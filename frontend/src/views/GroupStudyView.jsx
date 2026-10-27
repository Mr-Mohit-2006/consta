import React, { useState, useEffect, useRef } from 'react';
import { apiRequest, ChatSocket, getAssetUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Users, Plus, Lock, Globe, Key, ShieldCheck, CheckCircle, ArrowRight, ArrowLeft,
  MessageSquare, CheckSquare, Award, Clock, BarChart3, UserCheck,
  Crown, Trash2, UserPlus, AlertCircle, ChevronLeft, LogOut, LogIn,
  Search, Calendar, Square, Check, UserX, ShieldAlert, Trophy, Zap, Flame, Timer,
  Send, RefreshCw, ExternalLink, Hash, Image, Paperclip, X, CheckSquare2, Sparkles,
  RotateCcw
} from 'lucide-react';

export const STARTER_COHORTS = [
  {
    name: 'Computer Science & Engineering Cohort',
    subject: 'Computer Science',
    description: 'Public collaborative study group for Computer Science, Algorithms, and System Architecture.',
    objectives: 'Complete cohort topic checklist, solve doubts in group chat, and compete in weekly mastery sprints.',
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
];

export default function GroupStudyView({ onNavigate, onBack, onOpenTask, onOpenChatRoom, onOpenChallenge }) {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [roomDetails, setRoomDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  // Hub View state (when no group is selected)
  const [hubTab, setHubTab] = useState('my'); // 'my' | 'explore' | 'starters'
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [quickCodeInput, setQuickCodeInput] = useState('');
  const [quickCodeLoading, setQuickCodeLoading] = useState(false);

  // Workspace View state (when a group is selected)
  const [workspaceTab, setWorkspaceTab] = useState('chat'); // 'chat' | 'tasks' | 'challenges' | 'members' | 'analytics'
  const [chatMemberSidebarOpen, setChatMemberSidebarOpen] = useState(false);

  // Toast Notification state (replaces disruptive window.alert popups)
  const [toast, setToast] = useState(null);
  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => {
      setToast(curr => (curr?.message === message ? null : curr));
    }, 4000);
  }

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createRoomSubmitting, setCreateRoomSubmitting] = useState(false);
  const [createRoomError, setCreateRoomError] = useState('');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('Computer Science');
  const [description, setDescription] = useState('');
  const [objectives, setObjectives] = useState('');
  const [roomType, setRoomType] = useState('public');

  // Join by Name / Code Modal
  const [showJoinByNameModal, setShowJoinByNameModal] = useState(false);
  const [joinByNameQuery, setJoinByNameQuery] = useState('');
  const [joinByNameLoading, setJoinByNameLoading] = useState(false);
  const [joinByNameResults, setJoinByNameResults] = useState(null);
  const [joinByNameError, setJoinByNameError] = useState('');

  // Admin Task Modal
  const [showAdminTaskModal, setShowAdminTaskModal] = useState(false);
  const [adminTaskTitle, setAdminTaskTitle] = useState('');
  const [adminTaskDays, setAdminTaskDays] = useState(3);
  const [adminTaskTopics, setAdminTaskTopics] = useState([]);
  const [currentTopicInput, setCurrentTopicInput] = useState('');
  const [adminTaskPriority, setAdminTaskPriority] = useState('medium');
  const [adminTaskInstructions, setAdminTaskInstructions] = useState('');
  const [adminTaskSubmitting, setAdminTaskSubmitting] = useState(false);

  // Challenge Modal
  const [showCreateChallengeModal, setShowCreateChallengeModal] = useState(false);
  const [groupChalTitle, setGroupChalTitle] = useState('');
  const [groupChalDate, setGroupChalDate] = useState('');
  const [groupChalDuration, setGroupChalDuration] = useState('weekly');
  const [groupChalHasTimer, setGroupChalHasTimer] = useState(true);
  const [groupChalTimerMins, setGroupChalTimerMins] = useState(45);
  const [groupChalXp, setGroupChalXp] = useState(250);
  const [groupChalSubmitting, setGroupChalSubmitting] = useState(false);

  // Add Member Modal
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [memberIdentifier, setMemberIdentifier] = useState('');
  const [memberRole, setMemberRole] = useState('member');
  const [memberActionLoading, setMemberActionLoading] = useState(false);
  const [memberActionError, setMemberActionError] = useState('');
  const [userFriends, setUserFriends] = useState([]);
  const [addMemberTab, setAddMemberTab] = useState('friend'); // 'friend' | 'id'

  // Chat state
  const [roomChatMessages, setRoomChatMessages] = useState([]);
  const [newRoomMessage, setNewRoomMessage] = useState('');
  const [sendingRoomMessage, setSendingRoomMessage] = useState(false);
  const [chatPresenceCount, setChatPresenceCount] = useState(1);
  const [selectedChatPhoto, setSelectedChatPhoto] = useState(null);
  const [chatPhotoPreview, setChatPhotoPreview] = useState(null);
  const socketRef = useRef(null);
  const chatMessagesEndRef = useRef(null);

  // Group Analytics state
  const [groupAnalytics, setGroupAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Quick Task inside Group
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskDueDate, setQuickTaskDueDate] = useState('');
  const [quickTaskSubmitting, setQuickTaskSubmitting] = useState(false);

  // Initial load
  useEffect(() => {
    loadRooms();

    function onFriendUpdate() {
      apiRequest('/friends')
        .then(list => setUserFriends(list || []))
        .catch(() => {});
    }
    window.addEventListener('consta:friend-update', onFriendUpdate);
    return () => {
      window.removeEventListener('consta:friend-update', onFriendUpdate);
    };
  }, [user]);

  // WebSocket Chat Connection
  useEffect(() => {
    if (!roomDetails?.chatRoomId) return;

    socketRef.current = new ChatSocket((data) => {
      if (data.type === 'NEW_CHAT_MESSAGE') {
        if (Number(data.chatRoomId) === Number(roomDetails?.chatRoomId)) {
          setRoomChatMessages(prev => {
            if (prev.some(m => m.id === data.message?.id)) return prev;
            return [...prev, data.message];
          });
          setTimeout(() => {
            chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 60);
        }
      } else if (data.type === 'ROOM_PRESENCE') {
        if (Number(data.chatRoomId) === Number(roomDetails?.chatRoomId)) {
          setChatPresenceCount(data.activeCount || 1);
        }
      }
    });

    socketRef.current.joinRoom(roomDetails.chatRoomId);

    return () => {
      if (socketRef.current) {
        socketRef.current.leaveRoom(roomDetails.chatRoomId);
        socketRef.current.disconnect();
      }
    };
  }, [roomDetails?.chatRoomId]);

  async function loadRooms() {
    setLoading(true);
    try {
      const data = await apiRequest('/study-rooms');
      const list = Array.isArray(data) ? data : [];
      setRooms(list);
      if (selectedRoomId) {
        if (list.some(r => r.id === selectedRoomId)) {
          loadRoomDetails(selectedRoomId);
        } else {
          setSelectedRoomId(null);
          setRoomDetails(null);
        }
      }
    } catch (e) {
      console.error('Failed to load study rooms:', e);
    } finally {
      setLoading(false);
    }
  }

  async function loadRoomDetails(id) {
    const numId = Number(id);
    if (!numId || isNaN(numId)) return;
    try {
      const details = await apiRequest(`/study-rooms/${numId}`);
      setSelectedRoomId(numId);
      setRoomDetails(details);
      if (details.chatRoomId) {
        loadRoomChatMessages(details.chatRoomId);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load group details.', 'error');
    }
  }

  async function loadRoomChatMessages(chatRoomId) {
    try {
      const msgs = await apiRequest(`/chat/${chatRoomId}/messages`);
      setRoomChatMessages(msgs || []);
      setTimeout(() => {
        chatMessagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 50);
    } catch (e) {
      // ignore
    }
  }

  async function handleJoinRoom(roomId) {
    try {
      const res = await apiRequest(`/study-rooms/${roomId}/join`, { method: 'POST' });
      await loadRooms();
      if (res.status === 'active') {
        showToast('🎉 Joined group successfully! Welcome to the cohort.');
        await loadRoomDetails(roomId);
        setWorkspaceTab('chat');
      } else {
        showToast('⏳ Join request sent! Waiting for Group Admin approval.', 'info');
      }
    } catch (err) {
      showToast(err.message || 'Failed to join group.', 'error');
    }
  }

  async function handleLeaveRoom(roomId) {
    if (!window.confirm('Are you sure you want to exit and leave this study group?')) return;
    try {
      await apiRequest(`/study-rooms/${roomId}/leave`, { method: 'POST' });
      showToast('You have left the study group.', 'info');
      setSelectedRoomId(null);
      setRoomDetails(null);
      await loadRooms();
    } catch (err) {
      showToast(err.message || 'Failed to leave group.', 'error');
    }
  }

  async function handleCancelRequest(roomId) {
    try {
      await apiRequest(`/study-rooms/${roomId}/cancel-request`, { method: 'POST' });
      showToast('Join request cancelled.', 'info');
      await loadRooms();
      if (selectedRoomId === roomId) {
        setSelectedRoomId(null);
        setRoomDetails(null);
      }
    } catch (err) {
      showToast(err.message || 'Failed to cancel request.', 'error');
    }
  }

  async function handleDeleteGroup(roomId) {
    if (!window.confirm('⚠️ Are you sure you want to permanently delete this group? All tasks and chats will be removed.')) return;
    try {
      await apiRequest(`/study-rooms/${roomId}`, { method: 'DELETE' });
      showToast('Group deleted successfully.', 'info');
      setSelectedRoomId(null);
      setRoomDetails(null);
      await loadRooms();
    } catch (err) {
      showToast(err.message || 'Failed to delete group.', 'error');
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
      showToast('🚀 Study group created! You are the Group Admin.');
      await loadRooms();
      await loadRoomDetails(res.room.id);
      setWorkspaceTab('chat');
    } catch (err) {
      setCreateRoomError(err.message || 'Failed to create group.');
    } finally {
      setCreateRoomSubmitting(false);
    }
  }

  async function handleCreateStarterGroup(template) {
    try {
      setLoading(true);
      const existing = (rooms || []).find(r => (r.name || '').toLowerCase() === template.name.toLowerCase());
      if (existing) {
        if (existing.user_status !== 'active') {
          await handleJoinRoom(existing.id);
        }
        await loadRoomDetails(existing.id);
        setWorkspaceTab('chat');
        showToast(`🎉 Opened cohort "${existing.name}"!`);
        return;
      }

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

      // Add starter task with topics checklist
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

      // Add starter challenge
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
      setWorkspaceTab('chat');
      showToast(`🎉 Launched "${template.name}" with topic checklists & countdown timer!`);
    } catch (err) {
      showToast(err.message || 'Failed to launch starter cohort.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickJoinCode(e) {
    if (e) e.preventDefault();
    if (!quickCodeInput.trim()) return;

    setQuickCodeLoading(true);
    try {
      const res = await apiRequest('/study-rooms/join-by-name', {
        method: 'POST',
        body: { name: quickCodeInput.trim() }
      });
      setQuickCodeInput('');
      await loadRooms();
      if (res.room_id) {
        showToast(res.message || 'Successfully joined group!');
        await loadRoomDetails(res.room_id);
        setWorkspaceTab('chat');
      } else {
        showToast(res.message || 'Join request submitted! Waiting for Admin approval.', 'info');
      }
    } catch (err) {
      showToast(err.message || 'Failed to join group. Check the group name or code.', 'error');
    } finally {
      setQuickCodeLoading(false);
    }
  }

  async function handleToggleTopic(taskId, topicId, e) {
    if (e) e.stopPropagation();
    try {
      await apiRequest(`/study-tasks/${taskId}/topics/${topicId}/toggle`, { method: 'PATCH' });
      await loadRoomDetails(selectedRoomId);
    } catch (err) {
      showToast(err.message || 'Failed to update topic.', 'error');
    }
  }

  async function handleToggleTask(taskId, e) {
    if (e) e.stopPropagation();
    try {
      await apiRequest(`/study-tasks/${taskId}/toggle`, { method: 'POST' });
      await loadRoomDetails(selectedRoomId);
    } catch (err) {
      showToast(err.message || 'Failed to update task status.', 'error');
    }
  }

  async function handleDeleteTask(taskId, taskTitle) {
    if (!window.confirm(`Delete task "${taskTitle}"?`)) return;
    try {
      await apiRequest(`/study-tasks/${taskId}`, { method: 'DELETE' });
      showToast('Task removed.');
      await loadRoomDetails(selectedRoomId);
    } catch (err) {
      showToast(err.message || 'Failed to delete task.', 'error');
    }
  }

  async function handleCreateAdminTask(e) {
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
      setAdminTaskTopics([]);
      setCurrentTopicInput('');
      setAdminTaskInstructions('');
      showToast('📋 Admin group task created with topic checklists & timer!');
      await loadRoomDetails(selectedRoomId);
    } catch (err) {
      showToast(err.message || 'Failed to create task.', 'error');
    } finally {
      setAdminTaskSubmitting(false);
    }
  }

  async function handleQuickAddTask(e) {
    if (e) e.preventDefault();
    if (!quickTaskTitle.trim() || !selectedRoomId) return;

    setQuickTaskSubmitting(true);
    try {
      await apiRequest('/study-tasks', {
        method: 'POST',
        body: {
          title: quickTaskTitle.trim(),
          room_id: Number(selectedRoomId),
          is_group_task: true,
          subject: roomDetails?.room?.subject || 'General Study',
          due_date: quickTaskDueDate || null
        }
      });
      setQuickTaskTitle('');
      setQuickTaskDueDate('');
      showToast('Task added to group!');
      await loadRoomDetails(selectedRoomId);
    } catch (err) {
      showToast(err.message || 'Failed to add task.', 'error');
    } finally {
      setQuickTaskSubmitting(false);
    }
  }

  async function handleCreateChallenge(e) {
    if (e) e.preventDefault();
    if (!groupChalTitle.trim() || !selectedRoomId) return;

    setGroupChalSubmitting(true);
    try {
      await apiRequest('/challenges', {
        method: 'POST',
        body: {
          room_id: Number(selectedRoomId),
          title: groupChalTitle.trim(),
          challenge_scope: 'group',
          duration_type: groupChalDuration,
          scheduled_date: groupChalDate || null,
          time_limit_minutes: groupChalHasTimer ? Number(groupChalTimerMins) : 0,
          has_timer: groupChalHasTimer,
          min_score: 4.0,
          xp_reward: Number(groupChalXp)
        }
      });
      setShowCreateChallengeModal(false);
      setGroupChalTitle('');
      showToast('🏆 Cohort challenge launched!');
      await loadRoomDetails(selectedRoomId);
    } catch (err) {
      showToast(err.message || 'Failed to create challenge.', 'error');
    } finally {
      setGroupChalSubmitting(false);
    }
  }

  async function handleSendChatMessage(e) {
    if (e) e.preventDefault();
    if (!newRoomMessage.trim() && !selectedChatPhoto) return;
    if (!roomDetails?.chatRoomId) return;

    setSendingRoomMessage(true);
    try {
      let attachmentUrl = null;
      if (selectedChatPhoto) {
        const formData = new FormData();
        formData.append('file', selectedChatPhoto);
        const uploadRes = await apiRequest('/submissions/upload', {
          method: 'POST',
          body: formData
        });
        attachmentUrl = uploadRes.url;
      }

      const msg = await apiRequest(`/chat/${roomDetails.chatRoomId}/messages`, {
        method: 'POST',
        body: {
          message: newRoomMessage.trim() || (attachmentUrl ? 'Shared handwritten notes / attachment' : ''),
          attachment_url: attachmentUrl
        }
      });

      setRoomChatMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setNewRoomMessage('');
      setSelectedChatPhoto(null);
      setChatPhotoPreview(null);
      setTimeout(() => {
        chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } catch (err) {
      showToast(err.message || 'Failed to send message.', 'error');
    } finally {
      setSendingRoomMessage(false);
    }
  }

  async function handleApproveRequest(targetUserId) {
    try {
      await apiRequest(`/study-rooms/${selectedRoomId}/requests/${targetUserId}/approve`, { method: 'POST' });
      showToast('✅ Member approved and added to group!');
      await loadRoomDetails(selectedRoomId);
    } catch (err) {
      showToast(err.message || 'Failed to approve request.', 'error');
    }
  }

  async function handleRejectRequest(targetUserId) {
    try {
      await apiRequest(`/study-rooms/${selectedRoomId}/requests/${targetUserId}/reject`, { method: 'POST' });
      showToast('Request declined.', 'info');
      await loadRoomDetails(selectedRoomId);
    } catch (err) {
      showToast(err.message || 'Failed to decline request.', 'error');
    }
  }

  async function handleAddMember(e) {
    if (e) e.preventDefault();
    if (!memberIdentifier.trim()) return;

    setMemberActionLoading(true);
    setMemberActionError('');
    try {
      await apiRequest(`/study-rooms/${selectedRoomId}/members`, {
        method: 'POST',
        body: { identifier: memberIdentifier.trim(), role: memberRole }
      });
      setShowAddMemberModal(false);
      setMemberIdentifier('');
      showToast('Member added to study group!');
      await loadRoomDetails(selectedRoomId);
    } catch (err) {
      setMemberActionError(err.message || 'Failed to add member.');
    } finally {
      setMemberActionLoading(false);
    }
  }

  async function handleRemoveMember(memberId, memberName) {
    if (!window.confirm(`Remove ${memberName} from this study group?`)) return;
    try {
      await apiRequest(`/study-rooms/${selectedRoomId}/members/${memberId}`, { method: 'DELETE' });
      showToast('Member removed.');
      await loadRoomDetails(selectedRoomId);
    } catch (err) {
      showToast(err.message || 'Failed to remove member.', 'error');
    }
  }

  async function loadAnalytics() {
    if (!selectedRoomId) return;
    setAnalyticsLoading(true);
    try {
      const data = await apiRequest(`/study-rooms/${selectedRoomId}/analytics`);
      setGroupAnalytics(data);
    } catch (e) {
      // ignore
    } finally {
      setAnalyticsLoading(false);
    }
  }

  function formatTaskTimer(task) {
    if (!task) return null;
    const durationDays = Number(task.duration_days) || 0;
    const startedAt = task.timer_started_at || task.created_at;
    if (!startedAt || durationDays <= 0) {
      return task.due_date ? { text: `Due ${new Date(task.due_date).toLocaleDateString()}`, isUrgent: false } : null;
    }
    const endMs = new Date(startedAt).getTime() + (durationDays * 24 * 3600 * 1000);
    const diff = endMs - Date.now();
    if (diff <= 0) return { text: 'Timer Expired', isUrgent: true };
    const days = Math.floor(diff / (24 * 3600 * 1000));
    const hours = Math.floor((diff % (24 * 3600 * 1000)) / (3600 * 1000));
    return {
      text: days > 0 ? `${days}d ${hours}h left` : `${hours}h left`,
      isUrgent: diff < 24 * 3600 * 1000
    };
  }

  function formatChallengeTimer(c) {
    if (!c) return 'Untimed';
    if (c.end_date) {
      const msLeft = new Date(c.end_date) - Date.now();
      if (msLeft > 0) {
        const days = Math.floor(msLeft / (24 * 3600 * 1000));
        const hours = Math.floor((msLeft % (24 * 3600 * 1000)) / (3600 * 1000));
        return days > 0 ? `${days}d ${hours}h left` : `${hours}h left`;
      }
      return 'Expired';
    }
    if (c.has_timer && Number(c.time_limit_minutes) > 0) {
      return `${c.time_limit_minutes}m timer`;
    }
    return 'Active';
  }

  // Filtered rooms for Hub
  const q = searchQuery.trim().toLowerCase();
  const allFilteredRooms = rooms.filter(r => {
    const matchesSearch = !q ||
      (r.name || '').toLowerCase().includes(q) ||
      (r.subject || '').toLowerCase().includes(q) ||
      (r.description || '').toLowerCase().includes(q) ||
      (r.join_code || '').toLowerCase() === q;
    const matchesSubject = subjectFilter === 'all' || r.subject === subjectFilter;
    return matchesSearch && matchesSubject;
  });

  const myRooms = allFilteredRooms.filter(r => r.user_status === 'active' || r.user_role);
  const publicRooms = allFilteredRooms.filter(r => r.user_status !== 'active' && !r.user_role);

  const displayedRooms = hubTab === 'my' ? myRooms : (hubTab === 'explore' ? publicRooms : allFilteredRooms);

  const isCurrentRoomAdmin = roomDetails?.room?.owner_id === user?.id;
  const isCurrentRoomMember = Boolean(roomDetails?.isMember);
  const isCurrentRoomPending = Boolean(roomDetails?.isPending);
  const isPrivateGroup = roomDetails?.room?.room_type === 'private';

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed top-24 right-4 z-[90] max-w-md animate-in fade-in slide-in-from-top-4 duration-200">
          <div className={`p-4 rounded-2xl shadow-2xl border flex items-center space-x-3 text-xs font-semibold backdrop-blur-xl ${
            toast.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
              : toast.type === 'info'
              ? 'bg-amber-950/90 border-amber-500/50 text-amber-200'
              : 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
          }`}>
            <div className="shrink-0">
              {toast.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-400" />
              ) : toast.type === 'info' ? (
                <Clock className="w-4 h-4 text-amber-400" />
              ) : (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">{toast.message}</div>
            <button
              onClick={() => setToast(null)}
              className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* VIEW MODE 1: STUDY GROUPS HUB (No group selected) */}
      {!selectedRoomId ? (
        <div className="space-y-6">
          {/* Hub Header */}
          <div className="glass-panel rounded-3xl p-6 sm:p-8 relative overflow-hidden border border-indigo-500/30 bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-900 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="max-w-xl">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-bold mb-3">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Collaborative Study Cohorts</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Study Groups Workspace
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                  Join interactive peer cohorts, collaborate with real-time live chat, solve doubts, and complete admin task checklists with countdown timers.
                </p>
              </div>

              {/* Primary Call to Actions */}
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setName('');
                    setDescription('');
                    setObjectives('');
                    setShowCreateModal(true);
                  }}
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-extrabold text-xs flex items-center space-x-2 shadow-lg shadow-indigo-600/30 hover:scale-[1.02] transition cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>+ Create Study Group</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowJoinByNameModal(true);
                    setJoinByNameQuery('');
                    setJoinByNameResults(null);
                  }}
                  className="px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-indigo-300 hover:text-white border border-indigo-500/40 hover:border-indigo-400 font-bold text-xs flex items-center space-x-2 shadow-sm transition cursor-pointer"
                >
                  <Search className="w-4 h-4 text-indigo-400" />
                  <span>Join by Name / Code</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Search & Direct Code Join Bar */}
          <div className="glass-panel rounded-2xl p-4 shadow-lg border border-slate-800 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Search by Name */}
              <div className="md:col-span-2 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search groups by title, subject, or description..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-9 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 shadow-inner"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-3 text-slate-400 hover:text-white p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Direct Code Join Input */}
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={quickCodeInput}
                  onChange={e => setQuickCodeInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleQuickJoinCode(e)}
                  placeholder="Enter Group Name or Code..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 min-w-0"
                />
                <button
                  type="button"
                  onClick={handleQuickJoinCode}
                  disabled={!quickCodeInput.trim() || quickCodeLoading}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs shrink-0 cursor-pointer transition shadow-sm"
                >
                  {quickCodeLoading ? 'Joining...' : 'Join'}
                </button>
              </div>
            </div>

            {/* Navigation Filter Tabs & Subject Chips */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-800/80">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setHubTab('my')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
                    hubTab === 'my'
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>My Groups ({myRooms.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHubTab('explore')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
                    hubTab === 'explore'
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Explore Public ({publicRooms.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHubTab('starters')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
                    hubTab === 'starters'
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Starter Cohorts (4)</span>
                </button>
              </div>

              {/* Subject selector */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
                {['all', 'Computer Science', 'Mathematics', 'Physics', 'General Study'].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSubjectFilter(s)}
                    className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap cursor-pointer transition ${
                      subjectFilter === s
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {s === 'all' ? 'All Subjects' : s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tab Content: Starter Cohorts View */}
          {hubTab === 'starters' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Instant 1-Click Starter Cohorts</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Pre-configured cohorts equipped with Discord live doubt chat, topic checklists, and 3-day sprint timers:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {STARTER_COHORTS.map((tmpl, idx) => (
                  <div
                    key={idx}
                    className="glass-panel p-5 rounded-3xl border border-slate-800 hover:border-indigo-500/50 transition flex flex-col justify-between group shadow-lg"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                          {tmpl.subject}
                        </span>
                        <span className="text-xs text-emerald-400 font-semibold flex items-center space-x-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Instant Setup</span>
                        </span>
                      </div>
                      <h4 className="font-bold text-base text-white group-hover:text-indigo-200 transition">
                        {tmpl.name}
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {tmpl.description}
                      </p>

                      <div className="mt-3 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs space-y-1">
                        <div className="font-bold text-purple-300 flex items-center space-x-1.5">
                          <CheckSquare className="w-3.5 h-3.5 text-purple-400" />
                          <span>Includes Checklist Task:</span>
                        </div>
                        <div className="text-slate-400 text-[11px] truncate">
                          "{tmpl.taskTitle}" ({tmpl.topics.length} topics + 3-day countdown)
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3.5 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-mono text-amber-400 font-bold flex items-center space-x-1">
                        <Timer className="w-3.5 h-3.5" />
                        <span>Sprint Active</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => handleCreateStarterGroup(tmpl)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-indigo-600/30 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Launch & Open Group</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab Content: My Groups or Explore Public Groups */}
          {hubTab !== 'starters' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-300 uppercase tracking-wider">
                  {hubTab === 'my' ? `Your Joined Groups (${displayedRooms.length})` : `Public Groups across CONSTA (${displayedRooms.length})`}
                </h3>
              </div>

              {displayedRooms.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayedRooms.map(r => {
                    const isPrivate = r.room_type === 'private';
                    const isOwner = r.owner_id === user?.id;
                    const isMember = r.user_status === 'active';
                    const isPending = r.user_status === 'pending';

                    return (
                      <div
                        key={r.id}
                        onClick={() => {
                          if (isMember) {
                            loadRoomDetails(r.id);
                            setWorkspaceTab('chat');
                          }
                        }}
                        className={`glass-panel p-5 rounded-3xl border transition-all flex flex-col justify-between group shadow-lg ${
                          isMember
                            ? 'cursor-pointer hover:border-indigo-500/60 hover:bg-slate-900/90'
                            : 'border-slate-800'
                        }`}
                      >
                        <div>
                          {/* Badges: Subject & Type */}
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                              {r.subject}
                            </span>
                            <span className={`text-[11px] font-semibold flex items-center space-x-1 ${isPrivate ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {isPrivate ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                              <span>{isPrivate ? 'Private' : 'Public'}</span>
                            </span>
                          </div>

                          <h4 className="font-bold text-base text-white group-hover:text-indigo-200 transition">
                            {r.name}
                          </h4>
                          <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                            {r.description || 'Collaborative study space for peer learning and doubt solving.'}
                          </p>

                          {/* Member and Admin Info */}
                          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                            <span className="flex items-center space-x-1">
                              <Users className="w-3.5 h-3.5 text-indigo-400" />
                              <span>{r.member_count || 1} member(s)</span>
                            </span>
                            <span>Admin: <strong className="text-slate-200">{r.owner_name}</strong></span>
                          </div>

                          {/* Active Challenge snippet if any */}
                          {r.challenges && r.challenges.length > 0 && (
                            <div className="mt-2.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center space-x-2 text-[11px] text-amber-300">
                              <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span className="truncate">{r.challenges[0].title}</span>
                            </div>
                          )}
                        </div>

                        {/* Card Actions */}
                        <div className="mt-5 pt-3.5 border-t border-slate-800 flex items-center justify-between">
                          {isOwner ? (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              Group Admin
                            </span>
                          ) : isMember ? (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              Member
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500">Join to collaborate</span>
                          )}

                          <div className="flex items-center space-x-2">
                            {isMember ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  loadRoomDetails(r.id);
                                  setWorkspaceTab('chat');
                                }}
                                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-indigo-600/30 transition cursor-pointer"
                              >
                                <span>Open Workspace</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            ) : isPending ? (
                              <div className="flex items-center space-x-1.5">
                                <span className="text-amber-400 text-xs font-bold bg-amber-500/15 px-3 py-1.5 rounded-xl border border-amber-500/30 flex items-center space-x-1">
                                  <Clock className="w-3.5 h-3.5 animate-spin" />
                                  <span>Pending</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancelRequest(r.id);
                                  }}
                                  className="text-xs text-slate-400 hover:text-white px-2 py-1"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleJoinRoom(r.id);
                                }}
                                className={`px-4 py-2 rounded-xl text-white font-bold text-xs flex items-center space-x-1.5 shadow-md transition cursor-pointer ${
                                  isPrivate
                                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                                    : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 shadow-indigo-600/30'
                                }`}
                              >
                                {isPrivate ? <Lock className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 stroke-[3]" />}
                                <span>{isPrivate ? 'Request to Join' : '+ Join Group'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="glass-panel p-8 rounded-3xl text-center space-y-4 border border-dashed border-slate-800">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto">
                    <Users className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base text-white">
                      {hubTab === 'my'
                        ? "You haven't joined any study groups yet."
                        : `No public study groups found matching "${searchQuery || 'criteria'}".`}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                      {hubTab === 'my'
                        ? 'Join an existing public group, launch a ready-made starter cohort, or create your own custom group below!'
                        : 'You can create a new group with this name, or explore ready-to-launch starter cohorts.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (searchQuery.trim()) setName(searchQuery.trim());
                        setShowCreateModal(true);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition cursor-pointer flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>{searchQuery.trim() ? `+ Create "${searchQuery.trim().slice(0, 16)}"` : '+ Create New Group'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setHubTab('starters')}
                      className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center space-x-2 transition cursor-pointer"
                    >
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span>Explore Starter Cohorts</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* VIEW MODE 2: FOCUSED GROUP WORKSPACE (When a group is selected) */
        <div className="space-y-6">
          {/* Top Breadcrumb & Group Header Bar */}
          <div className="glass-panel rounded-3xl p-6 shadow-2xl border border-indigo-500/30 bg-slate-900/90 relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRoomId(null);
                      setRoomDetails(null);
                    }}
                    className="p-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white text-xs font-bold flex items-center space-x-1.5 border border-slate-700 cursor-pointer transition shadow-xs"
                  >
                    <ArrowLeft className="w-4 h-4 text-indigo-400" />
                    <span>Back to Groups</span>
                  </button>

                  <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    {roomDetails?.room?.subject || 'Study Group'}
                  </span>

                  <span className={`text-xs px-2.5 py-1 rounded-full border flex items-center space-x-1.5 font-semibold ${
                    isPrivateGroup
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  }`}>
                    {isPrivateGroup ? <Lock className="w-3 h-3 text-amber-400" /> : <Globe className="w-3 h-3 text-emerald-400" />}
                    <span>{isPrivateGroup ? 'Private' : 'Public'}</span>
                  </span>

                  {isCurrentRoomAdmin && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center space-x-1">
                      <Crown className="w-3 h-3 text-amber-400" />
                      <span>Admin</span>
                    </span>
                  )}
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate">
                  {roomDetails?.room?.name}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  {roomDetails?.room?.description || 'Collaborative cohort workspace.'}
                </p>

                <div className="flex items-center space-x-3 mt-3 text-xs text-slate-400">
                  <span>Admin: <strong className="text-white font-semibold">{roomDetails?.room?.owner_name}</strong></span>
                  <span>&bull;</span>
                  <span>{roomDetails?.members?.length || 1} member(s)</span>
                </div>
              </div>

              {/* Workspace Action Controls */}
              <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-center">
                {isCurrentRoomAdmin ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddMemberModal(true);
                        setMemberIdentifier('');
                        setMemberActionError('');
                        apiRequest('/friends').then(f => setUserFriends(f || [])).catch(() => {});
                      }}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-indigo-600/30 cursor-pointer transition"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ Invite Member</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteGroup(roomDetails.room.id)}
                      className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold transition cursor-pointer"
                      title="Delete study group"
                    >
                      <Trash2 className="w-4 h-4 text-rose-400" />
                    </button>
                  </>
                ) : isCurrentRoomMember ? (
                  <button
                    type="button"
                    onClick={() => handleLeaveRoom(roomDetails.room.id)}
                    className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                    <span>Leave Group</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleJoinRoom(roomDetails.room.id)}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 cursor-pointer"
                  >
                    {isPrivateGroup ? 'Request Admin Approval' : 'Join Group to Participate'}
                  </button>
                )}
              </div>
            </div>

            {/* Segmented Workspace Navigation Tabs */}
            <div className="flex items-center space-x-1 sm:space-x-2 mt-6 pt-4 border-t border-slate-800 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setWorkspaceTab('chat')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 shrink-0 cursor-pointer ${
                  workspaceTab === 'chat'
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Live Chat</span>
                {roomChatMessages.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-900/80 text-[10px] text-indigo-300">
                    {roomChatMessages.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setWorkspaceTab('tasks')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 shrink-0 cursor-pointer ${
                  workspaceTab === 'tasks'
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <CheckSquare className="w-4 h-4 text-purple-400" />
                <span>Tasks & Checklist</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-900/80 text-[10px] text-slate-300">
                  {roomDetails?.tasks?.length || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setWorkspaceTab('challenges')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 shrink-0 cursor-pointer ${
                  workspaceTab === 'challenges'
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Challenges</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-900/80 text-[10px] text-slate-300">
                  {roomDetails?.challenges?.length || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setWorkspaceTab('members')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 shrink-0 cursor-pointer ${
                  workspaceTab === 'members'
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Users className="w-4 h-4 text-blue-400" />
                <span>Members</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-900/80 text-[10px] text-slate-300">
                  {roomDetails?.members?.length || 0}
                </span>
                {isCurrentRoomAdmin && roomDetails?.pendingRequests?.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-[10px] text-slate-950 font-black animate-pulse">
                    {roomDetails.pendingRequests.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setWorkspaceTab('analytics');
                  loadAnalytics();
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 shrink-0 cursor-pointer ${
                  workspaceTab === 'analytics'
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <span>Analytics</span>
              </button>
            </div>
          </div>

          {/* TAB 1: LIVE CHAT (Discord-Style Realtime Discussion) */}
          {workspaceTab === 'chat' && (
            <div className="rounded-3xl overflow-hidden border border-slate-800 bg-[#2B1B15] shadow-2xl flex flex-col h-[650px] relative">
              {/* Channel Header */}
              <div className="bg-[#21130F] border-b border-slate-800 px-4 py-3 flex items-center justify-between shadow-xs">
                <div className="flex items-center space-x-2 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                    <Hash className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-sm text-white">general-discussion</span>
                      <span className="text-slate-500 text-xs hidden sm:inline">&bull;</span>
                      <span className="text-xs text-slate-400 truncate hidden sm:inline">{roomDetails?.room?.name}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{chatPresenceCount} Active</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => setChatMemberSidebarOpen(!chatMemberSidebarOpen)}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                    title="Toggle members sidebar"
                  >
                    <Users className="w-4 h-4 text-indigo-400" />
                  </button>
                </div>
              </div>

              {/* Chat Body & Member Sidebar */}
              <div className="flex-1 flex overflow-hidden">
                {/* Chat Messages */}
                <div className="flex-1 flex flex-col overflow-hidden bg-[#261712]">
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                    {/* Welcome Announcement */}
                    <div className="p-4 rounded-2xl bg-[#342018]/60 border border-slate-800 text-xs text-slate-300 space-y-1">
                      <div className="font-bold text-white flex items-center space-x-1.5">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span>Welcome to {roomDetails?.room?.name}!</span>
                      </div>
                      <p className="text-slate-400 leading-relaxed">
                        This is the live cohort channel. Discuss study plans, ask questions, share handwritten notes, and work through tasks together.
                      </p>
                    </div>

                    {roomChatMessages.map(msg => {
                      const isMe = msg.user_id === user?.id;
                      return (
                        <div key={msg.id} className="flex items-start space-x-3 group animate-in fade-in duration-100">
                          <img
                            src={msg.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender_name || 'Student')}&background=A66A43&color=fff`}
                            alt={msg.sender_name}
                            className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-700 shrink-0 mt-0.5"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline space-x-2">
                              <span className={`font-extrabold text-xs ${isMe ? 'text-amber-300' : 'text-white'}`}>
                                {msg.sender_name}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <p className="text-xs text-slate-200 mt-1 leading-relaxed break-words whitespace-pre-wrap">
                              {msg.message}
                            </p>

                            {/* Image Attachment */}
                            {msg.attachment_url && (
                              <div className="mt-2 max-w-sm rounded-2xl overflow-hidden border border-slate-700 bg-slate-950">
                                <a href={getAssetUrl(msg.attachment_url)} target="_blank" rel="noopener noreferrer">
                                  <img
                                    src={getAssetUrl(msg.attachment_url)}
                                    alt="attachment"
                                    className="w-full max-h-64 object-contain hover:scale-105 transition"
                                  />
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatMessagesEndRef} />
                  </div>

                  {/* Photo Preview if selected */}
                  {chatPhotoPreview && (
                    <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <img src={chatPhotoPreview} alt="preview" className="w-12 h-12 rounded-lg object-cover border border-slate-700" />
                        <span className="text-xs text-slate-300">Ready to upload note</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedChatPhoto(null);
                          setChatPhotoPreview(null);
                        }}
                        className="text-slate-400 hover:text-white p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Message Input Bar */}
                  <form onSubmit={handleSendChatMessage} className="p-3 sm:p-4 bg-[#21130F] border-t border-slate-800 flex items-center space-x-2">
                    <label className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 cursor-pointer transition shrink-0" title="Upload handwritten notes or image">
                      <Paperclip className="w-4 h-4" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setSelectedChatPhoto(file);
                            setChatPhotoPreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>

                    <input
                      type="text"
                      value={newRoomMessage}
                      onChange={e => setNewRoomMessage(e.target.value)}
                      placeholder="Type a message or doubt in #general-discussion..."
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 shadow-inner"
                    />

                    <button
                      type="submit"
                      disabled={sendingRoomMessage || (!newRoomMessage.trim() && !selectedChatPhoto)}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-40 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-indigo-600/30 transition cursor-pointer shrink-0"
                    >
                      <Send className="w-4 h-4" />
                      <span className="hidden sm:inline">{sendingRoomMessage ? 'Sending...' : 'Send'}</span>
                    </button>
                  </form>
                </div>

                {/* Collapsible Members List on Side */}
                {chatMemberSidebarOpen && (
                  <div className="w-56 bg-[#21130F] border-l border-slate-800 p-3 overflow-y-auto space-y-3 shrink-0">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span>Cohort Members</span>
                      <span className="text-[10px] font-mono text-indigo-400 font-bold">{roomDetails?.members?.length || 0}</span>
                    </div>

                    <div className="space-y-2">
                      {(roomDetails?.members || []).map(m => (
                        <div key={m.user_id} className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-slate-900/60 transition">
                          <img
                            src={m.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.full_name)}&background=A66A43&color=fff`}
                            alt={m.full_name}
                            className="w-7 h-7 rounded-lg object-cover ring-1 ring-slate-700 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-white truncate">{m.full_name}</div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {m.role === 'owner' ? '👑 Admin' : 'Member'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: TASKS & CHECKLIST */}
          {workspaceTab === 'tasks' && (
            <div className="space-y-6">
              {/* Task Header & Admin Creation Button */}
              <div className="glass-panel rounded-3xl p-6 shadow-xl border border-purple-500/20 bg-slate-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-base text-white flex items-center space-x-2">
                    <div className="p-1.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                      <CheckSquare className="w-4 h-4" />
                    </div>
                    <span>Group Tasks & Topics Checklist</span>
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 text-xs font-bold border border-purple-500/30">
                      {roomDetails?.tasks?.length || 0} scheduled
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Complete assigned topics with interactive checkboxes, track progress percentages, and beat the countdown timer.
                  </p>
                </div>

                {isCurrentRoomAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setAdminTaskTitle('');
                      setAdminTaskTopics([]);
                      setCurrentTopicInput('');
                      setAdminTaskInstructions('');
                      setShowAdminTaskModal(true);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 text-white text-xs font-bold flex items-center space-x-2 shadow-lg shadow-purple-600/25 cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>+ Add Group Task (Admin)</span>
                  </button>
                )}
              </div>

              {/* Tasks List */}
              <div className="space-y-4">
                {(roomDetails?.tasks || []).map(task => {
                  const isTaskCompleted = task.status === 'completed' || task.status === 'approved';
                  const timerInfo = formatTaskTimer(task);
                  const checklist = Array.isArray(task.topics_checklist) ? task.topics_checklist : [];
                  const completedTopics = checklist.filter(t => t.completed).length;
                  const totalTopics = checklist.length;
                  const pct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : (isTaskCompleted ? 100 : 0);

                  return (
                    <div
                      key={task.id}
                      className={`glass-panel p-5 sm:p-6 rounded-3xl border transition-all ${
                        isTaskCompleted
                          ? 'bg-slate-950/40 border-emerald-500/30'
                          : 'border-slate-800 bg-slate-900/80 shadow-md'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start space-x-3.5 min-w-0 flex-1">
                          {/* Main Task Toggle Checkbox */}
                          <button
                            type="button"
                            onClick={(e) => handleToggleTask(task.id, e)}
                            className={`p-1.5 rounded-xl border transition cursor-pointer shrink-0 mt-0.5 ${
                              isTaskCompleted
                                ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400'
                                : 'bg-slate-950 border-slate-700 text-slate-500 hover:border-indigo-500 hover:text-indigo-400'
                            }`}
                            title={isTaskCompleted ? 'Mark incomplete' : 'Mark task complete'}
                          >
                            {isTaskCompleted ? <Check className="w-4 h-4 text-emerald-400 stroke-[3]" /> : <Square className="w-4 h-4" />}
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                {task.subject || 'Cohort Sprint'}
                              </span>

                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                                task.priority === 'urgent' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                                task.priority === 'high' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                                'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                              }`}>
                                {task.priority || 'medium'}
                              </span>

                              {timerInfo && (
                                <span className={`text-[10px] px-2.5 py-0.5 rounded-md font-mono font-bold border flex items-center space-x-1 ${
                                  timerInfo.isUrgent
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                }`}>
                                  <Timer className="w-3 h-3" />
                                  <span>{timerInfo.text}</span>
                                </span>
                              )}
                            </div>

                            <h4 className={`text-base font-bold transition ${isTaskCompleted ? 'line-through text-slate-400' : 'text-white'}`}>
                              {task.title}
                            </h4>

                            {task.instructions && (
                              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                                {task.instructions}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Status & Delete */}
                        <div className="flex items-center space-x-2 shrink-0 self-end sm:self-start">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                            isTaskCompleted
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {isTaskCompleted ? '✓ Completed' : 'In Progress'}
                          </span>

                          {(isCurrentRoomAdmin || task.creator_id === user?.id) && (
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(task.id, task.title)}
                              className="p-1.5 hover:bg-rose-500/20 text-rose-400 rounded-lg transition cursor-pointer"
                              title="Delete task"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Interactive Topics Checklist */}
                      {totalTopics > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-300 flex items-center space-x-1.5">
                              <CheckSquare2 className="w-3.5 h-3.5 text-purple-400" />
                              <span>Topics Checklist ({completedTopics}/{totalTopics})</span>
                            </span>
                            <span className="font-mono font-bold text-indigo-300">{pct}% Completed</span>
                          </div>

                          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-400 transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {checklist.map(topic => (
                              <div
                                key={topic.id}
                                onClick={(e) => handleToggleTopic(task.id, topic.id, e)}
                                className={`p-3 rounded-2xl border flex items-center space-x-2.5 cursor-pointer transition select-none ${
                                  topic.completed
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                                    : 'bg-slate-950/80 hover:bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                                }`}
                              >
                                <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition ${
                                  topic.completed
                                    ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-black'
                                    : 'border-slate-600 bg-slate-900'
                                }`}>
                                  {topic.completed && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <span className={`text-xs font-semibold truncate ${
                                  topic.completed ? 'line-through text-slate-400' : 'text-slate-200'
                                }`}>
                                  {topic.title || topic.topic}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {(!roomDetails?.tasks || roomDetails.tasks.length === 0) && (
                  <div className="glass-panel p-8 rounded-3xl text-center space-y-3 border border-dashed border-slate-800">
                    <CheckSquare className="w-8 h-8 text-slate-500 mx-auto" />
                    <p className="text-xs text-slate-400">No tasks scheduled in this group yet.</p>
                    {isCurrentRoomAdmin && (
                      <button
                        type="button"
                        onClick={() => setShowAdminTaskModal(true)}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow-md"
                      >
                        + Create First Group Task
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Quick Add Task */}
              <div className="glass-panel p-4 rounded-2xl border border-slate-800">
                <form onSubmit={handleQuickAddTask} className="flex flex-col sm:flex-row items-center gap-2">
                  <input
                    type="text"
                    value={quickTaskTitle}
                    onChange={e => setQuickTaskTitle(e.target.value)}
                    placeholder="Quick add task title..."
                    className="flex-1 w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                  />
                  <input
                    type="date"
                    value={quickTaskDueDate}
                    onChange={e => setQuickTaskDueDate(e.target.value)}
                    className="w-full sm:w-auto bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-hidden focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={quickTaskSubmitting || !quickTaskTitle.trim()}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-bold text-xs border border-slate-700 cursor-pointer shrink-0"
                  >
                    {quickTaskSubmitting ? 'Adding...' : '+ Quick Add'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: CHALLENGES */}
          {workspaceTab === 'challenges' && (
            <div className="space-y-6">
              <div className="glass-panel rounded-3xl p-6 shadow-xl border border-amber-500/20 bg-slate-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-base text-white flex items-center space-x-2">
                    <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <span>Cohort Sprints & Speedrun Challenges</span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Compete in scheduled speed challenges, verify solutions with your cohort, and earn bonus XP.
                  </p>
                </div>

                {isCurrentRoomAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setGroupChalTitle('');
                      setShowCreateChallengeModal(true);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-bold flex items-center space-x-2 shadow-lg shadow-amber-600/25 cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>+ Launch Challenge</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(roomDetails?.challenges || []).map(chal => (
                  <div key={chal.id} className="glass-panel p-5 rounded-3xl border border-slate-800 bg-slate-900/90 flex flex-col justify-between group shadow-lg">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          {chal.duration_type || 'weekly'} Sprint
                        </span>
                        <span className="text-xs font-mono font-bold text-amber-400 flex items-center space-x-1">
                          <Timer className="w-3.5 h-3.5" />
                          <span>{formatChallengeTimer(chal)}</span>
                        </span>
                      </div>

                      <h4 className="font-bold text-base text-white group-hover:text-amber-200 transition">
                        {chal.title}
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {chal.description || 'Cohort challenge sprint with timed problem solving and XP rewards.'}
                      </p>
                    </div>

                    <div className="mt-5 pt-3.5 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-indigo-300">
                        +{chal.xp_reward || 250} XP Reward
                      </span>

                      <button
                        type="button"
                        onClick={() => onOpenChallenge && onOpenChallenge(chal.id)}
                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-amber-600/30 transition cursor-pointer"
                      >
                        <span>Participate</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {(!roomDetails?.challenges || roomDetails.challenges.length === 0) && (
                  <div className="md:col-span-2 glass-panel p-8 rounded-3xl text-center space-y-3 border border-dashed border-slate-800">
                    <Trophy className="w-8 h-8 text-slate-500 mx-auto" />
                    <p className="text-xs text-slate-400">No active cohort challenges right now.</p>
                    {isCurrentRoomAdmin && (
                      <button
                        type="button"
                        onClick={() => setShowCreateChallengeModal(true)}
                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs cursor-pointer shadow-md"
                      >
                        + Launch Cohort Sprint
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: MEMBERS & APPROVALS */}
          {workspaceTab === 'members' && (
            <div className="space-y-6">
              {/* Admin Pending Requests Banner */}
              {isCurrentRoomAdmin && roomDetails?.pendingRequests?.length > 0 && (
                <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-amber-500/40 bg-amber-950/20 shadow-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>Pending Join Requests ({roomDetails.pendingRequests.length})</span>
                    </div>
                    <span className="text-[11px] text-amber-400 font-semibold">Admin Approval Required</span>
                  </div>

                  <div className="space-y-2">
                    {roomDetails.pendingRequests.map(req => (
                      <div key={req.user_id} className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                        <div className="flex items-center space-x-3 min-w-0">
                          <img
                            src={req.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.full_name)}&background=A66A43&color=fff`}
                            alt={req.full_name}
                            className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-700 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">{req.full_name}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              @{req.username} &bull; {req.study_streak || 0}d streak
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleApproveRequest(req.user_id)}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1 shadow-md shadow-emerald-600/30 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectRequest(req.user_id)}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 text-xs font-semibold cursor-pointer"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Members Grid */}
              <div className="glass-panel p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-white flex items-center space-x-2">
                    <Users className="w-4 h-4 text-indigo-400" />
                    <span>Active Cohort Members ({roomDetails?.members?.length || 0})</span>
                  </h3>

                  {isCurrentRoomAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddMemberModal(true);
                        setMemberIdentifier('');
                        setMemberActionError('');
                        apiRequest('/friends').then(f => setUserFriends(f || [])).catch(() => {});
                      }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-md"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ Add Member</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {(roomDetails?.members || []).map(m => {
                    const isOwner = m.role === 'owner';
                    return (
                      <div key={m.user_id} className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                        <div className="flex items-center space-x-3 min-w-0">
                          <img
                            src={m.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.full_name)}&background=A66A43&color=fff`}
                            alt={m.full_name}
                            className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-700 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate flex items-center space-x-1">
                              <span>{m.full_name}</span>
                              {isOwner && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                              @{m.username} &bull; {m.study_streak || 0}d streak
                            </div>
                          </div>
                        </div>

                        {isCurrentRoomAdmin && !isOwner && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(m.user_id, m.full_name)}
                            className="p-1 hover:bg-rose-500/20 text-rose-400 rounded-lg transition cursor-pointer"
                            title="Remove member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ANALYTICS */}
          {workspaceTab === 'analytics' && (
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-base text-white flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4 text-emerald-400" />
                    <span>Cohort Analytics & Metrics</span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Real-time performance indicators and task velocity for {roomDetails?.room?.name}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadAnalytics}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                  title="Refresh analytics"
                >
                  <RefreshCw className={`w-4 h-4 ${analyticsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
                  <div className="text-2xl font-black text-white">{roomDetails?.members?.length || 1}</div>
                  <div className="text-[11px] text-slate-400 font-bold uppercase mt-1">Total Members</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
                  <div className="text-2xl font-black text-purple-400">{roomDetails?.tasks?.length || 0}</div>
                  <div className="text-[11px] text-slate-400 font-bold uppercase mt-1">Scheduled Tasks</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
                  <div className="text-2xl font-black text-amber-400">{roomDetails?.challenges?.length || 0}</div>
                  <div className="text-[11px] text-slate-400 font-bold uppercase mt-1">Cohort Sprints</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
                  <div className="text-2xl font-black text-emerald-400">{chatPresenceCount}</div>
                  <div className="text-[11px] text-slate-400 font-bold uppercase mt-1">Live Online</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: CREATE STUDY GROUP */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="glass-panel border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h4 className="font-extrabold text-sm sm:text-base text-white flex items-center space-x-2">
                <div className="p-1.5 rounded-xl bg-indigo-600 text-white">
                  <UserPlus className="w-4 h-4" />
                </div>
                <span>Create New Study Group</span>
              </h4>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Group Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Distributed Systems & AI Research"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="e.g. Computer Science, Mathematics, Physics"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Brief description of the study group focus and goals..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Group Privacy Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRoomType('public')}
                    className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer ${
                      roomType === 'public'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    <Globe className="w-4 h-4 text-emerald-400" />
                    <span>Public (Instant Join)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRoomType('private')}
                    className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer ${
                      roomType === 'private'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span>Private (Admin Approval)</span>
                  </button>
                </div>
              </div>

              {createRoomError && (
                <p className="text-xs text-rose-400 font-semibold">{createRoomError}</p>
              )}

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRoomSubmitting || !name.trim()}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-40 text-white font-extrabold text-xs shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  {createRoomSubmitting ? 'Creating...' : 'Create & Open Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: JOIN BY NAME OR CODE */}
      {showJoinByNameModal && (
        <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="glass-panel border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h4 className="font-extrabold text-sm sm:text-base text-white flex items-center space-x-2">
                <Search className="w-4 h-4 text-indigo-400" />
                <span>Join Group by Unique Name or Code</span>
              </h4>
              <button onClick={() => setShowJoinByNameModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={joinByNameQuery}
                  onChange={e => setJoinByNameQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      setJoinByNameLoading(true);
                      apiRequest(`/study-rooms?search=${encodeURIComponent(joinByNameQuery.trim())}`)
                        .then(res => setJoinByNameResults(res || []))
                        .catch(err => setJoinByNameError(err.message || 'Search failed.'))
                        .finally(() => setJoinByNameLoading(false));
                    }
                  }}
                  placeholder="Enter exact group title or join code..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!joinByNameQuery.trim()) return;
                    setJoinByNameLoading(true);
                    setJoinByNameError('');
                    apiRequest(`/study-rooms?search=${encodeURIComponent(joinByNameQuery.trim())}`)
                      .then(res => setJoinByNameResults(res || []))
                      .catch(err => setJoinByNameError(err.message || 'Search failed.'))
                      .finally(() => setJoinByNameLoading(false));
                  }}
                  disabled={joinByNameLoading || !joinByNameQuery.trim()}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-bold cursor-pointer"
                >
                  {joinByNameLoading ? 'Searching...' : 'Search Network'}
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    if (!joinByNameQuery.trim()) return;
                    setJoinByNameLoading(true);
                    try {
                      const res = await apiRequest('/study-rooms/join-by-name', {
                        method: 'POST',
                        body: { name: joinByNameQuery.trim() }
                      });
                      setShowJoinByNameModal(false);
                      showToast(res.message || 'Successfully joined group!');
                      await loadRooms();
                      if (res.room_id) {
                        await loadRoomDetails(res.room_id);
                        setWorkspaceTab('chat');
                      }
                    } catch (err) {
                      setJoinByNameError(err.message || 'Failed to join group.');
                    } finally {
                      setJoinByNameLoading(false);
                    }
                  }}
                  disabled={joinByNameLoading || !joinByNameQuery.trim()}
                  className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold cursor-pointer"
                >
                  Instant Join
                </button>
              </div>

              {joinByNameError && (
                <p className="text-xs text-rose-400 font-semibold">{joinByNameError}</p>
              )}

              {/* Results List */}
              {joinByNameResults && (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {joinByNameResults.map(r => (
                    <div key={r.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold text-white truncate">{r.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">{r.subject} &bull; {r.member_count} member(s)</div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          setShowJoinByNameModal(false);
                          await handleJoinRoom(r.id);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shrink-0 cursor-pointer"
                      >
                        + Join
                      </button>
                    </div>
                  ))}
                  {joinByNameResults.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-2">No groups found matching "{joinByNameQuery}".</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ADMIN GROUP TASK WITH TOPICS & TIMER */}
      {showAdminTaskModal && (
        <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="glass-panel border-purple-500/30 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-purple-950/20">
              <h4 className="font-extrabold text-sm sm:text-base text-white flex items-center space-x-2">
                <Crown className="w-4 h-4 text-amber-300" />
                <span>Assign Admin Group Task & Checklist</span>
              </h4>
              <button onClick={() => setShowAdminTaskModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAdminTask} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={adminTaskTitle}
                  onChange={e => setAdminTaskTitle(e.target.value)}
                  placeholder="e.g. Algorithms & Data Structures Sprint"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Duration Timer (Days)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={adminTaskDays}
                    onChange={e => setAdminTaskDays(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Priority</label>
                  <select
                    value={adminTaskPriority}
                    onChange={e => setAdminTaskPriority(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Topics Checklist Builder */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Topics Checklist ({adminTaskTopics.length} topics)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={currentTopicInput}
                    onChange={e => setCurrentTopicInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (currentTopicInput.trim()) {
                          setAdminTaskTopics(prev => [...prev, { id: 't' + Date.now(), title: currentTopicInput.trim(), completed: false }]);
                          setCurrentTopicInput('');
                        }
                      }
                    }}
                    placeholder="Type topic name and press Enter..."
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (currentTopicInput.trim()) {
                        setAdminTaskTopics(prev => [...prev, { id: 't' + Date.now(), title: currentTopicInput.trim(), completed: false }]);
                        setCurrentTopicInput('');
                      }
                    }}
                    className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shrink-0 cursor-pointer"
                  >
                    + Add
                  </button>
                </div>

                {/* Topics list preview */}
                <div className="space-y-1.5 mt-2.5 max-h-36 overflow-y-auto">
                  {adminTaskTopics.map((topic, i) => (
                    <div key={topic.id || i} className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-200 truncate">{i + 1}. {topic.title || topic.topic}</span>
                      <button
                        type="button"
                        onClick={() => setAdminTaskTopics(prev => prev.filter((_, idx) => idx !== i))}
                        className="text-slate-500 hover:text-rose-400 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Instructions</label>
                <textarea
                  rows={2}
                  value={adminTaskInstructions}
                  onChange={e => setAdminTaskInstructions(e.target.value)}
                  placeholder="Cohort guidelines for completing this checklist..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAdminTaskModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adminTaskSubmitting || !adminTaskTitle.trim()}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 disabled:opacity-40 text-white font-bold text-xs shadow-md cursor-pointer"
                >
                  {adminTaskSubmitting ? 'Creating...' : 'Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: LAUNCH COHORT CHALLENGE */}
      {showCreateChallengeModal && (
        <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="glass-panel border-amber-500/30 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-amber-950/20">
              <h4 className="font-extrabold text-sm sm:text-base text-white flex items-center space-x-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Launch Cohort Challenge</span>
              </h4>
              <button onClick={() => setShowCreateChallengeModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateChallenge} className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Challenge Title *</label>
                <input
                  type="text"
                  required
                  value={groupChalTitle}
                  onChange={e => setGroupChalTitle(e.target.value)}
                  placeholder="e.g. 45m Timed Problem Solving Sprint"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Timer (Minutes)</label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={groupChalTimerMins}
                    onChange={e => setGroupChalTimerMins(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">XP Reward</label>
                  <input
                    type="number"
                    min="50"
                    max="1000"
                    value={groupChalXp}
                    onChange={e => setGroupChalXp(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateChallengeModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={groupChalSubmitting || !groupChalTitle.trim()}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-bold text-xs shadow-md cursor-pointer"
                >
                  {groupChalSubmitting ? 'Launching...' : 'Launch Challenge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: ADD MEMBER */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="glass-panel border-slate-700 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h4 className="font-extrabold text-sm sm:text-base text-white flex items-center space-x-2">
                <UserPlus className="w-4 h-4 text-indigo-400" />
                <span>Add Member to Group</span>
              </h4>
              <button onClick={() => setShowAddMemberModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setAddMemberTab('friend')}
                  className={`flex-1 py-1.5 font-bold rounded-lg transition ${
                    addMemberTab === 'friend' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400'
                  }`}
                >
                  From Friends ({userFriends.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAddMemberTab('id')}
                  className={`flex-1 py-1.5 font-bold rounded-lg transition ${
                    addMemberTab === 'id' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400'
                  }`}
                >
                  By User ID / Email
                </button>
              </div>

              {addMemberTab === 'friend' && (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {userFriends.map(f => (
                    <div key={f.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <img
                          src={f.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.full_name)}&background=A66A43&color=fff`}
                          alt={f.full_name}
                          className="w-8 h-8 rounded-lg object-cover"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">{f.full_name}</div>
                          <div className="text-[10px] text-slate-400">@{f.username}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          setMemberActionLoading(true);
                          try {
                            await apiRequest(`/study-rooms/${selectedRoomId}/members`, {
                              method: 'POST',
                              body: { identifier: String(f.id), role: memberRole }
                            });
                            setShowAddMemberModal(false);
                            showToast(`Added ${f.full_name} to group!`);
                            await loadRoomDetails(selectedRoomId);
                          } catch (err) {
                            setMemberActionError(err.message || 'Failed to add friend.');
                          } finally {
                            setMemberActionLoading(false);
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer"
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                  {userFriends.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4">No friends found. Add friends or use User ID.</p>
                  )}
                </div>
              )}

              {addMemberTab === 'id' && (
                <form onSubmit={handleAddMember} className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">User ID, Username, or Email</label>
                    <input
                      type="text"
                      required
                      value={memberIdentifier}
                      onChange={e => setMemberIdentifier(e.target.value)}
                      placeholder="e.g. 5 or alice or alice@example.com"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  {memberActionError && (
                    <p className="text-xs text-rose-400 font-semibold">{memberActionError}</p>
                  )}

                  <div className="pt-2 flex items-center justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowAddMemberModal(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={memberActionLoading || !memberIdentifier.trim()}
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs shadow-md cursor-pointer"
                    >
                      {memberActionLoading ? 'Adding...' : 'Add Member'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
