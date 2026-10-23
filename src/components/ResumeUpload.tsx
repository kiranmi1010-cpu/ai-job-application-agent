import React, { useState, useEffect } from 'react';
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
  Zap,
  Star,
  MapPin,
  DollarSign
} from 'lucide-react';

interface ResumeData {
  name: string;
  email: string;
  phone: string;
  skills: string[];
  experience: { title: string; company: string; duration: string; description: string }[];
  education: { degree: string; institution: string; year: string }[];
}

const autoSearchResults = [
  { title: 'Senior React Engineer', company: 'Vercel', match: 97, location: 'Remote', salary: '$180K-$240K' },
  { title: 'Staff Frontend Engineer', company: 'Figma', match: 94, location: 'San Francisco', salary: '$200K-$280K' },
  { title: 'Full Stack Developer', company: 'Linear', match: 91, location: 'Remote', salary: '$160K-$220K' },
  { title: 'Senior UI Engineer', company: 'Notion', match: 89, location: 'New York', salary: '$170K-$230K' },
];

export default function ResumeUpload() {
  const [uploaded, setUploaded] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(false);
  const [autoSearching, setAutoSearching] = useState(false);
  const [searchComplete, setSearchComplete] = useState(false);
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [searchProgress, setSearchProgress] = useState(0);

  const handleUpload = () => {
    setUploaded(true);
    setParsing(true);
    setTimeout(() => {
      setParsing(false);
      setParsed(true);
      setResumeData({
        name: 'Alex Johnson',
        email: 'alex.johnson@email.com',
        phone: '+1 (555) 123-4567',
        skills: ['React', 'TypeScript', 'Node.js', 'Python', 'AWS', 'GraphQL', 'Docker', 'PostgreSQL', 'Git', 'CI/CD', 'REST APIs', 'System Design'],
        experience: [
          { title: 'Senior Frontend Engineer', company: 'TechCorp Inc.', duration: '2021 - Present', description: 'Led frontend architecture for a SaaS platform serving 2M+ users. Built design system used across 15 products.' },
          { title: 'Full Stack Developer', company: 'StartupXYZ', duration: '2019 - 2021', description: 'Developed and maintained multiple client-facing applications using React and Node.js. Improved performance by 40%.' },
          { title: 'Junior Developer', company: 'WebAgency', duration: '2017 - 2019', description: 'Built responsive web applications for various clients. Collaborated with design team to implement pixel-perfect UIs.' }
        ],
        education: [
          { degree: 'B.S. Computer Science', institution: 'University of California', year: '2017' },
        ]
      });
      // Start auto-search after parsing
      setTimeout(() => {
        setAutoSearching(true);
      }, 1000);
    }, 2500);
  };

  useEffect(() => {
    if (autoSearching) {
      const interval = setInterval(() => {
        setSearchProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setAutoSearching(false);
            setSearchComplete(true);
            return 100;
          }
          return prev + 3;
        });
      }, 80);
      return () => clearInterval(interval);
    }
  }, [autoSearching]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">My Resume</h1>
        <p className="text-slate-500 mt-1">Upload your resume — AI will automatically analyze it and find matching jobs</p>
      </div>

      {/* Upload Area */}
      {!uploaded && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center hover:border-blue-400 transition-colors"
        >
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Upload size={28} className="text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Upload Your Resume</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            Drop your resume here or click to browse. Our AI will parse your skills, experience, and automatically search for matching job openings across all major platforms.
          </p>
          <button
            onClick={handleUpload}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity"
          >
            Choose File
          </button>
          <p className="text-xs text-slate-400 mt-4">Max file size: 10MB • PDF, DOC, DOCX</p>

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
            <div>
              <p className="text-sm font-medium text-green-900">Resume parsed successfully!</p>
              <p className="text-xs text-green-600">AI has extracted your profile and is now searching for matching jobs.</p>
            </div>
            <button className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200">
              <RefreshCw size={12} />
              Re-parse
            </button>
          </div>

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
                    <p className="text-xs text-purple-600">Using your resume skills to find the best matches across all platforms</p>
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
                    { label: 'Scanning LinkedIn', done: searchProgress > 55 },
                    { label: 'Scanning Indeed', done: searchProgress > 65 },
                    { label: 'Scanning Glassdoor', done: searchProgress > 75 },
                    { label: 'Ranking matches', done: searchProgress > 90 },
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

          {/* Search Complete - Auto Found Jobs */}
          <AnimatePresence>
            {searchComplete && (
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
                      <p className="text-sm text-slate-500">AI automatically matched 156 positions based on your profile</p>
                    </div>
                  </div>
                  <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                    156 matches
                  </span>
                </div>
                <div className="divide-y divide-slate-50">
                  {autoSearchResults.map((job, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        job.match >= 95 ? 'bg-green-100' : 'bg-blue-100'
                      }`}>
                        <Briefcase size={18} className={job.match >= 95 ? 'text-green-600' : 'text-blue-600'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{job.title}</p>
                        <p className="text-xs text-slate-500">{job.company}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <MapPin size={10} /> {job.location}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <DollarSign size={10} /> {job.salary}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className={`text-sm font-bold ${job.match >= 95 ? 'text-green-600' : 'text-blue-600'}`}>
                            {job.match}%
                          </p>
                          <p className="text-[10px] text-slate-400">match</p>
                        </div>
                        <button className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
                          Apply
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="p-4 border-t border-slate-100 text-center bg-slate-50">
                  <button className="text-sm text-blue-600 font-medium hover:text-blue-700">
                    View all 156 matched jobs in Job Scanner →
                  </button>
                </div>
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

            {/* Education */}
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
          </div>

          {/* AI Matching Insights */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={18} className="text-blue-600" />
              <h3 className="text-sm font-semibold text-blue-900">AI Matching Insights</h3>
            </div>
            <p className="text-xs text-blue-700 mb-4">Based on your resume, the AI agent identified these opportunities:</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-4">
                <p className="text-2xl font-bold text-blue-600">156</p>
                <p className="text-xs text-slate-500 mt-1">Jobs matching your profile</p>
              </div>
              <div className="bg-white rounded-xl p-4">
                <p className="text-2xl font-bold text-green-600">24</p>
                <p className="text-xs text-slate-500 mt-1">High match (90%+)</p>
              </div>
              <div className="bg-white rounded-xl p-4">
                <p className="text-2xl font-bold text-purple-600">$185K</p>
                <p className="text-xs text-slate-500 mt-1">Avg. salary for matches</p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-white/70 rounded-xl">
              <p className="text-xs text-slate-600">
                <span className="font-semibold">AI Recommendation:</span> Your strongest matches are Senior Frontend and Full Stack roles at tech companies. 
                The agent will prioritize these and auto-apply with your approval.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
