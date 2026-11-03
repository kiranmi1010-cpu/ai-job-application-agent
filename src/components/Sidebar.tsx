import React from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  CheckCircle,
  Upload,
  Settings,
  Compass,
  X,
  Zap
} from 'lucide-react';
import { ViewType } from '../types';

interface SidebarProps {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  pendingApprovals: number;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  stats: { skills: number; jobs: number; matchedToday: number; interviews: number };
}

const menuItems: { id: ViewType; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { id: 'jobs', label: 'Job Scanner', icon: <Briefcase size={18} /> },
  { id: 'applications', label: 'Applications', icon: <FileText size={18} /> },
  { id: 'approvals', label: 'Approvals', icon: <CheckCircle size={18} /> },
  { id: 'resume', label: 'My Resume', icon: <Upload size={18} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
];

/** Paper sidebar: light surface, ink text, one solid accent for the active row. */
export default function Sidebar({ currentView, setCurrentView, pendingApprovals, isMobileOpen, setIsMobileOpen, stats }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={false}
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white text-slate-900 flex flex-col border-r border-slate-200 transform transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Wordmark */}
        <div className="px-6 pt-6 pb-5 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center">
              <Compass size={18} className="text-white" />
            </div>
            <div>
              <h1 className="font-serif text-lg leading-tight tracking-tight text-slate-900">
                JobPilot
              </h1>
              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Job search workspace</p>
            </div>
          </div>
          <button
            className="lg:hidden p-1 text-slate-400 hover:text-slate-700"
            onClick={() => setIsMobileOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Real counts */}
        <div className="mx-4 mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            <span className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Resume search</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap size={12} className="text-purple-600" />
            <span className="text-xs text-slate-600">
              {stats.skills} skill{stats.skills === 1 ? '' : 's'} → {stats.jobs} match{stats.jobs === 1 ? '' : 'es'}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 mt-4 space-y-0.5">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentView(item.id);
                setIsMobileOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                currentView === item.id
                  ? 'bg-slate-900 text-white font-medium'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.id === 'approvals' && pendingApprovals > 0 && (
                <span
                  className={`ml-auto text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    currentView === item.id
                      ? 'bg-white/15 text-white'
                      : 'bg-purple-100 text-purple-700'
                  }`}
                >
                  {pendingApprovals}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Today */}
        <div className="p-4 mx-3 mb-3 border-t border-slate-100">
          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400 mb-1">Matched today</p>
          <p className="font-serif text-3xl leading-none text-slate-900">{stats.matchedToday}</p>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>From your resume</span>
            <span>
              {stats.interviews} interview{stats.interviews === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </motion.aside>
    </>
  );
}
