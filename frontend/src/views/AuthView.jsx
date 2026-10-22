import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api';
import {
  GraduationCap, Mail, Lock, User, Eye, EyeOff, Sparkles,
  ArrowRight, ShieldCheck, Flame, Users, CheckCircle2,
  KeyRound, ArrowLeft, MessageSquare, Image, Check
} from 'lucide-react';

export default function AuthView({ onSuccess }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regBio, setRegBio] = useState('');

  // Forgot Password state
  const [forgotStep, setForgotStep] = useState(1); // 1 = enter email, 2 = enter code & new password
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotPw, setShowForgotPw] = useState(false);
  const [sentDemoCode, setSentDemoCode] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');

  // Live availability states
  const [usernameStatus, setUsernameStatus] = useState(null);
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
    setResetSuccessMessage('');
    try {
      await login(loginIdentifier.trim(), loginPassword);
      if (onSuccess) onSuccess();
    } catch (err) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
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
    setResetSuccessMessage('');
    try {
      const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      await register({
        full_name: regFullName.trim(),
        email: regEmail.trim().toLowerCase(),
        username: regUsername.trim().toLowerCase(),
        password: regPassword,
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

  async function handleSendForgotCode(e) {
    e.preventDefault();
    if (!forgotEmail.trim() || !forgotEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setResetSuccessMessage('');
    try {
      const res = await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: { email: forgotEmail.trim() }
      });
      if (res.code) {
        setSentDemoCode(res.code);
        setForgotCode(res.code); // auto-populate for effortless testing
      }
      setForgotStep(2);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to send reset code. Make sure this email is registered.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPasswordSubmit(e) {
    e.preventDefault();
    if (!forgotCode.trim() || !forgotNewPassword) {
      setErrorMessage('Please provide both the verification code and new password.');
      return;
    }
    if (forgotNewPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      const res = await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: {
          email: forgotEmail.trim(),
          code: forgotCode.trim(),
          new_password: forgotNewPassword
        }
      });
      setResetSuccessMessage(res.message || 'Password successfully reset! Please log in.');
      setLoginIdentifier(forgotEmail.trim());
      setLoginPassword('');
      setMode('login');
      setForgotStep(1);
      setSentDemoCode('');
      setForgotCode('');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to reset password. The code may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center py-6 sm:py-10 px-3 sm:px-6 lg:px-8 relative overflow-x-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-10 left-1/4 w-[32rem] h-[32rem] bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[28rem] h-[28rem] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-grid-pattern opacity-30 pointer-events-none" />

      <div className="w-full max-w-6xl mx-auto z-10 lg:grid lg:grid-cols-12 lg:gap-12 items-center">
        {/* Left Column: Brand & Feature Showcase */}
        <div className="lg:col-span-6 mb-10 lg:mb-0 text-left">
          <div className="inline-flex items-center space-x-2.5 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs font-semibold mb-6">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>CONSTA Collaborative Learning 2.0</span>
          </div>

          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-xl shadow-indigo-500/30">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">CONSTA</h1>
              <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Study & Growth Network</span>
            </div>
          </div>

          <p className="text-base text-slate-300 leading-relaxed max-w-lg mb-8">
            A collaborative workspace where students connect, solve doubts in real-time with instant photo uploads, maintain daily study streaks, and level up together.
          </p>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-lg">
            <div className="glass-card rounded-2xl p-3.5 border border-slate-800 flex items-start space-x-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Live Doubt Chat</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Upload photos & diagrams instantly with zero refresh.</p>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-3.5 border border-slate-800 flex items-start space-x-3">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Study Groups & Admin</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Group creator is Admin; easily join or leave groups & manage tasks.</p>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-3.5 border border-slate-800 flex items-start space-x-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Streaks & XP</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Stay consistent with heatmaps and level-up rewards.</p>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-3.5 border border-slate-800 flex items-start space-x-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Privacy Controls</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Public or Friends-Only mode, ID search, custom reset.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Form Card */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-700/60 relative">
            {/* Mode Switcher Tabs */}
            {mode !== 'forgot' ? (
              <div className="flex rounded-2xl bg-slate-950/80 p-1 mb-6 border border-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage('');
                    setResetSuccessMessage('');
                  }}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                    mode === 'login'
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>User Login</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMessage('');
                    setResetSuccessMessage('');
                  }}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                    mode === 'register'
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Create Account</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage('');
                    setResetSuccessMessage('');
                  }}
                  className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-indigo-400 font-semibold transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to User Login</span>
                </button>
                <div className="flex items-center space-x-1.5 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                  <KeyRound className="w-3 h-3" />
                  <span>Forgot Password</span>
                </div>
              </div>
            )}

            {/* Success Banner */}
            {resetSuccessMessage && (
              <div className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{resetSuccessMessage}</span>
              </div>
            )}

            {/* Error Banner */}
            {errorMessage && (
              <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2">
                <span className="font-bold">Error:</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* MODE: LOGIN */}
            {mode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-300 block mb-1.5 font-medium">Email or Username</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={loginIdentifier}
                      onChange={e => setLoginIdentifier(e.target.value)}
                      placeholder="Enter your email or username"
                      className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs text-slate-300 font-medium">Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setForgotStep(1);
                        setErrorMessage('');
                        setResetSuccessMessage('');
                        if (loginIdentifier.includes('@')) {
                          setForgotEmail(loginIdentifier);
                        }
                      }}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 transition cursor-pointer mt-2"
                >
                  <User className="w-4 h-4" />
                  <span>{loading ? 'Authenticating...' : 'User Login'}</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>

                <div className="text-center pt-2">
                  <span className="text-[11px] text-slate-400">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('register');
                        setErrorMessage('');
                      }}
                      className="text-indigo-400 hover:text-indigo-300 underline font-semibold cursor-pointer"
                    >
                      Create one now
                    </button>
                  </span>
                </div>
              </form>
            )}

            {/* MODE: FORGOT PASSWORD */}
            {mode === 'forgot' && (
              <div className="space-y-4">
                {forgotStep === 1 ? (
                  <form onSubmit={handleSendForgotCode} className="space-y-4">
                    <div className="text-center mb-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-2">
                        <Mail className="w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-bold text-white">Reset via Registered Email</h3>
                      <p className="text-[11px] text-slate-400 mt-1">
                        We will send a 6-digit verification code to your email address to reset your password.
                      </p>
                    </div>

                    <div>
                      <label className="text-xs text-slate-300 block mb-1.5 font-medium">Registered Email Address</label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="email"
                          required
                          value={forgotEmail}
                          onChange={e => setForgotEmail(e.target.value)}
                          placeholder="youremail@example.com"
                          className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 transition cursor-pointer"
                    >
                      <Mail className="w-4 h-4" />
                      <span>{loading ? 'Sending Verification Code...' : 'Send Reset Code'}</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                    <div className="text-center mb-2">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                        <KeyRound className="w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-bold text-white">Enter Verification Code</h3>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Code sent to <span className="text-indigo-300 font-semibold">{forgotEmail}</span>
                      </p>
                    </div>

                    {sentDemoCode && (
                      <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/60 text-xs text-indigo-300 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                          <span>Code delivered: <strong className="font-mono text-white tracking-widest bg-slate-950 px-2 py-0.5 rounded border border-indigo-500/40">{sentDemoCode}</strong></span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setForgotCode(sentDemoCode)}
                          className="text-[10px] text-indigo-400 hover:underline font-bold"
                        >
                          Auto-fill
                        </button>
                      </div>
                    )}

                    <div>
                      <label className="text-xs text-slate-300 block mb-1.5 font-medium">6-Digit Verification Code</label>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          required
                          maxLength={6}
                          value={forgotCode}
                          onChange={e => setForgotCode(e.target.value)}
                          placeholder="e.g. 123456"
                          className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white font-mono tracking-widest placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-slate-300 block mb-1.5 font-medium">New Password</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type={showForgotPw ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={forgotNewPassword}
                          onChange={e => setForgotNewPassword(e.target.value)}
                          placeholder="At least 6 characters"
                          className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowForgotPw(!showForgotPw)}
                          className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                        >
                          {showForgotPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-slate-300 block mb-1.5 font-medium">Confirm New Password</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type={showForgotPw ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={forgotConfirmPassword}
                          onChange={e => setForgotConfirmPassword(e.target.value)}
                          placeholder="Re-enter your new password"
                          className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/30 transition cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>{loading ? 'Updating Password...' : 'Confirm & Reset Password'}</span>
                    </button>

                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={() => setForgotStep(1)}
                        className="text-[11px] text-slate-400 hover:text-indigo-400 underline font-semibold"
                      >
                        Resend code or change email
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* MODE: REGISTER */}
            {mode === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div>
                  <label className="text-xs text-slate-300 block mb-1 font-medium">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                    <input
                      type="text"
                      required
                      value={regFullName}
                      onChange={e => setRegFullName(e.target.value)}
                      placeholder="Your Full Name"
                      className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl pl-10 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
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
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                      placeholder="youremail@example.com"
                      className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl pl-10 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
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
                    placeholder="your_unique_username"
                    className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 block mb-1 font-medium">Choose Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl pl-10 pr-10 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-300 block mb-1 font-medium">Short Bio (Optional)</label>
                  <input
                    type="text"
                    value={regBio}
                    onChange={e => setRegBio(e.target.value)}
                    placeholder="e.g. Computer Science student passionate about algorithms"
                    className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 transition"
                  />
                </div>

                <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-900/40 text-[11px] text-indigo-300 flex items-center space-x-2">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Signing up awards +50 welcome XP and sets up your daily streak!</span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 transition cursor-pointer"
                >
                  <span>{loading ? 'Creating Account...' : 'Create Account & Start Learning'}</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>

                <div className="text-center pt-1">
                  <span className="text-[11px] text-slate-400">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setErrorMessage('');
                      }}
                      className="text-indigo-400 hover:text-indigo-300 underline font-semibold cursor-pointer"
                    >
                      User Login
                    </button>
                  </span>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
