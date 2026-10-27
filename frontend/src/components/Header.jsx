import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen, Users, CheckSquare, MessageSquare, Flame, Award, BarChart3,
  User, Bell, ChevronDown, Sparkles, GraduationCap, Trophy,
  LogOut
} from 'lucide-react';

export default function Header({ activeTab, setActiveTab, onOpenNotifications, onOpenFriends }) {
  const { user, streaks, progression, unreadNotifications, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const userMenuRef = useRef(null);

  // Close menus when clicking outside
  useEffect(() => {
    if (!userMenuOpen) return;
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [userMenuOpen]);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Sparkles },
    { id: 'solo', label: 'Solo Study', icon: BookOpen },
    { id: 'group', label: 'Group Study', icon: Users },
    { id: 'tasks', label: 'Study Tasks', icon: CheckSquare },
    { id: 'challenges', label: 'Challenges', icon: Trophy },
    { id: 'chat', label: 'Doubt Chat', icon: MessageSquare },
    { id: 'gamification', label: 'XP & Levels', icon: Award },
    { id: 'streaks', label: 'Streaks', icon: Flame },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const currentLevel = progression?.level || 1;
  const currentTitle = progression?.title || 'Novice Explorer';
  const currentXp = progression?.currentXp || 0;
  const progressPct = progression?.progressPercentage || 0;
  const studyStreak = streaks?.study?.current_streak || 0;

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/95 backdrop-blur-2xl border-b border-slate-700/80 shadow-xs">
      {/* Top Banner with Brand, Level, Streak, User Menu */}
      <div className="relative z-30 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5 flex items-center justify-between gap-2">
        {/* Brand */}
        <div
          className="flex items-center space-x-2 sm:space-x-3 cursor-pointer group shrink-0 min-w-0"
          onClick={() => setActiveTab('dashboard')}
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-600 border border-indigo-700 flex items-center justify-center shadow-md shadow-indigo-600/20 group-hover:bg-indigo-500 transition-all duration-200 shrink-0">
            <GraduationCap className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-indigo-50 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <span className="font-black text-base sm:text-lg tracking-wider text-slate-100">CONSTA</span>
              <span className="hidden sm:inline-flex text-[10px] uppercase font-extrabold tracking-widest px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-600 border border-slate-700">
                Study Network
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden lg:block truncate">Collaborative Study & Personal Growth Platform</p>
          </div>
        </div>

        {/* Right Section: Level, Streaks, Notifications, Profile */}
        <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
          {/* Level Progress Widget */}
          <div
            onClick={() => setActiveTab('gamification')}
            className="hidden md:flex items-center space-x-3 bg-slate-900/90 hover:bg-slate-850 px-3 py-1.5 rounded-xl border border-slate-700 cursor-pointer transition shadow-xs"
            title="Click to view XP Ledger and Level progression"
          >
            <div className="w-7 h-7 rounded-lg bg-indigo-950 border border-indigo-700/50 flex items-center justify-center font-bold text-xs text-indigo-600">
              L{currentLevel}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center justify-between text-xs space-x-2">
                <span className="font-semibold text-slate-200 text-[11px]">{currentTitle}</span>
                <span className="text-indigo-600 font-mono font-bold text-[11px]">{currentXp} XP</span>
              </div>
              <div className="w-28 bg-slate-700/60 h-1.5 rounded-full overflow-hidden mt-1">
                <div
                  className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-700 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Daily Streak Pill */}
          <div
            onClick={() => setActiveTab('streaks')}
            className="flex items-center space-x-1 sm:space-x-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl text-amber-400 cursor-pointer transition shrink-0 shadow-xs"
            title="Study consistency streak"
          >
            <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-400 text-amber-400 animate-pulse shrink-0" />
            <span className="font-extrabold text-[11px] sm:text-xs">{studyStreak}d<span className="hidden sm:inline"> Streak</span></span>
          </div>

          {/* Friends Button */}
          <button
            onClick={onOpenFriends}
            className="p-1.5 sm:p-2 text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 rounded-xl transition flex items-center space-x-1 shrink-0 cursor-pointer"
            title="Friends Network"
          >
            <Users className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-indigo-400" />
          </button>

          {/* Notifications Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-1.5 sm:p-2 text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 rounded-xl transition shrink-0 cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-slate-950 animate-bounce">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </button>

          {/* User Profile Dropdown */}
          <div ref={userMenuRef} className="relative shrink-0 z-50">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center space-x-1.5 sm:space-x-2 bg-slate-900/90 hover:bg-slate-800/90 p-1 sm:p-1.5 sm:pr-2.5 rounded-xl border border-slate-800 hover:border-slate-700 transition cursor-pointer"
            >
              <img
                src={user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'User')}&background=4f46e5&color=fff`}
                alt={user?.full_name}
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg object-cover ring-1 ring-indigo-500/50"
              />
              <span className="text-xs font-semibold text-slate-200 hidden md:inline max-w-[90px] truncate">
                {user?.full_name?.split(' ')[0] || 'User'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {userMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)] bg-slate-800 border border-slate-700 rounded-2xl shadow-xl py-2 z-[100] text-xs animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="px-4 py-3 border-b border-slate-700">
                  <div className="font-bold text-slate-100 text-sm truncate">{user?.full_name}</div>
                  <div className="text-[11px] text-indigo-600 font-mono truncate">@{user?.username} · #{user?.id}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 truncate">{user?.email}</div>
                </div>

                <div className="pt-1.5 pb-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('profile');
                      setUserMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-900 text-slate-300 hover:text-slate-100 flex items-center space-x-2.5 transition cursor-pointer"
                  >
                    <User className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="font-medium">My Profile & Settings</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setUserMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-indigo-950 text-indigo-600 flex items-center space-x-2.5 transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="font-medium">Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar - Static & Sticky Mode Options */}
      <div className="relative z-20 border-t border-slate-800/80 bg-slate-900/95 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex space-x-1.5 overflow-x-auto py-2 scrollbar-none touch-pan-x">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/25 ring-1 ring-indigo-400/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
