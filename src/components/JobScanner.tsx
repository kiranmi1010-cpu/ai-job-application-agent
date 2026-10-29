import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MapPin,
  DollarSign,
  Clock,
  ExternalLink,
  Star,
  CheckCircle,
  XCircle,
  Loader2,
  Briefcase,
  Brain,
  Sparkles,
  ArrowRight,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { dbHelpers } from '../db';
import { Job } from '../types';
import { searchJobsWithQuery } from '../services/jobSearch';

export default function JobScanner() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [activeTab, setActiveTab] = useState<'ai-matched' | 'all-jobs'>('ai-matched');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setError(null);
      const dbJobs = await dbHelpers.getJobs();
      setJobs(dbJobs as any);
    } catch (error) {
      console.error('Error loading jobs:', error);
      setError('Failed to load jobs from database');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a search query');
      return;
    }

    setSearching(true);
    setError(null);

    try {
      // Fetch real jobs from JSearch API
      const apiJobs = await searchJobsWithQuery(searchQuery, {
        numPages: 1,
      });

      if (apiJobs.length === 0) {
        setError('No jobs found for your search query. Try different keywords.');
        setSearching(false);
        return;
      }

      // Save jobs to database
      await dbHelpers.clearJobs();
      await dbHelpers.saveJobs(apiJobs.map(job => ({
        ...job,
        status: 'pending' as const,
        foundAt: new Date()
      })));

      // Reload jobs from database
      await loadJobs();
      setSearching(false);
    } catch (error) {
      console.error('Error searching jobs:', error);
      setError('Failed to search jobs. Please check your API configuration and try again.');
      setSearching(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      await loadJobs();
    } catch (error) {
      setError('Failed to refresh jobs');
    } finally {
      setTimeout(() => setRefreshing(false), 1000);
    }
  };

  const handleApprove = async (jobId: number) => {
    try {
      await dbHelpers.updateJobStatus(jobId, 'approved');
      await loadJobs();
    } catch (error) {
      console.error('Error approving job:', error);
    }
  };

  const handleReject = async (jobId: number) => {
    try {
      await dbHelpers.updateJobStatus(jobId, 'rejected');
      await loadJobs();
    } catch (error) {
      console.error('Error rejecting job:', error);
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || job.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const aiMatchedJobs = [...jobs].sort((a, b) => b.matchScore - a.matchScore);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 size={24} className="text-blue-600 animate-spin" />
          </div>
          <p className="text-sm text-slate-600">Loading jobs...</p>
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Job Scanner</h1>
          <p className="text-slate-500 mt-1">AI automatically finds jobs matching your resume profile</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Briefcase size={28} className="text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">No Jobs Found Yet</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            Upload your resume first, and the AI will automatically search for matching job openings.
          </p>
          <button
            onClick={() => window.location.hash = '#resume'}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity"
          >
            Upload Resume
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Job Scanner</h1>
          <p className="text-slate-500 mt-1">AI automatically finds jobs matching your resume profile</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {refreshing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw size={16} />
              Refresh Jobs
            </>
          )}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-2xl font-bold text-slate-900">{jobs.length}</p>
          <p className="text-xs text-slate-500 mt-1">Total Jobs</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-2xl font-bold text-green-600">{jobs.filter(j => j.matchScore >= 90).length}</p>
          <p className="text-xs text-slate-500 mt-1">High Match (90%+)</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-2xl font-bold text-blue-600">{jobs.filter(j => j.status === 'approved').length}</p>
          <p className="text-xs text-slate-500 mt-1">Approved</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-2xl font-bold text-yellow-600">{jobs.filter(j => j.status === 'pending').length}</p>
          <p className="text-xs text-slate-500 mt-1">Pending Review</p>
        </div>
      </div>

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

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3"
        >
          <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-700">
            <XCircle size={16} />
          </button>
        </motion.div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search jobs (e.g., 'React Developer', 'Data Scientist')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            disabled={searching}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={searching || !searchQuery.trim()}
          className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {searching ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search size={16} />
              Search Jobs
            </>
          )}
        </button>
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
                      {activeTab === 'ai-matched' && job.matchScore >= 90 && (
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
                      onClick={() => handleApprove(Number(job.id))}
                      className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                      title="Approve & Apply"
                    >
                      <CheckCircle size={18} />
                    </button>
                    <button
                      onClick={() => handleReject(Number(job.id))}
                      className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                      title="Reject"
                    >
                      <XCircle size={18} />
                    </button>
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                      title="View Job"
                    >
                      <ExternalLink size={18} />
                    </a>
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

            {/* Gemini Match Reasons */}
            {job.matchReasons && job.matchReasons.length > 0 && (
              <div className="mt-3 ml-15 pl-4 border-l-2 border-purple-200">
                <p className="text-[10px] uppercase font-semibold text-purple-600 mb-1 flex items-center gap-1">
                  <Sparkles size={8} /> Gemini AI Analysis
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {job.matchReasons.slice(0, 3).map((reason, j) => (
                    <span key={j} className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[10px] font-medium">
                      {reason}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Requirements */}
            {job.requirements && job.requirements.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {job.requirements.slice(0, 5).map((req, j) => (
                  <span key={j} className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs">
                    {req}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
