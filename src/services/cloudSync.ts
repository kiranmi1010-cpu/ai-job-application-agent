// Cloud sync: keeps the resume, jobs, applications and settings the same on
// every device (laptop, phone) signed in to the same account.
//
// The app stays local-first: everything is still read from and written to
// IndexedDB, so it works offline. When Supabase is configured
// (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY), each signed-in user also has one
// row in `jobpilot_snapshots`, and this module merges that row with the local
// database:
//
//   * every local write stamps the record with `updatedAt` (Dexie hooks);
//   * every local delete leaves a tombstone, so a job you removed on the phone
//     does not come back from the laptop;
//   * merging keeps, per record, whichever side changed it last.
//
// Records are matched across devices by keys that do not depend on IndexedDB's
// auto-increment ids: jobs by externalId, applications by createdAt, resumes by
// uploadedAt. Applications point at jobs by local id, so the snapshot carries
// the job's externalId instead and ids are rebuilt on import.

import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';
import { db } from '../db';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;

export const cloudEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase: SupabaseClient | null = cloudEnabled
  ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;

const TABLE = 'jobpilot_snapshots';
const TOMBSTONE_KEY = 'jobpilot_tombstones';

type Kind = 'jobs' | 'applications' | 'resumes';
type Tombstones = Record<Kind, Record<string, number>>;

interface Snapshot {
  version: 1;
  resumes: any[];
  jobs: any[];
  applications: any[];
  settings: any | null;
  tombstones: Tombstones;
}

export type SyncState = 'off' | 'idle' | 'syncing' | 'error';
type Listener = (state: SyncState, detail?: string) => void;

let state: SyncState = cloudEnabled ? 'idle' : 'off';
let lastError = '';
let lastSyncedAt: number | null = null;
const listeners = new Set<Listener>();

function setState(next: SyncState, detail = '') {
  state = next;
  lastError = next === 'error' ? detail : '';
  listeners.forEach((fn) => fn(state, detail));
}

export function onSyncState(fn: Listener): () => void {
  listeners.add(fn);
  fn(state, lastError);
  return () => listeners.delete(fn);
}

export function getSyncInfo() {
  return { state, lastError, lastSyncedAt, cloudEnabled };
}

// --- keys, stamps and tombstones -------------------------------------------

const iso = (value: any) => (value instanceof Date ? value.toISOString() : value ? String(value) : '');

const keyOf = {
  jobs: (job: any) => String(job?.externalId || `${job?.title}-${job?.company}`),
  applications: (app: any) => iso(app?.createdAt) || `app-${app?.jobId}`,
  resumes: (resume: any) => iso(resume?.uploadedAt) || String(resume?.fileName || ''),
};

function readTombstones(): Tombstones {
  try {
    const parsed = JSON.parse(localStorage.getItem(TOMBSTONE_KEY) || '{}');
    return { jobs: parsed.jobs || {}, applications: parsed.applications || {}, resumes: parsed.resumes || {} };
  } catch {
    return { jobs: {}, applications: {}, resumes: {} };
  }
}

function writeTombstones(tombs: Tombstones) {
  // Tombstones older than 60 days have been seen by every active device.
  const cutoff = Date.now() - 60 * 24 * 3600 * 1000;
  (Object.keys(tombs) as Kind[]).forEach((kind) => {
    Object.entries(tombs[kind]).forEach(([key, at]) => {
      if (at < cutoff) delete tombs[kind][key];
    });
  });
  try {
    localStorage.setItem(TOMBSTONE_KEY, JSON.stringify(tombs));
  } catch {
    /* storage full or blocked - sync still works, deletes may reappear */
  }
}

/** True while a remote snapshot is being written locally; hooks stay quiet. */
let applyingRemote = false;
let hooksInstalled = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSync(delay = 3000) {
  if (!cloudEnabled) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void syncNow();
  }, delay);
}

function installHooks() {
  if (hooksInstalled) return;
  hooksInstalled = true;

  const stamp = (kind: Kind | 'settings') => {
    const table: any = (db as any)[kind];
    table.hook('creating', (_pk: any, obj: any) => {
      if (applyingRemote) return;
      obj.updatedAt = Date.now();
      scheduleSync();
    });
    table.hook('updating', (mods: any) => {
      if (applyingRemote || 'updatedAt' in mods) return undefined;
      scheduleSync();
      return { updatedAt: Date.now() };
    });
    if (kind !== 'settings') {
      table.hook('deleting', (_pk: any, obj: any) => {
        if (applyingRemote) return;
        const tombs = readTombstones();
        tombs[kind][keyOf[kind](obj)] = Date.now();
        writeTombstones(tombs);
        scheduleSync();
      });
    }
  };

  stamp('resumes');
  stamp('jobs');
  stamp('applications');
  stamp('settings');
}

// Install as soon as the module loads, so writes made before sign-in are
// stamped too and win against older cloud copies.
installHooks();

// --- snapshot export / merge / import --------------------------------------

async function exportLocal(): Promise<Snapshot> {
  const [resumes, jobs, applications, settings] = await Promise.all([
    db.resumes.toArray(),
    db.jobs.toArray(),
    db.applications.toArray(),
    db.settings.toCollection().first(),
  ]);
  const extById = new Map<number, string>();
  jobs.forEach((job) => job.id != null && extById.set(job.id, keyOf.jobs(job)));

  const strip = (row: any) => {
    const { id, ...rest } = row;
    return rest;
  };

  return {
    version: 1,
    resumes: resumes.map(strip),
    jobs: jobs.map(strip),
    applications: applications.map((app) => ({ ...strip(app), jobKey: extById.get(app.jobId) || '' })),
    settings: settings ? strip(settings) : null,
    tombstones: readTombstones(),
  };
}

const stampOf = (row: any) => Number(row?.updatedAt) || 0;

function mergeList(kind: Kind, local: any[], remote: any[], tombs: Tombstones): any[] {
  const out = new Map<string, any>();
  [...remote, ...local].forEach((row) => {
    const key = keyOf[kind](row);
    const current = out.get(key);
    if (!current || stampOf(row) >= stampOf(current)) out.set(key, row);
  });
  // A delete wins over any copy that was not touched after it.
  Object.entries(tombs[kind]).forEach(([key, deletedAt]) => {
    const row = out.get(key);
    if (row && stampOf(row) <= deletedAt) out.delete(key);
  });
  return [...out.values()];
}

function mergeTombstones(a: Tombstones, b: Tombstones): Tombstones {
  const out: Tombstones = { jobs: { ...a.jobs }, applications: { ...a.applications }, resumes: { ...a.resumes } };
  (Object.keys(out) as Kind[]).forEach((kind) => {
    Object.entries(b?.[kind] || {}).forEach(([key, at]) => {
      out[kind][key] = Math.max(out[kind][key] || 0, Number(at) || 0);
    });
  });
  return out;
}

function merge(local: Snapshot, remote: Snapshot | null): Snapshot {
  if (!remote) return local;
  const tombstones = mergeTombstones(local.tombstones, remote.tombstones || ({} as Tombstones));
  const settings =
    !remote.settings ? local.settings : !local.settings ? remote.settings
      : stampOf(remote.settings) > stampOf(local.settings) ? remote.settings : local.settings;
  return {
    version: 1,
    resumes: mergeList('resumes', local.resumes, remote.resumes || [], tombstones),
    jobs: mergeList('jobs', local.jobs, remote.jobs || [], tombstones),
    applications: mergeList('applications', local.applications, remote.applications || [], tombstones),
    settings,
    tombstones,
  };
}

const toDate = (value: any) => (value ? new Date(value) : value);

async function importSnapshot(snap: Snapshot) {
  applyingRemote = true;
  try {
    await db.transaction('rw', db.resumes, db.jobs, db.applications, db.settings, async () => {
      await Promise.all([db.resumes.clear(), db.jobs.clear(), db.applications.clear(), db.settings.clear()]);

      await db.resumes.bulkAdd(snap.resumes.map((r) => ({ ...r, uploadedAt: toDate(r.uploadedAt) })));

      const jobIds = await db.jobs.bulkAdd(
        snap.jobs.map((j) => ({ ...j, foundAt: toDate(j.foundAt) })),
        { allKeys: true }
      );
      const idByKey = new Map<string, number>();
      snap.jobs.forEach((job, i) => idByKey.set(keyOf.jobs(job), Number(jobIds[i])));

      const apps = snap.applications
        .map(({ jobKey, ...app }) => ({
          ...app,
          jobId: idByKey.get(jobKey) ?? -1,
          createdAt: toDate(app.createdAt),
          appliedAt: toDate(app.appliedAt),
        }))
        .filter((app) => app.jobId !== -1);
      await db.applications.bulkAdd(apps as any);

      if (snap.settings) await db.settings.add(snap.settings);
    });
    writeTombstones(snap.tombstones);
  } finally {
    applyingRemote = false;
  }
}

/** A cheap fingerprint so we only rewrite IndexedDB when something changed. */
function fingerprint(snap: Snapshot) {
  const part = (kind: Kind, rows: any[]) =>
    rows.map((r) => `${keyOf[kind](r)}@${stampOf(r)}`).sort().join('|');
  return [
    part('resumes', snap.resumes),
    part('jobs', snap.jobs),
    part('applications', snap.applications),
    stampOf(snap.settings),
  ].join('#');
}

// --- public API --------------------------------------------------------------

let running: Promise<void> | null = null;
let changeListeners = new Set<() => void>();

/** Components can re-read IndexedDB when another device's changes land. */
export function onRemoteChange(fn: () => void): () => void {
  changeListeners.add(fn);
  return () => changeListeners.delete(fn);
}

async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

export async function syncNow(): Promise<void> {
  if (!supabase) return;
  if (running) return running;

  running = (async () => {
    const userId = await currentUserId();
    if (!userId) {
      setState('idle');
      return;
    }
    setState('syncing');
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('data')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;

      const local = await exportLocal();
      const merged = merge(local, (data?.data as Snapshot) || null);

      if (fingerprint(merged) !== fingerprint(local)) {
        await importSnapshot(merged);
        changeListeners.forEach((fn) => fn());
      }

      const remoteFp = data?.data ? fingerprint(data.data as Snapshot) : '';
      if (fingerprint(merged) !== remoteFp) {
        const { error: upsertError } = await supabase
          .from(TABLE)
          .upsert({ user_id: userId, data: merged, updated_at: new Date().toISOString() });
        if (upsertError) throw upsertError;
      }

      lastSyncedAt = Date.now();
      setState('idle');
    } catch (err: any) {
      const message = err?.message || String(err);
      console.warn('Cloud sync failed:', message);
      setState('error', /relation .* does not exist|jobpilot_snapshots/i.test(message)
        ? 'The jobpilot_snapshots table is missing. Run supabase/schema.sql in your Supabase project.'
        : message);
    }
  })().finally(() => {
    running = null;
  });

  return running;
}

let loopStarted = false;

/** Sync on sign-in, when the app comes back to the foreground, and every 2 minutes. */
export function startSyncLoop() {
  if (!supabase || loopStarted) return;
  loopStarted = true;
  void syncNow();
  const onVisible = () => {
    if (document.visibilityState === 'visible') void syncNow();
  };
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('online', () => void syncNow());
  setInterval(() => {
    if (document.visibilityState === 'visible') void syncNow();
  }, 2 * 60 * 1000);
}

/** Before signing out: push pending changes, then wipe this device's copy. */
export async function flushAndClearLocal() {
  if (!supabase) return;
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  await syncNow();
  applyingRemote = true;
  try {
    await Promise.all([db.resumes.clear(), db.jobs.clear(), db.applications.clear(), db.settings.clear()]);
    localStorage.removeItem(TOMBSTONE_KEY);
  } finally {
    applyingRemote = false;
  }
}

export type { Session };

/** Exposed for tests only. */
export const __test = { exportLocal, importSnapshot, merge, fingerprint };
