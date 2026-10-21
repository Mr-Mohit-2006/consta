import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api';
import {
  User, Lock, Shield, Eye, Flame, Award, Users, UserPlus,
  CheckCircle2, Globe, Settings, Key, AlertCircle, RefreshCw,
  Calendar, Edit3, ShieldAlert, Check, Sparkles
} from 'lucide-react';

export default function ProfileView({ onOpenFriends }) {
  const { user, streaks: contextStreaks, progression: contextProgression, refreshUserData } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'friends' | 'settings'

  // Settings State: Reset Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState(null); // { type: 'success' | 'error', message: string }

  // Settings State: Edit Profile Info
  const [editFullName, setEditFullName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [profileUpdateLoading, setProfileUpdateLoading] = useState(false);
  const [profileUpdateStatus, setProfileUpdateStatus] = useState(null);

  // Privacy Mode Toggle
  const [privacyLoading, setPrivacyLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const data = await apiRequest('/profile/me');
      setProfileData(data);
      if (data.user) {
        setEditFullName(data.user.full_name || '');
        setEditBio(data.user.bio || '');
        setEditAvatarUrl(data.user.avatar_url || '');
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleTogglePrivacy() {
    if (!profileData || privacyLoading) return;
    setPrivacyLoading(true);
    try {
      const nextPrivacy = !profileData.profile?.is_public;
      await apiRequest('/profile/privacy', {
        method: 'PUT',
        body: { is_public: nextPrivacy }
      });
      setProfileData(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          is_public: nextPrivacy
        }
      }));
    } catch (err) {
      alert('Failed to update privacy: ' + err.message);
    } finally {
      setPrivacyLoading(false);
    }
  }

  async function handlePasswordReset(e) {
    e.preventDefault();
    setPasswordStatus(null);

    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'New password and confirmation do not match.' });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordStatus({ type: 'error', message: 'New password must be at least 6 characters.' });
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await apiRequest('/profile/reset-password', {
        method: 'POST',
        body: { currentPassword, newPassword }
      });
      setPasswordStatus({ type: 'success', message: res.message || 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordStatus({ type: 'error', message: err.message || 'Failed to update password.' });
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleSaveProfileInfo(e) {
    e.preventDefault();
    setProfileUpdateStatus(null);
    setProfileUpdateLoading(true);
    try {
      const res = await apiRequest('/profile/me', {
        method: 'PUT',
        body: {
          full_name: editFullName,
          bio: editBio,
          avatar_url: editAvatarUrl
        }
      });
      setProfileUpdateStatus({ type: 'success', message: 'Profile details saved successfully!' });
      await refreshUserData();
      await loadProfile();
    } catch (err) {
      setProfileUpdateStatus({ type: 'error', message: err.message || 'Failed to update profile.' });
    } finally {
      setProfileUpdateLoading(false);
    }
  }

  if (loading && !profileData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
        <span className="text-xs font-semibold uppercase tracking-wider">Loading User Profile...</span>
      </div>
    );
  }

  const currentUser = profileData?.user || user;
  const isPublic = profileData?.profile?.is_public ?? true;
  const progression = profileData?.progression || contextProgression;
  const streaks = profileData?.streaks || contextStreaks;
  const counts = profileData?.counts || { friends: 0, followers: 0, following: 0 };
  const friendsList = profileData?.friends || [];

  return (
    <div className="space-y-6">
      {/* Top Profile Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Avatar and Identity */}
          <div className="flex items-center space-x-5">
            <div className="relative">
              <img
                src={currentUser?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.full_name || 'User')}&background=4f46e5&color=fff&size=128`}
                alt={currentUser?.full_name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-2 ring-indigo-500/50 shadow-lg"
              />
              <span className="absolute -bottom-1.5 -right-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-600 text-white shadow-md">
                User
              </span>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {currentUser?.full_name}
                </h1>
                {isPublic ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Globe className="w-3 h-3 mr-1" /> Public Profile
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <ShieldAlert className="w-3 h-3 mr-1" /> Friends Only (Private)
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2 mt-0.5">
                <span className="text-xs text-indigo-400 font-mono">@{currentUser?.username}</span>
                <span className="font-mono px-2 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-300 font-bold border border-slate-700">
                  User ID: #{currentUser?.id}
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
                {currentUser?.bio || 'Learning actively on CONSTA with solo sessions and group study.'}
              </div>
            </div>
          </div>

          {/* Privacy Mode Action */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 text-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Profile Visibility
              </div>
              <button
                onClick={handleTogglePrivacy}
                disabled={privacyLoading}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                  isPublic
                    ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30'
                    : 'bg-amber-600/20 text-amber-300 border border-amber-500/30 hover:bg-amber-600/30'
                }`}
              >
                {isPublic ? <Globe className="w-4 h-4 text-emerald-400" /> : <Lock className="w-4 h-4 text-amber-400" />}
                <span>{isPublic ? 'Switch to Private (Friends Only)' : 'Switch to Public'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Privacy Notice Banner */}
        <div className={`mt-5 p-3 rounded-2xl text-xs flex items-center space-x-2 ${
          isPublic
            ? 'bg-slate-950/40 border border-slate-800/80 text-slate-400'
            : 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
        }`}>
          {isPublic ? (
            <>
              <Globe className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Public Mode: Other learners can discover your learning streaks, achievements, and statistics.</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Private Mode Active: Only your confirmed friends can see your full profile, streaks, and learning tasks.</span>
            </>
          )}
        </div>
      </div>

      {/* 4 Core Metrics Cards: Level, Streak, Friends, Followers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Level & XP */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Level & Mastery</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            Level {progression?.current_level || 1}
          </div>
          <div className="text-xs text-indigo-400 font-semibold mb-3">
            {progression?.current_title || 'Novice Explorer'}
          </div>
          <div className="w-full bg-slate-950 rounded-full h-2 mb-1.5 overflow-hidden">
            <div
              className="bg-indigo-500 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, progression?.progress_percentage || 0)}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>{progression?.current_xp || 0} XP</span>
            <span>Next: {progression?.next_level_xp || 100} XP</span>
          </div>
        </div>

        {/* Card 2: Current Streak */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Study Streak</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Flame className="w-4 h-4 fill-amber-400" />
            </div>
          </div>
          <div className="text-2xl font-black text-white flex items-center space-x-1">
            <span>{streaks?.study?.current_streak || 0}</span>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider ml-1">Days</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Longest record: <span className="text-white font-bold">{streaks?.study?.longest_streak || 0} days</span>
          </div>
          <div className="mt-3 text-[11px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-xl">
            Active daily study consistency
          </div>
        </div>

        {/* Card 3: Friends Count */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Study Buddies</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            {counts.friends}
          </div>
          <div className="text-xs text-slate-400 mt-1 mb-3">
            Confirmed friends & study partners
          </div>
          <button
            onClick={() => setActiveTab('friends')}
            className="w-full py-1.5 px-2 text-center rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-300 text-xs font-bold transition cursor-pointer"
          >
            Manage Buddies ({counts.friends})
          </button>
        </div>

        {/* Card 4: Followers & Following */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Community Network</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <UserPlus className="w-4 h-4" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div>
              <div className="text-2xl font-black text-white">{counts.followers}</div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Followers</div>
            </div>
            <div>
              <div className="text-2xl font-black text-white">{counts.following}</div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Following</div>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-purple-300/80 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-xl text-center">
            Peer learning connections
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs: Overview, Friends, Settings */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2">
        {[
          { id: 'overview', label: 'Overview & Achievements', icon: Award },
          { id: 'friends', label: `My Friends (${counts.friends})`, icon: Users },
          { id: 'settings', label: 'Settings & Reset Password', icon: Settings }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview & Achievements */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <h3 className="text-base font-bold text-white mb-4 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Learning Milestones & Achievements</span>
            </h3>

            {profileData?.achievements && profileData.achievements.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {profileData.achievements.map((ach, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{ach.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{ach.description}</div>
                      <div className="text-[10px] text-indigo-400 font-semibold mt-1">+{ach.xp_reward} XP Earned</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 text-xs">
                Complete your daily solo study sessions and task challenges to unlock learning badges!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Friends List */}
      {activeTab === 'friends' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <span>Confirmed Study Friends</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Friends can view your private profile and study streaks, and receive notifications when you start a task.
              </p>
            </div>
          </div>

          {friendsList.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {friendsList.map(friend => (
                <div
                  key={friend.id}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={friend.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.full_name)}&background=4f46e5&color=fff`}
                      alt={friend.full_name}
                      className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-700"
                    />
                    <div>
                      <div className="text-xs font-bold text-white">{friend.full_name}</div>
                      <div className="text-[11px] text-indigo-400 font-mono">@{friend.username}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 text-amber-400 bg-amber-500/10 px-2 py-1 rounded-xl text-[11px] font-bold">
                    <Flame className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{friend.study_streak || 0}d</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-slate-950 rounded-2xl border border-slate-800 text-slate-400 text-xs">
              <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p>No confirmed study buddies yet.</p>
              <p className="text-[11px] text-slate-500 mt-1">Use the Study Buddies modal in the header to connect by username or email!</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Settings & Reset Password */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card A: Reset Password Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <h3 className="text-base font-bold text-white mb-1 flex items-center space-x-2">
              <Key className="w-4 h-4 text-indigo-400" />
              <span>Reset Password</span>
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Securely update your password by confirming your current credentials.
            </p>

            {passwordStatus && (
              <div className={`p-3 rounded-xl mb-4 text-xs flex items-start space-x-2 ${
                passwordStatus.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
              }`}>
                {passwordStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{passwordStatus.message}</span>
              </div>
            )}

            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">Current Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Enter existing password"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">New Password</label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">Confirm New Password</label>
                <div className="relative">
                  <Check className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-lg shadow-indigo-600/30 transition cursor-pointer"
              >
                <span>{passwordLoading ? 'Updating Password...' : 'Update Password'}</span>
              </button>
            </form>
          </div>

          {/* Card B: Edit Profile Details */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <h3 className="text-base font-bold text-white mb-1 flex items-center space-x-2">
              <Edit3 className="w-4 h-4 text-indigo-400" />
              <span>Edit Profile Information</span>
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Update your public display name, biography, or avatar image URL.
            </p>

            {profileUpdateStatus && (
              <div className="p-3 rounded-xl mb-4 text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{profileUpdateStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfileInfo} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">Full Name</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={e => setEditFullName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">Bio</label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={e => setEditBio(e.target.value)}
                  placeholder="Share your learning focus, subjects, or study goals..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">Avatar Image URL (Optional)</label>
                <input
                  type="url"
                  value={editAvatarUrl}
                  onChange={e => setEditAvatarUrl(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={profileUpdateLoading}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer"
              >
                <span>{profileUpdateLoading ? 'Saving Changes...' : 'Save Profile Details'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}