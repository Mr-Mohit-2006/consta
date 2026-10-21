import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen, Users, CheckSquare, MessageSquare, Flame, Award, BarChart3,
  User, Bell, ChevronDown, Sparkles, GraduationCap, ShieldCheck, Trophy, UserCheck
} from 'lucide-react';

export default function Header({ activeTab, setActiveTab, onOpenNotifications, onOpenFriends }) {
  const { user, streaks, progression, unreadNotifications, switchUser, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Sparkles },
    { id: 'solo', label: 'Solo Study', icon: BookOpen },
    { id: 'group', label: 'Group Study', icon: Users },
    { id: 'tasks', label: 'Study Tasks', icon: CheckSquare },
    { id: 'challenges', label: 'Challenges', icon: Trophy },
    { id: 'reviews', label: 'Review Center', icon: ShieldCheck },
    { id: 'chat', label: 'Doubt Chat', icon: MessageSquare },
    { id: 'gamification', label: 'XP & Levels', icon: Award },
    { id: 'streaks', label: 'Streaks', icon: Flame },
    { id: 'portfolio', label: 'Portfolio', icon: User },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const currentLevel = progression?.level || 1;
  const currentTitle = progression?.title || 'Novice Explorer';
  const currentXp = progression?.currentXp || 0;
  const progressPct = progression?.progressPercentage || 0;
  const studyStreak = streaks?.study?.current_streak || 0;

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      {/* Top Banner with Brand, Level, Streak, User Switcher */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg tracking-wider text-white">CONSTA</span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                Study Mode
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Collaborative Study & Personal Growth Platform</p>
          </div>
        </div>

        {/* Right Section: Level, Streaks, Notifications, Profile */}
        <div className="flex items-center space-x-3">
          {/* Level Progress Widget */}
          <div
            onClick={() => setActiveTab('gamification')}
            className="hidden md:flex items-center space-x-3 bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700/60 cursor-pointer transition"
            title="Click to view XP Ledger and Level progression"
          >
            <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center font-bold text-xs text-indigo-300">
              L{currentLevel}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center justify-between text-xs space-x-2">
                <span className="font-medium text-slate-200">{currentTitle}</span>
                <span className="text-indigo-400 font-mono font-semibold">{currentXp} XP</span>
              </div>
              <div className="w-28 bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Daily Streak Pill */}
          <div
            onClick={() => setActiveTab('streaks')}
            className="flex items-center space-x-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2.5 py-1.5 rounded-xl text-amber-400 cursor-pointer transition"
            title="Study consistency streak"
          >
            <Flame className="w-4 h-4 fill-amber-400 text-amber-400 animate-pulse" />
            <span className="font-bold text-xs">{studyStreak}d Streak</span>
          </div>

          {/* Study Buddies / Friends Button */}
          <button
            onClick={onOpenFriends}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition flex items-center space-x-1"
            title="Study Buddies & Friend Activity"
          >
            <Users className="w-5 h-5 text-indigo-400" />
          </button>

          {/* Notifications Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadNotifications > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-slate-900">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </button>

          {/* User Switcher / Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center space-x-2 bg-slate-800/80 hover:bg-slate-800 p-1.5 pr-2.5 rounded-xl border border-slate-700/60 transition"
            >
              <img
                src={user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                alt={user?.full_name}
                className="w-7 h-7 rounded-lg object-cover ring-1 ring-indigo-500/50"
              />
              <span className="text-xs font-medium text-slate-200 hidden sm:inline max-w-[90px] truncate">
                {user?.full_name || 'Guest'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {userMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl py-2 z-50 text-xs"
                onMouseLeave={() => setUserMenuOpen(false)}
              >
                <div className="px-4 py-2 border-b border-slate-800">
                  <div className="font-semibold text-slate-200">{user?.full_name}</div>
                  <div className="text-[11px] text-slate-400 font-mono">@{user?.username} ({user?.role})</div>
                </div>

                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Switch Persona (Quick Test)
                </div>

                {[
                  { username: 'mohit_learner', name: 'Mohit Kumar (Student)', role: 'Student' },
                  { username: 'abhijit_study', name: 'Abhijit Sharma (Collaborator)', role: 'Peer' },
                  { username: 'abhishek_mentor', name: 'Prof. Abhishek Verma (Mentor)', role: 'Mentor/Reviewer' }
                ].map(p => (
                  <button
                    key={p.username}
                    onClick={() => {
                      switchUser(p.username);
                      setUserMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-1.5 hover:bg-slate-800 flex items-center justify-between ${
                      (user?.username === p.username || (p.username === 'mohit_learner' && user?.username === 'alex_learner') || (p.username === 'abhijit_study' && user?.username === 'sam_study') || (p.username === 'abhishek_mentor' && user?.username === 'dr_stone')) ? 'text-indigo-400 font-semibold' : 'text-slate-300'
                    }`}
                  >
                    <span>{p.name}</span>
                    {((user?.username === p.username) || (p.username === 'mohit_learner' && user?.username === 'alex_learner')) && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                  </button>
                ))}

                <div className="border-t border-slate-800 mt-2 pt-1">
                  <button
                    onClick={() => {
                      setActiveTab('portfolio');
                      setUserMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-800 text-slate-300"
                  >
                    My Learning Portfolio & Settings
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      setUserMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-800 text-rose-400"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="border-t border-slate-800/80 bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 overflow-x-auto py-1 scrollbar-none">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
