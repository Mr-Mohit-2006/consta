import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Users, Plus, Lock, Globe, Key, Shield, CheckCircle, ArrowRight,
  MessageSquare, CheckSquare, Award, Clock, BarChart3, UserCheck,
  Crown, Trash2, UserPlus, AlertCircle, ChevronLeft
} from 'lucide-react';

export default function GroupStudyView({ onNavigate, onOpenTask, onOpenChatRoom }) {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [roomDetails, setRoomDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileView, setMobileView] = useState('details'); // 'list' | 'details' for mobile responsiveness

  // New room modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('Computer Science');
  const [description, setDescription] = useState('');
  const [objectives, setObjectives] = useState('');
  const [roomType, setRoomType] = useState('public');

  // Join code modal
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinTargetRoom, setJoinTargetRoom] = useState(null);
  const [joinCode, setJoinCode] = useState('');

  // Group analytics tab
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [groupAnalytics, setGroupAnalytics] = useState(null);

  // Member management state
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [memberIdentifier, setMemberIdentifier] = useState('');
  const [memberRole, setMemberRole] = useState('member');
  const [memberActionLoading, setMemberActionLoading] = useState(false);
  const [memberActionError, setMemberActionError] = useState('');

  useEffect(() => {
    loadRooms();
  }, [user]);

  async function loadRooms() {
    setLoading(true);
    try {
      const data = await apiRequest('/study-rooms');
      setRooms(data);
      if (data.length > 0 && !selectedRoomId) {
        loadRoomDetails(data[0].id);
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function loadRoomDetails(id) {
    setSelectedRoomId(id);
    setMobileView('details');
    try {
      const details = await apiRequest(`/study-rooms/${id}`);
      setRoomDetails(details);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleCreateRoom(e) {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const res = await apiRequest('/study-rooms', {
        method: 'POST',
        body: {
          name: name.trim(),
          subject,
          description,
          objectives,
          room_type: roomType
        }
      });
      setShowCreateModal(false);
      setName('');
      setDescription('');
      setObjectives('');
      await loadRooms();
      loadRoomDetails(res.room.id);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleAddMember(e) {
    e.preventDefault();
    if (!memberIdentifier.trim() || !selectedRoomId) return;

    setMemberActionLoading(true);
    setMemberActionError('');
    try {
      await apiRequest(`/study-rooms/${selectedRoomId}/members`, {
        method: 'POST',
        body: { identifier: memberIdentifier.trim(), role: memberRole }
      });
      setShowAddMemberModal(false);
      setMemberIdentifier('');
      await loadRoomDetails(selectedRoomId);
      await loadRooms();
    } catch (err) {
      setMemberActionError(err.message || 'Failed to add member.');
    } finally {
      setMemberActionLoading(false);
    }
  }

  async function handleRemoveMember(memberUserId, memberName) {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from this study group?`)) return;

    try {
      await apiRequest(`/study-rooms/${selectedRoomId}/members/${memberUserId}`, {
        method: 'DELETE'
      });
      await loadRoomDetails(selectedRoomId);
      await loadRooms();
    } catch (err) {
      alert('Failed to remove member: ' + err.message);
    }
  }

  async function handleChangeMemberRole(memberUserId, newRole) {
    try {
      await apiRequest(`/study-rooms/${selectedRoomId}/members/${memberUserId}/role`, {
        method: 'PUT',
        body: { role: newRole }
      });
      await loadRoomDetails(selectedRoomId);
    } catch (err) {
      alert('Failed to update role: ' + err.message);
    }
  }

  async function handleJoinRoom(roomId, isPrivate) {
    if (isPrivate) {
      const target = rooms.find(r => r.id === roomId);
      setJoinTargetRoom(target);
      setShowJoinModal(true);
      return;
    }

    try {
      await apiRequest(`/study-rooms/${roomId}/join`, {
        method: 'POST',
        body: {}
      });
      await loadRooms();
      loadRoomDetails(roomId);
    } catch (err) {
      alert(err.message);
    }
  }

  async function submitJoinCode(e) {
    e.preventDefault();
    if (!joinTargetRoom) return;

    try {
      await apiRequest(`/study-rooms/${joinTargetRoom.id}/join`, {
        method: 'POST',
        body: { join_code: joinCode.trim() }
      });
      setShowJoinModal(false);
      setJoinCode('');
      await loadRooms();
      loadRoomDetails(joinTargetRoom.id);
    } catch (err) {
      alert(err.message);
    }
  }

  async function loadGroupAnalytics() {
    if (!selectedRoomId) return;
    try {
      const data = await apiRequest(`/study-rooms/${selectedRoomId}/analytics`);
      setGroupAnalytics(data);
      setShowAnalytics(true);
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <span>Group Study Rooms</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Collaborate in focused rooms, tackle shared assignments, conduct peer reviews, and resolve doubts.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Create Study Room</span>
        </button>
      </div>

      {/* Mobile Screen Segmented Switcher */}
      <div className="flex lg:hidden rounded-2xl bg-slate-900 p-1 border border-slate-800">
        <button
          onClick={() => setMobileView('list')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer ${
            mobileView === 'list' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Available Cohorts ({rooms.length})</span>
        </button>
        <button
          onClick={() => setMobileView('details')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer ${
            mobileView === 'details' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Cohort Overview & Tasks</span>
        </button>
      </div>

      {/* Main Two-Column View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Room List */}
        <div className={`space-y-3 ${mobileView === 'list' ? 'block' : 'hidden lg:block'}`}>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            Available Cohorts ({rooms.length})
          </div>

          <div className="space-y-2.5">
            {rooms.map(r => {
              const isSelected = r.id === selectedRoomId;
              const isPrivate = r.room_type !== 'public';

              return (
                <div
                  key={r.id}
                  onClick={() => loadRoomDetails(r.id)}
                  className={`p-4 rounded-2xl border transition cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500/50 shadow-lg'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-slate-800 text-indigo-300">
                      {r.subject}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center space-x-1">
                      {isPrivate ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Globe className="w-3.5 h-3.5 text-emerald-400" />}
                      <span className="capitalize">{r.room_type}</span>
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-white mt-2">{r.name}</h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{r.description}</p>

                  <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{r.member_count} member(s)</span>
                    {r.user_role ? (
                      <span className="text-indigo-400 font-medium capitalize flex items-center space-x-1">
                        <UserCheck className="w-3 h-3" />
                        <span>{r.user_role}</span>
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleJoinRoom(r.id, isPrivate);
                        }}
                        className="text-indigo-400 hover:text-indigo-300 font-semibold"
                      >
                        Join Room &rarr;
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 2 Columns: Room Details, Members, Tasks, and Discussions */}
        <div className={`lg:col-span-2 ${mobileView === 'details' ? 'block' : 'hidden lg:block'}`}>
          {roomDetails ? (
            <div className="space-y-6">
              {/* Room Header Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setMobileView('list')}
                        className="lg:hidden p-1.5 rounded-xl bg-slate-800 text-indigo-300 text-xs font-bold flex items-center space-x-1 border border-slate-700"
                        title="Back to Cohorts List"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Cohorts</span>
                      </button>
                      <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {roomDetails.room.subject}
                      </span>
                      {roomDetails.room.room_type !== 'public' && (
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          Code: {roomDetails.room.join_code}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-white mt-2">{roomDetails.room.name}</h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{roomDetails.room.description}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      onClick={() => onOpenChatRoom && onOpenChatRoom(roomDetails.chatRoomId)}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-lg shadow-indigo-600/30 transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Room Chat</span>
                    </button>
                    <button
                      onClick={loadGroupAnalytics}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 border border-slate-700 transition"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Analytics</span>
                    </button>
                  </div>
                </div>

                {roomDetails.room.objectives && (
                  <div className="mt-4 p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 text-xs">
                    <span className="font-semibold text-slate-300 block mb-1">Study Objectives:</span>
                    <p className="text-slate-400 leading-relaxed">{roomDetails.room.objectives}</p>
                  </div>
                )}
              </div>

              {/* Members Strip */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Cohort Members ({roomDetails.members?.length || 0})</span>
                  </h4>
                  
                  {/* If current user is the Room Mentor / Creator */}
                  {roomDetails.room.owner_id === user?.id && (
                    <button
                      onClick={() => {
                        setShowAddMemberModal(true);
                        setMemberActionError('');
                      }}
                      className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ Add / Invite Member</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {(roomDetails.members || []).map(m => (
                    <div key={m.user_id} className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <img
                          src={m.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.full_name)}&background=4f46e5&color=fff`}
                          alt={m.full_name}
                          className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-700"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-200 truncate">{m.full_name}</div>
                          <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 mt-0.5">
                            {m.role === 'owner' ? (
                              <span className="text-amber-400 font-bold flex items-center space-x-1">
                                <Crown className="w-3 h-3 text-amber-400" />
                                <span>Mentor</span>
                              </span>
                            ) : (
                              <span className="capitalize text-slate-400 font-medium">
                                {m.role}
                              </span>
                            )}
                            <span>&bull; {m.study_streak || 0}d streak</span>
                          </div>
                        </div>
                      </div>

                      {/* Mentor actions on members */}
                      {roomDetails.room.owner_id === user?.id && m.role !== 'owner' && (
                        <div className="flex items-center space-x-1 ml-2">
                          <select
                            value={m.role}
                            onChange={e => handleChangeMemberRole(m.user_id, e.target.value)}
                            className="bg-slate-900 border border-slate-700 text-slate-300 rounded-lg px-1.5 py-0.5 text-[10px] focus:outline-hidden"
                            title="Edit member role"
                          >
                            <option value="member">Member</option>
                            <option value="moderator">Moderator</option>
                          </select>
                          <button
                            onClick={() => handleRemoveMember(m.user_id, m.full_name)}
                            className="p-1 hover:bg-rose-500/20 text-rose-400 rounded-lg transition"
                            title="Remove member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Shared Study Tasks */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-bold text-sm text-white flex items-center space-x-2">
                      <CheckSquare className="w-4 h-4 text-indigo-400" />
                      <span>Shared Study Tasks</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Assigned assignments, peer submissions, and verifications.
                    </p>
                  </div>

                  <button
                    onClick={() => onNavigate('tasks')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    + Create Task
                  </button>
                </div>

                <div className="space-y-2.5">
                  {(roomDetails.tasks || []).map(t => (
                    <div
                      key={t.id}
                      onClick={() => onOpenTask && onOpenTask(t.id)}
                      className="p-4 rounded-2xl bg-slate-950/40 hover:bg-slate-800/50 border border-slate-800/80 flex items-center justify-between cursor-pointer transition"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-300">
                            {t.topic || t.subject}
                          </span>
                          <span className="text-xs font-bold text-white">{t.title}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-1">{t.instructions}</p>
                      </div>

                      <div className="text-right shrink-0 pl-3">
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${
                          t.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                          t.status === 'under_review' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {t.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}

                  {(!roomDetails.tasks || roomDetails.tasks.length === 0) && (
                    <div className="text-center py-8 text-xs text-slate-500">
                      No shared study tasks in this room yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 text-xs">
              Select a study room from the left to view members, shared assignments, and discussions.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create Room */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Create Study Room</h3>
            <p className="text-xs text-slate-400 mb-4">Set up a collaborative study group with shared objectives.</p>

            <form onSubmit={handleCreateRoom} className="space-y-3.5">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Room Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Distributed Consensus & Systems Design"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Access Privacy</label>
                  <select
                    value={roomType}
                    onChange={e => setRoomType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="public">Public (Anyone can browse and join)</option>
                    <option value="private">Private (Requires Join Code)</option>
                    <option value="invite_only">Invite Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Cohort Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What is this cohort focused on?"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Study Objectives</label>
                <textarea
                  rows={2}
                  value={objectives}
                  onChange={e => setObjectives(e.target.value)}
                  placeholder="e.g. Complete 2 algorithmic tasks weekly and review peer solutions"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Create Cohort
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Join Code */}
      {showJoinModal && joinTargetRoom && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Enter Room Join Code</h3>
            <p className="text-xs text-slate-400 mb-4">
              "{joinTargetRoom.name}" is a private room. Please enter the invitation code to join.
            </p>

            <form onSubmit={submitJoinCode} className="space-y-3">
              <input
                type="text"
                required
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
                placeholder="e.g. ALGO-2026"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-center font-mono font-bold tracking-widest text-white uppercase"
              />

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Join Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Group Analytics */}
      {showAnalytics && groupAnalytics && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-indigo-400" />
                <span>Group Participation & Turnaround Analytics</span>
              </h3>
              <button
                onClick={() => setShowAnalytics(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-slate-400">Total Members</div>
                <div className="text-xl font-bold text-white mt-1">{groupAnalytics.members}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{groupAnalytics.facilitators} moderators/owners</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-slate-400">Shared Task Completion</div>
                <div className="text-xl font-bold text-emerald-400 mt-1">{groupAnalytics.taskCompletionRate}%</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{groupAnalytics.completedTasks}/{groupAnalytics.totalTasks} completed</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-slate-400">Avg Review Turnaround</div>
                <div className="text-xl font-bold text-cyan-400 mt-1">
                  {groupAnalytics.avgReviewTurnaroundHours !== null ? `${groupAnalytics.avgReviewTurnaroundHours} hrs` : 'N/A'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Time from submission to review</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-slate-400">Helpful Solutions & Doubts</div>
                <div className="text-xl font-bold text-amber-400 mt-1">{groupAnalytics.acceptedSolutions}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{groupAnalytics.helpfulReactions} upvotes in discussions</div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed italic">
              Note: Analytics are computed strictly from verified database records. Group membership alone does not award participation credit.
            </p>
          </div>
        </div>
      )}
      {/* Modal: Add / Invite Member (for Mentor / Owner) */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center space-x-2">
              <UserPlus className="w-4 h-4 text-indigo-400" />
              <span>Add Member to Study Cohort</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Invite a user by their username or email to collaborate in this room.
            </p>

            {memberActionError && (
              <div className="p-3 rounded-xl mb-4 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{memberActionError}</span>
              </div>
            )}

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">Username or Email</label>
                <input
                  type="text"
                  required
                  value={memberIdentifier}
                  onChange={e => setMemberIdentifier(e.target.value)}
                  placeholder="e.g. learner_username or learner@example.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">Assigned Role</label>
                <select
                  value={memberRole}
                  onChange={e => setMemberRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                >
                  <option value="member">Member (Can participate, submit work & chat)</option>
                  <option value="moderator">Moderator (Can help review & manage tasks)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={memberActionLoading}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30"
                >
                  {memberActionLoading ? 'Adding...' : 'Add to Cohort'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
