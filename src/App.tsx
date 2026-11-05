import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Bell, Search, LogOut } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import JobScanner from './components/JobScanner';
import Applications from './components/Applications';
import Approvals from './components/Approvals';
import ResumeUpload from './components/ResumeUpload';
import Settings from './components/Settings';
import LoginPage from './components/LoginPage';
import { ViewType } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { dbHelpers } from './db';
import { onRemoteChange, onSyncState, SyncState, cloudEnabled } from './services/cloudSync';

function AppContent() {
  const { user, isAuthenticated, logout } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  // Bumped when another device's changes are synced in, so the open screen re-reads.
  const [remoteVersion, setRemoteVersion] = useState(0);
  const [syncState, setSyncState] = useState<SyncState>('off');

  useEffect(() => onRemoteChange(() => setRemoteVersion((v) => v + 1)), []);
  useEffect(() => onSyncState((next) => setSyncState(next)), []);

  // These were literal constants ("3 pending", "24 matched today"), so the
  // badges stayed the same no matter what was actually in the database.
  const [stats, setStats] = useState({
    jobs: 0,
    skills: 0,
    matchedToday: 0,
    interviews: 0,
    approvals: 0,
  });

  // The Dashboard/JobScanner buttons navigate by setting window.location.hash
  // ('#resume', '#jobs', ...), but the view lives in React state - nothing was
  // listening, so the URL changed while the screen stayed on the Dashboard.
  // Sync hash -> view so those buttons (and deep links) actually work.
  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.replace('#', '');
      const views: ViewType[] = ['dashboard', 'jobs', 'applications', 'approvals', 'resume', 'settings'];
      if ((views as string[]).includes(hash)) {
        setCurrentView(hash as ViewType);
      }
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, []);

  // Re-read on every view change so counts follow searches and approvals.
  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      try {
        const [counts, resume] = await Promise.all([dbHelpers.getStats(), dbHelpers.getResume()]);
        const [matchedToday, approvals] = await Promise.all([
          dbHelpers.countJobsToday(),
          dbHelpers.countPendingApprovals(),
        ]);
        if (cancelled) return;
        setStats({
          jobs: counts.totalJobs,
          skills: (resume?.parsedData?.skills || []).length,
          matchedToday,
          interviews: counts.interviewApplications,
          approvals,
        });
      } catch (error) {
        console.warn('Could not load sidebar stats:', error);
      }
    };

    loadStats();
    return () => {
      cancelled = true;
    };
  }, [currentView, remoteVersion]);

  const pendingApprovals = stats.approvals;

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'jobs': return <JobScanner />;
      case 'applications': return <Applications />;
      case 'approvals': return <Approvals />;
      case 'resume': return <ResumeUpload />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  const getUserInitial = () => {
    return user?.name?.charAt(0).toUpperCase() || 'U';
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        pendingApprovals={pendingApprovals}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        stats={stats}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <Menu size={20} />
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
              <Search size={15} className="text-slate-400" />
              <input
                type="text"
                placeholder="Search jobs, companies…"
                className="bg-transparent text-sm text-slate-700 placeholder-slate-400 focus:outline-none w-56"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
              <Bell size={18} />
              {pendingApprovals > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-purple-600 text-white text-[10px] rounded-full flex items-center justify-center font-medium">
                  {pendingApprovals}
                </span>
              )}
            </button>

            <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-slate-900">{user?.name || 'User'}</p>
                <p className="text-[11px] text-slate-400">
                  {!cloudEnabled
                    ? 'This device only'
                    : syncState === 'syncing'
                      ? 'Syncing…'
                      : syncState === 'error'
                        ? 'Sync problem: see Settings'
                        : 'Synced across devices'}
                </p>
              </div>
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white text-xs font-semibold">
                {getUserInitial()}
              </div>
              <button
                onClick={logout}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentView}-${remoteVersion}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
