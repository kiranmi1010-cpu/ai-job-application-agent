import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  Mail,
  FileText,
  Clock,
  AlertTriangle,
  Eye,
  Smartphone,
  Send,
  Edit3
} from 'lucide-react';
import { ApprovalItem, Job } from '../types';
import { dbHelpers } from '../db';

export default function Approvals() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalItem | null>(null);
  const [showMobileView, setShowMobileView] = useState(false);

  // Real queue: applications sitting in draft/pending_approval for this user,
  // joined to their job. No canned demo data.
  const loadApprovals = async () => {
    try {
      const [applications, jobs] = await Promise.all([dbHelpers.getApplications(), dbHelpers.getJobs()]);
      const jobById = new Map(jobs.map((job) => [Number(job.id), job]));
      const pending = applications.filter((app) => app.status === 'pending_approval' || app.status === 'draft');

      setApprovals(
        pending.map((application) => {
          const job = jobById.get(Number(application.jobId));
          const draft: any = application.emailDraft;
          const fallback: Job = {
            externalId: 'application-' + application.id,
            title: draft?.subject
              ? String(draft.subject).replace(/^(Application for|Applying for)\s*/i, '').trim()
              : 'Role no longer in your saved jobs',
            company: 'Application #' + application.id,
            location: '',
            type: 'Full-time',
            description: application.coverLetter || '',
            requirements: [],
            matchScore: job?.matchScore ?? 0,
            source: 'JobPilot',
            url: '',
            postedDate: '',
            status: 'pending',
            foundAt: application.createdAt,
          };

          return {
            id: String(application.id),
            type: 'application' as const,
            job: job ?? fallback,
            preview: application.emailDraft,
            createdAt: application.createdAt,
            priority: (job?.matchScore ?? 0) >= 85 ? ('high' as const) : ('medium' as const),
          };
        })
      );
    } catch (error) {
      console.error('Error loading approvals:', error);
    }
  };

  useEffect(() => {
    loadApprovals();
  }, []);

  const handleApprove = async (id: string) => {
    setApprovals((prev) => prev.filter((item) => item.id !== id));
    setSelectedApproval(null);
    await dbHelpers.updateApplicationStatus(Number(id), 'submitted');
  };

  const handleReject = async (id: string) => {
    setApprovals((prev) => prev.filter((item) => item.id !== id));
    setSelectedApproval(null);
    await dbHelpers.updateApplicationStatus(Number(id), 'rejected');
  };

  const handleApproveAll = async () => {
    const ids = approvals.map((item) => item.id);
    setApprovals([]);
    setSelectedApproval(null);
    await Promise.all(ids.map((id) => dbHelpers.updateApplicationStatus(Number(id), 'submitted')));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'application': return <FileText size={16} />;
      case 'email': return <Mail size={16} />;
      case 'form': return <Edit3 size={16} />;
      default: return <FileText size={16} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Approval Queue</h1>
          <p className="text-slate-500 mt-1">Review and approve applications before they're sent</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowMobileView(!showMobileView)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Smartphone size={16} />
            Mobile Preview
          </button>
          {approvals.length > 1 && (
            <button
              onClick={handleApproveAll}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700"
            >
              <CheckCircle size={16} />
              Approve All
            </button>
          )}
        </div>
      </div>

      {/* Mobile Approval Info */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <Smartphone size={20} className="text-indigo-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-indigo-900">Approve from your phone</p>
            <p className="text-xs text-indigo-600 mt-1">
              Download the JobPilot AI mobile app or use the mobile-responsive web app to approve applications on the go. 
              You'll receive push notifications for high-priority approvals.
            </p>
            <div className="flex gap-2 mt-3">
              <button className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium">
                iOS App
              </button>
              <button className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium">
                Android App
              </button>
              <button className="px-3 py-1.5 bg-white text-indigo-600 border border-indigo-200 rounded-lg text-xs font-medium">
                Share Link
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Preview */}
      <AnimatePresence>
        {showMobileView && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex justify-center"
          >
            <div className="w-[320px] bg-slate-900 rounded-[3rem] p-3 shadow-2xl">
              <div className="bg-white rounded-[2.5rem] overflow-hidden">
                {/* Phone header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 pt-8">
                  <p className="text-white text-xs font-medium">JobPilot AI</p>
                  <p className="text-white/80 text-xs mt-1">{approvals.length} pending approvals</p>
                </div>
                {/* Phone content */}
                <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                  {approvals.map((approval) => (
                    <div key={approval.id} className="bg-slate-50 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                          {getTypeIcon(approval.type)}
                        </div>
                        <p className="text-xs font-medium text-slate-900 truncate">{approval.job.title}</p>
                      </div>
                      <p className="text-xs text-slate-500 mb-2">{approval.job.company}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(approval.id)}
                          className="flex-1 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => handleReject(approval.id)}
                          className="flex-1 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium"
                        >
                          ✗ Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Approval Cards */}
      {approvals.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} className="text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">All caught up!</h3>
          <p className="text-slate-500 mt-1">No pending approvals. Your AI agent will notify you when new applications need review.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {approvals.map((approval, i) => (
            <motion.div
              key={approval.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
            >
              {/* Card Header */}
              <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    approval.type === 'application' ? 'bg-blue-100 text-blue-600' :
                    approval.type === 'email' ? 'bg-purple-100 text-purple-600' :
                    'bg-orange-100 text-orange-600'
                  }`}>
                    {getTypeIcon(approval.type)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{approval.job.title}</h3>
                    <p className="text-sm text-slate-500">{approval.job.company} • {approval.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getPriorityColor(approval.priority)}`}>
                    {approval.priority} priority
                  </span>
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock size={12} />
                    Just now
                  </span>
                </div>
              </div>

              {/* Email Preview */}
              {'to' in approval.preview && (
                <div className="px-5 pb-4">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail size={14} className="text-slate-400" />
                      <span className="text-xs text-slate-500">To: {approval.preview.to}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-700 mb-2">{approval.preview.subject}</p>
                    <p className="text-xs text-slate-600 line-clamp-3 whitespace-pre-line">
                      {approval.preview.body}
                    </p>
                    {approval.preview.attachments.length > 0 && (
                      <div className="flex gap-2 mt-3">
                        {approval.preview.attachments.map((att, j) => (
                          <span key={j} className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-600">
                            <FileText size={10} /> {att}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="px-5 pb-5 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => handleApprove(approval.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity"
                >
                  <CheckCircle size={16} />
                  Approve & Send
                </button>
                <button
                  onClick={() => setSelectedApproval(approval)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-200"
                >
                  <Eye size={16} />
                  Review
                </button>
                <button
                  onClick={() => handleReject(approval.id)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl font-medium text-sm hover:bg-red-100"
                >
                  <XCircle size={16} />
                  Reject
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      <AnimatePresence>
        {selectedApproval && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedApproval(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-900">Review Application</h2>
                <p className="text-sm text-slate-500 mt-1">{selectedApproval.job.title} at {selectedApproval.job.company}</p>
              </div>
              <div className="p-6">
                {'to' in selectedApproval.preview && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase">To</label>
                      <p className="text-sm text-slate-900 mt-1">{selectedApproval.preview.to}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase">Subject</label>
                      <p className="text-sm text-slate-900 mt-1">{selectedApproval.preview.subject}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase">Body</label>
                      <div className="mt-1 p-4 bg-slate-50 rounded-xl">
                        <p className="text-sm text-slate-700 whitespace-pre-line">{selectedApproval.preview.body}</p>
                      </div>
                    </div>
                    {selectedApproval.preview.attachments.length > 0 && (
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase">Attachments</label>
                        <div className="flex gap-2 mt-2">
                          {selectedApproval.preview.attachments.map((att, i) => (
                            <span key={i} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 rounded-lg text-sm text-slate-700">
                              <FileText size={14} /> {att}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-slate-100 flex gap-3">
                <button
                  onClick={() => handleApprove(selectedApproval.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium text-sm hover:opacity-90"
                >
                  <Send size={16} />
                  Approve & Send
                </button>
                <button
                  onClick={() => setSelectedApproval(null)}
                  className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-200"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
