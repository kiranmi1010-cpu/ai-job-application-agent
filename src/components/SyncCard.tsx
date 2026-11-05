import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, Smartphone, AlertCircle, CheckCircle } from 'lucide-react';
import { cloudEnabled, getSyncInfo, onSyncState, syncNow, SyncState } from '../services/cloudSync';

/** Settings card: shows whether laptop and phone share data, and syncs on demand. */
export default function SyncCard() {
  const [state, setState] = useState<SyncState>('off');
  const [detail, setDetail] = useState('');
  const [lastSynced, setLastSynced] = useState<number | null>(null);

  useEffect(
    () =>
      onSyncState((next, info) => {
        setState(next);
        setDetail(info || '');
        setLastSynced(getSyncInfo().lastSyncedAt);
      }),
    []
  );

  const installHint = /iphone|ipad/i.test(navigator.userAgent)
    ? 'On iPhone: open this site in Safari, tap Share, then "Add to Home Screen".'
    : 'On Android: open this site in Chrome, tap the ⋮ menu, then "Install app" or "Add to Home screen".';

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
      <div className="p-5 border-b border-slate-100">
        <h2 className="text-lg font-semibold text-slate-900">Phone & Sync</h2>
        <p className="text-sm text-slate-500">Use JobPilot on your laptop and phone with the same data</p>
      </div>
      <div className="p-5 space-y-4">
        {cloudEnabled ? (
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {state === 'error' ? (
                <AlertCircle size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
              ) : (
                <Cloud size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {state === 'error' ? 'Sync needs attention' : state === 'syncing' ? 'Syncing…' : 'Cloud sync is on'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {state === 'error'
                    ? detail
                    : lastSynced
                      ? `Last synced ${new Date(lastSynced).toLocaleTimeString()}. Changes sync automatically.`
                      : 'Your resume, jobs and applications sync automatically.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => void syncNow()}
              disabled={state === 'syncing'}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-900 text-white rounded-lg disabled:opacity-50 flex-shrink-0"
            >
              <RefreshCw size={14} className={state === 'syncing' ? 'animate-spin' : ''} />
              Sync now
            </button>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <CloudOff size={20} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-slate-900">Data stays on this device</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Cloud sync is not set up for this deployment, so your phone and laptop keep separate data. Add
                VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel to turn it on (see SYNC_SETUP.md).
              </p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-3 pt-4 border-t border-slate-100">
          <Smartphone size={20} className="text-slate-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
              Install on your phone
              {window.matchMedia?.('(display-mode: standalone)').matches && (
                <span className="inline-flex items-center gap-1 text-xs text-green-700">
                  <CheckCircle size={12} /> installed
                </span>
              )}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{installHint}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
