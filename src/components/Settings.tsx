import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Shield,
  Bell,
  Globe,
  CheckCircle,
  Smartphone,
  Zap,
  Target,
  Clock,
  Brain,
  TrendingUp,
  Save,
  AlertCircle
} from 'lucide-react';
import { dbHelpers } from '../db';

export default function Settings() {
  const [gmailConnected, setGmailConnected] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [autoApply, setAutoApply] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [maxDailyApplications, setMaxDailyApplications] = useState(20);
  const [minMatchScore, setMinMatchScore] = useState(75);
  const [desiredRoles, setDesiredRoles] = useState('');
  const [locationPreference, setLocationPreference] = useState('');
  const [salaryRange, setSalaryRange] = useState('');
  const [jobTypes, setJobTypes] = useState('');
  const [companiesToSkip, setCompaniesToSkip] = useState('');
  const [searchFrequency, setSearchFrequency] = useState('Every 6 hours');
  const [autoSearchFromResume, setAutoSearchFromResume] = useState(true);
  const [skillBasedMatching, setSkillBasedMatching] = useState(true);
  const [experienceLevelMatching, setExperienceLevelMatching] = useState(true);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await dbHelpers.getSettings();
      if (settings) {
        setGmailConnected(settings.gmailConnected);
        setGoogleConnected(settings.googleConnected);
        setAutoApply(settings.autoApply);
        setPushNotifications(settings.pushNotifications);
        setEmailNotifications(settings.emailNotifications);
        setMaxDailyApplications(settings.maxDailyApplications);
        setMinMatchScore(settings.minMatchScore);
        setDesiredRoles(settings.desiredRoles);
        setLocationPreference(settings.locationPreference);
        setSalaryRange(settings.salaryRange);
        setJobTypes(settings.jobTypes);
        setCompaniesToSkip(settings.companiesToSkip);
        setSearchFrequency(settings.searchFrequency);
        setAutoSearchFromResume(settings.autoSearchFromResume);
        setSkillBasedMatching(settings.skillBasedMatching);
        setExperienceLevelMatching(settings.experienceLevelMatching);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await dbHelpers.saveSettings({
        gmailConnected,
        googleConnected,
        autoApply,
        pushNotifications,
        emailNotifications,
        maxDailyApplications,
        minMatchScore,
        desiredRoles,
        locationPreference,
        salaryRange,
        jobTypes,
        companiesToSkip,
        searchFrequency,
        autoSearchFromResume,
        skillBasedMatching,
        experienceLevelMatching
      });
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleConnectGmail = () => {
    // In production, this would trigger OAuth flow
    alert('Gmail integration requires OAuth setup. See SETUP_GUIDE.md for instructions.');
    setGmailConnected(!gmailConnected);
  };

  const handleConnectGoogle = () => {
    // In production, this would trigger OAuth flow
    alert('Google Sign-In requires OAuth setup. See SETUP_GUIDE.md for instructions.');
    setGoogleConnected(!googleConnected);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm text-slate-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500 mt-1">Configure your AI agent and connected accounts</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity"
        >
          <Save size={16} />
          Save Settings
        </button>
      </div>

      {/* Save Success Message */}
      <AnimatePresence>
        {saved && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3"
          >
            <CheckCircle size={20} className="text-green-600" />
            <p className="text-sm font-medium text-green-900">Settings saved successfully!</p>
          </motion.div>
        )}
      </AnimatePresence>

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
                <p className="text-xs text-slate-500">Send application emails directly</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {gmailConnected && (
                <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                  <CheckCircle size={12} /> Connected
                </span>
              )}
              <button
                onClick={handleConnectGmail}
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
              {googleConnected && (
                <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                  <CheckCircle size={12} /> Connected
                </span>
              )}
              <button
                onClick={handleConnectGoogle}
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

          {/* Info Box */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-blue-600 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-blue-900">Setup Required</p>
                <p className="text-xs text-blue-700 mt-1">
                  To enable Gmail and Google Sign-In, you need to configure OAuth credentials. 
                  See SETUP_GUIDE.md for detailed instructions.
                </p>
              </div>
            </div>
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
            <button
              onClick={() => setAutoSearchFromResume(!autoSearchFromResume)}
              className={`w-12 h-6 rounded-full transition-colors ${autoSearchFromResume ? 'bg-blue-600' : 'bg-slate-200'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${autoSearchFromResume ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Clock size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Search Frequency</p>
                <p className="text-xs text-slate-500">How often AI rescans job boards</p>
              </div>
            </div>
            <select
              value={searchFrequency}
              onChange={(e) => setSearchFrequency(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700"
            >
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
                <p className="text-xs text-slate-500">Use extracted skills to find matching roles</p>
              </div>
            </div>
            <button
              onClick={() => setSkillBasedMatching(!skillBasedMatching)}
              className={`w-12 h-6 rounded-full transition-colors ${skillBasedMatching ? 'bg-blue-600' : 'bg-slate-200'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${skillBasedMatching ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <TrendingUp size={18} className="text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Experience Level Matching</p>
                <p className="text-xs text-slate-500">Match job seniority to your experience</p>
              </div>
            </div>
            <button
              onClick={() => setExperienceLevelMatching(!experienceLevelMatching)}
              className={`w-12 h-6 rounded-full transition-colors ${experienceLevelMatching ? 'bg-blue-600' : 'bg-slate-200'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${experienceLevelMatching ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* AI Agent Configuration */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">AI Agent Configuration</h2>
          <p className="text-sm text-slate-500">Control how the AI agent applies to jobs</p>
        </div>
        <div className="p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Zap size={18} className="text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Auto-Apply Mode</p>
                <p className="text-xs text-slate-500">Automatically apply to high-match jobs</p>
              </div>
            </div>
            <button
              onClick={() => setAutoApply(!autoApply)}
              className={`w-12 h-6 rounded-full transition-colors ${autoApply ? 'bg-blue-600' : 'bg-slate-200'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${autoApply ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

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

      {/* Job Preferences */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Job Preferences</h2>
          <p className="text-sm text-slate-500">Additional filters for AI job search</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase mb-1 block">Desired Roles</label>
              <input
                type="text"
                value={desiredRoles}
                onChange={(e) => setDesiredRoles(e.target.value)}
                placeholder="e.g. Accounts Manager, Data Analyst, Sales Executive"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase mb-1 block">Location Preference</label>
              <input
                type="text"
                value={locationPreference}
                onChange={(e) => setLocationPreference(e.target.value)}
                placeholder="Remote, San Francisco, New York"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase mb-1 block">Salary Range</label>
              <input
                type="text"
                value={salaryRange}
                onChange={(e) => setSalaryRange(e.target.value)}
                placeholder="$150,000 - $250,000"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase mb-1 block">Job Types</label>
              <input
                type="text"
                value={jobTypes}
                onChange={(e) => setJobTypes(e.target.value)}
                placeholder="Full-time, Contract"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase mb-1 block">Companies to Skip</label>
            <input
              type="text"
              value={companiesToSkip}
              onChange={(e) => setCompaniesToSkip(e.target.value)}
              placeholder="Enter company names to exclude (comma separated)"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
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
                <p className="text-xs text-slate-500">Get notified for approvals</p>
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
                <p className="text-xs text-slate-500">Daily summary of applications</p>
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
    </div>
  );
}
