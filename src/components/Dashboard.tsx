import React from 'react';
import { motion } from 'framer-motion';
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
  ArrowUpRight
} from 'lucide-react';

const stats = [
  { label: 'Applications Sent', value: '47', change: '+12 this week', icon: <Mail size={20} />, color: 'from-blue-500 to-blue-600' },
  { label: 'Interviews Secured', value: '8', change: '+3 this week', icon: <Calendar size={20} />, color: 'from-green-500 to-green-600' },
  { label: 'Jobs Matched', value: '156', change: '24 new today', icon: <Target size={20} />, color: 'from-purple-500 to-purple-600' },
  { label: 'Response Rate', value: '34%', change: '+5% vs avg', icon: <TrendingUp size={20} />, color: 'from-orange-500 to-orange-600' },
];

const recentActivity = [
  { action: 'Application submitted', company: 'Google', role: 'Senior Frontend Engineer', time: '2 min ago', status: 'success' },
  { action: 'Interview scheduled', company: 'Meta', role: 'Full Stack Developer', time: '1 hour ago', status: 'interview' },
  { action: 'Email follow-up sent', company: 'Amazon', role: 'Software Engineer II', time: '3 hours ago', status: 'success' },
  { action: 'Application submitted', company: 'Stripe', role: 'React Developer', time: '5 hours ago', status: 'success' },
  { action: 'Rejected by company', company: 'Startup Inc', role: 'Frontend Dev', time: '1 day ago', status: 'rejected' },
  { action: 'Interview completed', company: 'Netflix', role: 'Frontend Architect', time: '2 days ago', status: 'interview' },
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
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Welcome back, Alex 👋
          </h1>
          <p className="text-slate-500 mt-1">Your AI agent is actively finding and applying to jobs for you.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-green-700 font-medium">Agent Running</span>
        </div>
      </div>

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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm"
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
                  'bg-red-100 text-red-600'
                }`}>
                  {activity.status === 'success' ? <CheckCircle size={16} /> :
                   activity.status === 'interview' ? <Calendar size={16} /> :
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

        {/* AI Agent Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm"
        >
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">AI Agent Status</h2>
            <p className="text-sm text-slate-500">Current tasks and performance</p>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
              <Zap size={18} className="text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">Scanning Jobs</p>
                <p className="text-xs text-blue-600">Checking 6 new openings</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
              <CheckCircle size={18} className="text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-900">Form Filling</p>
                <p className="text-xs text-green-600">3 applications ready</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
              <Mail size={18} className="text-purple-600" />
              <div>
                <p className="text-sm font-medium text-purple-900">Email Drafts</p>
                <p className="text-xs text-purple-600">2 awaiting approval</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
              <Clock size={18} className="text-orange-600" />
              <div>
                <p className="text-sm font-medium text-orange-900">Follow-ups</p>
                <p className="text-xs text-orange-600">5 scheduled for today</p>
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
                  <span className="text-slate-500">Application Quality</span>
                  <span className="font-medium text-slate-700">88%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full" style={{ width: '88%' }} />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Ready to boost your job search?</h3>
            <p className="text-blue-100 text-sm mt-1">Your AI agent can scan 500+ job boards and apply automatically with your approval.</p>
          </div>
          <button className="px-5 py-2.5 bg-white text-blue-600 rounded-xl font-medium text-sm hover:bg-blue-50 transition-colors whitespace-nowrap">
            Start Auto-Apply
          </button>
        </div>
      </motion.div>
    </div>
  );
}
