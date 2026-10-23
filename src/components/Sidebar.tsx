import React from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  CheckCircle,
  Upload,
  Settings,
  Bot,
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
}

const menuItems: { id: ViewType; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { id: 'jobs', label: 'Job Scanner', icon: <Briefcase size={20} /> },
  { id: 'applications', label: 'Applications', icon: <FileText size={20} /> },
  { id: 'approvals', label: 'Approvals', icon: <CheckCircle size={20} /> },
  { id: 'resume', label: 'My Resume', icon: <Upload size={20} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
];

export default function Sidebar({ currentView, setCurrentView, pendingApprovals, isMobileOpen, setIsMobileOpen }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={false}
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white flex flex-col transform transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Bot size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                JobPilot AI
              </h1>
              <p className="text-xs text-slate-400">Smart Job Agent</p>
            </div>
          </div>
          <button
            className="lg:hidden text-slate-400 hover:text-white"
            onClick={() => setIsMobileOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* AI Status */}
        <div className="mx-4 mb-4 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-green-400 font-medium">AI Agent Active</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap size={12} className="text-yellow-400" />
            <span className="text-xs text-slate-400">Scanning 6 new jobs...</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentView(item.id);
                setIsMobileOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                currentView === item.id
                  ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-white border border-blue-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.id === 'approvals' && pendingApprovals > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {pendingApprovals}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="p-4 mx-3 mb-3 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-xl border border-slate-700/50">
          <p className="text-xs text-slate-400 mb-1">Applications Today</p>
          <p className="text-2xl font-bold text-white">12</p>
          <p className="text-xs text-green-400 mt-1">↑ 3 interviews scheduled</p>
        </div>
      </motion.aside>
    </>
  );
}
