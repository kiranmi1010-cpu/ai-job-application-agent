import React, { useEffect, useState } from 'react';
import { db, dbHelpers } from '../db';
import { useAuth } from '../contexts/AuthContext';
import { cloudEnabled, getSyncInfo, onSyncState, syncNow, SyncState } from '../services/cloudSync';

/** Ask the Job Scanner to start a search as soon as it opens. */
export const AUTOSCAN_KEY = 'jobpilot_autoscan';

const pad = (n: number) => String(n).padStart(2, '0');
const hhmmss = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

/**
 * The ring screen from the local JobPilot console, driven by this app's data:
 * how many roles clear your match threshold, how many were scanned, and the
 * sync state between your devices.
 */
export default function HudHero() {
  const { user } = useAuth();
  const [clock, setClock] = useState(hhmmss(new Date()));
  const [info, setInfo] = useState({ relevant: 0, scanned: 0, threshold: 60, lastScan: '', hasResume: false });
  const [sync, setSync] = useState<SyncState>('off');
  const [checking, setChecking] = useState(false);

  const load = async () => {
    const [jobs, settings, resume] = await Promise.all([
      db.jobs.toArray(),
      dbHelpers.getSettings(),
      dbHelpers.getResume(),
    ]);
    const threshold = settings?.minMatchScore || 60;
    const latest = jobs.reduce<Date | null>((max, job) => {
      const at = job.foundAt ? new Date(job.foundAt) : null;
      return at && (!max || at > max) ? at : max;
    }, null);
    setInfo({
      relevant: jobs.filter((job) => (job.matchScore || 0) >= threshold).length,
      scanned: jobs.length,
      threshold,
      lastScan: latest
        ? `${latest.getFullYear()}-${pad(latest.getMonth() + 1)}-${pad(latest.getDate())} ${pad(latest.getHours())}:${pad(latest.getMinutes())}`
        : '',
      hasResume: Boolean(resume),
    });
  };

  useEffect(() => {
    void load();
    const tick = setInterval(() => setClock(hhmmss(new Date())), 1000);
    const unsub = onSyncState((state) => setSync(state));
    return () => {
      clearInterval(tick);
      unsub();
    };
  }, []);

  const recheck = async () => {
    setChecking(true);
    try {
      await syncNow();
      await load();
    } finally {
      setChecking(false);
    }
  };

  const runScan = () => {
    sessionStorage.setItem(AUTOSCAN_KEY, '1');
    window.location.hash = info.hasResume ? 'jobs' : 'resume';
  };

  const lastSynced = getSyncInfo().lastSyncedAt;
  const dotClass = !info.hasResume ? 'hud-dot off' : info.scanned === 0 ? 'hud-dot idle' : 'hud-dot';
  const status = !info.hasResume
    ? 'no resume yet'
    : info.scanned === 0
      ? 'no scan yet'
      : `${info.relevant} relevant role${info.relevant === 1 ? '' : 's'} · ${info.scanned} scanned`;
  const meta = !info.hasResume
    ? 'upload your resume to start'
    : [user?.name || 'candidate', `threshold ${info.threshold}%`, info.lastScan || 'press run scan'].join(' · ');

  return (
    <section className="hud-hero">
      <div className="hud-corner hud-tl">
        JobPilot
        <br />
        application agent
      </div>
      <div className="hud-corner hud-tr">
        {clock}
        <br />
        {cloudEnabled ? 'cloud node' : 'this device'}
      </div>
      <div className="hud-corner hud-bl">
        {cloudEnabled ? (sync === 'error' ? 'sync problem' : sync === 'syncing' ? 'syncing…' : 'synced · all devices') : 'local only'}
      </div>
      <div className="hud-corner hud-br">
        {lastSynced ? hhmmss(new Date(lastSynced)) : '--:--:--'}
        <br />
        last sync
      </div>

      <div className="hud-stage">
        <div className="hud-ring hud-ticks" />
        <div className="hud-ring hud-outer" />
        <div className="hud-ring hud-arcs" />
        <div className="hud-ring hud-amber" />
        <div className="hud-ring hud-dots" />
        <div className="hud-ring hud-inner" />
        <div className="hud-ring hud-core" />
        <div className="hud-disc" />

        <div className="hud-center">
          <div className="hud-eyebrow">intelligent job applications</div>
          <div className="hud-wordmark">JOBPILOT</div>
          <div className="hud-status">
            <span className={dotClass} />
            <span>{status}</span>
          </div>
          <div className="hud-meta">{meta}</div>
          <div className="hud-actions">
            <a className="hud-btn primary" href={info.hasResume ? '#jobs' : '#resume'}>
              {info.hasResume ? 'View jobs' : 'Upload resume'}
            </a>
            <button className="hud-btn" type="button" onClick={runScan}>
              Run scan
            </button>
            <button className="hud-btn" type="button" onClick={recheck} disabled={checking}>
              {checking ? '…' : 'Re-check'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
