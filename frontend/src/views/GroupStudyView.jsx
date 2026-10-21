import React, { useState, useEffect, useRef } from 'react';
import { apiRequest, ChatSocket, getAssetUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Users, Plus, Lock, Globe, Key, ShieldCheck, CheckCircle, ArrowRight, ArrowLeft,
  MessageSquare, CheckSquare, Award, Clock, BarChart3, UserCheck,
  Crown, Trash2, UserPlus, AlertCircle, ChevronLeft, LogOut, LogIn,
  Search, Calendar, Square, Check, UserX, ShieldAlert, Trophy, Zap, Flame, Timer, Hourglass, Send, RefreshCw, ExternalLink,
  Hash, Image, Paperclip, X, CheckSquare2, Sparkles
} from 'lucide-react';

export default function GroupStudyView({ onNavigate, onBack, onOpenTask, onOpenChatRoom, onOpenChallenge }) {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [roomDetails, setRoomDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileView, setMobileView] = useState('details'); // 'list' | 'details'
  const [searchQuery, setSearchQuery] = useState('');
  const [groupListFilter, setGroupListFilter] = useState('my'); // 'my' | 'explore'

  // New room modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('Computer Science');
  const [description, setDescription] = useState('');
  const [objectives, setObjectives] = useState('');
  const [roomType, setRoomType] = useState('public'); // 'public' | 'private'

  // Admin Group Task with Main Title, Checkboxes for each topic & Timer
  const [showAdminTaskModal, setShowAdminTaskModal] = useState(false);
  const [adminTaskTitle, setAdminTaskTitle] = useState('');
  const [adminTaskDays, setAdminTaskDays] = useState(3);
  const [adminTaskTopics, setAdminTaskTopics] = useState([]);
  const [currentTopicInput, setCurrentTopicInput] = useState('');
  const [adminTaskPriority, setAdminTaskPriority] = useState('medium');
  const [adminTaskInstructions, setAdminTaskInstructions] = useState('');
  const [adminTaskSubmitting, setAdminTaskSubmitting] = useState(false);

  // New legacy task modal (inside group)
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskTopic, setTaskTopic] = useState('');
  const [taskInstructions, setTaskInstructions] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskSubmitting, setTaskSubmitting] = useState(false);

  // Quick Add Task for Group State
  const [quickGroupTaskTitle, setQuickGroupTaskTitle] = useState('');
  const [quickGroupTaskDueDate, setQuickGroupTaskDueDate] = useState('');
  const [addingGroupQuickTask, setAddingGroupQuickTask] = useState(false);

  // Group Details Navigation & Discord Chat State
  const [activeGroupTab, setActiveGroupTab] = useState('all'); // 'all' | 'tasks' | 'chat' | 'challenges' | 'members'
  const [roomChatMessages, setRoomChatMessages] = useState([]);
  const [roomChatLoading, setRoomChatLoading] = useState(false);
  const [newRoomMessage, setNewRoomMessage] = useState('');
  const [sendingRoomMessage, setSendingRoomMessage] = useState(false);
  const [chatMemberSidebarOpen, setChatMemberSidebarOpen] = useState(true);
  const [chatPresenceCount, setChatPresenceCount] = useState(1);
  const [selectedChatPhoto, setSelectedChatPhoto] = useState(null);
  const [chatPhotoPreview, setChatPhotoPreview] = useState(null);

  const socketRef = useRef(null);
  const chatMessagesEndRef = useRef(null);

  // Group Challenge Modal & Form State
  const [showCreateChallengeModal, setShowCreateChallengeModal] = useState(false);
  const [groupChalTitle, setGroupChalTitle] = useState('');
  const [groupChalDate, setGroupChalDate] = useState('');
  const [groupChalDuration, setGroupChalDuration] = useState('weekly'); // 'daily' | 'weekly' | 'monthly'
  const [groupChalHasTimer, setGroupChalHasTimer] = useState(true);
  const [groupChalTimerMins, setGroupChalTimerMins] = useState(30);
  const [groupChalTaskId, setGroupChalTaskId] = useState('');
  const [groupChalScore, setGroupChalScore] = useState(4.0);
  const [groupChalXp, setGroupChalXp] = useState(250);
  const [groupChalSubmitting, setGroupChalSubmitting] = useState(false);

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

  // Real-time WebSocket connection for Discord-like Chat
  useEffect(() => {
    socketRef.current = new ChatSocket((data) => {
      if (data.type === 'NEW_CHAT_MESSAGE') {
        if (Number(data.chatRoomId) === Number(roomDetails?.chatRoomId)) {
          setRoomChatMessages(prev => {
            if (prev.some(m => m.id === data.message?.id)) return prev;
            return [...prev, data.message];
          });
          setTimeout(() => {
            if (chatMessagesEndRef.current) {
              chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
          }, 60);
        }
      } else if (data.type === 'ROOM_PRESENCE') {
        if (Number(data.chatRoomId) === Number(roomDetails?.chatRoomId)) {
          setChatPresenceCount(data.activeCount || 1);
        }
      }
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [roomDetails?.chatRoomId]);

  useEffect(() => {
    if (roomDetails?.chatRoomId && socketRef.current) {
      socketRef.current.joinRoom(roomDetails.chatRoomId);
      return () => {
        if (socketRef.current) socketRef.current.leaveRoom(roomDetails.chatRoomId);
      };
    }
  }, [roomDetails?.chatRoomId]);

  async function loadRooms() {
    setLoading(true);
    try {
      const data = await apiRequest('/study-rooms');
      setRooms(data);
      const myRooms = data.filter(r => r.user_status === 'active' || r.user_role);
      if (myRooms.length > 0) {
        if (!selectedRoomId || !myRooms.some(r => r.id === selectedRoomId)) {
          loadRoomDetails(myRooms[0].id);
        }
      } else {
        setSelectedRoomId(null);
        setRoomDetails(null);
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  function handleChatPhotoSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (chatPhotoPreview) URL.revokeObjectURL(chatPhotoPreview);
    setSelectedChatPhoto(file);
    setChatPhotoPreview(URL.createObjectURL(file));
  }

  async function handleCreateAdminGroupTask(e) {
    if (e) e.preventDefault();
    if (!adminTaskTitle.trim() || !selectedRoomId) return;

    setAdminTaskSubmitting(true);
    try {
      await apiRequest('/study-tasks', {
        method: 'POST',
        body: {
          title: adminTaskTitle.trim(),
          topics_checklist: adminTaskTopics,
          duration_days: Math.max(0, parseInt(adminTaskDays, 10) || 0),
          priority: adminTaskPriority,
          instructions: adminTaskInstructions.trim(),
          room_id: Number(selectedRoomId),
          is_group_task: true,
          subject: roomDetails?.room?.subject || 'Cohort Sprint'
        }
      });

      setShowAdminTaskModal(false);
      setAdminTaskTitle('');
      setAdminTaskDays(3);
      setAdminTaskTopics([]);
      setCurrentTopicInput('');
      setAdminTaskInstructions('');
      await loadRoomDetails(selectedRoomId);
      alert('✅ Admin Group Task published with topic checklist and duration timer!');
    } catch (err) {
      alert(err.message || 'Failed to create group task.');
    } finally {
      setAdminTaskSubmitting(false);
    }
  }

  async function handleToggleTopic(taskId, topicId, e) {
    if (e) e.stopPropagation();
    try {
      const res = await apiRequest(`/study-tasks/${taskId}/toggle-topic`, {
        method: 'PATCH',
        body: { topicId }
      });
      if (roomDetails?.tasks) {
        setRoomDetails(prev => ({
          ...prev,
          tasks: prev.tasks.map(t => t.id === taskId ? {
            ...t,
            status: res.status,
            topics_checklist: res.topics_checklist
          } : t)
        }));
      }
    } catch (err) {
      alert(err.message || 'Failed to toggle topic.');
    }
  }

  function getTaskTimerInfo(t) {
    if (!t) return null;
    const durationDays = Number(t.duration_days) || 0;
    if (durationDays <= 0 && !t.due_date) return null;

    let targetDate = null;
    if (t.due_date) {
      targetDate = new Date(t.due_date);
    } else if (durationDays > 0 && t.created_at) {
      targetDate = new Date(new Date(t.created_at).getTime() + durationDays * 86400000);
    }
    if (!targetDate || isNaN(targetDate.getTime())) return null;

    const diff = targetDate.getTime() - Date.now();
    if (diff <= 0) {
      return {
        isExpired: true,
        text: 'Time Expired',
        totalDays: durationDays,
        badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40'
      };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    const text = days > 0
      ? `${days}d ${hours}h left`
      : `${hours}h ${mins}m left`;
    const isUrgent = diff < 24 * 3600 * 1000;

    return {
      isExpired: false,
      text,
      totalDays: durationDays,
      daysLeft: days,
      badgeClass: isUrgent
        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
        : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
    };
  }

  async function loadRoomDetails(id) {
    const numId = Number(id);
    if (!numId || isNaN(numId)) return;
    setSelectedRoomId(numId);
    setMobileView('details');
    try {
      const details = await apiRequest(`/study-rooms/${numId}`);
      setRoomDetails(details);
      if (details.chatRoomId) {
        loadRoomChatMessages(details.chatRoomId);
      }
    } catch (err) {
      // ignore or reset
    }
  }

  async function handleQuickAddGroupTask(e) {
    if (e) e.preventDefault();
    if (!quickGroupTaskTitle.trim() || !selectedRoomId) return;

    setAddingGroupQuickTask(true);
    try {
      await apiRequest('/study-tasks', {
        method: 'POST',
        body: {
          title: quickGroupTaskTitle.trim(),
          room_id: Number(selectedRoomId),
          is_group_task: true,
          subject: roomDetails?.room?.subject || 'General',
          due_date: quickGroupTaskDueDate || null
        }
      });
      setQuickGroupTaskTitle('');
      setQuickGroupTaskDueDate('');
      await loadRoomDetails(selectedRoomId);
    } catch (err) {
      alert(err.message || 'Failed to add task.');
    } finally {
      setAddingGroupQuickTask(false);
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
    const id = Number(roomId);
    if (!id || isNaN(id)) {
      alert('Invalid group ID.');
      return;
    }

    const targetRoom = rooms.find(r => r.id === id) || (roomDetails?.room?.id === id ? roomDetails.room : null);
    const roomName = targetRoom?.name || 'this group';

    if (!window.confirm(`⚠️ Are you sure you want to permanently delete "${roomName}"? All tasks and group discussions will be removed.`)) {
      return;
    }

    try {
      await apiRequest(`/study-rooms/${id}`, { method: 'DELETE' });
      if (selectedRoomId === id) {
        setSelectedRoomId(null);
        setRoomDetails(null);
      }
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

    if (!window.confirm(`Are you sure you want to exit and leave "${roomName}"?`)) {
      return;
    }

    try {
      await apiRequest(`/study-rooms/${roomId}/leave`, {
        method: 'POST'
      });
      if (selectedRoomId === roomId) {
        setSelectedRoomId(null);
        setRoomDetails(null);
        setMobileView('list');
      }
      await loadRooms();
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
    const id = Number(taskId);
    if (!id || isNaN(id)) {
      alert('Invalid task ID.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete task "${title || 'this task'}"?`)) return;

    try {
      await apiRequest(`/study-tasks/${id}`, { method: 'DELETE' });
      if (selectedRoomId) {
        await loadRoomDetails(selectedRoomId);
      }
      alert('Task deleted successfully.');
    } catch (err) {
      alert(err.message || 'Failed to delete task.');
    }
  }

  // Toggle Task Completion Checkbox
  async function handleToggleTask(taskId, e) {
    if (e) e.stopPropagation();
    const id = Number(taskId);
    if (!id || isNaN(id)) return;

    try {
      const res = await apiRequest(`/study-tasks/${id}/toggle`, { method: 'PATCH' });
      if (roomDetails?.tasks) {
        setRoomDetails(prev => ({
          ...prev,
          tasks: prev.tasks.map(t => t.id === id ? { ...t, status: res.status } : t)
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

  async function handleCreateGroupChallenge(e) {
    if (e) e.preventDefault();
    if (!groupChalTitle.trim() || !selectedRoomId) return;

    setGroupChalSubmitting(true);
    try {
      const body = {
        room_id: Number(selectedRoomId),
        task_id: groupChalTaskId ? Number(groupChalTaskId) : null,
        title: groupChalTitle.trim(),
        challenge_scope: 'group',
        duration_type: groupChalDuration,
        scheduled_date: groupChalDate || null,
        time_limit_minutes: groupChalHasTimer ? Number(groupChalTimerMins) : 0,
        has_timer: groupChalHasTimer,
        min_score: Number(groupChalScore),
        xp_reward: Number(groupChalXp)
      };

      const res = await apiRequest('/challenges', {
        method: 'POST',
        body
      });

      setShowCreateChallengeModal(false);
      setGroupChalTitle('');
      setGroupChalDate('');
      setGroupChalTaskId('');
      await loadRoomDetails(selectedRoomId);
      alert(`🏆 Group Challenge "${res.title}" scheduled successfully for ${groupChalDate ? new Date(groupChalDate).toLocaleDateString() : 'today'}! Cohort members have been alerted.`);
    } catch (err) {
      alert(err.message);
    } finally {
      setGroupChalSubmitting(false);
    }
  }

  async function handleDeleteGroupChallenge(challengeId, title, e) {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete group challenge "${title}"?`)) return;
    try {
      await apiRequest(`/challenges/${challengeId}`, { method: 'DELETE' });
      await loadRoomDetails(selectedRoomId);
      alert('Challenge deleted successfully.');
    } catch (err) {
      alert(err.message);
    }
  }

  async function loadRoomChatMessages(chatRoomId) {
    if (!chatRoomId) return;
    setRoomChatLoading(true);
    try {
      const msgs = await apiRequest(`/chat/room/${chatRoomId}/messages`);
      setRoomChatMessages(msgs || []);
    } catch (e) {
      // ignore
    } finally {
      setRoomChatLoading(false);
    }
  }

  async function handleSendRoomMessage(e) {
    if (e) e.preventDefault();
    if ((!newRoomMessage.trim() && !selectedChatPhoto) || !roomDetails?.chatRoomId) return;

    setSendingRoomMessage(true);
    try {
      const formData = new FormData();
      if (newRoomMessage.trim()) {
        formData.append('content', newRoomMessage.trim());
      }
      if (selectedChatPhoto) {
        formData.append('attachments', selectedChatPhoto);
      }

      const res = await apiRequest(`/chat/room/${roomDetails.chatRoomId}/messages`, {
        method: 'POST',
        body: formData
      });

      setNewRoomMessage('');
      setSelectedChatPhoto(null);
      if (chatPhotoPreview) {
        URL.revokeObjectURL(chatPhotoPreview);
        setChatPhotoPreview(null);
      }

      setRoomChatMessages(prev => {
        if (prev.some(m => m.id === res.id)) return prev;
        return [...prev, res];
      });

      if (socketRef.current) {
        socketRef.current.broadcastChatMessage(roomDetails.chatRoomId, res);
      }

      setTimeout(() => {
        if (chatMessagesEndRef.current) {
          chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 60);
    } catch (err) {
      alert(err.message || 'Failed to send message.');
    } finally {
      setSendingRoomMessage(false);
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
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onBack || (() => onNavigate && onNavigate('dashboard'))}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition cursor-pointer flex items-center space-x-1.5 shrink-0 shadow-sm"
            title="Go back"
          >
            <ArrowLeft className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold">Back</span>
          </button>
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

          {/* Segmented Filter Switcher */}
          <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setGroupListFilter('my')}
              className={`flex-1 py-1.5 font-bold rounded-lg transition cursor-pointer ${
                groupListFilter === 'my'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              My Groups ({rooms.filter(r => r.user_status === 'active' || r.user_role).length})
            </button>
            <button
              type="button"
              onClick={() => setGroupListFilter('explore')}
              className={`flex-1 py-1.5 font-bold rounded-lg transition cursor-pointer ${
                groupListFilter === 'explore'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Explore Public ({rooms.filter(r => r.user_status !== 'active' && !r.user_role).length})
            </button>
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
            {displayedRooms.map(r => {
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
                        <div className="flex items-center space-x-1.5">
                          <span className="text-amber-400 font-bold flex items-center space-x-1 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                            <Crown className="w-3 h-3" />
                            <span>Admin</span>
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGroup(r.id);
                            }}
                            className="text-[10px] text-rose-400 hover:text-rose-300 font-semibold px-1.5 py-0.5 hover:bg-rose-500/20 rounded-md transition cursor-pointer flex items-center space-x-1 border border-rose-500/20"
                            title="Delete this study group"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                            <span>Delete</span>
                          </button>
                        </div>
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

            {displayedRooms.length === 0 && (
              <div className="text-center py-10 text-xs text-slate-400 glass-card rounded-2xl p-6 border border-dashed border-slate-800">
                <Users className="w-8 h-8 text-indigo-400/60 mx-auto mb-2" />
                <p className="font-semibold text-slate-300">
                  {groupListFilter === 'my'
                    ? "You haven't joined any groups yet"
                    : "No public groups available"}
                </p>
                <p className="text-[11px] text-slate-500 mt-1 mb-4">
                  {groupListFilter === 'my'
                    ? "Start fresh! Create your own study group or explore public cohorts."
                    : "Create the first public study group for your subject!"}
                </p>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition cursor-pointer"
                >
                  + Create Study Group
                </button>
              </div>
            )}
            {false && (
              <div className="text-center py-10 text-xs text-slate-400 glass-card rounded-2xl p-6 border border-dashed border-slate-800">
                <Users className="w-8 h-8 text-indigo-400/60 mx-auto mb-2" />
                <p className="font-semibold text-slate-300">
                  {searchQuery ? 'No groups matching search' : 'No study groups created yet'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1 mb-4">
                  {searchQuery ? 'Try clearing your search query' : 'Create a group to start collaborating on tasks and challenges!'}
                </p>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition cursor-pointer"
                >
                  + Create Study Group
                </button>
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
                        onClick={() => {
                          setSelectedRoomId(null);
                          setRoomDetails(null);
                          setMobileView('list');
                        }}
                        className="p-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white text-xs font-bold flex items-center space-x-1.5 border border-slate-700 cursor-pointer transition shadow-xs"
                        title="Back to All Groups"
                      >
                        <ChevronLeft className="w-4 h-4 text-indigo-400" />
                        <span>Back to Groups</span>
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
                          onClick={() => {
                            setSelectedRoomId(null);
                            setRoomDetails(null);
                            setMobileView('list');
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                          title="Exit group view"
                        >
                          <LogOut className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Exit Group</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGroup(roomDetails?.room?.id || selectedRoomId)}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                          title="Permanently delete this group"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRoomId(null);
                            setRoomDetails(null);
                            setMobileView('list');
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                          title="Exit to groups list"
                        >
                          <ChevronLeft className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Exit View</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLeaveRoom(roomDetails.room.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer"
                          title="Exit and leave this group"
                        >
                          <LogOut className="w-3.5 h-3.5 text-rose-400" />
                          <span>Exit Group</span>
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {isCurrentRoomMember && (
                        <button
                          type="button"
                          onClick={() => setActiveGroupTab(activeGroupTab === 'chat' ? 'all' : 'chat')}
                          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-indigo-600/30 transition cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Group Chat</span>
                          {roomChatMessages.length > 0 && (
                            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-indigo-950/80 text-[10px] text-indigo-200 border border-indigo-400/30 font-bold">
                              {roomChatMessages.length}
                            </span>
                          )}
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

              {/* Group Navigation Tabs */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
                <button
                  type="button"
                  onClick={() => setActiveGroupTab('all')}
                  className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                    activeGroupTab === 'all'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Overview (All)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveGroupTab('tasks')}
                  className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                    activeGroupTab === 'tasks'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5 text-purple-400" />
                  <span>Tasks</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
                    {roomDetails.tasks?.length || 0}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveGroupTab('chat')}
                  className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                    activeGroupTab === 'chat'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Group Chat</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
                    {roomChatMessages.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveGroupTab('challenges')}
                  className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                    activeGroupTab === 'challenges'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Challenges</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
                    {roomDetails.challenges?.length || 0}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveGroupTab('members')}
                  className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                    activeGroupTab === 'members'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  <span>Members</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
                    {roomDetails.members?.length || 0}
                  </span>
                </button>
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

              {/* Admin Group Tasks with Checkbox for Each Topic & Timer with No. of Days */}
              {(isCurrentRoomMember || !isPrivateGroup) && (activeGroupTab === 'all' || activeGroupTab === 'tasks') && (
                <div className="glass-panel rounded-3xl p-5 sm:p-6 shadow-xl border border-purple-500/20">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                      <h4 className="font-bold text-sm text-white flex items-center space-x-2">
                        <div className="p-1 rounded-md bg-purple-500/20 text-purple-400">
                          <CheckSquare className="w-3.5 h-3.5" />
                        </div>
                        <span>Group Tasks & Topic Checklists</span>
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 text-[10px] font-bold border border-purple-500/20">
                          {roomDetails.tasks?.length || 0} tasks
                        </span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Admin-assigned group tasks with main title, topic checkboxes, countdown timer, and cohort progress.
                      </p>
                    </div>

                    {/* Admin Action: Add Group Task Button */}
                    {isCurrentRoomAdmin && (
                      <button
                        type="button"
                        onClick={() => setShowAdminTaskModal(true)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 text-white text-xs font-bold transition flex items-center space-x-2 shadow-lg shadow-purple-600/25 cursor-pointer self-start sm:self-auto"
                      >
                        <Crown className="w-3.5 h-3.5 text-amber-300" />
                        <span>+ Add Group Task (Admin)</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-3.5">
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
                        No tasks scheduled in this group yet. Click <strong>"+ Detailed Task"</strong> or use the quick form above to add one!
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Discord-like Chat & Live Discussion Section */}
              {(isCurrentRoomMember || !isPrivateGroup) && (activeGroupTab === 'all' || activeGroupTab === 'chat') && (
                <div className="rounded-3xl overflow-hidden border border-[#3b3e45] bg-[#313338] shadow-2xl flex flex-col min-h-[560px]">
                  {/* Discord Top Channel Header */}
                  <div className="bg-[#2b2d31] border-b border-[#232428] px-4 py-3 flex items-center justify-between shadow-xs">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-[#5865F2]/20 text-[#5865F2] flex items-center justify-center font-bold">
                        <Hash className="w-4 h-4 text-indigo-400 stroke-[2.5]" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-sm text-white truncate">general-chat</span>
                          <span className="hidden sm:inline-block text-slate-500">|</span>
                          <span className="hidden sm:inline-block text-xs text-slate-300 font-semibold truncate">
                            {roomDetails.room.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {roomDetails.room.description || 'Welcome to this study cohort! Discuss tasks, ask doubts & collaborate.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRoomId(null);
                          setRoomDetails(null);
                          setMobileView('list');
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-[#383a40] hover:bg-[#404249] text-slate-200 text-xs font-bold flex items-center space-x-1.5 border border-[#4e5058]/50 transition cursor-pointer"
                        title="Exit group view"
                      >
                        <ArrowLeft className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="hidden sm:inline">Exit Group</span>
                        <span className="sm:hidden">Exit</span>
                      </button>

                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>{chatPresenceCount || roomDetails.members?.length || 1} online</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => setChatMemberSidebarOpen(prev => !prev)}
                        className={`p-1.5 rounded-lg border transition cursor-pointer ${
                          chatMemberSidebarOpen
                            ? 'bg-[#5865F2]/20 text-[#5865F2] border-[#5865F2]/30'
                            : 'bg-[#383a40] text-slate-300 border-transparent hover:bg-[#404249]'
                        }`}
                        title="Toggle Discord Members list"
                      >
                        <Users className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => loadRoomChatMessages(roomDetails.chatRoomId)}
                        disabled={roomChatLoading}
                        className="p-1.5 rounded-lg bg-[#383a40] hover:bg-[#404249] text-slate-300 transition cursor-pointer"
                        title="Refresh chat messages"
                      >
                        <RefreshCw className={`w-4 h-4 ${roomChatLoading ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Discord Main Chat Body (Messages + Member Sidebar) */}
                  <div className="flex flex-1 min-h-0 relative">
                    {/* Left/Center: Discord Message Feed */}
                    <div className="flex-1 flex flex-col justify-between p-4 min-w-0 bg-[#313338]">
                      {/* Messages Stream */}
                      <div className="space-y-4 max-h-[460px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[#232428]">
                        {/* Discord Welcome Banner */}
                        <div className="py-6 px-4 mb-4 rounded-2xl bg-[#2b2d31]/80 border border-[#3b3e45]/50 flex items-start space-x-3.5">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#5865F2] to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-[#5865F2]/20">
                            <Hash className="w-6 h-6 text-white stroke-[2.5]" />
                          </div>
                          <div>
                            <h3 className="font-extrabold text-white text-base">
                              Welcome to #{roomDetails.room.name.toLowerCase().replace(/\s+/g, '-')}!
                            </h3>
                            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                              This is the start of the <strong className="text-white">{roomDetails.room.name}</strong> study chat channel. Collaborate on group tasks, check off topics, and share study materials in real-time.
                            </p>
                          </div>
                        </div>

                        {roomChatLoading && roomChatMessages.length === 0 ? (
                          <div className="py-12 text-center text-xs text-slate-400">Loading channel messages...</div>
                        ) : roomChatMessages.length === 0 ? (
                          <div className="py-8 text-center text-xs text-slate-400 bg-[#2b2d31]/50 rounded-2xl border border-[#3b3e45]/40">
                            No messages yet in this channel. Send the first message below!
                          </div>
                        ) : (
                          roomChatMessages.map((msg, idx) => {
                            const isOwner = msg.sender_id === roomDetails.room.owner_id;
                            const isMe = msg.sender_id === user?.id;
                            const formattedTime = msg.created_at
                              ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : '';

                            return (
                              <div
                                key={msg.id || idx}
                                className="flex items-start space-x-3.5 px-3 py-2 rounded-xl hover:bg-[#2e3035]/70 transition group"
                              >
                                {/* Discord Avatar */}
                                <img
                                  src={msg.avatar_url ? getAssetUrl(msg.avatar_url) : `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender_name || msg.full_name || 'User')}&background=5865F2&color=fff`}
                                  alt={msg.sender_name || 'User'}
                                  className="w-10 h-10 rounded-full object-cover shrink-0 mt-0.5 shadow-sm"
                                />

                                {/* Message Content */}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-baseline space-x-2">
                                    <span className={`font-bold text-sm hover:underline cursor-pointer ${
                                      isOwner ? 'text-[#FEE75C]' : isMe ? 'text-[#5865F2]' : 'text-white'
                                    }`}>
                                      {msg.sender_name || msg.full_name || 'Cohort Peer'}
                                    </span>

                                    {/* Discord Role Badge */}
                                    {isOwner && (
                                      <span className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded-md bg-amber-500/20 text-[#FEE75C] border border-amber-500/30 text-[9px] font-extrabold uppercase tracking-wider">
                                        <Crown className="w-2.5 h-2.5" />
                                        <span>Owner</span>
                                      </span>
                                    )}

                                    {!isOwner && msg.user_role === 'mentor' && (
                                      <span className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded-md bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]/30 text-[9px] font-extrabold uppercase tracking-wider">
                                        <span>Admin</span>
                                      </span>
                                    )}

                                    <span className="text-[11px] text-slate-500">
                                      {formattedTime}
                                    </span>
                                  </div>

                                  {/* Message text */}
                                  {msg.content && (
                                    <p className="text-xs text-slate-200 mt-1 leading-relaxed whitespace-pre-wrap break-words">
                                      {msg.content}
                                    </p>
                                  )}

                                  {/* Discord Attachment photo */}
                                  {msg.attachments && msg.attachments.length > 0 && (
                                    <div className="mt-2.5 flex flex-wrap gap-2">
                                      {msg.attachments.map((att, attIdx) => (
                                        <a
                                          key={att.id || attIdx}
                                          href={getAssetUrl(att.file_path)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="block rounded-xl overflow-hidden border border-[#3b3e45] hover:opacity-95 transition max-w-xs"
                                        >
                                          <img
                                            src={getAssetUrl(att.file_path)}
                                            alt={att.original_name || 'Attachment'}
                                            className="max-h-56 rounded-xl object-contain bg-[#1e1f22]"
                                          />
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                        <div ref={chatMessagesEndRef} />
                      </div>

                      {/* Discord Attachment Preview Tray */}
                      {chatPhotoPreview && (
                        <div className="mb-2 p-2 rounded-xl bg-[#2b2d31] border border-[#3b3e45] inline-flex items-center space-x-2">
                          <img src={chatPhotoPreview} alt="Preview" className="w-12 h-12 object-cover rounded-lg" />
                          <div className="text-xs text-slate-300 pr-2">
                            <span className="font-semibold block truncate max-w-[140px]">{selectedChatPhoto?.name}</span>
                            <span className="text-[10px] text-slate-500">Ready to upload</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedChatPhoto(null);
                              URL.revokeObjectURL(chatPhotoPreview);
                              setChatPhotoPreview(null);
                            }}
                            className="p-1 rounded-full hover:bg-rose-500/20 text-rose-400 transition cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Discord Input Bar */}
                      {isCurrentRoomMember ? (
                        <form onSubmit={handleSendRoomMessage} className="mt-3">
                          <div className="bg-[#383a40] border border-[#404249] rounded-xl px-3 py-2 flex items-center space-x-2.5 focus-within:border-[#5865F2] transition">
                            {/* Attachment Plus button */}
                            <label
                              className="p-1.5 rounded-full bg-[#4e5058] hover:bg-[#5865F2] text-slate-200 hover:text-white transition cursor-pointer shrink-0"
                              title="Attach photo/screenshot"
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[3]" />
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleChatPhotoSelect}
                                className="hidden"
                              />
                            </label>

                            <input
                              type="text"
                              value={newRoomMessage}
                              onChange={e => setNewRoomMessage(e.target.value)}
                              placeholder={`Message #${roomDetails.room.name}`}
                              className="flex-1 bg-transparent text-xs text-white placeholder-[#949ba4] focus:outline-hidden"
                            />

                            <button
                              type="submit"
                              disabled={sendingRoomMessage || (!newRoomMessage.trim() && !selectedChatPhoto)}
                              className="px-3.5 py-1.5 rounded-lg bg-[#5865F2] hover:bg-[#4752c4] disabled:opacity-40 text-white font-bold text-xs flex items-center space-x-1 transition cursor-pointer shrink-0 shadow-md shadow-[#5865F2]/20"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">{sendingRoomMessage ? 'Sending...' : 'Send'}</span>
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="mt-3 text-center py-2.5 text-xs text-slate-400 bg-[#2b2d31] rounded-xl border border-[#3b3e45]">
                          🔒 Join this study group to chat and collaborate with cohort members.
                        </div>
                      )}
                    </div>

                    {/* Right: Discord Member Sidebar */}
                    {chatMemberSidebarOpen && (
                      <div className="w-56 bg-[#2b2d31] border-l border-[#232428] p-3 hidden sm:block overflow-y-auto max-h-[520px] scrollbar-thin">
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#949ba4] px-2 mb-2">
                          MEMBERS — {roomDetails.members?.length || 0}
                        </div>

                        <div className="space-y-1">
                          {(roomDetails.members || []).map(m => {
                            const isOwner = m.role === 'owner';
                            const isMod = m.role === 'moderator';

                            return (
                              <div
                                key={m.user_id}
                                className="flex items-center space-x-2.5 px-2 py-1.5 rounded-lg hover:bg-[#35373c] transition group cursor-pointer"
                                title={`${m.full_name} (@${m.username})`}
                              >
                                <div className="relative shrink-0">
                                  <img
                                    src={m.avatar_url ? getAssetUrl(m.avatar_url) : `https://ui-avatars.com/api/?name=${encodeURIComponent(m.full_name)}&background=5865F2&color=fff`}
                                    alt={m.full_name}
                                    className="w-8 h-8 rounded-full object-cover"
                                  />
                                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#2b2d31] absolute bottom-0 right-0" />
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center space-x-1">
                                    <span className={`text-xs font-semibold truncate ${
                                      isOwner ? 'text-[#FEE75C]' : isMod ? 'text-[#5865F2]' : 'text-slate-200'
                                    }`}>
                                      {m.full_name.split(' ')[0]}
                                    </span>
                                    {isOwner && <Crown className="w-3 h-3 text-[#FEE75C] shrink-0" />}
                                  </div>
                                  <span className="text-[10px] text-slate-400 capitalize block truncate">
                                    {isOwner ? 'Admin' : m.role}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Group Challenges & Scheduled Competitions Section */}
              {(isCurrentRoomMember || !isPrivateGroup) && (activeGroupTab === 'all' || activeGroupTab === 'challenges') && (
                <div className="glass-panel rounded-3xl p-5 sm:p-6 shadow-xl border border-amber-500/20">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                      <h4 className="font-bold text-sm text-white flex items-center space-x-2">
                        <div className="p-1 rounded-md bg-amber-500/20 text-amber-400">
                          <Trophy className="w-3.5 h-3.5" />
                        </div>
                        <span>Group Challenges & Scheduled Competitions</span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 text-[10px] font-bold border border-amber-500/20">
                          {roomDetails.challenges?.length || 0} challenges
                        </span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Schedule challenges for specific dates, race against cohort peers, and conquer study goals.
                      </p>
                    </div>

                    {isCurrentRoomMember && (
                      <button
                        type="button"
                        onClick={() => setShowCreateChallengeModal(true)}
                        className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs transition flex items-center space-x-1.5 shadow-md shadow-amber-500/20 cursor-pointer self-start sm:self-auto"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Schedule Challenge</span>
                      </button>
                    )}
                  </div>

                  {/* Challenge list */}
                  <div className="space-y-3">
                    {(roomDetails.challenges || []).map(c => {
                      const dType = c.duration_type || 'weekly';
                      const isOwner = c.creator_id === user?.id || isCurrentRoomAdmin;
                      const hasScheduledDate = Boolean(c.scheduled_date);

                      let scheduleStatus = 'active';
                      if (hasScheduledDate) {
                        const todayStr = new Date().toISOString().split('T')[0];
                        if (c.scheduled_date > todayStr) {
                          scheduleStatus = 'upcoming';
                        } else if (c.scheduled_date === todayStr) {
                          scheduleStatus = 'today';
                        } else {
                          scheduleStatus = 'past';
                        }
                      }

                      return (
                        <div
                          key={c.id}
                          className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                                <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                  {dType === 'weekly' ? '📅 Weekly' : dType === 'monthly' ? '🗓️ Monthly' : '⚡ Daily'}
                                </span>

                                {/* Scheduled Date Badge */}
                                {hasScheduledDate ? (
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center space-x-1 border ${
                                    scheduleStatus === 'upcoming'
                                      ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                                      : scheduleStatus === 'today'
                                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                      : 'bg-slate-800 text-slate-300 border-slate-700'
                                  }`}>
                                    <Calendar className="w-3 h-3 text-amber-400" />
                                    <span>
                                      {scheduleStatus === 'today' ? '🔥 Today' : scheduleStatus === 'upcoming' ? '⏳ Scheduled' : '📅'} : {new Date(c.scheduled_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                    Instant Sprint
                                  </span>
                                )}

                                {/* Timer Mode badge */}
                                <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-slate-900 text-slate-300 border border-slate-800 flex items-center space-x-1">
                                  {c.has_timer === 1 ? (
                                    <>
                                      <Timer className="w-2.5 h-2.5 text-amber-400" />
                                      <span>{c.time_limit_minutes}m Timer</span>
                                    </>
                                  ) : (
                                    <>
                                      <Hourglass className="w-2.5 h-2.5 text-indigo-400" />
                                      <span>Untimed Focus</span>
                                    </>
                                  )}
                                </span>

                                <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                                  +{c.xp_reward} XP
                                </span>
                              </div>

                              <h5 className="text-sm font-bold text-white">{c.title}</h5>
                              <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                                {c.description}
                              </p>

                              <div className="flex flex-wrap items-center gap-3 mt-2.5 text-[11px] text-slate-400">
                                <span>Created by <strong className="text-slate-300">{c.creator_name || 'Cohort Admin'}</strong></span>
                                <span>&bull;</span>
                                <span>{c.participant_count || 1} participant(s)</span>
                                {c.my_completed ? (
                                  <span className="text-emerald-400 font-bold flex items-center space-x-1">
                                    <Check className="w-3 h-3 stroke-[3]" />
                                    <span>Completed</span>
                                  </span>
                                ) : c.my_status === 'in_progress' ? (
                                  <span className="text-amber-400 font-bold animate-pulse">In Progress</span>
                                ) : null}
                              </div>
                            </div>

                            {/* Challenge Action Button */}
                            <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                              <button
                                type="button"
                                onClick={() => {
                                  if (onOpenChallenge) {
                                    onOpenChallenge(c.id);
                                  } else if (onNavigate) {
                                    onNavigate('challenges');
                                  }
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-indigo-600/30 transition cursor-pointer"
                              >
                                <Trophy className="w-3 h-3" />
                                <span>{c.my_status === 'in_progress' ? 'Resume Sprint' : c.my_completed ? 'View Challenge' : 'Open Challenge'}</span>
                              </button>

                              {isOwner && (
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteGroupChallenge(c.id, c.title, e)}
                                  className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 border border-rose-500/20 transition cursor-pointer"
                                  title="Delete this group challenge"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {(!roomDetails.challenges || roomDetails.challenges.length === 0) && (
                      <div className="text-center py-6 text-xs text-slate-500 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
                        No challenges scheduled in this group yet. Click <strong>"Schedule Challenge"</strong> above to schedule a competition for your group on any date!
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Members Section */}
              {(activeGroupTab === 'all' || activeGroupTab === 'members') && (
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
              )}
            </div>
          ) : (
            <div className="glass-panel rounded-3xl p-10 sm:p-14 text-center text-slate-400 text-xs border border-dashed border-slate-800/80">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-500/10">
                <Users className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-white mb-1.5">No Group Selected</h4>
              <p className="text-slate-400 max-w-sm mx-auto mb-5 leading-relaxed text-xs">
                {rooms.length === 0
                  ? 'No study groups exist in the system yet. Click below to create the first group as Admin!'
                  : 'Select a study group from the left to view shared tasks, open live chat discussions, and participate in challenges.'}
              </p>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs inline-flex items-center space-x-1.5 shadow-lg shadow-indigo-600/30 transition cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Create Study Group</span>
              </button>
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

      {/* Modal: Schedule Group Challenge for Date */}
      {showCreateChallengeModal && roomDetails?.room && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="glass-panel border-amber-500/30 rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-1 flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span>Schedule Challenge for "{roomDetails.room.name}"</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Schedule a competitive study challenge for your cohort on a specific date.
            </p>

            <form onSubmit={handleCreateGroupChallenge} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">Challenge Title</label>
                <input
                  type="text"
                  required
                  value={groupChalTitle}
                  onChange={e => setGroupChalTitle(e.target.value)}
                  placeholder="e.g. Saturday Algorithm Sprint / Weekly Goal"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* Schedule For Date Section */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>Schedule For Date</span>
                  </label>
                  <span className="text-[11px] font-semibold text-amber-300">
                    {groupChalDate ? `Scheduled: ${new Date(groupChalDate).toLocaleDateString()}` : 'Starts immediately today'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="date"
                    value={groupChalDate}
                    onChange={e => setGroupChalDate(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                  />
                  {groupChalDate && (
                    <button
                      type="button"
                      onClick={() => setGroupChalDate('')}
                      className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { label: 'Today', offset: 0 },
                    { label: 'Tomorrow', offset: 1 },
                    { label: 'In 3 Days', offset: 3 },
                    { label: 'In 1 Week', offset: 7 }
                  ].map(item => {
                    const d = new Date();
                    d.setDate(d.getDate() + item.offset);
                    const iso = d.toISOString().split('T')[0];
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => setGroupChalDate(iso)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition cursor-pointer ${
                          groupChalDate === iso
                            ? 'bg-amber-500 text-slate-950 font-bold border-amber-500'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Duration Type */}
              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">Duration Period</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'daily', label: 'Daily Sprint', desc: '24 Hours' },
                    { id: 'weekly', label: 'Weekly Quest', desc: '7 Days' },
                    { id: 'monthly', label: 'Monthly Marathon', desc: '30 Days' }
                  ].map(dur => (
                    <button
                      key={dur.id}
                      type="button"
                      onClick={() => {
                        setGroupChalDuration(dur.id);
                        if (dur.id === 'weekly') {
                          setGroupChalXp(250);
                          setGroupChalTimerMins(45);
                        } else if (dur.id === 'monthly') {
                          setGroupChalXp(600);
                          setGroupChalTimerMins(60);
                        } else {
                          setGroupChalXp(100);
                          setGroupChalTimerMins(25);
                        }
                      }}
                      className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                        groupChalDuration === dur.id
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-semibold">{dur.label}</div>
                      <div className="text-[10px] text-slate-500">{dur.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Link to Task */}
              {roomDetails.tasks?.length > 0 && (
                <div>
                  <label className="text-xs text-slate-300 block mb-1 font-medium">Tie to Group Task (Optional)</label>
                  <select
                    value={groupChalTaskId}
                    onChange={e => setGroupChalTaskId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-hidden focus:border-amber-500"
                  >
                    <option value="">General Group Challenge (No specific task)</option>
                    {roomDetails.tasks.map(t => (
                      <option key={t.id} value={t.id}>Task: {t.title}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Timer Option */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={groupChalHasTimer}
                      onChange={e => setGroupChalHasTimer(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 focus:ring-amber-500"
                    />
                    <span>Add Timer to this Challenge?</span>
                  </label>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${groupChalHasTimer ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'}`}>
                    {groupChalHasTimer ? 'Timed Sprint' : 'Untimed Focus'}
                  </span>
                </div>

                {groupChalHasTimer ? (
                  <div className="space-y-2 pt-1 border-t border-slate-900">
                    <div className="flex items-center space-x-2">
                      <Timer className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-xs text-slate-400">Duration (mins):</span>
                      <input
                        type="number"
                        min="5"
                        max="240"
                        value={groupChalTimerMins}
                        onChange={e => setGroupChalTimerMins(e.target.value)}
                        className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[15, 25, 45, 60, 90].map(mins => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => setGroupChalTimerMins(mins)}
                          className={`px-2 py-0.5 rounded text-[11px] border transition cursor-pointer ${
                            Number(groupChalTimerMins) === mins
                              ? 'bg-amber-500 text-slate-950 font-bold border-amber-500'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                          }`}
                        >
                          {mins}m
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    Untimed — group members complete at their own pace without timer pressure.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1 font-medium">Bonus XP</label>
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={groupChalXp}
                    onChange={e => setGroupChalXp(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1 font-medium">Min Score</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="5"
                    value={groupChalScore}
                    onChange={e => setGroupChalScore(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateChallengeModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={groupChalSubmitting}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  {groupChalSubmitting ? 'Scheduling...' : 'Schedule & Launch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Group Task Modal with Main Title, Checkboxes for each topic & Timer */}
      {showAdminTaskModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/30 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-xl bg-purple-500/20 text-purple-400">
                  <Crown className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Create Group Task</h3>
                  <p className="text-[11px] text-slate-400">Admin Task with Topic Checklists and Timer</p>
                </div>
              </div>
              <button
                onClick={() => setShowAdminTaskModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAdminGroupTask} className="space-y-4">
              {/* Main Title */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Main Task Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={adminTaskTitle}
                  onChange={e => setAdminTaskTitle(e.target.value)}
                  placeholder="e.g. Full-Stack Web Development & System Design Sprint"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-purple-500"
                />
              </div>

              {/* Timer with No. of Days */}
              <div>
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between mb-1">
                  <span className="flex items-center space-x-1">
                    <Timer className="w-3.5 h-3.5 text-purple-400" />
                    <span>Timer Duration (Number of Days)</span>
                  </span>
                  <span className="text-[11px] text-purple-300 font-bold">
                    {adminTaskDays} day{adminTaskDays == 1 ? '' : 's'} timer
                  </span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={adminTaskDays}
                  onChange={e => setAdminTaskDays(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-hidden focus:border-purple-500"
                />
                {/* Quick preset selector buttons */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[1, 2, 3, 5, 7, 14, 30].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setAdminTaskDays(d)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                        Number(adminTaskDays) === d
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {d} Day{d > 1 ? 's' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Topics Checklist Builder */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Checklist Topics (Add topics for cohort members to check off)
                </label>
                <div className="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    value={currentTopicInput}
                    onChange={e => setCurrentTopicInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (currentTopicInput.trim()) {
                          setAdminTaskTopics(prev => [...prev, currentTopicInput.trim()]);
                          setCurrentTopicInput('');
                        }
                      }
                    }}
                    placeholder="e.g. Topic 1: Database Normalization"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (currentTopicInput.trim()) {
                        setAdminTaskTopics(prev => [...prev, currentTopicInput.trim()]);
                        setCurrentTopicInput('');
                      }
                    }}
                    className="px-3 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-xs font-bold transition cursor-pointer"
                  >
                    + Add
                  </button>
                </div>

                {/* List of topics added */}
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {adminTaskTopics.map((top, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-950/70 border border-slate-800 text-xs"
                    >
                      <span className="text-slate-200 truncate pr-2">
                        <strong className="text-purple-400 mr-1.5">#{idx + 1}</strong>
                        {top}
                      </span>
                      <button
                        type="button"
                        onClick={() => setAdminTaskTopics(prev => prev.filter((_, i) => i !== idx))}
                        className="p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {adminTaskTopics.length === 0 && (
                    <p className="text-[11px] text-slate-500 italic py-1">
                      No topics added yet. Type a topic name above and click "+ Add" (or press Enter).
                    </p>
                  )}
                </div>
              </div>

              {/* Priority & Instructions */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Priority</label>
                  <select
                    value={adminTaskPriority}
                    onChange={e => setAdminTaskPriority(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Instructions (Optional)</label>
                  <input
                    type="text"
                    value={adminTaskInstructions}
                    onChange={e => setAdminTaskInstructions(e.target.value)}
                    placeholder="Brief instructions..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAdminTaskModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adminTaskSubmitting || !adminTaskTitle.trim()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-purple-600/30 transition cursor-pointer"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-300" />
                  <span>{adminTaskSubmitting ? 'Creating Task...' : 'Publish Group Task'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
