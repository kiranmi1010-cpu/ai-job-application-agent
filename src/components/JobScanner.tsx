import React, { useState, useEffect } from 'react';
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
  Briefcase,
  Brain,
  Sparkles,
  FileText,
  ArrowRight,
  Zap,
  Target,
  Code
} from 'lucide-react';
import { Job } from '../types';
import { mockJobs } from '../data';

const resumeInsights = {
  skills: ['React', 'TypeScript', 'Node.js', 'Python', 'AWS', 'GraphQL', 'Docker', 'PostgreSQL'],
  experienceLevel: 'Senior (5+ years)',
  targetRoles: ['Frontend Engineer', 'Full Stack Developer', 'UI Architect'],
  locations: ['Remote', 'San Francisco', 'New York'],
  salaryRange: '$150K - $250K'
};

export default function JobScanner() {
  const [jobs, setJobs] = useState<Job[]>(mockJobs);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [scanning, setScanning] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [activeTab, setActiveTab] = useState<'ai-matched' | 'all-jobs'>('ai-matched');
  const [scanProgress, setScanProgress] = useState(0);
  const [currentScanSource, setCurrentScanSource] = useState('');

  const scanSources = [
    { name: 'LinkedIn', jobs: 42 },
    { name: 'Indeed', jobs: 38 },
    { name: 'Glassdoor', jobs: 24 },
    { name: 'AngelList', jobs: 18 },
    { name: 'Remote.co', jobs: 15 },
    { name: 'Company Sites', jobs: 19 },
  ];

  const handleScan = () => {
    setScanning(true);
    setScanProgress(0);
    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setScanning(false);
          return 100;
        }
        return prev + 2;
      });
    }, 60);

    // Cycle through sources
    let sourceIndex = 0;
    const sourceInterval = setInterval(() => {
      setCurrentScanSource(scanSources[sourceIndex % scanSources.length].name);
      sourceIndex++;
      if (sourceIndex >= scanSources.length * 2) clearInterval(sourceInterval);
    }, 800);
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

  const aiMatchedJobs = [...jobs].sort((a, b) => b.matchScore - a.matchScore);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Job Scanner</h1>
          <p className="text-slate-500 mt-1">AI automatically finds jobs matching your resume profile</p>
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
              <Brain size={16} />
              Re-Scan All Boards
            </>
          )}
        </button>
      </div>

      {/* Resume → Job Matching Pipeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-50 via-blue-50 to-indigo-50 rounded-2xl border border-purple-100 p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Brain size={18} className="text-purple-600" />
          <h3 className="text-sm font-semibold text-purple-900">How AI Finds Jobs From Your Resume</h3>
        </div>
        
        {/* Visual Pipeline */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-purple-200 shadow-sm flex-shrink-0">
            <FileText size={14} className="text-purple-600" />
            <span className="text-xs font-medium text-purple-800">Your Resume</span>
          </div>
          <ArrowRight size={14} className="text-purple-400 flex-shrink-0" />
          <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-blue-200 shadow-sm flex-shrink-0">
            <Code size={14} className="text-blue-600" />
            <span className="text-xs font-medium text-blue-800">Extract Skills</span>
          </div>
          <ArrowRight size={14} className="text-blue-400 flex-shrink-0" />
          <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-indigo-200 shadow-sm flex-shrink-0">
            <Target size={14} className="text-indigo-600" />
            <span className="text-xs font-medium text-indigo-800">Match Roles</span>
          </div>
          <ArrowRight size={14} className="text-indigo-400 flex-shrink-0" />
          <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-green-200 shadow-sm flex-shrink-0">
            <Search size={14} className="text-green-600" />
            <span className="text-xs font-medium text-green-800">Scan Boards</span>
          </div>
          <ArrowRight size={14} className="text-green-400 flex-shrink-0" />
          <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-emerald-200 shadow-sm flex-shrink-0">
            <Star size={14} className="text-emerald-600" />
            <span className="text-xs font-medium text-emerald-800">Rank & Present</span>
          </div>
        </div>

        {/* Resume Insights Used */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white/70 rounded-xl p-3 border border-white">
            <p className="text-[10px] uppercase font-semibold text-slate-500 mb-1.5">Skills Found</p>
            <div className="flex flex-wrap gap-1">
              {resumeInsights.skills.slice(0, 4).map((skill, i) => (
                <span key={i} className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-medium">{skill}</span>
              ))}
              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px]">+{resumeInsights.skills.length - 4}</span>
            </div>
          </div>
          <div className="bg-white/70 rounded-xl p-3 border border-white">
            <p className="text-[10px] uppercase font-semibold text-slate-500 mb-1.5">Experience Level</p>
            <p className="text-xs font-medium text-slate-800">{resumeInsights.experienceLevel}</p>
          </div>
          <div className="bg-white/70 rounded-xl p-3 border border-white">
            <p className="text-[10px] uppercase font-semibold text-slate-500 mb-1.5">Target Roles</p>
            <p className="text-xs font-medium text-slate-800">{resumeInsights.targetRoles.join(', ')}</p>
          </div>
          <div className="bg-white/70 rounded-xl p-3 border border-white">
            <p className="text-[10px] uppercase font-semibold text-slate-500 mb-1.5">Preferences</p>
            <p className="text-xs font-medium text-slate-800">{resumeInsights.locations[0]} • {resumeInsights.salaryRange}</p>
          </div>
        </div>
      </motion.div>

      {/* Scanning Animation */}
      <AnimatePresence>
        {scanning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white border border-blue-200 rounded-2xl p-5 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Loader2 size={16} className="text-blue-600 animate-spin" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">AI is scanning job boards using your resume profile...</p>
                <p className="text-xs text-blue-600">Currently checking: <span className="font-semibold">{currentScanSource}</span></p>
              </div>
              <span className="text-sm font-bold text-blue-600">{scanProgress}%</span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-blue-100 rounded-full h-2 mb-4">
              <motion.div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                style={{ width: `${scanProgress}%` }}
              />
            </div>

            {/* Source Status */}
            <div className="flex gap-2 flex-wrap">
              {scanSources.map((source, i) => (
                <div
                  key={source.name}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    currentScanSource === source.name
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : scanProgress > (i + 1) * 16
                      ? 'bg-green-100 text-green-700 border border-green-200'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}
                >
                  {currentScanSource === source.name ? (
                    <Loader2 size={10} className="animate-spin" />
                  ) : scanProgress > (i + 1) * 16 ? (
                    <CheckCircle size={10} />
                  ) : (
                    <Clock size={10} />
                  )}
                  {source.name}
                  {scanProgress > (i + 1) * 16 && (
                    <span className="text-[10px]">({source.jobs} found)</span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('ai-matched')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'ai-matched'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Sparkles size={14} className="text-purple-500" />
          AI Matched ({aiMatchedJobs.length})
        </button>
        <button
          onClick={() => setActiveTab('all-jobs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'all-jobs'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Briefcase size={14} />
          All Jobs ({jobs.length})
        </button>
      </div>

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
        {(activeTab === 'ai-matched' ? aiMatchedJobs : filteredJobs).map((job, i) => (
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
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900 truncate">{job.title}</h3>
                      {activeTab === 'ai-matched' && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px] font-bold">
                          <Sparkles size={8} /> AI PICK
                        </span>
                      )}
                    </div>
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

                {/* Why this job matches */}
                {activeTab === 'ai-matched' && (
                  <div className="mt-3 ml-15 pl-4 border-l-2 border-purple-200">
                    <p className="text-[10px] uppercase font-semibold text-purple-600 mb-1">Why AI matched this</p>
                    <div className="flex flex-wrap gap-1.5">
                      {job.requirements.slice(0, 3).map((req, j) => (
                        <span key={j} className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded text-[10px] font-medium flex items-center gap-1">
                          <CheckCircle size={8} /> {req}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
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
                  {activeTab === 'ai-matched' && (
                    <p className="text-[10px] text-slate-400 mt-1">from resume</p>
                  )}
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
              
              {/* AI Match Reason */}
              <div className="mt-4 p-4 bg-purple-50 rounded-xl border border-purple-100">
                <div className="flex items-center gap-2 mb-2">
                  <Brain size={14} className="text-purple-600" />
                  <span className="text-xs font-semibold text-purple-800">AI Match Analysis</span>
                </div>
                <p className="text-xs text-purple-700">
                  This role matches <span className="font-bold">{selectedJob.matchScore}%</span> of your resume profile. 
                  Your skills in {selectedJob.requirements.slice(0, 2).join(' and ')} align directly with the requirements.
                </p>
              </div>

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
