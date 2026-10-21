import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Users, Plus, Lock, Globe, Key, ShieldCheck, CheckCircle, ArrowRight,
  MessageSquare, CheckSquare, Award, Clock, BarChart3, UserCheck,
  Crown, Trash2, UserPlus, AlertCircle, ChevronLeft, LogOut, LogIn,
  Search, Calendar, Square, Check, UserX, ShieldAlert
} from 'lucide-react';

export default function GroupStudyView({ onNavigate, onOpenTask, onOpenChatRoom }) {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [roomDetails, setRoomDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileView, setMobileView] = useState('details'); // 'list' | 'details'
  const [searchQuery, setSearchQuery] = useState('');

  // New room modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('Computer Science');
  const [description, setDescription] = useState('');
  const [objectives, setObjectives] = useState('');
  const [roomType, setRoomType] = useState('public'); // 'public' | 'private'

  // New task modal (inside group)
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskTopic, setTaskTopic] = useState('');
  const [taskInstructions, setTaskInstructions] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskSubmitting, setTaskSubmitting] = useState(false);

  // Group analytics modal
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

  async function handleDeleteGroup(roomId) {
    const targetRoom = rooms.find(r => r.id === roomId) || roomDetails?.room;
    const roomName = targetRoom?.name || 'this group';

    if (!window.confirm(`⚠️ Are you sure you want to permanently delete "${roomName}"? All tasks and group discussions will be removed.`)) {
      return;
    }

    try {
      await apiRequest(`/study-rooms/${roomId}`, { method: 'DELETE' });
      setSelectedRoomId(null);
      setRoomDetails(null);
      await loadRooms();
      alert('Group deleted successfully.');
    } catch (err) {
      alert(err.message || 'Failed to delete group.');
    }
  }

  async function handleJoinRoom(roomId) {
    try {
      const res = await apiRequest(`/study-rooms/${roomId}/join`, {
        method: 'POST'
      });
      if (res.pendingApproval) {
        alert('🔒 Join request sent! As this is a Private group, the Group Admin will review and approve your request.');
      } else {
        alert('🎉 Successfully joined study group!');
      }
      await loadRooms();
      loadRoomDetails(roomId);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleCancelRequest(roomId) {
    try {
      await apiRequest(`/study-rooms/${roomId}/cancel-request`, { method: 'POST' });
      await loadRooms();
      loadRoomDetails(roomId);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleApproveRequest(targetUserId) {
    try {
      await apiRequest(`/study-rooms/${selectedRoomId}/requests/${targetUserId}/approve`, {
        method: 'POST'
      });
      await loadRoomDetails(selectedRoomId);
      await loadRooms();
    } catch (err) {
      alert(err.message || 'Failed to approve user.');
    }
  }

  async function handleRejectRequest(targetUserId) {
    try {
      await apiRequest(`/study-rooms/${selectedRoomId}/requests/${targetUserId}/reject`, {
        method: 'POST'
      });
      await loadRoomDetails(selectedRoomId);
    } catch (err) {
      alert(err.message || 'Failed to decline request.');
    }
  }

  async function handleLeaveRoom(roomId) {
    const targetRoom = rooms.find(r => r.id === roomId) || roomDetails?.room;
    const roomName = targetRoom?.name || 'this group';

    if (!window.confirm(`Are you sure you want to leave "${roomName}"?`)) {
      return;
    }

    try {
      await apiRequest(`/study-rooms/${roomId}/leave`, {
        method: 'POST'
      });
      await loadRooms();
      if (selectedRoomId === roomId) {
        await loadRoomDetails(roomId);
      }
    } catch (err) {
      alert(err.message || 'Failed to leave group.');
    }
  }

  // Quick Task Creation directly in Group
  async function handleCreateTaskInGroup(e) {
    e.preventDefault();
    if (!taskTitle.trim() || !taskInstructions.trim() || !selectedRoomId) return;

    setTaskSubmitting(true);
    try {
      await apiRequest('/study-tasks', {
        method: 'POST',
        body: {
          title: taskTitle.trim(),
          instructions: taskInstructions.trim(),
          subject: roomDetails?.room?.subject || 'General Study',
          topic: taskTopic.trim() || 'Cohort Goal',
          room_id: Number(selectedRoomId),
          due_date: taskDueDate || null,
          priority: taskPriority,
          is_group_task: true
        }
      });

      setShowCreateTaskModal(false);
      setTaskTitle('');
      setTaskTopic('');
      setTaskInstructions('');
      setTaskDueDate('');
      setTaskPriority('medium');
      await loadRoomDetails(selectedRoomId);
    } catch (err) {
      alert(err.message || 'Failed to create task.');
    } finally {
      setTaskSubmitting(false);
    }
  }

  // Delete Task
  async function handleDeleteTask(taskId, title) {
    if (!window.confirm(`Are you sure you want to delete task "${title}"?`)) return;

    try {
      await apiRequest(`/study-tasks/${taskId}`, { method: 'DELETE' });
      await loadRoomDetails(selectedRoomId);
    } catch (err) {
      alert(err.message || 'Failed to delete task.');
    }
  }

  // Toggle Task Completion Checkbox
  async function handleToggleTask(taskId, e) {
    e.stopPropagation();
    try {
      const res = await apiRequest(`/study-tasks/${taskId}/toggle`, { method: 'PATCH' });
      if (roomDetails?.tasks) {
        setRoomDetails(prev => ({
          ...prev,
          tasks: prev.tasks.map(t => t.id === taskId ? { ...t, status: res.status } : t)
        }));
      }
    } catch (err) {
      alert(err.message || 'Failed to update task status.');
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
    if (!window.confirm(`Are you sure you want to remove ${memberName} from this group?`)) return;

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

  const filteredRooms = rooms.filter(r =>
    (r.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.subject || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isCurrentRoomAdmin = roomDetails?.room?.owner_id === user?.id;
  const isCurrentRoomMember = Boolean(roomDetails?.isMember);
  const isCurrentRoomPending = Boolean(roomDetails?.isPending);
  const isPrivateGroup = roomDetails?.room?.room_type === 'private';

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
            <span>Study Groups</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Choose Public or Private groups (Private requires Admin approval). Schedule tasks and collaborate seamlessly.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition self-start cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Group</span>
        </button>
      </div>

      {/* Mobile Screen Segmented Switcher */}
      <div className="flex lg:hidden rounded-2xl bg-slate-900/90 p-1 border border-slate-800">
        <button
          onClick={() => setMobileView('list')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer ${
            mobileView === 'list'
              ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>All Groups ({rooms.length})</span>
        </button>
        <button
          onClick={() => setMobileView('details')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer ${
            mobileView === 'details'
              ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Group Details & Tasks</span>
        </button>
      </div>

      {/* Main Two-Column View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Group List */}
        <div className={`space-y-3 ${mobileView === 'list' ? 'block' : 'hidden lg:block'}`}>
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Groups ({filteredRooms.length})
            </span>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search groups by name or subject..."
              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 transition"
            />
          </div>

          <div className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {filteredRooms.map(r => {
              const isSelected = r.id === selectedRoomId;
              const isPrivate = r.room_type === 'private';
              const isOwner = r.owner_id === user?.id;
              const isMember = r.user_status === 'active';
              const isPending = r.user_status === 'pending';

              return (
                <div
                  key={r.id}
                  onClick={() => loadRoomDetails(r.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500/50 shadow-lg shadow-indigo-950/50'
                      : 'glass-card glass-card-hover'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider bg-slate-800/80 text-indigo-300 border border-slate-700/60">
                      {r.subject}
                    </span>
                    <span className={`text-xs flex items-center space-x-1 ${isPrivate ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {isPrivate ? <Lock className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                      <span className="capitalize text-[11px] font-semibold">{isPrivate ? 'Private' : 'Public'}</span>
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-white mt-2 truncate">{r.name}</h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{r.description || 'Collaborative study cohort.'}</p>

                  <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">{r.member_count} member(s)</span>

                    {/* Role & Action Badges */}
                    <div className="flex items-center space-x-2">
                      {isOwner ? (
                        <span className="text-amber-400 font-bold flex items-center space-x-1 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                          <Crown className="w-3 h-3" />
                          <span>Admin</span>
                        </span>
                      ) : isMember ? (
                        <div className="flex items-center space-x-1.5">
                          <span className="text-emerald-400 font-semibold flex items-center space-x-1 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            <CheckCircle className="w-3 h-3" />
                            <span>Joined</span>
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLeaveRoom(r.id);
                            }}
                            className="text-[10px] text-rose-400 hover:text-rose-300 font-semibold hover:underline cursor-pointer"
                            title="Leave this group"
                          >
                            Leave
                          </button>
                        </div>
                      ) : isPending ? (
                        <span className="text-amber-400 text-[10px] font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30 animate-pulse">
                          ⏳ Pending Approval
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleJoinRoom(r.id);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center space-x-1 cursor-pointer ${
                            isPrivate
                              ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30'
                              : 'bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30'
                          }`}
                        >
                          {isPrivate ? <Lock className="w-3 h-3" /> : <LogIn className="w-3 h-3" />}
                          <span>{isPrivate ? 'Request' : 'Join'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredRooms.length === 0 && (
              <div className="text-center py-10 text-xs text-slate-500 glass-card rounded-2xl p-4">
                No groups found matching your search.
              </div>
            )}
          </div>
        </div>

        {/* Right 2 Columns: Room Details, Members, Tasks */}
        <div className={`lg:col-span-2 ${mobileView === 'details' ? 'block' : 'hidden lg:block'}`}>
          {roomDetails ? (
            <div className="space-y-6">
              {/* Group Header Card */}
              <div className="glass-panel rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => setMobileView('list')}
                        className="lg:hidden p-1.5 rounded-xl bg-slate-800 text-indigo-300 text-xs font-bold flex items-center space-x-1 border border-slate-700 cursor-pointer"
                        title="Back to Groups List"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>All Groups</span>
                      </button>

                      <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                        {roomDetails.room.subject}
                      </span>

                      {/* Public vs Private with Admin Approval Pill */}
                      <span className={`text-xs px-2.5 py-1 rounded-full border flex items-center space-x-1.5 font-semibold ${
                        isPrivateGroup
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      }`}>
                        {isPrivateGroup ? <Lock className="w-3 h-3 text-amber-400" /> : <Globe className="w-3 h-3 text-emerald-400" />}
                        <span>{isPrivateGroup ? 'Private (Needs Admin Approval)' : 'Public (Instant Join)'}</span>
                      </span>
                    </div>

                    <h3 className="text-2xl font-black text-white tracking-tight">{roomDetails.room.name}</h3>
                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{roomDetails.room.description || 'Collaborative study space.'}</p>

                    <div className="flex items-center space-x-2 mt-3 text-xs text-slate-400">
                      <span>Created by <strong className="text-white font-semibold">{roomDetails.room.owner_name}</strong> (Group Admin)</span>
                    </div>
                  </div>

                  {/* Header Action Buttons: Join, Leave, Delete Group, Chat, Analytics */}
                  <div className="flex flex-wrap sm:flex-col items-end gap-2 shrink-0">
                    {/* Status Button: Join / Request / Pending / Leave / Admin */}
                    {!isCurrentRoomMember ? (
                      isCurrentRoomPending ? (
                        <div className="flex items-center space-x-2">
                          <span className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center space-x-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                            <span>Request Pending Approval</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCancelRequest(roomDetails.room.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleJoinRoom(roomDetails.room.id)}
                          className={`px-4 py-2 rounded-xl text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg transition cursor-pointer ${
                            isPrivateGroup
                              ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                              : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                          }`}
                        >
                          {isPrivateGroup ? <Lock className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                          <span>{isPrivateGroup ? 'Request to Join Group' : 'Join Group'}</span>
                        </button>
                      )
                    ) : isCurrentRoomAdmin ? (
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center space-x-1">
                          <Crown className="w-3.5 h-3.5 text-amber-400" />
                          <span>Admin</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteGroup(roomDetails.room.id)}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                          title="Permanently delete this group"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          <span className="hidden sm:inline">Delete Group</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleLeaveRoom(roomDetails.room.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer"
                        title="Leave this group"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-400" />
                        <span>Leave Group</span>
                      </button>
                    )}

                    <div className="flex items-center gap-2">
                      {isCurrentRoomMember && (
                        <button
                          type="button"
                          onClick={() => onOpenChatRoom && onOpenChatRoom(roomDetails.chatRoomId)}
                          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-indigo-600/30 transition cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Group Chat</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={loadGroupAnalytics}
                        className="px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 border border-slate-700 transition cursor-pointer"
                        title="Group performance stats"
                      >
                        <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="hidden sm:inline">Analytics</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Private Group Guest Banner */}
                {isPrivateGroup && !isCurrentRoomMember && !isCurrentRoomPending && (
                  <div className="mt-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center space-x-3 text-xs text-amber-300">
                    <ShieldAlert className="w-5 h-5 shrink-0 text-amber-400" />
                    <div>
                      <strong>Private Study Group:</strong> Members must be approved by the Group Admin before viewing group tasks, discussions, and doubt channels. Click "Request to Join Group" above.
                    </div>
                  </div>
                )}

                {/* Objectives Callout */}
                {roomDetails.room.objectives && (
                  <div className="mt-4 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs">
                    <span className="font-bold text-slate-200 block mb-1">Study Objectives:</span>
                    <p className="text-slate-400 leading-relaxed">{roomDetails.room.objectives}</p>
                  </div>
                )}
              </div>

              {/* Pending Join Requests Panel (Admin Only) */}
              {isCurrentRoomAdmin && roomDetails.pendingRequests?.length > 0 && (
                <div className="glass-panel border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-xl bg-amber-950/20">
                  <div className="flex items-center justify-between mb-3.5">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-amber-300 flex items-center space-x-2">
                      <div className="p-1 rounded-md bg-amber-500/20 text-amber-400">
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                      <span>Pending Join Requests ({roomDetails.pendingRequests.length})</span>
                    </h4>
                    <span className="text-[11px] text-amber-400 font-semibold">Admin Approval Required</span>
                  </div>

                  <div className="space-y-2.5">
                    {roomDetails.pendingRequests.map(req => (
                      <div key={req.user_id} className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                        <div className="flex items-center space-x-3 min-w-0">
                          <img
                            src={req.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.full_name)}&background=4f46e5&color=fff`}
                            alt={req.full_name}
                            className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-700 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">{req.full_name}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              <span className="font-mono text-indigo-300">@{req.username}</span> &bull; {req.study_streak || 0}d streak
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleApproveRequest(req.user_id)}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1 shadow-md shadow-emerald-600/30 transition cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectRequest(req.user_id)}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 font-semibold text-xs border border-slate-700 transition cursor-pointer"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Members Section */}
              <div className="glass-panel rounded-3xl p-5 sm:p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                    <div className="p-1 rounded-md bg-indigo-500/20 text-indigo-400">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <span>Active Group Members ({roomDetails.members?.length || 0})</span>
                  </h4>

                  {/* Add Member Button (Admin Only) */}
                  {isCurrentRoomAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddMemberModal(true);
                        setMemberActionError('');
                      }}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ Invite Member</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {(roomDetails.members || []).map(m => {
                    const isAdmin = m.role === 'owner';
                    return (
                      <div key={m.user_id} className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <img
                            src={m.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.full_name)}&background=4f46e5&color=fff`}
                            alt={m.full_name}
                            className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-700 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">{m.full_name}</div>
                            <div className="flex items-center space-x-1.5 text-[10px] mt-0.5">
                              {isAdmin ? (
                                <span className="text-amber-400 font-extrabold flex items-center space-x-1 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                                  <Crown className="w-3 h-3 text-amber-400" />
                                  <span>Admin</span>
                                </span>
                              ) : (
                                <span className="capitalize text-slate-400 font-semibold bg-slate-800 px-1.5 py-0.2 rounded">
                                  {m.role}
                                </span>
                              )}
                              <span className="text-slate-400 font-medium">&bull; {m.study_streak || 0}d streak</span>
                            </div>
                          </div>
                        </div>

                        {/* Admin controls to manage roles / kick members */}
                        {isCurrentRoomAdmin && !isAdmin && (
                          <div className="flex items-center space-x-1 ml-2 shrink-0">
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
                              type="button"
                              onClick={() => handleRemoveMember(m.user_id, m.full_name)}
                              className="p-1 hover:bg-rose-500/20 text-rose-400 rounded-lg transition cursor-pointer"
                              title="Remove member"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Shared Study Tasks & Schedule */}
              {(isCurrentRoomMember || !isPrivateGroup) && (
                <div className="glass-panel rounded-3xl p-5 sm:p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-bold text-sm text-white flex items-center space-x-2">
                        <div className="p-1 rounded-md bg-purple-500/20 text-purple-400">
                          <CheckSquare className="w-3.5 h-3.5" />
                        </div>
                        <span>Group Task Schedule & Checkbox</span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Check off tasks when completed. Tasks with schedules are tracked here.
                      </p>
                    </div>

                    {/* Add Task Button directly inside group */}
                    {isCurrentRoomMember && (
                      <button
                        type="button"
                        onClick={() => setShowCreateTaskModal(true)}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Add Task</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {(roomDetails.tasks || []).map(t => {
                      const isTaskCompleted = t.status === 'completed' || t.status === 'approved';
                      const canDeleteTask = t.creator_id === user?.id || isCurrentRoomAdmin;

                      return (
                        <div
                          key={t.id}
                          onClick={() => onOpenTask && onOpenTask(t.id)}
                          className={`p-3.5 sm:p-4 rounded-2xl border transition flex items-center justify-between cursor-pointer group ${
                            isTaskCompleted
                              ? 'bg-slate-950/40 border-emerald-500/30 opacity-80'
                              : 'bg-slate-950/70 hover:bg-slate-900 border-slate-800/80 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center space-x-3 min-w-0 pr-3">
                            {/* Completion Checkbox */}
                            <button
                              type="button"
                              onClick={(e) => handleToggleTask(t.id, e)}
                              className={`p-1 rounded-lg border transition cursor-pointer shrink-0 ${
                                isTaskCompleted
                                  ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400'
                                  : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-indigo-400 hover:border-indigo-500'
                              }`}
                              title={isTaskCompleted ? "Mark as incomplete" : "Click checkbox to mark completed"}
                            >
                              {isTaskCompleted ? (
                                <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                                  {t.topic || t.subject}
                                </span>

                                <span className={`text-xs font-bold transition truncate ${
                                  isTaskCompleted ? 'line-through text-slate-400' : 'text-white group-hover:text-indigo-200'
                                }`}>
                                  {t.title}
                                </span>

                                {/* Task Schedule / Due Date */}
                                {t.due_date && (
                                  <span className="text-[10px] text-amber-300/90 flex items-center space-x-1 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 font-medium">
                                    <Calendar className="w-3 h-3 text-amber-400 shrink-0" />
                                    <span>Schedule: {new Date(t.due_date).toLocaleDateString()}</span>
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-slate-400 mt-1 line-clamp-1">{t.instructions}</p>
                            </div>
                          </div>

                          {/* Status pill & Delete Button */}
                          <div className="flex items-center space-x-2 shrink-0">
                            <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold capitalize ${
                              isTaskCompleted ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                              t.status === 'under_review' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                              t.status === 'in_progress' ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30' :
                              'bg-slate-800 text-slate-400'
                            }`}>
                              {isTaskCompleted ? '✓ Completed' : t.status.replace('_', ' ')}
                            </span>

                            {/* Delete Task Button */}
                            {canDeleteTask && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTask(t.id, t.title);
                                }}
                                className="p-1.5 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded-lg transition cursor-pointer"
                                title="Delete task"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {(!roomDetails.tasks || roomDetails.tasks.length === 0) && (
                      <div className="text-center py-8 text-xs text-slate-500 bg-slate-950/30 rounded-2xl border border-dashed border-slate-800">
                        No tasks scheduled in this group yet. Click <strong>"+ Add Task"</strong> above to schedule one!
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-panel rounded-3xl p-12 text-center text-slate-400 text-xs">
              Select a study group from the left to view members, shared assignments, and discussions.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create Room (Public vs Private with Admin Approval) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="glass-panel border-slate-700 rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-1">Create Study Group</h3>
            <p className="text-xs text-slate-400 mb-4">Set up a collaborative study group as Group Admin.</p>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">Group Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Distributed Systems & Algorithms"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">Subject</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* Public or Private Option with Admin Approval */}
              <div>
                <label className="text-xs text-slate-300 block mb-1.5 font-medium">Group Privacy & Access</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRoomType('public')}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      roomType === 'public'
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-600/20'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 mb-1">
                      <Globe className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white">Public Group</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Anyone can browse and join instantly without approval.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRoomType('private')}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      roomType === 'private'
                        ? 'bg-amber-500/20 border-amber-500 text-white shadow-md shadow-amber-500/20'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 mb-1">
                      <Lock className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-white">Private Group</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Users submit join requests; requires <strong>Admin approval</strong>.
                    </p>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">Group Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What is this group focused on?"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">Study Objectives</label>
                <textarea
                  rows={2}
                  value={objectives}
                  onChange={e => setObjectives(e.target.value)}
                  placeholder="e.g. Complete 2 tasks weekly, review peer solutions, and resolve doubts"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Task in Group */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="glass-panel border-slate-700 rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1 flex items-center space-x-2">
              <Plus className="w-5 h-5 text-indigo-400" />
              <span>Add Task to {roomDetails?.room?.name}</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Create an assignment or milestone for members of this study group.
            </p>

            <form onSubmit={handleCreateTaskInGroup} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">Task Title</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  placeholder="e.g. Implement Dijkstra Shortest Path"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1 font-medium">Topic / Module</label>
                  <input
                    type="text"
                    value={taskTopic}
                    onChange={e => setTaskTopic(e.target.value)}
                    placeholder="e.g. Graph Algorithms"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1 font-medium">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={e => setTaskPriority(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">Schedule / Due Date (Optional)</label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={e => setTaskDueDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">Task Instructions</label>
                <textarea
                  rows={3}
                  required
                  value={taskInstructions}
                  onChange={e => setTaskInstructions(e.target.value)}
                  placeholder="Provide instructions, acceptance criteria, or links for group members..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateTaskModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={taskSubmitting}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  {taskSubmitting ? 'Adding...' : 'Add Task to Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Group Analytics */}
      {showAnalytics && groupAnalytics && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="glass-panel border-slate-700 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-indigo-400" />
                <span>Group Participation Analytics</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAnalytics(false)}
                className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <div className="text-slate-400">Total Members</div>
                <div className="text-2xl font-black text-white mt-1">{groupAnalytics.members}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{groupAnalytics.facilitators} admin(s)/moderators</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <div className="text-slate-400">Task Completion Rate</div>
                <div className="text-2xl font-black text-emerald-400 mt-1">{groupAnalytics.taskCompletionRate}%</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{groupAnalytics.completedTasks}/{groupAnalytics.totalTasks} completed</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <div className="text-slate-400">Avg Review Time</div>
                <div className="text-2xl font-black text-cyan-400 mt-1">
                  {groupAnalytics.avgReviewTurnaroundHours !== null ? `${groupAnalytics.avgReviewTurnaroundHours} hrs` : 'N/A'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Submission to review approval</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <div className="text-slate-400">Helpful Solutions & Doubts</div>
                <div className="text-2xl font-black text-amber-400 mt-1">{groupAnalytics.acceptedSolutions}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{groupAnalytics.helpfulReactions} upvotes in discussions</div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed italic">
              Note: Analytics are computed strictly from verified database records.
            </p>
          </div>
        </div>
      )}

      {/* Modal: Add / Invite Member (Admin Only) */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="glass-panel border-slate-700 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center space-x-2">
              <UserPlus className="w-4 h-4 text-indigo-400" />
              <span>Invite Member to Group</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Add a user by their username or email to collaborate in this group.
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">Assigned Role</label>
                <select
                  value={memberRole}
                  onChange={e => setMemberRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                >
                  <option value="member">Member (Can participate, submit work & chat)</option>
                  <option value="moderator">Moderator (Can help review & manage tasks)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={memberActionLoading}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 cursor-pointer"
                >
                  {memberActionLoading ? 'Adding...' : 'Add to Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
