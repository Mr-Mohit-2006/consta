import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen, Users, CheckSquare, MessageSquare, Flame, Award, BarChart3,
  User, Bell, ChevronDown, Sparkles, GraduationCap, Trophy,
  Menu, X, LogOut
} from 'lucide-react';

export default function Header({ activeTab, setActiveTab, onOpenNotifications, onOpenFriends }) {
  const { user, streaks, progression, unreadNotifications, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80 transition-all">
      {/* Top Banner with Brand, Level, Streak, User Menu */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between">
        {/* Brand */}
        <div
          className="flex items-center space-x-2 sm:space-x-3 cursor-pointer group shrink-0"
          onClick={() => setActiveTab('dashboard')}
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
            <GraduationCap className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <span className="font-black text-base sm:text-lg tracking-wider text-white">CONSTA</span>
              <span className="hidden sm:inline-flex text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                Study Network
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden lg:block">Collaborative Study & Personal Growth Platform</p>
          </div>
        </div>

        {/* Right Section: Level, Streaks, Notifications, Profile */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5">
          {/* Level Progress Widget */}
          <div
            onClick={() => setActiveTab('gamification')}
            className="hidden md:flex items-center space-x-3 bg-slate-900/90 hover:bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700 cursor-pointer transition shadow-xs"
            title="Click to view XP Ledger and Level progression"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600/40 to-indigo-500/20 border border-indigo-500/40 flex items-center justify-center font-bold text-xs text-indigo-300">
              L{currentLevel}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center justify-between text-xs space-x-2">
                <span className="font-semibold text-slate-200 text-[11px]">{currentTitle}</span>
                <span className="text-indigo-400 font-mono font-bold text-[11px]">{currentXp} XP</span>
              </div>
              <div className="w-28 bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1 ring-1 ring-slate-700/50">
                <div
                  className="bg-gradient-to-r from-indigo-500 via-indigo-400 to-cyan-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Daily Streak Pill */}
          <div
            onClick={() => setActiveTab('streaks')}
            className="flex items-center space-x-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 px-2.5 py-1.5 rounded-xl text-amber-400 cursor-pointer transition shrink-0 shadow-xs"
            title="Study consistency streak"
          >
            <Flame className="w-4 h-4 fill-amber-400 text-amber-400 animate-pulse shrink-0" />
            <span className="font-extrabold text-xs">{studyStreak}d<span className="hidden sm:inline"> Streak</span></span>
          </div>

          {/* Study Buddies / Friends Button */}
          <button
            onClick={onOpenFriends}
            className="p-2 text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 rounded-xl transition flex items-center space-x-1 shrink-0 cursor-pointer"
            title="Study Buddies & Friend Activity"
          >
            <Users className="w-4.5 h-4.5 text-indigo-400" />
          </button>

          {/* Notifications Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 rounded-xl transition shrink-0 cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4.5 h-4.5" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-slate-950 animate-bounce">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </button>

          {/* User Profile Dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center space-x-2 bg-slate-900/90 hover:bg-slate-800/90 p-1.5 sm:pr-2.5 rounded-xl border border-slate-800 hover:border-slate-700 transition cursor-pointer"
            >
              <img
                src={user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'User')}&background=4f46e5&color=fff`}
                alt={user?.full_name}
                className="w-7 h-7 rounded-lg object-cover ring-1 ring-indigo-500/50"
              />
              <span className="text-xs font-semibold text-slate-200 hidden md:inline max-w-[90px] truncate">
                {user?.full_name?.split(' ')[0] || 'User'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {userMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-2rem)] glass-panel border border-slate-700/80 rounded-2xl shadow-2xl py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150"
                onMouseLeave={() => setUserMenuOpen(false)}
              >
                <div className="px-4 py-3 border-b border-slate-800">
                  <div className="font-bold text-white text-sm">{user?.full_name}</div>
                  <div className="text-[11px] text-indigo-400 font-mono">@{user?.username} · #{user?.id}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 truncate">{user?.email}</div>
                </div>

                <div className="pt-1.5 pb-1">
                  <button
                    onClick={() => {
                      setActiveTab('profile');
                      setUserMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-800/80 text-slate-300 hover:text-white flex items-center space-x-2.5 transition"
                  >
                    <User className="w-4 h-4 text-indigo-400" />
                    <span className="font-medium">My Profile & Settings</span>
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      setUserMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-rose-500/10 text-rose-400 flex items-center space-x-2.5 transition"
                  >
                    <LogOut className="w-4 h-4 text-rose-400" />
                    <span className="font-medium">Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Navigation Menu Toggle Button (Phone & Tablet) */}
          <button
            type="button"
            aria-label="Toggle Navigation Menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`md:hidden p-2 sm:px-2.5 rounded-xl border transition-all cursor-pointer flex items-center space-x-1 shrink-0 ${
              mobileMenuOpen
                ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                : 'bg-slate-900/95 hover:bg-slate-800 text-indigo-300 hover:text-white border-indigo-500/30 hover:border-indigo-500/60'
            }`}
            title={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-indigo-300" />}
            <span className="text-[11px] font-bold hidden xs:inline">{mobileMenuOpen ? 'Close' : 'Menu'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation Menu (Phone & Tablet) */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800/90 bg-slate-950/98 backdrop-blur-2xl px-4 py-3 shadow-2xl transition-all">
          <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2.5">
            <span>Navigation Sections</span>
            <span className="text-indigo-400 font-mono">User ID #{user?.id}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center space-x-2 p-2.5 rounded-xl text-xs font-semibold transition text-left cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-900/80 border border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-indigo-400'}`} />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Action Buttons in Mobile Drawer */}
          <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <button
              onClick={() => {
                onOpenFriends();
                setMobileMenuOpen(false);
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-indigo-300 hover:bg-slate-800 font-semibold cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>Buddies</span>
            </button>
            <button
              onClick={() => {
                onOpenNotifications();
                setMobileMenuOpen(false);
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 font-semibold cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span>Alerts {unreadNotifications > 0 ? `(${unreadNotifications})` : ''}</span>
            </button>
            <button
              onClick={() => {
                logout();
                setMobileMenuOpen(false);
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-semibold cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Navigation Tabs Bar for Desktop & Tablet */}
      <div className="border-t border-slate-800/60 bg-slate-950/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1.5 overflow-x-auto py-1.5 scrollbar-none touch-pan-x">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/25 ring-1 ring-indigo-400/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
