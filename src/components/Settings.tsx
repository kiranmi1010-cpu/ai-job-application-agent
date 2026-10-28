import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Mail,
  Shield,
  Bell,
  Globe,
  CheckCircle,
  XCircle,
  Link,
  Unlink,
  Smartphone,
  Zap,
  Settings as SettingsIcon,
  User,
  Target,
  Clock,
  Brain,
  TrendingUp
} from 'lucide-react';

export default function Settings() {
  const [gmailConnected, setGmailConnected] = useState(true);
  const [googleConnected, setGoogleConnected] = useState(true);
  const [autoApply, setAutoApply] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [maxDailyApplications, setMaxDailyApplications] = useState(20);
  const [minMatchScore, setMinMatchScore] = useState(75);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Configure your AI agent and connected accounts</p>
      </div>

      {/* Connected Accounts */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Connected Accounts</h2>
          <p className="text-sm text-slate-500">Manage your Google and email integrations</p>
        </div>
        <div className="p-5 space-y-4">
          {/* Gmail */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <Mail size={20} className="text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Gmail</p>
                <p className="text-xs text-slate-500">alex.johnson@gmail.com</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                <CheckCircle size={12} /> Connected
              </span>
              <button
                onClick={() => setGmailConnected(!gmailConnected)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                  gmailConnected
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                }`}
              >
                {gmailConnected ? 'Disconnect' : 'Connect'}
              </button>
            </div>
          </div>

          {/* Google Account */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Globe size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Google Account (SSO)</p>
                <p className="text-xs text-slate-500">Sign in to job sites with Google</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                <CheckCircle size={12} /> Connected
              </span>
              <button
                onClick={() => setGoogleConnected(!googleConnected)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                  googleConnected
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                }`}
              >
                {googleConnected ? 'Disconnect' : 'Connect'}
              </button>
            </div>
          </div>

          {/* Google Services */}
          {googleConnected && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="ml-4 pl-4 border-l-2 border-slate-200 space-y-3"
            >
              <p className="text-xs font-medium text-slate-500 uppercase">Authorized Services</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                  <Mail size={14} className="text-green-600" />
                  <span className="text-xs text-green-700 font-medium">Gmail ✓</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                  <Globe size={14} className="text-green-600" />
                  <span className="text-xs text-green-700 font-medium">Google Sign-In ✓</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                  <Shield size={14} className="text-green-600" />
                  <span className="text-xs text-green-700 font-medium">OAuth 2.0 ✓</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* AI Agent Configuration */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">AI Agent Configuration</h2>
          <p className="text-sm text-slate-500">Control how the AI agent applies to jobs on your behalf</p>
        </div>
        <div className="p-5 space-y-5">
          {/* Auto Apply Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Zap size={18} className="text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Auto-Apply Mode</p>
                <p className="text-xs text-slate-500">Automatically apply to high-match jobs (still requires approval)</p>
              </div>
            </div>
            <button
              onClick={() => setAutoApply(!autoApply)}
              className={`w-12 h-6 rounded-full transition-colors ${autoApply ? 'bg-blue-600' : 'bg-slate-200'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${autoApply ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Max Daily Applications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Target size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Max Daily Applications</p>
                <p className="text-xs text-slate-500">Maximum applications per day</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMaxDailyApplications(Math.max(5, maxDailyApplications - 5))}
                className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-200"
              >
                -
              </button>
              <span className="w-10 text-center text-sm font-medium text-slate-900">{maxDailyApplications}</span>
              <button
                onClick={() => setMaxDailyApplications(Math.min(50, maxDailyApplications + 5))}
                className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-200"
              >
                +
              </button>
            </div>
          </div>

          {/* Min Match Score */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <Shield size={18} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Minimum Match Score</p>
                <p className="text-xs text-slate-500">Only apply to jobs with this match % or higher</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMinMatchScore(Math.max(50, minMatchScore - 5))}
                className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-200"
              >
                -
              </button>
              <span className="w-10 text-center text-sm font-medium text-slate-900">{minMatchScore}%</span>
              <button
                onClick={() => setMinMatchScore(Math.min(100, minMatchScore + 5))}
                className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-200"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
          <p className="text-sm text-slate-500">Choose how you want to be notified</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <Smartphone size={18} className="text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Push Notifications</p>
                <p className="text-xs text-slate-500">Get notified on your phone for approvals</p>
              </div>
            </div>
            <button
              onClick={() => setPushNotifications(!pushNotifications)}
              className={`w-12 h-6 rounded-full transition-colors ${pushNotifications ? 'bg-blue-600' : 'bg-slate-200'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${pushNotifications ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Mail size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Email Digest</p>
                <p className="text-xs text-slate-500">Daily summary of applications and responses</p>
              </div>
            </div>
            <button
              onClick={() => setEmailNotifications(!emailNotifications)}
              className={`w-12 h-6 rounded-full transition-colors ${emailNotifications ? 'bg-blue-600' : 'bg-slate-200'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${emailNotifications ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Resume-Based Auto Search */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Resume-Based Auto Search</h2>
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">AI Powered</span>
          </div>
          <p className="text-sm text-slate-500">Configure how the AI uses your resume to automatically find and apply to jobs</p>
        </div>
        <div className="p-5 space-y-5">
          <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl border border-purple-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Brain size={18} className="text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-purple-900">Auto-Search from Resume</p>
                <p className="text-xs text-purple-600">AI continuously scans for jobs matching your resume skills</p>
              </div>
            </div>
            <button className="w-12 h-6 bg-blue-600 rounded-full transition-colors">
              <div className="w-5 h-5 bg-white rounded-full shadow-sm translate-x-6" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Zap size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Search Frequency</p>
                <p className="text-xs text-slate-500">How often AI rescans job boards with your profile</p>
              </div>
            </div>
            <select className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700">
              <option>Every 2 hours</option>
              <option>Every 6 hours</option>
              <option>Every 12 hours</option>
              <option>Once daily</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <Target size={18} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Skill-Based Matching</p>
                <p className="text-xs text-slate-500">Use extracted skills to find roles requiring those technologies</p>
              </div>
            </div>
            <button className="w-12 h-6 bg-blue-600 rounded-full transition-colors">
              <div className="w-5 h-5 bg-white rounded-full shadow-sm translate-x-6" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <TrendingUp size={18} className="text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Experience Level Matching</p>
                <p className="text-xs text-slate-500">Match job seniority to your years of experience</p>
              </div>
            </div>
            <button className="w-12 h-6 bg-blue-600 rounded-full transition-colors">
              <div className="w-5 h-5 bg-white rounded-full shadow-sm translate-x-6" />
            </button>
          </div>

          {/* Resume Summary */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Current Resume Profile Used for Search</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <p className="text-lg font-bold text-slate-900">12</p>
                <p className="text-xs text-slate-500">Skills</p>
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">Senior</p>
                <p className="text-xs text-slate-500">Level</p>
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">5+</p>
                <p className="text-xs text-slate-500">Years Exp</p>
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">4</p>
                <p className="text-xs text-slate-500">Target Roles</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Job Preferences */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Job Preferences</h2>
          <p className="text-sm text-slate-500">Additional filters for AI job search (combined with resume analysis)</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase mb-1 block">Desired Roles</label>
              <input
                type="text"
                defaultValue="Frontend Engineer, Full Stack Developer"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase mb-1 block">Location Preference</label>
              <input
                type="text"
                defaultValue="Remote, San Francisco, New York"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase mb-1 block">Salary Range</label>
              <input
                type="text"
                defaultValue="$150,000 - $250,000"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase mb-1 block">Job Types</label>
              <input
                type="text"
                defaultValue="Full-time, Contract"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase mb-1 block">Companies to Skip</label>
            <input
              type="text"
              defaultValue=""
              placeholder="Enter company names to exclude (comma separated)"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity">
          Save Settings
        </button>
      </div>
    </div>
  );
}
