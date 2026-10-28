import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  Briefcase,
  Mail,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Target,
  Zap,
  ArrowUpRight,
  Brain,
  Search,
  FileText,
  Sparkles,
  ArrowRight,
  Code,
  MapPin,
  DollarSign,
  Star,
  Loader2
} from 'lucide-react';

const stats = [
  { label: 'Applications Sent', value: '47', change: '+12 this week', icon: <Mail size={20} />, color: 'from-blue-500 to-blue-600' },
  { label: 'Interviews Secured', value: '8', change: '+3 this week', icon: <Calendar size={20} />, color: 'from-green-500 to-green-600' },
  { label: 'Jobs Matched', value: '156', change: '24 new today', icon: <Target size={20} />, color: 'from-purple-500 to-purple-600' },
  { label: 'Response Rate', value: '34%', change: '+5% vs avg', icon: <TrendingUp size={20} />, color: 'from-orange-500 to-orange-600' },
];

const resumeAnalysisSteps = [
  { label: 'Extracting technical skills', detail: 'React, TypeScript, Node.js, Python, AWS...', status: 'done' },
  { label: 'Analyzing experience level', detail: 'Senior (5+ years) → Targeting senior roles', status: 'done' },
  { label: 'Identifying target roles', detail: 'Frontend Engineer, Full Stack, UI Architect', status: 'done' },
  { label: 'Scanning job boards', detail: 'Found 156 matching positions across 12 platforms', status: 'done' },
  { label: 'Ranking by match score', detail: '24 high-match (90%+), 48 medium-match (75-89%)', status: 'active' },
];

const autoFoundJobs = [
  { title: 'Senior React Engineer', company: 'Vercel', match: 97, location: 'Remote', salary: '$180K-$240K', isNew: true },
  { title: 'Staff Frontend Engineer', company: 'Figma', match: 94, location: 'San Francisco', salary: '$200K-$280K', isNew: true },
  { title: 'Full Stack Developer', company: 'Linear', match: 91, location: 'Remote', salary: '$160K-$220K', isNew: true },
  { title: 'Senior UI Engineer', company: 'Notion', match: 89, location: 'New York', salary: '$170K-$230K', isNew: false },
  { title: 'Frontend Architect', company: 'Datadog', match: 86, location: 'Remote', salary: '$175K-$245K', isNew: false },
];

const recentActivity = [
  { action: 'Auto-matched from resume', company: 'Vercel', role: 'Senior React Engineer', time: 'Just now', status: 'match' },
  { action: 'Application submitted', company: 'Google', role: 'Senior Frontend Engineer', time: '2 min ago', status: 'success' },
  { action: 'Interview scheduled', company: 'Meta', role: 'Full Stack Developer', time: '1 hour ago', status: 'interview' },
  { action: 'Resume skill detected new match', company: 'Figma', role: 'Staff Frontend Engineer', time: '3 min ago', status: 'match' },
  { action: 'Email follow-up sent', company: 'Amazon', role: 'Software Engineer II', time: '3 hours ago', status: 'success' },
  { action: 'Application submitted', company: 'Stripe', role: 'React Developer', time: '5 hours ago', status: 'success' },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function Dashboard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [showPipeline, setShowPipeline] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep(prev => (prev + 1) % resumeAnalysisSteps.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Welcome back, Alex 👋
          </h1>
          <p className="text-slate-500 mt-1">Your AI agent is analyzing your resume and finding matching jobs automatically.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-green-700 font-medium">Agent Running</span>
        </div>
      </div>

      {/* AI Resume → Job Pipeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
      >
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Brain size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">AI Resume Analysis Pipeline</h2>
              <p className="text-sm text-slate-500">Automatically scanning for jobs based on your resume</p>
            </div>
          </div>
          <button
            onClick={() => setShowPipeline(!showPipeline)}
            className="text-sm text-blue-600 font-medium hover:text-blue-700"
          >
            {showPipeline ? 'Collapse' : 'Expand'}
          </button>
        </div>

        <AnimatePresence>
          {showPipeline && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              {/* Pipeline Steps */}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                  {resumeAnalysisSteps.map((step, i) => (
                    <React.Fragment key={i}>
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl whitespace-nowrap transition-all ${
                        step.status === 'done' ? 'bg-green-50 border border-green-200' :
                        i === currentStep ? 'bg-blue-50 border border-blue-200 animate-pulse' :
                        'bg-slate-50 border border-slate-200'
                      }`}>
                        {step.status === 'done' ? (
                          <CheckCircle size={14} className="text-green-600" />
                        ) : i === currentStep ? (
                          <Loader2 size={14} className="text-blue-600 animate-spin" />
                        ) : (
                          <Clock size={14} className="text-slate-400" />
                        )}
                        <span className={`text-xs font-medium ${
                          step.status === 'done' ? 'text-green-700' :
                          i === currentStep ? 'text-blue-700' : 'text-slate-500'
                        }`}>{step.label}</span>
                      </div>
                      {i < resumeAnalysisSteps.length - 1 && (
                        <ArrowRight size={14} className="text-slate-300 flex-shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* Current Activity */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={16} className="text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">
                      {resumeAnalysisSteps[currentStep].label}
                    </span>
                  </div>
                  <p className="text-xs text-blue-600">{resumeAnalysisSteps[currentStep].detail}</p>
                </div>
              </div>

              {/* Resume Skills Extracted */}
              <div className="px-5 pb-5">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Skills Found */}
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Code size={14} className="text-blue-600" />
                      <span className="text-xs font-semibold text-slate-700 uppercase">Skills Extracted</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {['React', 'TypeScript', 'Node.js', 'Python', 'AWS', 'GraphQL', 'Docker', 'PostgreSQL'].map((skill, i) => (
                        <motion.span
                          key={skill}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.05 }}
                          className="px-2 py-1 bg-white border border-slate-200 rounded-md text-xs text-slate-700 font-medium"
                        >
                          {skill}
                        </motion.span>
                      ))}
                    </div>
                  </div>

                  {/* Target Roles */}
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Target size={14} className="text-purple-600" />
                      <span className="text-xs font-semibold text-slate-700 uppercase">Target Roles</span>
                    </div>
                    <div className="space-y-2">
                      {['Senior Frontend Engineer', 'Full Stack Developer', 'UI Architect', 'React Specialist'].map((role, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                          <span className="text-xs text-slate-700">{role}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Search Sources */}
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Search size={14} className="text-green-600" />
                      <span className="text-xs font-semibold text-slate-700 uppercase">Searching On</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {['LinkedIn', 'Indeed', 'Glassdoor', 'AngelList', 'Remote.co', 'Company Sites'].map((source, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                          <span className="text-xs text-slate-700">{source}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            variants={item}
            className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white`}>
                {stat.icon}
              </div>
              <ArrowUpRight size={16} className="text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
            <p className="text-xs text-green-600 mt-2 font-medium">{stat.change}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Auto-Found Jobs + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Auto-Matched Jobs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm"
        >
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-900">Jobs Found From Your Resume</h2>
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">AI Matched</span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">Based on your skills, experience & preferences</p>
            </div>
          </div>
          <div className="divide-y divide-slate-50">
            {autoFoundJobs.map((job, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="p-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  job.match >= 95 ? 'bg-green-100' :
                  job.match >= 90 ? 'bg-blue-100' : 'bg-yellow-100'
                }`}>
                  <Briefcase size={18} className={
                    job.match >= 95 ? 'text-green-600' :
                    job.match >= 90 ? 'text-blue-600' : 'text-yellow-600'
                  } />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 truncate">{job.title}</p>
                    {job.isNew && (
                      <span className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-[10px] font-bold uppercase">New</span>
                    )}
                  </div>
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
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className={`text-right`}>
                    <p className={`text-sm font-bold ${
                      job.match >= 95 ? 'text-green-600' :
                      job.match >= 90 ? 'text-blue-600' : 'text-yellow-600'
                    }`}>{job.match}%</p>
                    <p className="text-[10px] text-slate-400">match</p>
                  </div>
                  <button className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors">
                    Apply
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="p-4 border-t border-slate-100 text-center">
            <button className="text-sm text-blue-600 font-medium hover:text-blue-700">
              View all 156 matched jobs →
            </button>
          </div>
        </motion.div>

        {/* AI Agent Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm"
        >
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">AI Agent Status</h2>
            <p className="text-sm text-slate-500">Real-time activity</p>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl border border-purple-100">
              <Brain size={18} className="text-purple-600" />
              <div>
                <p className="text-sm font-medium text-purple-900">Resume Analysis</p>
                <p className="text-xs text-purple-600">12 skills, 3 roles identified</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <Search size={18} className="text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">Job Discovery</p>
                <p className="text-xs text-blue-600">Scanning 6 platforms</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
              <CheckCircle size={18} className="text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-900">Form Filling</p>
                <p className="text-xs text-green-600">3 applications ready</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl border border-orange-100">
              <Mail size={18} className="text-orange-600" />
              <div>
                <p className="text-sm font-medium text-orange-900">Email Drafts</p>
                <p className="text-xs text-orange-600">2 awaiting approval</p>
              </div>
            </div>

            {/* Performance */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-sm font-medium text-slate-700 mb-3">Today's Performance</p>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Match Accuracy</span>
                  <span className="font-medium text-slate-700">92%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full" style={{ width: '92%' }} />
                </div>
                <div className="flex justify-between text-xs mt-2">
                  <span className="text-slate-500">Resume-Job Fit</span>
                  <span className="font-medium text-slate-700">89%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full" style={{ width: '89%' }} />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-2xl border border-slate-100 shadow-sm"
      >
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
          <p className="text-sm text-slate-500">Latest actions by your AI agent</p>
        </div>
        <div className="divide-y divide-slate-50">
          {recentActivity.map((activity, i) => (
            <div key={i} className="p-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                activity.status === 'success' ? 'bg-green-100 text-green-600' :
                activity.status === 'interview' ? 'bg-blue-100 text-blue-600' :
                activity.status === 'match' ? 'bg-purple-100 text-purple-600' :
                'bg-red-100 text-red-600'
              }`}>
                {activity.status === 'success' ? <CheckCircle size={16} /> :
                 activity.status === 'interview' ? <Calendar size={16} /> :
                 activity.status === 'match' ? <Sparkles size={16} /> :
                 <XCircle size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">{activity.action}</p>
                <p className="text-xs text-slate-500">{activity.company} • {activity.role}</p>
              </div>
              <span className="text-xs text-slate-400 whitespace-nowrap">{activity.time}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
