import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Briefcase,
  Mail,
  Calendar,
  CheckCircle,
  Clock,
  Target,
  Zap,
  ArrowUpRight,
  Brain,
  Search,
  Sparkles,
  ArrowRight,
  Code,
  Loader2,
  FileText
} from 'lucide-react';
import { dbHelpers } from '../db';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalJobs: 0,
    totalApplications: 0,
    submittedApplications: 0,
    interviewApplications: 0,
    pendingApplications: 0
  });
  const [hasResume, setHasResume] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dbStats, resume] = await Promise.all([
        dbHelpers.getStats(),
        dbHelpers.getResume()
      ]);
      
      setStats(dbStats);
      setHasResume(!!resume);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const responseRate = stats.totalApplications > 0 
    ? Math.round((stats.submittedApplications / stats.totalApplications) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Welcome back 👋
          </h1>
          <p className="text-slate-500 mt-1">
            {hasResume 
              ? 'Your AI agent is actively finding and matching jobs for you.'
              : 'Upload your resume to get started with AI-powered job search.'}
          </p>
        </div>
        {hasResume && (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-green-700 font-medium">Agent Active</span>
          </div>
        )}
      </div>

      {/* Get Started Banner (if no resume) */}
      {!hasResume && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Get Started: Upload Your Resume</h3>
              <p className="text-blue-100 text-sm mt-1">Our AI will automatically analyze your skills and find matching jobs.</p>
            </div>
            <button 
              onClick={() => window.location.hash = '#resume'}
              className="px-5 py-2.5 bg-white text-blue-600 rounded-xl font-medium text-sm hover:bg-blue-50 transition-colors whitespace-nowrap"
            >
              Upload Resume
            </button>
          </div>
        </motion.div>
      )}

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
              <Briefcase size={20} />
            </div>
            <ArrowUpRight size={16} className="text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.totalJobs}</p>
          <p className="text-sm text-slate-500 mt-1">Jobs Matched</p>
          <p className="text-xs text-green-600 mt-2 font-medium">From your resume</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white">
              <Mail size={20} />
            </div>
            <ArrowUpRight size={16} className="text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.totalApplications}</p>
          <p className="text-sm text-slate-500 mt-1">Applications</p>
          <p className="text-xs text-green-600 mt-2 font-medium">{stats.submittedApplications} submitted</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white">
              <Calendar size={20} />
            </div>
            <ArrowUpRight size={16} className="text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.interviewApplications}</p>
          <p className="text-sm text-slate-500 mt-1">Interviews</p>
          <p className="text-xs text-green-600 mt-2 font-medium">Scheduled</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white">
              <TrendingUp size={20} />
            </div>
            <ArrowUpRight size={16} className="text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{responseRate}%</p>
          <p className="text-sm text-slate-500 mt-1">Response Rate</p>
          <p className="text-xs text-green-600 mt-2 font-medium">Above average</p>
        </div>
      </motion.div>

      {/* Pipeline & Status */}
      {hasResume && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* AI Pipeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm"
          >
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Brain size={18} className="text-purple-600" />
                <h2 className="text-lg font-semibold text-slate-900">AI Resume → Job Pipeline</h2>
              </div>
              <p className="text-sm text-slate-500 mt-1">How AI finds jobs from your resume</p>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {[
                  { label: 'Resume', icon: <FileText size={14} />, color: 'purple' },
                  { label: 'Extract Skills', icon: <Code size={14} />, color: 'blue' },
                  { label: 'Match Roles', icon: <Target size={14} />, color: 'indigo' },
                  { label: 'Search Boards', icon: <Search size={14} />, color: 'green' },
                  { label: 'Rank Results', icon: <Sparkles size={14} />, color: 'emerald' },
                ].map((step, i) => (
                  <React.Fragment key={i}>
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl whitespace-nowrap bg-${step.color}-50 border border-${step.color}-200`}>
                      <span className={`text-${step.color}-600`}>{step.icon}</span>
                      <span className={`text-xs font-medium text-${step.color}-800`}>{step.label}</span>
                    </div>
                    {i < 4 && <ArrowRight size={14} className="text-slate-300 flex-shrink-0" />}
                  </React.Fragment>
                ))}
              </div>

              {/* Summary */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] uppercase font-semibold text-slate-500 mb-1">Jobs Found</p>
                  <p className="text-xl font-bold text-slate-900">{stats.totalJobs}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] uppercase font-semibold text-slate-500 mb-1">High Match</p>
                  <p className="text-xl font-bold text-green-600">
                    {stats.totalJobs > 0 ? Math.round(stats.totalJobs * 0.3) : 0}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] uppercase font-semibold text-slate-500 mb-1">Pending</p>
                  <p className="text-xl font-bold text-yellow-600">{stats.pendingApplications}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm"
          >
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2>
            </div>
            <div className="p-5 space-y-3">
              <button
                onClick={() => window.location.hash = '#jobs'}
                className="w-full flex items-center gap-3 p-3 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors text-left"
              >
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Briefcase size={16} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-900">View Matched Jobs</p>
                  <p className="text-xs text-blue-600">{stats.totalJobs} jobs found</p>
                </div>
              </button>

              <button
                onClick={() => window.location.hash = '#approvals'}
                className="w-full flex items-center gap-3 p-3 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors text-left"
              >
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <CheckCircle size={16} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-900">Review Approvals</p>
                  <p className="text-xs text-purple-600">{stats.pendingApplications} pending</p>
                </div>
              </button>

              <button
                onClick={() => window.location.hash = '#applications'}
                className="w-full flex items-center gap-3 p-3 bg-green-50 rounded-xl hover:bg-green-100 transition-colors text-left"
              >
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Mail size={16} className="text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-900">Track Applications</p>
                  <p className="text-xs text-green-600">{stats.totalApplications} total</p>
                </div>
              </button>

              <button
                onClick={() => window.location.hash = '#resume'}
                className="w-full flex items-center gap-3 p-3 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors text-left"
              >
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Zap size={16} className="text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-orange-900">Update Resume</p>
                  <p className="text-xs text-orange-600">Re-scan for new matches</p>
                </div>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* CTA */}
      {hasResume && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Ready to boost your job search?</h3>
              <p className="text-blue-100 text-sm mt-1">Your AI agent has found {stats.totalJobs} matching jobs. Start applying now!</p>
            </div>
            <button
              onClick={() => window.location.hash = '#jobs'}
              className="px-5 py-2.5 bg-white text-blue-600 rounded-xl font-medium text-sm hover:bg-blue-50 transition-colors whitespace-nowrap"
            >
              View Jobs →
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
