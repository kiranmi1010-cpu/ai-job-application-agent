import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  Mail,
  Eye,
  Filter,
  TrendingUp,
  FileText
} from 'lucide-react';
import { Application } from '../types';
import { dbHelpers } from '../db';

export default function Applications() {
  const [applications, setApplications] = useState<Application[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [apps, jobs] = await Promise.all([dbHelpers.getApplications(), dbHelpers.getJobs()]);
        const byId = new Map(jobs.map((j) => [Number(j.id), j]));
        setApplications(
          apps.map((a) => ({
            id: 'app-' + a.id,
            job: (byId.get(Number(a.jobId)) as any) || {
              id: a.jobId, title: 'Job ' + a.jobId, company: '', location: '', type: 'Full-time',
              description: '', requirements: [], matchScore: 0, source: '', url: '',
              postedDate: '', status: 'applied',
            },
            status: a.status as any,
            appliedAt: a.appliedAt ? new Date(a.appliedAt) : undefined,
            emailDraft: a.emailDraft,
            coverLetter: a.coverLetter,
          }))
        );
      } catch (err) {
        console.error('Failed to load applications:', err);
      }
    })();
  }, []);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  const statusConfig = {
    draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700', icon: <FileText size={14} /> },
    pending_approval: { label: 'Pending Review', color: 'bg-yellow-100 text-yellow-700', icon: <Clock size={14} /> },
    approved: { label: 'Approved', color: 'bg-blue-100 text-blue-700', icon: <CheckCircle size={14} /> },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: <XCircle size={14} /> },
    submitted: { label: 'Submitted', color: 'bg-green-100 text-green-700', icon: <Mail size={14} /> },
    interview: { label: 'Interview', color: 'bg-purple-100 text-purple-700', icon: <Calendar size={14} /> },
    rejected_by_company: { label: 'Not Selected', color: 'bg-red-100 text-red-700', icon: <XCircle size={14} /> },
  };

  const filteredApps = applications.filter(app =>
    filterStatus === 'all' || app.status === filterStatus
  );

  const stats = {
    total: applications.length,
    submitted: applications.filter(a => a.status === 'submitted').length,
    interviews: applications.filter(a => a.status === 'interview').length,
    pending: applications.filter(a => a.status === 'pending_approval').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Applications</h1>
        <p className="text-slate-500 mt-1">Track all your job applications in one place</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          <p className="text-xs text-slate-500 mt-1">Total Applications</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-2xl font-bold text-green-600">{stats.submitted}</p>
          <p className="text-xs text-slate-500 mt-1">Submitted</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-2xl font-bold text-purple-600">{stats.interviews}</p>
          <p className="text-xs text-slate-500 mt-1">Interviews</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          <p className="text-xs text-slate-500 mt-1">Pending Review</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter size={16} className="text-slate-400 flex-shrink-0" />
        {['all', 'submitted', 'interview', 'pending_approval', 'draft'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              filterStatus === status
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {status === 'all' ? 'All' : statusConfig[status as keyof typeof statusConfig]?.label || status}
          </button>
        ))}
      </div>

      {/* Application List */}
      <div className="space-y-3">
        {filteredApps.map((app, i) => (
          <motion.div
            key={app.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-xl border border-slate-100 p-5 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setSelectedApp(app)}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-slate-900">{app.job.title}</h3>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[app.status].color}`}>
                    {statusConfig[app.status].icon}
                    {statusConfig[app.status].label}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-1">{app.job.company} • {app.job.location}</p>
                <div className="flex items-center gap-4 mt-2">
                  {app.appliedAt && (
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock size={12} />
                      Applied {app.appliedAt.toLocaleDateString()}
                    </span>
                  )}
                  <span className="text-xs text-slate-400">
                    via {app.job.source}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 bg-slate-50 rounded-lg text-slate-600 hover:bg-slate-100">
                  <Eye size={16} />
                </button>
                {app.status === 'interview' && (
                  <button className="flex items-center gap-1 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-100">
                    <Calendar size={14} />
                    View Interview
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedApp && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedApp(null)}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selectedApp.job.title}</h2>
                  <p className="text-sm text-slate-500">{selectedApp.job.company}</p>
                </div>
                <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${statusConfig[selectedApp.status].color}`}>
                  {statusConfig[selectedApp.status].icon}
                  {statusConfig[selectedApp.status].label}
                </span>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase">Email Sent To</label>
                <p className="text-sm text-slate-900 mt-1">{selectedApp.emailDraft.to}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase">Subject</label>
                <p className="text-sm text-slate-900 mt-1">{selectedApp.emailDraft.subject}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase">Email Body</label>
                <div className="mt-1 p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-700 whitespace-pre-line">{selectedApp.emailDraft.body}</p>
                </div>
              </div>
              {selectedApp.emailDraft.attachments.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase">Attachments</label>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {selectedApp.emailDraft.attachments.map((att, i) => (
                      <span key={i} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 rounded-lg text-sm text-slate-700">
                        <FileText size={14} /> {att}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {selectedApp.status === 'interview' && (
                <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={16} className="text-purple-600" />
                    <p className="text-sm font-medium text-purple-900">Interview Scheduled</p>
                  </div>
                  <p className="text-xs text-purple-700">
                    Your interview has been scheduled. Check your email for details and preparation tips.
                  </p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-100">
              <button
                onClick={() => setSelectedApp(null)}
                className="w-full py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
