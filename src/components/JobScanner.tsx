import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MapPin,
  DollarSign,
  Clock,
  ExternalLink,
  Filter,
  Star,
  CheckCircle,
  XCircle,
  Loader2,
  Briefcase
} from 'lucide-react';
import { Job } from '../types';
import { mockJobs } from '../data';

export default function JobScanner() {
  const [jobs, setJobs] = useState<Job[]>(mockJobs);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [scanning, setScanning] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
    }, 3000);
  };

  const handleApprove = (jobId: string) => {
    setJobs(jobs.map(j => j.id === jobId ? { ...j, status: 'approved' as const } : j));
  };

  const handleReject = (jobId: string) => {
    setJobs(jobs.map(j => j.id === jobId ? { ...j, status: 'rejected' as const } : j));
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || job.type === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Job Scanner</h1>
          <p className="text-slate-500 mt-1">AI-powered job discovery matching your profile</p>
        </div>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {scanning ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Search size={16} />
              Scan New Jobs
            </>
          )}
        </button>
      </div>

      {/* Scanning Animation */}
      <AnimatePresence>
        {scanning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Loader2 size={16} className="text-blue-600 animate-spin" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900">AI Agent is scanning job boards...</p>
                <p className="text-xs text-blue-600">Checking LinkedIn, Indeed, Glassdoor, Company websites</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {['LinkedIn', 'Indeed', 'Glassdoor', 'AngelList', 'Remote.co', 'We Work Remotely'].map((source, i) => (
                <motion.span
                  key={source}
                  initial={{ opacity: 0.3 }}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                  className="px-3 py-1 bg-white rounded-full text-xs text-blue-700 border border-blue-200"
                >
                  {source}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search jobs by title or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'Full-time', 'Remote', 'Contract'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                filterType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {type === 'all' ? 'All' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Job Cards */}
      <div className="grid gap-4">
        {filteredJobs.map((job, i) => (
          <motion.div
            key={job.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all p-5"
          >
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              {/* Job Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Briefcase size={20} className="text-slate-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">{job.title}</h3>
                    <p className="text-sm text-slate-600">{job.company}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <MapPin size={12} /> {job.location}
                      </span>
                      {job.salary && (
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <DollarSign size={12} /> {job.salary}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock size={12} /> {job.type}
                      </span>
                      <span className="text-xs text-slate-400">via {job.source}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Match Score */}
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold ${
                    job.matchScore >= 90 ? 'bg-green-100 text-green-700' :
                    job.matchScore >= 80 ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    <Star size={12} />
                    {job.matchScore}% Match
                  </div>
                </div>

                {/* Actions */}
                {job.status === 'pending' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(job.id)}
                      className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                      title="Approve & Apply"
                    >
                      <CheckCircle size={18} />
                    </button>
                    <button
                      onClick={() => handleReject(job.id)}
                      className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                      title="Reject"
                    >
                      <XCircle size={18} />
                    </button>
                    <button
                      onClick={() => setSelectedJob(job)}
                      className="p-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                      title="View Details"
                    >
                      <ExternalLink size={18} />
                    </button>
                  </div>
                )}

                {job.status === 'approved' && (
                  <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    ✓ Approved
                  </span>
                )}
                {job.status === 'rejected' && (
                  <span className="px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                    ✗ Skipped
                  </span>
                )}
              </div>
            </div>

            {/* Requirements */}
            <div className="mt-3 flex flex-wrap gap-2">
              {job.requirements.map((req, j) => (
                <span key={j} className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs">
                  {req}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Job Detail Modal */}
      <AnimatePresence>
        {selectedJob && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedJob(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-slate-900">{selectedJob.title}</h2>
              <p className="text-slate-600 mt-1">{selectedJob.company} • {selectedJob.location}</p>
              <div className="mt-4 p-4 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-700">{selectedJob.description}</p>
              </div>
              <div className="mt-4">
                <h4 className="text-sm font-medium text-slate-700 mb-2">Requirements</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedJob.requirements.map((req, i) => (
                    <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
                      {req}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => { handleApprove(selectedJob.id); setSelectedJob(null); }}
                  className="flex-1 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium text-sm hover:opacity-90"
                >
                  Approve & Apply
                </button>
                <button
                  onClick={() => setSelectedJob(null)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-200"
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
