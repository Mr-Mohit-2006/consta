import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Users, UserPlus, Flame, Check, X, Clock, Sparkles, Send, ArrowRight,
  Search, Copy, CheckCircle2, AlertCircle, Hash
} from 'lucide-react';

export default function FriendsModal({ isOpen, onClose, onNavigateToTask }) {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [activity, setActivity] = useState([]);
  const [tab, setTab] = useState('buddies'); // 'buddies' | 'activity' | 'add'
  const [loading, setLoading] = useState(false);

  // Search friend by User ID or username state
  const [searchId, setSearchId] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState(null); // { user, is_self, is_friend }
  const [searchError, setSearchError] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadFriendsData();
      setSearchError('');
      setSearchResult(null);
    }
  }, [isOpen]);

  async function loadFriendsData() {
    setLoading(true);
    try {
      const fList = await apiRequest('/friends');
      setFriends(fList);

      const actList = await apiRequest('/friends/activity');
      setActivity(actList);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleSearchFriend(e) {
    if (e) e.preventDefault();
    if (!searchId.trim()) return;

    setSearchLoading(true);
    setSearchError('');
    setSearchResult(null);
    try {
      const data = await apiRequest(`/friends/search?id=${encodeURIComponent(searchId.trim())}`);
      setSearchResult(data);
    } catch (err) {
      setSearchError(err.message || 'No user found with that ID or username.');
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleConnectUser(targetId) {
    setAddLoading(true);
    try {
      await apiRequest('/friends', {
        method: 'POST',
        body: { identifier: targetId }
      });
      await loadFriendsData();
      setSearchResult(prev => prev ? { ...prev, is_friend: true } : null);
      alert('Study buddy connected! You will now receive push alerts when they start a task or challenge.');
    } catch (err) {
      alert(err.message);
    } finally {
      setAddLoading(false);
    }
  }

  function handleCopyMyId() {
    if (!user?.id) return;
    navigator.clipboard.writeText(String(user.id));
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-sm text-white">Study Buddies & Friend Network</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-4 sm:px-6 pt-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setTab('buddies')}
            className={`pb-2.5 text-xs font-semibold mr-5 border-b-2 transition whitespace-nowrap cursor-pointer ${
              tab === 'buddies' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            My Buddies ({friends.length})
          </button>
          <button
            onClick={() => setTab('activity')}
            className={`pb-2.5 text-xs font-semibold mr-5 border-b-2 transition whitespace-nowrap cursor-pointer ${
              tab === 'activity' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            Live Activity Feed
          </button>
          <button
            onClick={() => setTab('add')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
              tab === 'add' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            🔍 Search & Connect
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {tab === 'buddies' ? (
            <div className="space-y-2.5">
              <div className="text-[11px] text-slate-400 mb-2 leading-relaxed bg-indigo-950/20 p-2.5 rounded-xl border border-indigo-900/30">
                🚀 When your study buddies start a study task or launch a challenge sprint, you automatically receive push alerts to study together!
              </div>

              {friends.map(f => (
                <div key={f.id} className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-3 min-w-0">
                    <img
                      src={f.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.full_name)}&background=4f46e5&color=fff`}
                      alt={f.full_name}
                      className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-700 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-white truncate">{f.full_name}</div>
                      <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 mt-0.5">
                        <span className="font-mono text-indigo-400">@{f.username}</span>
                        <span>&bull;</span>
                        <span className="font-mono px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-300 font-bold">
                          ID: #{f.id}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 text-amber-400 text-xs font-bold bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20 shrink-0">
                    <Flame className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{f.study_streak || 0}d</span>
                  </div>
                </div>
              ))}

              {friends.length === 0 && (
                <div className="text-center py-10 text-xs text-slate-500 space-y-2">
                  <p>No study buddies connected yet.</p>
                  <button
                    onClick={() => setTab('add')}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-bold hover:bg-indigo-600/30 transition cursor-pointer"
                  >
                    Search Friends by User ID &rarr;
                  </button>
                </div>
              )}
            </div>
          ) : tab === 'activity' ? (
            <div className="space-y-2.5">
              {activity.map((act, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2.5">
                    <img
                      src={act.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(act.full_name)}&background=4f46e5&color=fff`}
                      alt={act.full_name}
                      className="w-7 h-7 rounded-lg object-cover ring-1 ring-slate-700"
                    />
                    <div>
                      <span className="font-semibold text-slate-200">{act.full_name}</span>{' '}
                      <span className="text-slate-400">logged</span>{' '}
                      <span className="font-mono text-indigo-400 font-bold">{act.activity_type.replace('_', ' ')}</span>
                      <div className="text-[10px] text-slate-500">{act.activity_date}</div>
                    </div>
                  </div>
                </div>
              ))}

              {activity.length === 0 && (
                <div className="text-center py-10 text-xs text-slate-500">
                  No recent activity logged by buddies yet.
                </div>
              )}
            </div>
          ) : (
            /* Search by User ID or Username Tab */
            <div className="space-y-4">
              {/* My ID Card with 1-Click Copy */}
              <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-900/50 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                    Your Unique User ID
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">
                    Share your ID with friends to let them search and add you instantly:
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyMyId}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-xs shadow-md transition cursor-pointer shrink-0 ml-2"
                  title="Copy your user ID"
                >
                  <Hash className="w-3.5 h-3.5" />
                  <span>ID: #{user?.id}</span>
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Search by User ID Form with Search Button */}
              <form onSubmit={handleSearchFriend} className="space-y-2">
                <label className="text-xs text-slate-300 font-semibold block">
                  Search Friend by User ID, Username, or Email:
                </label>
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <Hash className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={searchId}
                      onChange={e => setSearchId(e.target.value)}
                      placeholder="e.g. 1, 2, or username..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={searchLoading || !searchId.trim()}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-indigo-600/30 transition cursor-pointer shrink-0"
                  >
                    <Search className="w-4 h-4" />
                    <span>{searchLoading ? 'Searching...' : 'Search'}</span>
                  </button>
                </div>
              </form>

              {/* Error Message */}
              {searchError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{searchError}</span>
                </div>
              )}

              {/* Search Result User Card */}
              {searchResult && (
                <div className="p-4 rounded-2xl bg-slate-950 border-2 border-indigo-500/60 shadow-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      User Found
                    </span>
                    <span className="text-xs font-mono font-bold text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800">
                      User ID #{searchResult.user.id}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3.5">
                    <img
                      src={searchResult.user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(searchResult.user.full_name)}&background=4f46e5&color=fff`}
                      alt={searchResult.user.full_name}
                      className="w-12 h-12 rounded-xl object-cover ring-2 ring-indigo-500/40 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-white">{searchResult.user.full_name}</div>
                      <div className="text-xs text-indigo-400 font-mono">@{searchResult.user.username}</div>
                      {searchResult.user.bio && (
                        <div className="text-[11px] text-slate-400 mt-1 line-clamp-1">{searchResult.user.bio}</div>
                      )}
                    </div>
                    {searchResult.user.study_streak > 0 && (
                      <div className="flex items-center space-x-1 text-amber-400 bg-amber-500/10 px-2 py-1 rounded-xl text-xs font-bold shrink-0">
                        <Flame className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{searchResult.user.study_streak}d</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex justify-end">
                    {searchResult.is_self ? (
                      <span className="text-xs text-slate-400 italic">
                        (This is your own account)
                      </span>
                    ) : searchResult.is_friend ? (
                      <span className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Already Study Buddies</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleConnectUser(searchResult.user.id)}
                        disabled={addLoading}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-indigo-600/30 transition cursor-pointer"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>{addLoading ? 'Connecting...' : 'Add as Study Buddy'}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}