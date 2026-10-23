import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Upload,
  FileText,
  CheckCircle,
  X,
  Sparkles,
  Briefcase,
  GraduationCap,
  Code,
  Loader2,
  RefreshCw
} from 'lucide-react';

interface ResumeData {
  name: string;
  email: string;
  phone: string;
  skills: string[];
  experience: { title: string; company: string; duration: string; description: string }[];
  education: { degree: string; institution: string; year: string }[];
}

export default function ResumeUpload() {
  const [uploaded, setUploaded] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(false);
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);

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
    }, 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">My Resume</h1>
        <p className="text-slate-500 mt-1">Upload your resume for AI-powered job matching and applications</p>
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
            Drop your resume here or click to browse. We support PDF, DOC, and DOCX formats.
            Your resume will be parsed and used to match you with relevant job openings.
          </p>
          <button
            onClick={handleUpload}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity"
          >
            Choose File
          </button>
          <p className="text-xs text-slate-400 mt-4">Max file size: 10MB • PDF, DOC, DOCX</p>
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

      {/* Parsed Resume */}
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
              <p className="text-xs text-green-600">AI has extracted your profile. Ready for job matching.</p>
            </div>
            <button className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200">
              <RefreshCw size={12} />
              Re-parse
            </button>
          </div>

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
                <h3 className="text-sm font-semibold text-slate-700">Skills</h3>
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
          </div>
        </motion.div>
      )}
    </div>
  );
}
