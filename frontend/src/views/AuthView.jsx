import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api';
import {
  GraduationCap, Mail, Lock, User, Check, X, Eye, EyeOff, Sparkles,
  ArrowRight, ShieldCheck, Flame, Award, BookOpen
} from 'lucide-react';

export default function AuthView({ onSuccess }) {
  const { login, register, switchUser } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('student');
  const [regBio, setRegBio] = useState('');

  // Live availability states
  const [usernameStatus, setUsernameStatus] = useState(null); // { available: bool, message: string }
  const [emailStatus, setEmailStatus] = useState(null);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Live check username
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (regUsername.trim().length >= 3) {
        try {
          const res = await apiRequest(`/auth/check-username?username=${encodeURIComponent(regUsername.trim())}`);
          setUsernameStatus(res);
        } catch (e) {
          setUsernameStatus(null);
        }
      } else {
        setUsernameStatus(null);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [regUsername]);

  // Live check email
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (regEmail.trim().includes('@') && regEmail.trim().includes('.')) {
        try {
          const res = await apiRequest(`/auth/check-email?email=${encodeURIComponent(regEmail.trim())}`);
          setEmailStatus(res);
        } catch (e) {
          setEmailStatus(null);
        }
      } else {
        setEmailStatus(null);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [regEmail]);

  async function handleLoginSubmit(e) {
    e.preventDefault();
    if (!loginIdentifier.trim() || !loginPassword) return;

    setLoading(true);
    setErrorMessage('');
    try {
      await login(loginIdentifier.trim(), loginPassword);
      if (onSuccess) onSuccess();
    } catch (err) {
      setErrorMessage(err.message || 'Login failed. Please check your email/username and password.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterSubmit(e) {
    e.preventDefault();
    if (!regFullName.trim() || !regEmail.trim() || !regUsername.trim() || !regPassword) return;

    if (usernameStatus && !usernameStatus.available) {
      setErrorMessage('Please choose a different, unique username.');
      return;
    }

    if (emailStatus && !emailStatus.available) {
      setErrorMessage('An account with this email already exists.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      await register({
        full_name: regFullName.trim(),
        email: regEmail.trim().toLowerCase(),
        username: regUsername.trim().toLowerCase(),
        password: regPassword,
        role: regRole,
        bio: regBio.trim(),
        timezone: detectedTz
      });
      if (onSuccess) onSuccess();
    } catch (err) {
      setErrorMessage(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickPersona(username) {
    setLoading(true);
    setErrorMessage('');
    try {
      await switchUser(username);
      if (onSuccess) onSuccess();
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 shadow-xl shadow-indigo-600/30 mb-4">
          <GraduationCap className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">CONSTA</h2>
        <p className="mt-1 text-xs text-slate-400 uppercase tracking-widest font-semibold">
          Collaborative Study & Personal Growth Platform
        </p>
      </div>

      {/* Card Container */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 z-10">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          {/* Mode Tabs */}
          <div className="flex rounded-2xl bg-slate-950 p-1 mb-6 border border-slate-800">
            <button
              onClick={() => {
                setMode('login');
                setErrorMessage('');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                mode === 'login'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In by Email
            </button>
            <button
              onClick={() => {
                setMode('register');
                setErrorMessage('');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                mode === 'register'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2">
              <span className="font-bold">Error:</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {mode === 'login' ? (
            /* Login Form */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">Email or Username</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={e => setLoginIdentifier(e.target.value)}
                    placeholder="e.g. mohit@consta.edu or mohit_learner"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-2.5 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-lg shadow-indigo-600/30 transition mt-2"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={e => setRegFullName(e.target.value)}
                    placeholder="e.g. Mohit Kumar"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-slate-300 font-medium">Email Address</label>
                  {emailStatus && (
                    <span className={`text-[10px] font-semibold ${emailStatus.available ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {emailStatus.available ? '✓ Available' : '✗ Email exists'}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    placeholder="e.g. mohit@gmail.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-slate-300 font-medium">Choose Unique Username</label>
                  {usernameStatus && (
                    <span className={`text-[10px] font-semibold ${usernameStatus.available ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {usernameStatus.available ? '✓ Username available' : '✗ Taken'}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={regUsername}
                  onChange={e => setRegUsername(e.target.value)}
                  placeholder="e.g. mohit_coder"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">Choose Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-10 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-2.5 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">Platform Role</label>
                <select
                  value={regRole}
                  onChange={e => setRegRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                >
                  <option value="student">Student (Focus on Solo & Group Study)</option>
                  <option value="mentor">Academic Mentor (Review & Moderate)</option>
                </select>
              </div>

              <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-900/40 text-[11px] text-indigo-300 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Creating an account instantly grants +50 welcome XP & your day 1 streak!</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-lg shadow-indigo-600/30 transition"
              >
                <span>{loading ? 'Creating Account...' : 'Register & Launch Dashboard'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Quick Demo Switcher Section */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block text-center mb-2.5">
              Or Explore with Pre-Seeded Profiles:
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { username: 'mohit_learner', label: 'Mohit', sub: 'Student' },
                { username: 'abhijit_study', label: 'Abhijit', sub: 'Peer' },
                { username: 'abhishek_mentor', label: 'Prof. Abhishek', sub: 'Mentor' }
              ].map(p => (
                <button
                  key={p.username}
                  type="button"
                  onClick={() => handleQuickPersona(p.username)}
                  className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-center transition"
                >
                  <div className="text-xs font-bold text-white truncate">{p.label}</div>
                  <div className="text-[10px] text-indigo-400 font-medium">{p.sub}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
