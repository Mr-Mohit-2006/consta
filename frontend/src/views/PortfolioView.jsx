import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  User, Award, Flame, CheckCircle2, Trophy, Globe, Lock, Settings,
  ExternalLink, Sparkles, BookOpen, Clock, ShieldCheck, Edit3
} from 'lucide-react';

export default function PortfolioView() {
  const { user, profile, streaks, progression, refreshUserData } = useAuth();
  const [portfolioData, setPortfolioData] = useState(null);
  const [editingSettings, setEditingSettings] = useState(false);
  const [privacySettings, setPrivacySettings] = useState({
    is_public: true,
    show_streak: true,
    show_xp: true,
    show_tasks: true,
    show_analytics: true
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPortfolio();
  }, [user]);

  async function loadPortfolio() {
    if (!user) return;
    setLoading(true);
    try {
      const data = await apiRequest(`/profile/${user.username}`);
      setPortfolioData(data);
      if (data.profile) {
        setPrivacySettings({
          is_public: Boolean(data.profile.is_public),
          show_streak: Boolean(data.profile.show_streak ?? true),
          show_xp: Boolean(data.profile.show_xp ?? true),
          show_tasks: Boolean(data.profile.show_tasks ?? true),
          show_analytics: Boolean(data.profile.show_analytics ?? true)
        });
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePrivacy() {
    try {
      await apiRequest('/auth/profile', {
        method: 'PUT',
        body: privacySettings
      });
      setEditingSettings(false);
      await refreshUserData();
      await loadPortfolio();
      alert('Portfolio privacy preferences updated.');
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) {
    return <div className="text-center py-16 text-slate-500 text-xs">Loading learning portfolio...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <User className="w-5 h-5 text-indigo-400" />
            <span>Public Learning Portfolio & Verified Showcase</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Showcase your verified work, accepted solutions, peer credentials, and learning milestones.
          </p>
        </div>

        <button
          onClick={() => setEditingSettings(!editingSettings)}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center space-x-2 transition self-start"
        >
          <Settings className="w-4 h-4 text-indigo-400" />
          <span>{editingSettings ? 'Close Settings' : 'Privacy & Display Controls'}</span>
        </button>
      </div>

      {/* Privacy Settings Drawer if open */}
      {editingSettings && (
        <div className="bg-slate-900 border border-indigo-900/40 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 text-indigo-400">
            <ShieldCheck className="w-4 h-4" />
            <h4 className="font-bold text-sm text-white">Portfolio Privacy & Exposure Settings</h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Choose what is visible on your public portfolio URL (`/profile/{user?.username}`). Private submissions, draft reviews, and chat history are always protected.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
            {[
              { key: 'is_public', label: 'Make Portfolio Publicly Accessible' },
              { key: 'show_streak', label: 'Display Consistency Streaks' },
              { key: 'show_xp', label: 'Display Level & XP Metrics' },
              { key: 'show_tasks', label: 'Display Verified Approved Tasks' },
              { key: 'show_analytics', label: 'Display Study Analytics Trends' }
            ].map(item => (
              <label key={item.key} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between cursor-pointer">
                <span className="text-xs text-slate-300 mr-2">{item.label}</span>
                <input
                  type="checkbox"
                  checked={Boolean(privacySettings[item.key])}
                  onChange={e => setPrivacySettings({ ...privacySettings, [item.key]: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500 h-4 w-4"
                />
              </label>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSavePrivacy}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition"
            >
              Save Preferences
            </button>
          </div>
        </div>
      )}

      {/* Profile Showcase Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div className="flex items-center space-x-4">
            <img
              src={user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
              alt={user?.full_name}
              className="w-18 h-18 rounded-2xl object-cover ring-2 ring-indigo-500/40 shadow-xl"
            />
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-2xl font-extrabold text-white">{user?.full_name}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {user?.role}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">@{user?.username} &bull; Timezone: {user?.timezone}</p>
              <p className="text-xs text-slate-300 mt-2 max-w-xl leading-relaxed">{user?.bio || 'Passionate student and growth practitioner.'}</p>
            </div>
          </div>

          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400">Visibility:</span>
              <span className={`text-xs font-semibold flex items-center space-x-1 ${
                privacySettings.is_public ? 'text-emerald-400' : 'text-slate-500'
              }`}>
                {privacySettings.is_public ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                <span>{privacySettings.is_public ? 'Public' : 'Private'}</span>
              </span>
            </div>

            <div className="text-xs text-indigo-400 font-mono">
              Joined {new Date(user?.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Skills and Subjects Tags */}
        <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Core Skills & Tools:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(portfolioData?.profile?.skills || []).map((skill, idx) => (
                <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 font-medium">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Subjects of Study:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(portfolioData?.profile?.subjects || []).map((sub, idx) => (
                <span key={idx} className="px-2.5 py-1 rounded-lg bg-indigo-950/40 border border-indigo-900/40 text-xs text-indigo-300 font-medium">
                  {sub}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Showcase Tasks vs Public Achievements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Showcase of Verified Study Tasks */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <h4 className="font-bold text-sm text-white">Verified Approved Solutions</h4>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              {portfolioData?.showcaseTasks?.length || 0} showcase items
            </span>
          </div>

          <div className="space-y-3">
            {(portfolioData?.showcaseTasks || []).map(task => (
              <div key={task.id} className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{task.title}</span>
                  {task.verified_score && (
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      {task.verified_score} / 5.0 pts
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400">{task.subject} &bull; {task.topic}</div>
                {task.expected_outcome && (
                  <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed mt-1">
                    {task.expected_outcome}
                  </p>
                )}
                <div className="text-[10px] text-slate-500 pt-1">
                  Verified on {new Date(task.completed_at).toLocaleDateString()}
                </div>
              </div>
            ))}

            {(!portfolioData?.showcaseTasks || portfolioData.showcaseTasks.length === 0) && (
              <div className="text-center py-10 text-xs text-slate-500">
                No approved study tasks yet. Once peer or mentor reviews are approved, they appear here.
              </div>
            )}
          </div>
        </div>

        {/* Accepted Solutions & Doubt Resolution Contributions */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h4 className="font-bold text-sm text-white">Community Accepted Solutions</h4>
            </div>
            <span className="text-[11px] text-slate-500">Doubt-solving contributions</span>
          </div>

          <div className="space-y-3">
            {(portfolioData?.acceptedSolutions || []).map(sol => (
              <div key={sol.id} className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800 space-y-1">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold uppercase inline-block mb-1">
                  Accepted Answer
                </span>
                <p className="text-xs text-slate-200 line-clamp-3 leading-relaxed whitespace-pre-wrap font-mono">
                  {sol.content}
                </p>
                <div className="text-[10px] text-slate-500 pt-1">
                  Resolved on {new Date(sol.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}

            {(!portfolioData?.acceptedSolutions || portfolioData.acceptedSolutions.length === 0) && (
              <div className="text-center py-10 text-xs text-slate-500">
                Answers marked as accepted solutions by peers will be highlighted here.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
