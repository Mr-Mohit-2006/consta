import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Users, UserPlus, Flame, Check, X, Clock, Sparkles, Send, ArrowRight
} from 'lucide-react';

export default function FriendsModal({ isOpen, onClose, onNavigateToTask }) {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [activity, setActivity] = useState([]);
  const [tab, setTab] = useState('buddies'); // 'buddies' | 'activity' | 'add'
  const [newFriendId, setNewFriendId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadFriendsData();
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

  async function handleAddFriend(e) {
    e.preventDefault();
    if (!newFriendId.trim()) return;

    try {
      await apiRequest('/friends', {
        method: 'POST',
        body: { identifier: newFriendId.trim() }
      });
      setNewFriendId('');
      setTab('buddies');
      await loadFriendsData();
      alert('Study buddy connected! You will now receive push notifications when each other starts a task or challenge.');
    } catch (err) {
      alert(err.message);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-sm text-white">Study Buddies & Friend Activity</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-2">
          <button
            onClick={() => setTab('buddies')}
            className={`pb-2.5 text-xs font-semibold mr-6 border-b-2 transition ${
              tab === 'buddies' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            My Buddies ({friends.length})
          </button>
          <button
            onClick={() => setTab('activity')}
            className={`pb-2.5 text-xs font-semibold mr-6 border-b-2 transition ${
              tab === 'activity' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            Live Activity Feed
          </button>
          <button
            onClick={() => setTab('add')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition ${
              tab === 'add' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            + Connect Buddy
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {tab === 'buddies' ? (
            <div className="space-y-2.5">
              <div className="text-[11px] text-slate-400 mb-2 leading-relaxed">
                When your study buddies start a study task or launch a challenge, you receive real-time push alerts to study together!
              </div>

              {friends.map(f => (
                <div key={f.id} className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img
                      src={f.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                      alt={f.full_name}
                      className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-700"
                    />
                    <div>
                      <div className="font-semibold text-xs text-white">{f.full_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">@{f.username} &bull; {f.role}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 text-amber-400 text-xs font-bold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                    <Flame className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{f.study_streak || 0}d</span>
                  </div>
                </div>
              ))}

              {friends.length === 0 && (
                <div className="text-center py-10 text-xs text-slate-500">
                  No study buddies connected yet. Click "+ Connect Buddy" to add one!
                </div>
              )}
            </div>
          ) : tab === 'activity' ? (
            <div className="space-y-2.5">
              {activity.map((act, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2.5">
                    <img
                      src={act.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
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
            <form onSubmit={handleAddFriend} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Connect by Username or Email
                </label>
                <input
                  type="text"
                  required
                  value={newFriendId}
                  onChange={e => setNewFriendId(e.target.value)}
                  placeholder="e.g. sam_study or dr_stone"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-900/40 text-xs text-slate-300 leading-relaxed space-y-1">
                <span className="font-semibold text-indigo-300 block">Mutual Notifications:</span>
                <p>&bull; Get notified whenever your friend starts a study task.</p>
                <p>&bull; Receive alerts when they launch or start a sprint challenge.</p>
                <p>&bull; Compete on challenge leaderboards!</p>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center space-x-1.5 shadow-lg shadow-indigo-600/30 transition"
              >
                <UserPlus className="w-4 h-4" />
                <span>Connect as Study Buddy</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
