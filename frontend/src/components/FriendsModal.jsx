import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Users, UserPlus, Flame, Check, X, Clock, Sparkles, Send,
  Search, Copy, CheckCircle2, AlertCircle, Hash, Trash2, UserCheck, Shield
} from 'lucide-react';

export default function FriendsModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [tab, setTab] = useState('friends'); // 'friends' | 'requests' | 'add'
  const [loading, setLoading] = useState(false);

  // Search friend by User ID or username state
  const [searchId, setSearchId] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState(null); // { user, is_self, is_friend, friend_status }
  const [searchError, setSearchError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    loadFriendsData();
    setSearchError('');
    setSearchResult(null);

    // Silent background sync while modal is open (every 2.5 seconds)
    const interval = setInterval(async () => {
      try {
        const [fList, reqs] = await Promise.all([
          apiRequest('/friends'),
          apiRequest('/friends/requests')
        ]);
        setFriends(fList || []);
        setRequests(reqs || { incoming: [], outgoing: [] });
      } catch {
        // silent
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [isOpen]);

  async function loadFriendsData() {
    setLoading(true);
    try {
      const fList = await apiRequest('/friends');
      setFriends(fList || []);

      const reqs = await apiRequest('/friends/requests');
      setRequests(reqs || { incoming: [], outgoing: [] });
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

  async function handleSendFriendRequest(targetId) {
    setActionLoading(true);
    try {
      const res = await apiRequest('/friends', {
        method: 'POST',
        body: { identifier: targetId }
      });
      await loadFriendsData();
      if (searchResult) {
        setSearchResult(prev => ({
          ...prev,
          friend_status: res.status === 'accepted' ? 'accepted' : 'pending_sent',
          is_friend: res.status === 'accepted'
        }));
      }
      alert(res.message || 'Friend request sent!');
    } catch (err) {
      alert(err.message || 'Failed to send friend request.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleApproveRequest(requestId, senderName) {
    // Instant optimistic update
    const approvedItem = requests.incoming.find(r => r.request_id === requestId || r.user_id === requestId);
    if (approvedItem) {
      setRequests(prev => ({
        ...prev,
        incoming: prev.incoming.filter(r => r.request_id !== requestId && r.user_id !== requestId)
      }));
      setFriends(prev => {
        if (prev.some(f => f.id === approvedItem.user_id)) return prev;
        return [...prev, {
          id: approvedItem.user_id,
          username: approvedItem.username,
          full_name: approvedItem.full_name,
          avatar_url: approvedItem.avatar_url,
          study_streak: approvedItem.study_streak || 0
        }];
      });
    }

    try {
      await apiRequest(`/friends/requests/${requestId}/approve`, { method: 'POST' });
      await loadFriendsData();
      if (searchResult) {
        setSearchResult(prev => ({ ...prev, friend_status: 'accepted', is_friend: true }));
      }
    } catch (err) {
      alert(err.message || 'Failed to approve friend request.');
      await loadFriendsData();
    }
  }

  async function handleRejectRequest(requestId) {
    // Instant optimistic update
    setRequests(prev => ({
      ...prev,
      incoming: prev.incoming.filter(r => r.request_id !== requestId && r.user_id !== requestId)
    }));

    try {
      await apiRequest(`/friends/requests/${requestId}/reject`, { method: 'POST' });
      await loadFriendsData();
      if (searchResult) {
        setSearchResult(prev => ({ ...prev, friend_status: 'none', is_friend: false }));
      }
    } catch (err) {
      alert(err.message || 'Failed to decline request.');
      await loadFriendsData();
    }
  }

  async function handleRemoveFriend(friendId, friendName) {
    if (!window.confirm(`Are you sure you want to remove ${friendName || 'this friend'} from your friends?`)) return;

    // Instant optimistic update
    setFriends(prev => prev.filter(f => f.id !== friendId));

    try {
      await apiRequest(`/friends/${friendId}`, { method: 'DELETE' });
      await loadFriendsData();
      if (searchResult && searchResult.user?.id === friendId) {
        setSearchResult(prev => ({ ...prev, friend_status: 'none', is_friend: false }));
      }
    } catch (err) {
      alert(err.message || 'Failed to remove friend.');
      await loadFriendsData();
    }
  }

  function handleCopyMyId() {
    if (!user?.id) return;
    navigator.clipboard.writeText(String(user.id));
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  }

  if (!isOpen) return null;

  const incomingCount = requests.incoming?.length || 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-sm text-white">Friends Network</h3>
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
            onClick={() => setTab('friends')}
            className={`pb-2.5 text-xs font-semibold mr-5 border-b-2 transition whitespace-nowrap cursor-pointer ${
              tab === 'friends' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            My Friends ({friends.length})
          </button>
          <button
            onClick={() => setTab('requests')}
            className={`pb-2.5 text-xs font-semibold mr-5 border-b-2 transition whitespace-nowrap flex items-center space-x-1.5 cursor-pointer ${
              tab === 'requests' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <span>Friend Requests</span>
            {incomingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-500 text-white text-[10px] font-bold">
                {incomingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('add')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
              tab === 'add' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            🔍 Add Friend
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {tab === 'friends' ? (
            <div className="space-y-2.5">
              <div className="text-[11px] text-slate-400 mb-2 leading-relaxed bg-indigo-950/20 p-2.5 rounded-xl border border-indigo-900/30 flex items-start space-x-2">
                <Shield className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  Approved friends can view your study profile and streaks even if set to private, and receive alerts when you study together.
                </span>
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

                  <div className="flex items-center space-x-2 shrink-0">
                    <div className="flex items-center space-x-1.5 text-amber-400 text-xs font-bold bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20">
                      <Flame className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{f.study_streak || 0}d</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFriend(f.id, f.full_name)}
                      className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/15 border border-slate-800 hover:border-rose-500/30 transition cursor-pointer"
                      title="Remove friend"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {friends.length === 0 && (
                <div className="text-center py-10 text-xs text-slate-500 space-y-2">
                  <p>No friends connected yet.</p>
                  <button
                    onClick={() => setTab('add')}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-bold hover:bg-indigo-600/30 transition cursor-pointer"
                  >
                    Add Friend by Unique ID &rarr;
                  </button>
                </div>
              )}
            </div>
          ) : tab === 'requests' ? (
            /* Friend Requests Tab (Incoming & Outgoing with Approvals) */
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                  <span>Incoming Requests ({requests.incoming?.length || 0})</span>
                  <span className="text-[10px] font-normal text-slate-500">Requires your approval</span>
                </h4>

                {requests.incoming && requests.incoming.length > 0 ? (
                  <div className="space-y-2">
                    {requests.incoming.map(req => (
                      <div key={req.request_id} className="p-3.5 rounded-2xl bg-indigo-950/20 border border-indigo-900/40 flex items-center justify-between">
                        <div className="flex items-center space-x-3 min-w-0">
                          <img
                            src={req.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.full_name)}&background=4f46e5&color=fff`}
                            alt={req.full_name}
                            className="w-10 h-10 rounded-xl object-cover ring-1 ring-indigo-500/30 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-xs text-white truncate">{req.full_name}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center space-x-1.5">
                              <span className="font-mono text-indigo-400">@{req.username}</span>
                              <span>&bull;</span>
                              <span className="font-mono text-[10px] text-slate-400">ID #{req.user_id}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={() => handleApproveRequest(req.request_id, req.full_name)}
                            className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1 shadow-sm transition cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectRequest(req.request_id)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-800 transition cursor-pointer"
                            title="Decline request"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800">
                    No pending incoming requests.
                  </div>
                )}
              </div>

              {requests.outgoing && requests.outgoing.length > 0 && (
                <div className="pt-2 border-t border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Sent Requests ({requests.outgoing.length})
                  </h4>
                  <div className="space-y-2">
                    {requests.outgoing.map(req => (
                      <div key={req.request_id} className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <img
                            src={req.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.full_name)}&background=4f46e5&color=fff`}
                            alt={req.full_name}
                            className="w-7 h-7 rounded-lg object-cover ring-1 ring-slate-700"
                          />
                          <div className="truncate">
                            <span className="font-semibold text-slate-200">{req.full_name}</span>{' '}
                            <span className="text-indigo-400 font-mono">@{req.username}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 shrink-0">
                          <span className="text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded font-medium border border-amber-500/20">
                            Waiting for approval
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFriend(req.user_id, req.full_name)}
                            className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                            title="Cancel request"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
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
                    Share your ID with peers to let them send you a friend request:
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
                    ) : searchResult.is_friend || searchResult.friend_status === 'accepted' ? (
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Connected Friend</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFriend(searchResult.user.id, searchResult.user.full_name)}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold transition cursor-pointer"
                        >
                          Remove Friend
                        </button>
                      </div>
                    ) : searchResult.friend_status === 'pending_sent' ? (
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
                          Request Pending Approval
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFriend(searchResult.user.id, searchResult.user.full_name)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : searchResult.friend_status === 'pending_received' ? (
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleApproveRequest(searchResult.user.id, searchResult.user.full_name)}
                          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center space-x-1 shadow-md cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve Request</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectRequest(searchResult.user.id)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs cursor-pointer"
                        >
                          Decline
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendFriendRequest(searchResult.user.id)}
                        disabled={actionLoading}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-indigo-600/30 transition cursor-pointer"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>{actionLoading ? 'Sending...' : 'Send Friend Request'}</span>
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
