import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, LogIn, UserPlus, Compass, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cloudEnabled } from '../services/cloudSync';

export default function LoginPage() {
  const { login, signup } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let success: boolean;
      if (isSignUp) {
        if (!name.trim()) {
          setError('Please enter your name');
          setLoading(false);
          return;
        }
        success = await signup(email, password, name);
        if (!success) {
          setError('An account with this email already exists');
        }
      } else {
        success = await login(email, password);
        if (!success) {
          setError('Invalid email or password');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail('kiran@example.com');
    setPassword('demo123');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {/* Wordmark */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center">
              <Compass size={18} className="text-white" />
            </div>
            <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Job search workspace</span>
          </div>
          <h1 className="font-serif text-4xl leading-tight text-slate-900">
            JobPilot
          </h1>
          <p className="text-slate-600 mt-2 text-sm">
            Resume-driven job matching, with every application left in your hands.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-1">
            {isSignUp ? 'Create an account' : 'Sign in'}
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            {isSignUp ? 'Start with the resume you already have.' : 'Pick up where your search left off.'}
          </p>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2"
            >
              <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 mb-1.5">
                  Full name
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 transition-colors"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 transition-colors"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 text-white rounded-lg font-medium text-sm hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {isSignUp ? 'Creating account…' : 'Signing in…'}
                </>
              ) : (
                <>
                  {isSignUp ? <UserPlus size={16} /> : <LogIn size={16} />}
                  {isSignUp ? 'Create account' : 'Sign in'}
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              {isSignUp ? 'Already have an account?' : 'No account yet?'}
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                }}
                className="ml-1 text-slate-900 font-medium underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900 transition-colors"
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          </div>

          {!isSignUp && !cloudEnabled && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <button
                onClick={fillDemoCredentials}
                className="w-full py-2 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-100 transition-colors"
              >
                Use demo credentials
              </button>
              <p className="text-[11px] text-slate-400 text-center mt-2">
                kiran@example.com · demo123
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-6">
          {cloudEnabled
            ? 'Sign in with the same account on your laptop and phone to see the same jobs everywhere.'
            : 'Letters are drafted from your resume. Nothing is submitted without you.'}
        </p>
      </motion.div>
    </div>
  );
}
