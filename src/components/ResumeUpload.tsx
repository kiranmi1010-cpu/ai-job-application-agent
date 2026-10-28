import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileText,
  CheckCircle,
  Sparkles,
  Briefcase,
  GraduationCap,
  Code,
  Loader2,
  RefreshCw,
  Brain,
  Search,
  ArrowRight,
  Target,
  Star,
  MapPin,
  DollarSign,
  X,
  AlertCircle
} from 'lucide-react';
import { parseResumeFile, parseResumeText, ParsedResume } from '../services/resumeParser';
import { searchJobs, JobListing } from '../services/jobSearch';
import { dbHelpers } from '../db';

export default function ResumeUpload() {
  const [uploaded, setUploaded] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(false);
  const [autoSearching, setAutoSearching] = useState(false);
  const [searchComplete, setSearchComplete] = useState(false);
  const [resumeData, setResumeData] = useState<ParsedResume | null>(null);
  const [searchProgress, setSearchProgress] = useState(0);
  const [foundJobs, setFoundJobs] = useState<JobListing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [geminiUsed, setGeminiUsed] = useState(false);
  const [geminiAvailable, setGeminiAvailable] = useState<boolean | null>(null);

  // Load existing resume on mount
  useEffect(() => {
    loadExistingResume();
    checkGemini();
  }, []);

  const checkGemini = async () => {
    try {
      const response = await fetch('/api/gemini', { method: 'OPTIONS' });
      setGeminiAvailable(response.ok);
    } catch {
      setGeminiAvailable(false);
    }
  };

  const loadExistingResume = async () => {
    try {
      const existingResume = await dbHelpers.getResume();
      if (existingResume) {
        setResumeData({
          rawText: existingResume.rawText,
          ...existingResume.parsedData
        });
        setUploaded(true);
        setParsed(true);
        
        // Load existing jobs
        const jobs = await dbHelpers.getJobsByMatchScore(10);
        if (jobs.length > 0) {
          setFoundJobs(jobs as any);
          setSearchComplete(true);
        }
      }
    } catch (error) {
      console.error('Error loading resume:', error);
    }
  };

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setError(null);
    setUploaded(true);
    setParsing(true);

    try {
      // Validate file size
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size exceeds 10MB limit. Please upload a smaller file.');
      }

      // Validate file type
      const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain'
      ];
      
      if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|docx|doc|txt)$/i)) {
        throw new Error('Invalid file type. Please upload a PDF, DOCX, or TXT file.');
      }

      // Parse the resume (all processing happens in browser)
      const parsed = await parseResumeFile(file);
      setResumeData(parsed);
      setParsed(true);
      
      // Check if Gemini was used (Gemini adds a summary field)
      setGeminiUsed(!!(parsed as any).summary || (parsed.skills?.length > 15));

      // Save to IndexedDB (browser storage, not file system)
      await dbHelpers.saveResume({
        fileName: file.name,
        rawText: parsed.rawText,
        parsedData: {
          name: parsed.name,
          email: parsed.email,
          phone: parsed.phone,
          skills: parsed.skills,
          experience: parsed.experience,
          education: parsed.education
        },
        uploadedAt: new Date()
      });

      // Start auto-search after parsing
      setTimeout(() => {
        startAutoSearch(parsed);
      }, 1000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse resume';
      setError(errorMessage);
      setUploaded(false);
      setParsing(false);
      console.error('Resume upload error:', err);
    }
  };

  const startAutoSearch = async (resume: ParsedResume) => {
    setAutoSearching(true);
    setSearchProgress(0);

    try {
      // Simulate progress while searching
      const progressInterval = setInterval(() => {
        setSearchProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 5;
        });
      }, 200);

      // Search for jobs
      const jobs = await searchJobs(resume, false); // Set to true if you have API key
      
      clearInterval(progressInterval);
      setSearchProgress(100);

      // Save jobs to database
      await dbHelpers.clearJobs();
      await dbHelpers.saveJobs(jobs.map(job => ({
        ...job,
        status: 'pending' as const,
        foundAt: new Date()
      })));

      setFoundJobs(jobs);
      setAutoSearching(false);
      setSearchComplete(true);
    } catch (error) {
      console.error('Error searching jobs:', error);
      setAutoSearching(false);
      setError('Failed to search for jobs. Please try again.');
    }
  };

  const handleReparse = async () => {
    if (!resumeData) return;
    
    setParsed(false);
    setParsing(true);
    
    try {
      const parsed = parseResumeText(resumeData.rawText);
      setResumeData({ ...resumeData, ...parsed });
      setParsed(true);
      
      // Update in database
      const existingResume = await dbHelpers.getResume();
      if (existingResume?.id) {
        await dbHelpers.saveResume({
          fileName: 'Updated Resume',
          rawText: resumeData.rawText,
          parsedData: {
            name: parsed.name,
            email: parsed.email,
            phone: parsed.phone,
            skills: parsed.skills,
            experience: parsed.experience,
            education: parsed.education
          },
          uploadedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error reparsing:', error);
    }
  };

  const handleDeleteResume = async () => {
    if (!confirm('Are you sure you want to delete your resume? This will also remove all matched jobs.')) {
      return;
    }
    
    try {
      const existingResume = await dbHelpers.getResume();
      if (existingResume?.id) {
        await dbHelpers.deleteResume(existingResume.id);
      }
      await dbHelpers.clearJobs();
      
      setUploaded(false);
      setParsed(false);
      setResumeData(null);
      setFoundJobs([]);
      setSearchComplete(false);
    } catch (error) {
      console.error('Error deleting resume:', error);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">My Resume</h1>
          <p className="text-slate-500 mt-1">Upload your resume — AI will automatically analyze it and find matching jobs</p>
        </div>
        {parsed && (
          <button
            onClick={handleDeleteResume}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100"
          >
            <X size={16} />
            Delete Resume
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3"
        >
          <AlertCircle size={20} className="text-red-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-700">
            <X size={16} />
          </button>
        </motion.div>
      )}

      {/* Upload Area */}
      {!uploaded && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div
            {...getRootProps()}
            className={`bg-white rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-400'
            }`}
          >
          <input {...getInputProps()} />
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Upload size={28} className="text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">
            {isDragActive ? 'Drop your resume here...' : 'Upload Your Resume'}
          </h3>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            Drop your resume here or click to browse. Our AI will parse your skills, experience, and automatically search for matching job openings.
          </p>
          <button className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity">
            Choose File
          </button>
          <p className="text-xs text-slate-400 mt-4">Max file size: 10MB • PDF, DOC, DOCX, TXT</p>

          {/* How it works */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-4">How it works</p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
                <FileText size={14} className="text-blue-600" />
                <span className="text-xs font-medium text-blue-800">Upload Resume</span>
              </div>
              <ArrowRight size={14} className="text-slate-300" />
              <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-lg">
                <Brain size={14} className="text-purple-600" />
                <span className="text-xs font-medium text-purple-800">AI Parses</span>
              </div>
              <ArrowRight size={14} className="text-slate-300" />
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg">
                <Search size={14} className="text-green-600" />
                <span className="text-xs font-medium text-green-800">Auto-Search Jobs</span>
              </div>
              <ArrowRight size={14} className="text-slate-300" />
              <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-lg">
                <Target size={14} className="text-orange-600" />
                <span className="text-xs font-medium text-orange-800">Match & Apply</span>
              </div>
            </div>
          </div>
          </div>
        </motion.div>
      )}

      {/* Parsing State */}
      {parsing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-blue-200 p-8 text-center"
        >
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 size={28} className="text-blue-600 animate-spin" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">AI is parsing your resume...</h3>
          <p className="text-sm text-slate-500 mt-2">Extracting skills, experience, and education</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </motion.div>
      )}

      {/* Parsed Resume + Auto Search */}
      {parsed && resumeData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Success Banner */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle size={20} className="text-green-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900">Resume parsed successfully!</p>
              <p className="text-xs text-green-600">
                {searchComplete 
                  ? `Found ${foundJobs.length} matching jobs based on your profile.`
                  : 'AI is now searching for matching jobs.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {geminiUsed && (
                <span className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium">
                  <Sparkles size={10} />
                  Gemini AI
                </span>
              )}
              <button 
                onClick={handleReparse}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200"
              >
                <RefreshCw size={12} />
                Re-parse
              </button>
            </div>
          </div>

          {/* Gemini Status */}
          {geminiAvailable !== null && (
            <div className={`rounded-xl p-3 flex items-center gap-2 ${
              geminiAvailable 
                ? 'bg-purple-50 border border-purple-200' 
                : 'bg-amber-50 border border-amber-200'
            }`}>
              {geminiAvailable ? (
                <>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                  <p className="text-xs text-purple-700">
                    <span className="font-semibold">Google Gemini AI</span> is active — powering resume parsing, job matching, and email generation.
                  </p>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-amber-500 rounded-full" />
                  <p className="text-xs text-amber-700">
                    <span className="font-semibold">Gemini API not connected.</span> Using local parsing. Deploy to Vercel with GEMINI_API_KEY to enable AI features.
                  </p>
                </>
              )}
            </div>
          )}

          {/* Auto Search Progress */}
          <AnimatePresence>
            {autoSearching && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-2xl p-5"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Brain size={20} className="text-purple-600 animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-purple-900">AI is automatically searching for jobs...</p>
                    <p className="text-xs text-purple-600">Using your resume skills to find the best matches</p>
                  </div>
                  <span className="text-sm font-bold text-purple-600">{searchProgress}%</span>
                </div>
                <div className="w-full bg-purple-100 rounded-full h-2.5 mb-3">
                  <motion.div
                    className="bg-gradient-to-r from-purple-500 to-blue-500 h-2.5 rounded-full"
                    style={{ width: `${searchProgress}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { label: 'Extracting skills', done: searchProgress > 20 },
                    { label: 'Identifying roles', done: searchProgress > 40 },
                    { label: 'Scanning job boards', done: searchProgress > 60 },
                    { label: 'Matching positions', done: searchProgress > 75 },
                    { label: 'Calculating scores', done: searchProgress > 85 },
                    { label: 'Ranking results', done: searchProgress > 95 },
                  ].map((step, i) => (
                    <div key={i} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs ${
                      step.done ? 'bg-green-100 text-green-700' : 'bg-white/50 text-slate-500'
                    }`}>
                      {step.done ? <CheckCircle size={10} /> : <Loader2 size={10} className="animate-spin" />}
                      {step.label}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search Complete - Found Jobs */}
          <AnimatePresence>
            {searchComplete && foundJobs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
              >
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                      <Sparkles size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Jobs Found From Your Resume</h3>
                      <p className="text-sm text-slate-500">AI automatically matched {foundJobs.length} positions</p>
                    </div>
                  </div>
                  <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                    {foundJobs.length} matches
                  </span>
                </div>
                <div className="divide-y divide-slate-50 max-h-96 overflow-y-auto">
                  {foundJobs.slice(0, 10).map((job, i) => (
                    <motion.div
                      key={job.externalId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="p-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        job.matchScore >= 90 ? 'bg-green-100' : 'bg-blue-100'
                      }`}>
                        <Briefcase size={18} className={job.matchScore >= 90 ? 'text-green-600' : 'text-blue-600'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{job.title}</p>
                        <p className="text-xs text-slate-500 truncate">{job.company}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <MapPin size={10} /> {job.location}
                          </span>
                          {job.salary && (
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <DollarSign size={10} /> {job.salary}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className={`text-sm font-bold ${job.matchScore >= 90 ? 'text-green-600' : 'text-blue-600'}`}>
                            {job.matchScore}%
                          </p>
                          <p className="text-[10px] text-slate-400">match</p>
                        </div>
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700"
                        >
                          View
                        </a>
                      </div>
                    </motion.div>
                  ))}
                </div>
                {foundJobs.length > 10 && (
                  <div className="p-4 border-t border-slate-100 text-center bg-slate-50">
                    <p className="text-sm text-blue-600 font-medium">
                      + {foundJobs.length - 10} more jobs in Job Scanner
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Profile Card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold">
                {resumeData.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{resumeData.name}</h2>
                <p className="text-sm text-slate-500">{resumeData.email} • {resumeData.phone}</p>
              </div>
            </div>

            {/* Skills */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Code size={16} className="text-blue-600" />
                <h3 className="text-sm font-semibold text-slate-700">Skills Extracted by AI</h3>
                <Sparkles size={14} className="text-yellow-500" />
              </div>
              <div className="flex flex-wrap gap-2">
                {resumeData.skills.map((skill, i) => (
                  <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Experience */}
            {resumeData.experience.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase size={16} className="text-green-600" />
                  <h3 className="text-sm font-semibold text-slate-700">Experience</h3>
                </div>
                <div className="space-y-4">
                  {resumeData.experience.map((exp, i) => (
                    <div key={i} className="pl-4 border-l-2 border-slate-200">
                      <h4 className="font-medium text-slate-900">{exp.title}</h4>
                      <p className="text-sm text-slate-500">{exp.company} • {exp.duration}</p>
                      <p className="text-sm text-slate-600 mt-1">{exp.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {resumeData.education.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <GraduationCap size={16} className="text-purple-600" />
                  <h3 className="text-sm font-semibold text-slate-700">Education</h3>
                </div>
                <div className="space-y-2">
                  {resumeData.education.map((edu, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                        <GraduationCap size={14} className="text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{edu.degree}</p>
                        <p className="text-xs text-slate-500">{edu.institution} • {edu.year}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Matching Insights */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={18} className="text-blue-600" />
              <h3 className="text-sm font-semibold text-blue-900">AI Matching Insights</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-4">
                <p className="text-2xl font-bold text-blue-600">{foundJobs.length}</p>
                <p className="text-xs text-slate-500 mt-1">Jobs matching your profile</p>
              </div>
              <div className="bg-white rounded-xl p-4">
                <p className="text-2xl font-bold text-green-600">
                  {foundJobs.filter(j => j.matchScore >= 90).length}
                </p>
                <p className="text-xs text-slate-500 mt-1">High match (90%+)</p>
              </div>
              <div className="bg-white rounded-xl p-4">
                <p className="text-2xl font-bold text-purple-600">{resumeData.skills.length}</p>
                <p className="text-xs text-slate-500 mt-1">Skills identified</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}


