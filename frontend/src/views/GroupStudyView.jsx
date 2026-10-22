import React, { useState, useEffect, useRef } from 'react';
import { apiRequest, ChatSocket, getAssetUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Users, Plus, Lock, Globe, Key, ShieldCheck, CheckCircle, ArrowRight, ArrowLeft,
  MessageSquare, CheckSquare, Award, Clock, BarChart3, UserCheck,
  Crown, Trash2, UserPlus, AlertCircle, ChevronLeft, LogOut, LogIn,
  Search, Calendar, Square, Check, UserX, ShieldAlert, Trophy, Zap, Flame, Timer, Hourglass, Send, RefreshCw, ExternalLink,
  Hash, Image, Paperclip, X, CheckSquare2, Sparkles, RotateCcw
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
  const [createRoomSubmitting, setCreateRoomSubmitting] = useState(false);
  const [createRoomError, setCreateRoomError] = useState('');
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
  const [userFriends, setUserFriends] = useState([]);
  const [addMemberTab, setAddMemberTab] = useState('friend'); // 'friend' | 'id'

  // Join by Group Name state (Requires Admin Approval)
  const [showJoinByNameModal, setShowJoinByNameModal] = useState(false);
  const [joinByNameQuery, setJoinByNameQuery] = useState('');
  const [joinByNameLoading, setJoinByNameLoading] = useState(false);
  const [joinByNameResults, setJoinByNameResults] = useState(null);
  const [joinByNameError, setJoinByNameError] = useState('');

  async function handleSearchGroupByName(e) {
    if (e) e.preventDefault();
    if (!joinByNameQuery.trim()) return;

    setJoinByNameLoading(true);
    setJoinByNameError('');
    setJoinByNameResults(null);
    try {
      const data = await apiRequest(`/study-rooms?search=${encodeURIComponent(joinByNameQuery.trim())}`);
      setJoinByNameResults(data || []);
      if (!data || data.length === 0) {
        setJoinByNameError(`No study group found matching "${joinByNameQuery.trim()}".`);
      }
    } catch (err) {
      setJoinByNameError(err.message || 'Failed to search for groups.');
    } finally {
      setJoinByNameLoading(false);
    }
  }

  async function handleJoinByNameDirect(groupId, groupName) {
    setJoinByNameLoading(true);
    try {
      const res = await apiRequest(`/study-rooms/${groupId}/join`, {
        method: 'POST'
      });
      alert(res.message || `Join request submitted for "${groupName}"! Waiting for Group Admin approval.`);
      setShowJoinByNameModal(false);
      setJoinByNameQuery('');
      setJoinByNameResults(null);
      await loadRooms();
      if (res.status === 'active') {
        loadRoomDetails(groupId);
      }
    } catch (err) {
      alert(err.message || 'Failed to submit join request.');
    } finally {
      setJoinByNameLoading(false);
    }
  }

  async function handleQuickJoinByNameSubmit(e) {
    if (e) e.preventDefault();
    if (!joinByNameQuery.trim()) return;

    setJoinByNameLoading(true);
    setJoinByNameError('');
    try {
      const res = await apiRequest('/study-rooms/join-by-name', {
        method: 'POST',
        body: { name: joinByNameQuery.trim() }
      });
      alert(res.message || 'Join request submitted! Waiting for Group Admin approval.');
      setShowJoinByNameModal(false);
      setJoinByNameQuery('');
      setJoinByNameResults(null);
      await loadRooms();
      if (res.status === 'active' && res.room_id) {
        loadRoomDetails(res.room_id);
      }
    } catch (err) {
      setJoinByNameError(err.message || 'Failed to join group.');
    } finally {
      setJoinByNameLoading(false);
    }
  }

  async function openAddMemberModal() {
    setShowAddMemberModal(true);
    setMemberActionError('');
    setMemberIdentifier('');
    try {
      const list = await apiRequest('/friends');
      setUserFriends(list || []);
      if (!list || list.length === 0) {
        setAddMemberTab('id');
      } else {
        setAddMemberTab('friend');
        if (list[0]) setMemberIdentifier(String(list[0].id));
      }
    } catch (e) {
      setAddMemberTab('id');
    }
  }

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

  // Real-time automatic chat background sync (every 2 seconds)
  useEffect(() => {
    if (!roomDetails?.chatRoomId || !isCurrentRoomMember) return;
    const interval = setInterval(async () => {
      try {
        const msgs = await apiRequest(`/chat/room/${roomDetails.chatRoomId}/messages`);
        if (Array.isArray(msgs)) {
          setRoomChatMessages(prev => {
            if (prev.length !== msgs.length) {
              setTimeout(() => {
                chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }, 50);
              return msgs;
            }
            return prev;
          });
        }
      } catch (e) {
        // ignore
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [roomDetails?.chatRoomId, isCurrentRoomMember]);

  async function loadRooms() {
    setLoading(true);
    try {
      const data = await apiRequest('/study-rooms');
      const roomList = Array.isArray(data) ? data : [];
      setRooms(roomList);
      const myRooms = roomList.filter(r => r.user_status === 'active' || r.user_role);
      if (myRooms.length > 0) {
        if (!selectedRoomId || !myRooms.some(r => r.id === selectedRoomId)) {
          loadRoomDetails(myRooms[0].id);
        }
      } else if (roomList.length > 0) {
        loadRoomDetails(roomList[0].id);
      } else {
        setSelectedRoomId(null);
        setRoomDetails(null);
      }
    } catch (e) {
      console.error('Failed to load study rooms:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateStarterGroup(template) {
    try {
      setLoading(true);
      const res = await apiRequest('/study-rooms', {
        method: 'POST',
        body: {
          name: template.name,
          subject: template.subject,
          description: template.description,
          objectives: template.objectives,
          room_type: 'public'
        }
      });

      const newRoomId = res.room?.id;
      if (!newRoomId) throw new Error('Failed to create group');

      // Add Admin task with topics checklist & duration timer
      await apiRequest('/study-tasks', {
        method: 'POST',
        body: {
          title: template.taskTitle,
          topics_checklist: template.topics,
          duration_days: 3,
          priority: 'high',
          instructions: 'Complete these core topics with your cohort before the countdown timer expires.',
          room_id: Number(newRoomId),
          is_group_task: true,
          subject: template.subject
        }
      }).catch(() => null);

      // Add Group challenge with timer
      const todayStr = new Date().toISOString().split('T')[0];
      await apiRequest('/challenges', {
        method: 'POST',
        body: {
          room_id: Number(newRoomId),
          title: template.chalTitle,
          challenge_scope: 'group',
          duration_type: 'weekly',
          scheduled_date: todayStr,
          time_limit_minutes: 45,
          has_timer: true,
          min_score: 4.0,
          xp_reward: 250
        }
      }).catch(() => null);

      await loadRooms();
      await loadRoomDetails(newRoomId);
      alert(`🎉 Group "${template.name}" created with Discord chat, topics checklist, and challenge!`);
    } catch (err) {
      alert(err.message || 'Failed to create starter group.');
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

  function formatChallengeTimer(c) {
    if (!c) return 'Untimed';

    // 1. If end_date is present, compute remaining time
    if (c.end_date) {
      const msLeft = new Date(c.end_date) - Date.now();
      if (msLeft > 0) {
        const days = Math.floor(msLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
        if (days > 0) return `${days}d ${hours}h left`;
        if (hours > 0) return `${hours}h ${mins}m left`;
        return `${mins}m left`;
      }
      return 'Expired';
    }

    // 2. If scheduled_date is in the future
    if (c.scheduled_date) {
      const msUntil = new Date(c.scheduled_date) - Date.now();
      if (msUntil > 0) {
        const days = Math.ceil(msUntil / (1000 * 60 * 60 * 24));
        return `Starts in ${days}d`;
      }
    }

    // 3. If explicit timer minutes configured
    if (c.has_timer && Number(c.time_limit_minutes) > 0) {
      return `${c.time_limit_minutes}m timer`;
    }

    // 4. Fallback based on duration type
    if (c.duration_type === 'daily') return '24h window';
    if (c.duration_type === 'weekly') return '7-Day window';
    if (c.duration_type === 'monthly') return '30-Day window';

    return 'Active';
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

    setCreateRoomSubmitting(true);
    setCreateRoomError('');
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
      setMobileView('details');
    } catch (err) {
      setCreateRoomError(err.message || 'Failed to create group.');
    } finally {
      setCreateRoomSubmitting(false);
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
      setActiveGroupTab('challenges');
      await loadRoomDetails(selectedRoomId);
      await loadRooms();
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
      await loadRooms();
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

  const myRooms = filteredRooms.filter(r => r.user_status === 'active' || r.user_role);
  const publicRooms = filteredRooms.filter(r => r.user_status !== 'active' && !r.user_role);

  // If the user selected 'my' but hasn't joined any groups yet, show all available filteredRooms so it is never empty!
  const displayedRooms = groupListFilter === 'my'
    ? (myRooms.length > 0 ? myRooms : filteredRooms)
    : (publicRooms.length > 0 ? publicRooms : filteredRooms);

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

        <div className="flex flex-wrap items-center gap-2 self-start">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition cursor-pointer group"
            title="Create New Study Group"
          >
            <div className="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <UserPlus className="w-3.5 h-3.5 text-white" />
            </div>
            <span>Create Group</span>
          </button>

          <button
            onClick={() => {
              setShowJoinByNameModal(true);
              setJoinByNameError('');
              setJoinByNameResults(null);
            }}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-indigo-300 hover:text-white border border-indigo-500/40 hover:border-indigo-400 font-bold text-xs flex items-center space-x-2 shadow-sm transition cursor-pointer"
            title="Join Group by Unique Name (Requires Admin Approval)"
          >
            <Search className="w-3.5 h-3.5 text-indigo-400" />
            <span>Join by Unique Name</span>
          </button>
        </div>
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
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => {
                  setShowJoinByNameModal(true);
                  setJoinByNameError('');
                  setJoinByNameResults(null);
                }}
                className="p-1 px-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-slate-700 text-xs font-semibold flex items-center space-x-1 transition cursor-pointer"
                title="Join Group by Unique Name (Admin Approval)"
              >
                <Search className="w-3 h-3 text-indigo-400" />
                <span className="hidden sm:inline">Join by Unique Name</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="p-1 px-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-indigo-600/30 transition cursor-pointer"
                title="Create New Study Group"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Create</span>
              </button>
            </div>
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

                  {/* Active Challenges & Timers Section on Group Card */}
                  {r.challenges && r.challenges.length > 0 ? (
                    <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-bold text-amber-400">
                        <span className="flex items-center space-x-1">
                          <Trophy className="w-3 h-3 text-amber-400" />
                          <span>Active Challenge{r.challenges.length > 1 ? `s (${r.challenges.length})` : ''}</span>
                        </span>
                        <span className="text-[10px] text-indigo-300 font-mono">
                          +{r.challenges.reduce((sum, c) => sum + (c.xp_reward || 0), 0)} XP
                        </span>
                      </div>

                      {r.challenges.slice(0, 2).map(c => {
                        const timerText = formatChallengeTimer(c);
                        const isExpired = timerText === 'Expired';
                        return (
                          <div
                            key={c.id}
                            className="p-2 rounded-xl bg-slate-900/90 border border-amber-500/20 hover:border-amber-500/40 transition flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-white truncate flex items-center space-x-1">
                                <span className="text-amber-400 text-xs">⚡</span>
                                <span className="truncate">{c.title}</span>
                              </p>
                              {c.scheduled_date && (
                                <p className="text-[10px] text-amber-300/80 flex items-center space-x-1 mt-0.5">
                                  <Calendar className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                                  <span>{new Date(c.scheduled_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                </p>
                              )}
                            </div>

                            {/* Challenge Timer Pill */}
                            <div className={`shrink-0 flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border ${
                              isExpired
                                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            }`}>
                              <Timer className={`w-3 h-3 ${isExpired ? 'text-rose-400' : 'text-amber-400 animate-pulse'}`} />
                              <span>{timerText}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (isMember || isOwner) ? (
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 flex items-center space-x-1">
                        <Trophy className="w-3 h-3 text-slate-500" />
                        <span>No active challenge</span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRoomId(r.id);
                          loadRoomDetails(r.id);
                          setShowCreateChallengeModal(true);
                        }}
                        className="text-amber-400 hover:text-amber-300 font-bold hover:underline cursor-pointer flex items-center space-x-0.5"
                        title="Schedule a challenge with timer for this group"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>Add Challenge</span>
                      </button>
                    </div>
                  ) : null}

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
              <div className="text-center py-8 text-xs text-slate-400 glass-card rounded-3xl p-6 border border-dashed border-slate-800 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">
                    {searchQuery ? 'No groups matching search' : 'No Study Groups Yet'}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                    {searchQuery
                      ? 'Try adjusting your search terms or join an existing group by name.'
                      : 'Choose to create a new study group or join an existing group by its name (requires Admin approval).'}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition cursor-pointer"
                  >
                    + Create Group
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowJoinByNameModal(true);
                      setJoinByNameError('');
                      setJoinByNameResults(null);
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-slate-700 font-bold text-xs transition cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <Search className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Join by Unique Name</span>
                  </button>
                </div>
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

                {/* Active Cohort Challenge & Live Countdown Spotlight */}
                {roomDetails.challenges && roomDetails.challenges.length > 0 && (
                  <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-indigo-950/40 to-slate-900 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/30">
                        <Trophy className="w-5 h-5 text-amber-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Active Group Challenge
                          </span>
                          <span className="text-xs text-indigo-300 font-mono">
                            +{roomDetails.challenges[0].xp_reward} XP
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white mt-0.5 truncate">{roomDetails.challenges[0].title}</h4>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold">
                        <Timer className="w-4 h-4 text-amber-400 animate-pulse" />
                        <span>{formatChallengeTimer(roomDetails.challenges[0])}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveGroupTab('challenges')}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition cursor-pointer"
                      >
                        View Challenge
                      </button>
                    </div>
                  </div>
                )}

                {/* Group Action Hub: Add Member, Group Chat, Assign Task, Launch Challenge */}
                {isCurrentRoomMember && (
                  <div className="mt-4 p-4 rounded-2xl bg-slate-950/70 border border-indigo-500/30 shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center space-x-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Group Actions & Setup</span>
                      </span>
                      {isCurrentRoomAdmin && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          Group Admin Controls
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {/* Action 1: Add Members */}
                      {isCurrentRoomAdmin ? (
                        <button
                          type="button"
                          onClick={openAddMemberModal}
                          className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 text-left transition cursor-pointer group flex flex-col justify-between"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <UserPlus className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-mono text-indigo-300 font-bold">#{roomDetails.members?.length || 0}</span>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">+ Add Member</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">Friends or Unique ID</div>
                          </div>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveGroupTab('members')}
                          className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition cursor-pointer group flex flex-col justify-between"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <Users className="w-4 h-4 text-indigo-400" />
                            <span className="text-[10px] font-mono text-indigo-300 font-bold">#{roomDetails.members?.length || 0}</span>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">Members</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">View cohort</div>
                          </div>
                        </button>
                      )}

                      {/* Action 2: Group Chat */}
                      <button
                        type="button"
                        onClick={() => setActiveGroupTab('chat')}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer group flex flex-col justify-between ${
                          activeGroupTab === 'chat'
                            ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                            : 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-indigo-500/50 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <MessageSquare className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                          <span className="text-[10px] font-mono text-emerald-300 font-bold">{roomChatMessages.length} msgs</span>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">Group Chat</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Live discussion</div>
                        </div>
                      </button>

                      {/* Action 3: Assign Tasks */}
                      {isCurrentRoomAdmin ? (
                        <button
                          type="button"
                          onClick={() => {
                            setTaskTitle('');
                            setTaskInstructions('');
                            setTaskTopics(['']);
                            setTaskDurationDays(3);
                            setShowCreateTaskModal(true);
                          }}
                          className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 text-left transition cursor-pointer group flex flex-col justify-between"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <CheckSquare className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-mono text-purple-300 font-bold">#{roomDetails.tasks?.length || 0}</span>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">+ Assign Task</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">Checklist & Timer</div>
                          </div>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveGroupTab('tasks')}
                          className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition cursor-pointer group flex flex-col justify-between"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <CheckSquare className="w-4 h-4 text-purple-400" />
                            <span className="text-[10px] font-mono text-purple-300 font-bold">#{roomDetails.tasks?.length || 0}</span>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">Group Tasks</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">View assignments</div>
                          </div>
                        </button>
                      )}

                      {/* Action 4: Launch Challenge */}
                      <button
                        type="button"
                        onClick={() => {
                          if (isCurrentRoomAdmin) {
                            setShowCreateChallengeModal(true);
                          } else {
                            setActiveGroupTab('challenges');
                          }
                        }}
                        className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 text-left transition cursor-pointer group flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Trophy className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                          <span className="text-[10px] font-mono text-amber-300 font-bold">
                            {roomDetails.challenges?.length || 0}
                          </span>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">
                            {isCurrentRoomAdmin ? '+ Challenge' : 'Challenges'}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Speedrun timers</div>
                        </div>
                      </button>
                    </div>
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
                      const timerInfo = getTaskTimerInfo(t);
                      const checklist = Array.isArray(t.topics_checklist) ? t.topics_checklist : [];
                      const completedTopicsCount = checklist.filter(topic => topic.completed).length;
                      const totalTopicsCount = checklist.length;
                      const completionPct = totalTopicsCount > 0 ? Math.round((completedTopicsCount / totalTopicsCount) * 100) : 0;

                      return (
                        <div
                          key={t.id}
                          className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                            isTaskCompleted
                              ? 'bg-slate-950/40 border-emerald-500/30'
                              : 'bg-slate-950/80 hover:bg-slate-900 border-slate-800 hover:border-slate-700 shadow-md'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="flex items-start space-x-3 min-w-0 pr-3 flex-1">
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
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                    {t.subject || 'Cohort Sprint'}
                                  </span>

                                  {/* Priority Pill */}
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                    t.priority === 'urgent' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                                    t.priority === 'high' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                                    'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                                  }`}>
                                    {t.priority || 'medium'}
                                  </span>

                                  {/* Duration Timer Pill */}
                                  {timerInfo && (
                                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold border flex items-center space-x-1.5 ${timerInfo.badgeClass}`}>
                                      <Timer className="w-3 h-3 shrink-0" />
                                      <span>{timerInfo.text}</span>
                                      {timerInfo.totalDays > 0 && (
                                        <span className="text-[9px] opacity-75 font-sans">({timerInfo.totalDays}d timer)</span>
                                      )}
                                    </span>
                                  )}

                                  {t.due_date && !timerInfo && (
                                    <span className="text-[10px] text-amber-300/90 flex items-center space-x-1 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 font-medium">
                                      <Calendar className="w-3 h-3 text-amber-400 shrink-0" />
                                      <span>Schedule: {new Date(t.due_date).toLocaleDateString()}</span>
                                    </span>
                                  )}
                                </div>

                                <h4 className={`text-sm font-bold mt-1.5 transition ${
                                  isTaskCompleted ? 'line-through text-slate-400' : 'text-white'
                                }`}>
                                  {t.title}
                                </h4>

                                {t.instructions && (
                                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{t.instructions}</p>
                                )}
                              </div>
                            </div>

                            {/* Status pill & Delete Button */}
                            <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
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

                          {/* Topic Checklist with Interactive Checkboxes */}
                          {totalTopicsCount > 0 && (
                            <div className="mt-4 pt-3.5 border-t border-slate-800/80 space-y-2.5">
                              {/* Checklist Header & Progress Bar */}
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-slate-300 flex items-center space-x-1.5">
                                  <CheckSquare2 className="w-3.5 h-3.5 text-purple-400" />
                                  <span>Topics Checklist ({completedTopicsCount}/{totalTopicsCount})</span>
                                </span>
                                <span className="text-[11px] font-mono font-bold text-indigo-300">{completionPct}% Done</span>
                              </div>

                              {/* Progress Track */}
                              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                                <div
                                  className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-400 transition-all duration-300"
                                  style={{ width: `${completionPct}%` }}
                                />
                              </div>

                              {/* Topics List with Checkboxes */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                {checklist.map((topic) => (
                                  <div
                                    key={topic.id}
                                    onClick={(e) => handleToggleTopic(t.id, topic.id, e)}
                                    className={`p-2.5 rounded-xl border flex items-center space-x-2.5 cursor-pointer transition select-none ${
                                      topic.completed
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                                        : 'bg-slate-900/70 hover:bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                                    }`}
                                  >
                                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition ${
                                      topic.completed
                                        ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-black'
                                        : 'border-slate-600 bg-slate-950 hover:border-indigo-400'
                                    }`}>
                                      {topic.completed && <Check className="w-3 h-3 stroke-[3]" />}
                                    </div>
                                    <span className={`text-xs font-semibold truncate ${
                                      topic.completed ? 'line-through text-slate-400' : 'text-slate-200'
                                    }`}>
                                      {topic.title}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
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
              {(activeGroupTab === 'all' || activeGroupTab === 'chat') && (
                isCurrentRoomMember ? (
                <div className="rounded-3xl overflow-hidden border border-[#3b3e45] bg-[#313338] shadow-2xl flex flex-col min-h-[560px]">
                  {/* Discord Top Channel Header */}
                  <div className="bg-[#2b2d31] border-b border-[#232428] px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 shadow-xs">
                    <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0 flex-1">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#5865F2]/20 text-[#5865F2] flex items-center justify-center font-bold shrink-0">
                        <Hash className="w-4 h-4 text-indigo-400 stroke-[2.5]" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5 sm:space-x-2">
                          <span className="font-extrabold text-xs sm:text-sm text-white truncate">general-chat</span>
                          <span className="hidden sm:inline-block text-slate-500">|</span>
                          <span className="hidden sm:inline-block text-xs text-slate-300 font-semibold truncate">
                            {roomDetails.room.name}
                          </span>
                        </div>
                        <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                          {roomDetails.room.description || 'Welcome to this study cohort! Discuss tasks, ask doubts & collaborate.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRoomId(null);
                          setRoomDetails(null);
                          setMobileView('list');
                        }}
                        className="px-2 sm:px-2.5 py-1.5 rounded-lg bg-[#383a40] hover:bg-[#404249] text-slate-200 text-xs font-bold flex items-center space-x-1 border border-[#4e5058]/50 transition cursor-pointer"
                        title="Exit group view"
                      >
                        <ArrowLeft className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="hidden sm:inline">Exit Group</span>
                      </button>

                      <span className="inline-flex items-center space-x-1 px-2 sm:px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] sm:text-[11px] font-bold">
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>{chatPresenceCount || roomDetails.members?.length || 1} <span className="hidden xs:inline">online</span></span>
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
                        <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => loadRoomChatMessages(roomDetails.chatRoomId)}
                        disabled={roomChatLoading}
                        className="p-1.5 rounded-lg bg-[#383a40] hover:bg-[#404249] text-slate-300 transition cursor-pointer"
                        title="Refresh chat messages"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${roomChatLoading ? 'animate-spin' : ''}`} />
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
                ) : (
                  <div className="rounded-3xl overflow-hidden border border-indigo-500/30 bg-[#313338] shadow-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[380px]">
                    <div className="w-16 h-16 rounded-3xl bg-[#5865F2]/20 text-[#5865F2] flex items-center justify-center mx-auto mb-4 border border-[#5865F2]/30 shadow-xl shadow-[#5865F2]/20">
                      <Lock className="w-8 h-8" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#5865F2]/15 text-[#5865F2] border border-[#5865F2]/30 mb-2">
                      Group Members Only
                    </span>
                    <h4 className="text-xl font-black text-white mb-2">
                      Exclusive Discord Chat for Members
                    </h4>
                    <p className="text-xs text-slate-300 max-w-md mx-auto mb-6 leading-relaxed">
                      Only enrolled members of <strong className="text-white font-bold">{roomDetails.room.name}</strong> can view and participate in this live chat. Join this study cohort to chat in real-time, solve doubts, and collaborate on tasks!
                    </p>
                    {isCurrentRoomPending ? (
                      <span className="px-5 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                        <span>Join Request Pending Admin Approval</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleJoinRoom(roomDetails.room.id)}
                        className="px-6 py-2.5 rounded-xl bg-[#5865F2] hover:bg-indigo-600 text-white font-extrabold text-xs shadow-lg shadow-[#5865F2]/30 transition cursor-pointer flex items-center space-x-2"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>{isPrivateGroup ? 'Request Admin Approval to Join' : 'Join Group to Unlock Chat'}</span>
                      </button>
                    )}
                  </div>
                )
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
                        onClick={openAddMemberModal}
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
            <div className="space-y-6">
              {/* Welcome to Study Groups Hero */}
              <div className="glass-panel rounded-3xl p-6 sm:p-8 relative overflow-hidden border border-indigo-500/30 bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-900 shadow-2xl">
                <div className="max-w-xl">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 inline-flex items-center space-x-1 mb-3">
                    <Sparkles className="w-3 h-3 text-indigo-400" />
                    <span>Collaborative Learning Cohorts</span>
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Welcome to CONSTA Study Groups
                  </h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    Study groups allow you to learn together in real-time with Discord-like live doubt chats, admin task checklists with countdown timers, and weekly cohort sprints.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-slate-800/80">
                  <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                    <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold mb-1">
                      <MessageSquare className="w-4 h-4" />
                      <span>Discord Chat</span>
                    </div>
                    <p className="text-[11px] text-slate-400">Live doubt solving, handwritten notes photo uploads, and member presence.</p>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                    <div className="flex items-center space-x-2 text-purple-400 text-xs font-bold mb-1">
                      <CheckSquare className="w-4 h-4" />
                      <span>Topic Checklists</span>
                    </div>
                    <p className="text-[11px] text-slate-400">Admin group tasks with interactive checkboxes for every topic & timer days.</p>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                    <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold mb-1">
                      <Trophy className="w-4 h-4" />
                      <span>Cohort Sprints</span>
                    </div>
                    <p className="text-[11px] text-slate-400">Scheduled challenges, countdown timers, and bonus XP rewards.</p>
                  </div>
                </div>
              </div>

              {/* 1-Click Starter Cohorts */}
              <div className="glass-panel rounded-3xl p-6 sm:p-7 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-bold text-sm text-white flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span>Launch Instant Starter Group</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Click any cohort below to instantly create a study group populated with Discord chat, checklist topics, and active challenge timer:
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {[
                    {
                      name: 'Computer Science & Engineering Cohort',
                      subject: 'Computer Science',
                      description: 'Public collaborative study group for Computer Science, Algorithms, and System Architecture.',
                      objectives: 'Complete cohort topic checklist, solve doubts in Discord chat, and compete in weekly mastery sprints.',
                      taskTitle: 'Data Structures & Algorithms Sprint',
                      topics: [
                        { id: 't1', title: 'Arrays, Hashing & Two-Pointer Patterns', completed: false },
                        { id: 't2', title: 'Binary Trees, BST & Graph Traversals', completed: false },
                        { id: 't3', title: 'Dynamic Programming & Memoization', completed: false }
                      ],
                      chalTitle: 'Weekly Mastery Sprint - Algorithms Challenge'
                    },
                    {
                      name: 'Mathematics & Quantitative Problem Solving',
                      subject: 'Mathematics',
                      description: 'Advanced problem-solving group for Linear Algebra, Calculus, and Discrete Mathematics.',
                      objectives: 'Weekly math problem sets, peer verification, and rigorous mathematical proofs.',
                      taskTitle: 'Calculus & Linear Algebra Problem Set',
                      topics: [
                        { id: 'm1', title: 'Eigenvalues & Matrix Transformations', completed: false },
                        { id: 'm2', title: 'Multivariable Derivatives & Integrals', completed: false },
                        { id: 'm3', title: 'Differential Equations & Proof Verification', completed: false }
                      ],
                      chalTitle: 'Math Sprint - Solve 10 Proof Problems'
                    },
                    {
                      name: 'Physics & Deep Tech Engineering',
                      subject: 'Physics',
                      description: 'Collaborative cohort for Classical Mechanics, Electromagnetism, and Quantum Concepts.',
                      objectives: 'Break down physical concepts, solve textbook problems, and verify solutions.',
                      taskTitle: 'Electromagnetism & Waves Mastery',
                      topics: [
                        { id: 'p1', title: 'Gauss Law & Electric Potential', completed: false },
                        { id: 'p2', title: 'Magnetic Fields & Ampere Law', completed: false },
                        { id: 'p3', title: 'Maxwell Equations & Wave Propagation', completed: false }
                      ],
                      chalTitle: 'Physics Challenge - 45m Timed Problem Solving'
                    },
                    {
                      name: 'General Study & Daily Productivity Cohort',
                      subject: 'General Study',
                      description: 'Daily accountability group for focused study sessions, habit consistency, and streak building.',
                      objectives: 'Daily check-ins, Pomodoro sprints, and consistent personal growth.',
                      taskTitle: 'Daily Habit & Focus Sprint',
                      topics: [
                        { id: 'g1', title: '2 Hours Deep Focus Study Block', completed: false },
                        { id: 'g2', title: 'Problem Logging & Notes Review', completed: false },
                        { id: 'g3', title: 'Peer Discussion & Summary Post', completed: false }
                      ],
                      chalTitle: 'Consistency Sprint - 5 Days Streak Target'
                    }
                  ].map((tmpl, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 transition flex flex-col justify-between group shadow-sm"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            {tmpl.subject}
                          </span>
                          <span className="text-[10px] text-emerald-400 font-semibold flex items-center space-x-1">
                            <Globe className="w-3 h-3" />
                            <span>Instant Setup</span>
                          </span>
                        </div>
                        <h5 className="font-bold text-sm text-white group-hover:text-indigo-200 transition">
                          {tmpl.name}
                        </h5>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {tmpl.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="text-[11px] text-amber-300 font-mono font-bold flex items-center space-x-1">
                          <Timer className="w-3 h-3 text-amber-400" />
                          <span>3-Day Timer Task</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => handleCreateStarterGroup(tmpl)}
                          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-indigo-600/30 transition cursor-pointer"
                        >
                          <Plus className="w-3 h-3 stroke-[3]" />
                          <span>Launch Group</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Or Custom Create Button */}
                <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-xs text-slate-400">Want to create your own custom study group with private approval or custom subject?</p>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center space-x-2 shrink-0 cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Custom Group</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create Room (Public vs Private with Admin Approval) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="glass-panel border-slate-700 rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 sm:p-6 pb-3 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-0.5">Create Study Group</h3>
                <p className="text-xs text-slate-400">Set up a collaborative study group as Group Admin.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {createRoomError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">{createRoomError}</span>
                </div>
              )}

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">Unique Group Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => {
                    setName(e.target.value);
                    if (createRoomError) setCreateRoomError('');
                  }}
                  placeholder="e.g. Distributed Systems & Algorithms"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Every group must have a unique name. Peers can find and submit join requests using this exact name.
                </p>
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

              <div className="sticky bottom-0 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 p-4 sm:p-5 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex justify-end space-x-2 mt-4 z-10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRoomSubmitting || !name.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-600/30 cursor-pointer transition flex items-center space-x-1.5"
                >
                  {createRoomSubmitting ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating Unique Group...</span>
                    </>
                  ) : (
                    <span>Create Group</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Task in Group */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="glass-panel border-slate-700 rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 sm:p-6 pb-3 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                <span>Add Task to {roomDetails?.room?.name}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateTaskModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTaskInGroup} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
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

              <div className="sticky bottom-0 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 p-4 sm:p-5 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex justify-end space-x-2 mt-4 z-10">
                <button
                  type="button"
                  onClick={() => setShowCreateTaskModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={taskSubmitting}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-600/30 cursor-pointer transition"
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="glass-panel border-slate-700 rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-indigo-400" />
                <span>Group Participation Analytics</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAnalytics(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="glass-panel border-slate-700 rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <UserPlus className="w-4 h-4 text-indigo-400" />
                <span>Invite Member to Group</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddMemberModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Add a peer to this study group either from your existing friends or by their Unique User ID.
            </p>

            {/* Mode Selector Tabs: Existing Friend vs Unique ID */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl mb-4 border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setAddMemberTab('friend');
                  if (userFriends.length > 0 && !memberIdentifier) {
                    setMemberIdentifier(String(userFriends[0].id));
                  }
                }}
                className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                  addMemberTab === 'friend'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Existing Friend ({userFriends.length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddMemberTab('id');
                  setMemberIdentifier('');
                }}
                className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                  addMemberTab === 'id'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Hash className="w-3.5 h-3.5" />
                <span>Unique ID</span>
              </button>
            </div>

            {memberActionError && (
              <div className="p-3 rounded-xl mb-4 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{memberActionError}</span>
              </div>
            )}

            <form onSubmit={handleAddMember} className="space-y-4">
              {addMemberTab === 'friend' ? (
                <div>
                  <label className="text-xs text-slate-300 block mb-1 font-medium">Select an Approved Friend</label>
                  {userFriends.length > 0 ? (
                    <select
                      value={memberIdentifier}
                      onChange={e => setMemberIdentifier(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                    >
                      <option value="">-- Choose an approved friend --</option>
                      {userFriends.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.full_name} (@{f.username} · ID #{f.id})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400">
                      No connected friends found. Switch to the <strong>"Unique ID"</strong> tab above to add a member using their User ID or username.
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="text-xs text-slate-300 block mb-1 font-medium">Enter Unique ID, Username, or Email</label>
                  <input
                    type="text"
                    required
                    value={memberIdentifier}
                    onChange={e => setMemberIdentifier(e.target.value)}
                    placeholder="e.g. 1, 2, or username..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>
              )}

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
                  disabled={memberActionLoading || !memberIdentifier.trim()}
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-purple-500/30 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 sm:p-6 pb-3 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
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
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAdminGroupTask} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
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
              <div className="sticky bottom-0 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 p-4 sm:p-5 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-end space-x-2 mt-4 z-10">
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

      {/* Modal: Join Group by Unique Group Name (Admin Approval Required) */}
      {showJoinByNameModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="glass-panel border-slate-700 rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Search className="w-4 h-4 text-indigo-400" />
                <span>Join Group by Unique Name</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowJoinByNameModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 mb-4 text-xs text-amber-300 flex items-start space-x-2">
              <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Enter the unique group name to submit a join request. If the cohort is private, <strong>Group Admin approval</strong> is required.
              </span>
            </div>

            <form onSubmit={handleQuickJoinByNameSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">Unique Group Name *</label>
                <input
                  type="text"
                  required
                  value={joinByNameQuery}
                  onChange={e => {
                    setJoinByNameQuery(e.target.value);
                    if (joinByNameError) setJoinByNameError('');
                  }}
                  placeholder="e.g. Distributed Systems & Algorithms"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={joinByNameLoading || !joinByNameQuery.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-indigo-600/30 transition cursor-pointer"
                >
                  {joinByNameLoading ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending Request...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Send Join Request</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleSearchGroupByName}
                  disabled={joinByNameLoading || !joinByNameQuery.trim()}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 disabled:opacity-50 text-xs font-semibold flex items-center space-x-1 transition cursor-pointer shrink-0"
                  title="Search for groups matching this keyword"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Search</span>
                </button>
              </div>
            </form>

            {joinByNameError && (
              <div className="p-3 rounded-xl mt-4 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{joinByNameError}</span>
              </div>
            )}

            {/* Direct Join Option when group name is entered */}
            {joinByNameQuery.trim() && !joinByNameResults && !joinByNameError && (
              <div className="mt-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                <span>Know the exact name?</span>
                <button
                  type="button"
                  onClick={handleQuickJoinByNameSubmit}
                  disabled={joinByNameLoading}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition cursor-pointer"
                >
                  Send Join Request &rarr;
                </button>
              </div>
            )}

            {/* Matching Groups List */}
            {joinByNameResults && joinByNameResults.length > 0 && (
              <div className="mt-4 space-y-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Matching Groups ({joinByNameResults.length})
                </div>
                {joinByNameResults.map(grp => (
                  <div
                    key={grp.id}
                    className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-white truncate">{grp.name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          <span>{grp.subject}</span> &bull; <span>Admin: {grp.owner_name}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 shrink-0">
                        {grp.member_count} member{grp.member_count === 1 ? '' : 's'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex justify-end">
                      {grp.user_status === 'active' || grp.user_role ? (
                        <button
                          type="button"
                          onClick={() => {
                            setShowJoinByNameModal(false);
                            setSelectedRoomId(grp.id);
                            loadRoomDetails(grp.id);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition cursor-pointer"
                        >
                          View Group &rarr;
                        </button>
                      ) : grp.user_status === 'pending' ? (
                        <span className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                          <span>Request Pending Approval</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleJoinByNameDirect(grp.id, grp.name)}
                          disabled={joinByNameLoading}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-indigo-600/30 transition cursor-pointer"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Request to Join (Admin Approval)</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-4 mt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowJoinByNameModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
