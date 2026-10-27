import React, { useState, useEffect, useRef } from 'react';
import { apiRequest, ChatSocket } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  MessageSquare, Send, Paperclip, Pin, CheckCircle2, ThumbsUp,
  Search, CornerDownRight, Check, Sparkles, Users, Clock,
  Camera, Image as ImageIcon, X, ZoomIn, Download, HelpCircle,
  AlertCircle, ChevronLeft, ArrowLeft, UserCheck, UserPlus, User
} from 'lucide-react';

export default function ChatDiscussionView({ initialChatRoomId, onNavigate, onBack }) {
  const { user, refreshUserData } = useAuth();
  const [chatMode, setChatMode] = useState('group'); // 'group' (Particular Group) | 'friends' (Friends)
  const [rooms, setRooms] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [friends, setFriends] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [activeFriend, setActiveFriend] = useState(null);
  const [activeChatRoomId, setActiveChatRoomId] = useState(initialChatRoomId || null);
  const [activeRoomTitle, setActiveRoomTitle] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyParent, setReplyParent] = useState(null);
  const [isTypingUser, setIsTypingUser] = useState(null);
  const [presenceCount, setPresenceCount] = useState(1);
  const [isDoubt, setIsDoubt] = useState(false);
  const [mobileView, setMobileView] = useState('chat'); // 'threads' | 'chat' for phone/tablet responsiveness

  // Photos state for instant upload
  const [selectedPhotos, setSelectedPhotos] = useState([]); // Array of { file, previewUrl, name, size }
  const [submitting, setSubmitting] = useState(false);
  const [enlargedPhoto, setEnlargedPhoto] = useState(null); // URL for full-screen photo modal

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadChatNav();
  }, [user]);

  // Real-time WebSocket connection
  useEffect(() => {
    socketRef.current = new ChatSocket((data) => {
      if (data.type === 'NEW_CHAT_MESSAGE') {
        if (Number(data.chatRoomId) === Number(activeChatRoomId)) {
          setMessages(prev => {
            if (prev.some(m => m.id === data.message.id)) return prev;
            return [...prev, data.message];
          });
        }
      } else if (data.type === 'SOLUTION_TOGGLED') {
        if (Number(data.chatRoomId) === Number(activeChatRoomId)) {
          setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, is_solution: data.is_solution } : m));
        }
      } else if (data.type === 'MESSAGE_HELPFUL') {
        if (Number(data.chatRoomId) === Number(activeChatRoomId)) {
          setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, is_helpful_count: data.is_helpful_count } : m));
        }
      } else if (data.type === 'USER_TYPING') {
        if (Number(data.chatRoomId) === Number(activeChatRoomId)) {
          if (data.isTyping) {
            setIsTypingUser(data.user.fullName);
          } else {
            setIsTypingUser(null);
          }
        }
      } else if (data.type === 'ROOM_PRESENCE') {
        if (Number(data.chatRoomId) === Number(activeChatRoomId)) {
          setPresenceCount(data.activeCount || 1);
        }
      } else if (data.type === 'FRIEND_UPDATE') {
        refreshFriendsList();
      }
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [activeChatRoomId]);

  // Load messages and subscribe to room
  useEffect(() => {
    if (activeChatRoomId) {
      loadMessages(activeChatRoomId);
      if (socketRef.current) {
        socketRef.current.joinRoom(activeChatRoomId);
      }
    }
  }, [activeChatRoomId]);

  // Real-time background sync fallback (polls every 3 seconds seamlessly without refresh)
  useEffect(() => {
    if (!activeChatRoomId) return;
    const interval = setInterval(() => {
      loadMessagesSilent(activeChatRoomId);
    }, 3000);
    return () => clearInterval(interval);
  }, [activeChatRoomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function refreshFriendsList() {
    try {
      const friendList = await apiRequest('/chat/friends');
      setFriends(friendList || []);
    } catch (e) {
      // ignore
    }
  }

  useEffect(() => {
    function onFriendUpdate() {
      refreshFriendsList();
    }
    window.addEventListener('consta:friend-update', onFriendUpdate);
    return () => {
      window.removeEventListener('consta:friend-update', onFriendUpdate);
    };
  }, []);

  async function loadChatNav() {
    try {
      const roomList = await apiRequest('/study-rooms');
      setRooms(roomList || []);

      const taskList = await apiRequest('/study-tasks');
      setTasks(taskList || []);

      const friendList = await apiRequest('/chat/friends');
      setFriends(friendList || []);

      if (!activeChatRoomId) {
        if (roomList && roomList.length > 0) {
          selectStudyRoomChat(roomList[0]);
        } else if (friendList && friendList.length > 0) {
          setChatMode('friends');
          selectFriendChat(friendList[0]);
        } else if (taskList && taskList.length > 0) {
          selectTaskChat(taskList[0]);
        }
      }
    } catch (e) {
      // ignore
    }
  }

  async function selectStudyRoomChat(room) {
    setActiveGroup(room);
    setActiveFriend(null);
    try {
      const details = await apiRequest(`/study-rooms/${room.id}`);
      setActiveChatRoomId(details.chatRoomId);
      setActiveRoomTitle(`Group: ${room.name}`);
      setMobileView('chat');
    } catch (e) {
      // ignore
    }
  }

  async function selectFriendChat(friend) {
    setActiveFriend(friend);
    setActiveGroup(null);
    try {
      const res = await apiRequest(`/chat/direct/${friend.id}`, { method: 'POST' });
      setActiveChatRoomId(res.chatRoomId);
      setActiveRoomTitle(`Friend: ${friend.full_name}`);
      setMobileView('chat');
    } catch (e) {
      alert(e.message || 'Failed to start friend chat');
    }
  }

  async function selectTaskChat(task) {
    setActiveGroup(null);
    setActiveFriend(null);
    const details = await apiRequest(`/study-tasks/${task.id}`);
    setActiveChatRoomId(details.chatRoomId);
    setActiveRoomTitle(`Task Doubt Thread: ${task.title}`);
    setMobileView('chat');
  }

  async function loadMessages(chatRoomId) {
    try {
      const msgs = await apiRequest(`/chat/room/${chatRoomId}/messages${searchQuery ? `?search=${searchQuery}` : ''}`);
      setMessages(msgs);
    } catch (e) {
      // ignore
    }
  }

  async function loadMessagesSilent(chatRoomId) {
    try {
      const msgs = await apiRequest(`/chat/room/${chatRoomId}/messages`);
      setMessages(prev => {
        // Only update if message count or statuses changed
        if (prev.length !== msgs.length) return msgs;
        const hasDiff = msgs.some((m, idx) => prev[idx]?.is_solution !== m.is_solution || prev[idx]?.is_helpful_count !== m.is_helpful_count);
        return hasDiff ? msgs : prev;
      });
    } catch (e) {
      // silent
    }
  }

  function handlePhotoSelect(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newPhotos = files.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file),
      name: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB'
    }));

    setSelectedPhotos(prev => [...prev, ...newPhotos]);
    // Reset file input so re-selecting same photo triggers onChange
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleRemovePhoto(index) {
    setSelectedPhotos(prev => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleSendMessage(e) {
    if (e) e.preventDefault();
    if (!inputText.trim() && selectedPhotos.length === 0) return;

    let targetRoomId = activeChatRoomId;
    if (!targetRoomId) {
      if (rooms.length > 0) {
        try {
          const details = await apiRequest(`/study-rooms/${rooms[0].id}`);
          targetRoomId = details.chatRoomId;
          setActiveChatRoomId(targetRoomId);
          setActiveGroup(rooms[0]);
          setActiveRoomTitle(`Group: ${rooms[0].name}`);
        } catch {}
      } else if (friends.length > 0) {
        try {
          const res = await apiRequest(`/chat/direct/${friends[0].id}`, { method: 'POST' });
          targetRoomId = res.chatRoomId;
          setActiveChatRoomId(targetRoomId);
          setActiveFriend(friends[0]);
          setActiveRoomTitle(`Friend: ${friends[0].full_name}`);
        } catch {}
      } else {
        // Seamlessly auto-create a default public community study room so send button always works
        try {
          const newRoomRes = await apiRequest('/study-rooms', {
            method: 'POST',
            body: {
              name: 'General Doubt & Study Hub',
              subject: 'General Study',
              description: 'Public community cohort for doubts, discussions, and real-time collaboration.',
              objectives: 'Share doubts, verify solutions, and study together.',
              room_type: 'public'
            }
          });
          targetRoomId = newRoomRes.chat_room_id;
          setActiveChatRoomId(targetRoomId);
          setActiveGroup(newRoomRes.room);
          setActiveRoomTitle(`Group: ${newRoomRes.room.name}`);
          setRooms([newRoomRes.room]);
        } catch {
          // If a room already exists with that name, fetch rooms and pick the first
          try {
            const list = await apiRequest('/study-rooms');
            if (list && list.length > 0) {
              const details = await apiRequest(`/study-rooms/${list[0].id}`);
              targetRoomId = details.chatRoomId;
              setActiveChatRoomId(targetRoomId);
              setActiveGroup(list[0]);
              setActiveRoomTitle(`Group: ${list[0].name}`);
              setRooms(list);
            }
          } catch {}
        }
      }
    }

    if (!targetRoomId) {
      alert('Please select or create a study group or friend to start chatting.');
      return;
    }

    setSubmitting(true);
    try {
      // Detect mentions, e.g. @username
      const mentions = (inputText.match(/@([a-zA-Z0-9_]+)/g) || []).map(m => m.slice(1));

      const formData = new FormData();
      let finalContent = inputText.trim();
      if (isDoubt && !finalContent.includes('[DOUBT]')) {
        finalContent = `[DOUBT] ${finalContent}`;
      }
      formData.append('content', finalContent);
      if (replyParent) formData.append('parent_id', replyParent.id);
      if (mentions.length > 0) formData.append('mentions', JSON.stringify(mentions));

      // Append selected photos for doubt upload
      for (const p of selectedPhotos) {
        formData.append('attachments', p.file);
      }

      // Asynchronous upload without page refresh
      const newMsg = await apiRequest(`/chat/room/${targetRoomId}/messages`, {
        method: 'POST',
        body: formData
      });

      // Optimistically update message feed without refreshing
      setMessages(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      // Real-time WebSocket broadcast to other active users
      if (socketRef.current) {
        socketRef.current.broadcastChatMessage(targetRoomId, newMsg);
      }

      // Clear form states
      setInputText('');
      setSelectedPhotos([]);
      setReplyParent(null);
      setIsDoubt(false);

      // Auto scroll to latest message smoothly
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } catch (err) {
      alert('Failed to send message: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function markSolution(msgId) {
    try {
      const res = await apiRequest(`/chat/messages/${msgId}/solution`, { method: 'POST' });
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_solution: res.is_solution } : m));
      await refreshUserData();
    } catch (err) {
      alert(err.message);
    }
  }

  async function markHelpful(msgId) {
    try {
      const res = await apiRequest(`/chat/messages/${msgId}/helpful`, { method: 'POST' });
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_helpful_count: res.is_helpful_count } : m));
    } catch (err) {
      alert(err.message);
    }
  }

  async function pinMessage(msgId) {
    try {
      const res = await apiRequest(`/chat/messages/${msgId}/pin`, { method: 'POST' });
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_pinned: res.is_pinned } : m));
    } catch (err) {
      alert(err.message);
    }
  }

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
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-indigo-400" />
              <span>Real-Time Doubt Solving Chat</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Ask questions to your particular study group or discuss 1-on-1 with friends. Upload photos and earn +15 XP for verified solutions!
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') loadMessages(activeChatRoomId);
              }}
              placeholder="Search doubts & answers..."
              className="bg-slate-900 border border-slate-700 text-xs text-white rounded-xl pl-8 pr-3 py-1.5 focus:outline-hidden focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Two Doubt Chat Mode Options: Option 1 (Particular Group) & Option 2 (Friends) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-2 sm:p-2.5 rounded-2xl border border-slate-800">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => {
              setChatMode('group');
              if (rooms.length > 0) selectStudyRoomChat(rooms[0]);
            }}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              chatMode === 'group'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400/40'
                : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Particular Group</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${chatMode === 'group' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
              {rooms.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setChatMode('friends');
              if (friends.length > 0) selectFriendChat(friends[0]);
            }}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              chatMode === 'friends'
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-600/30 ring-1 ring-emerald-400/40'
                : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Friends</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${chatMode === 'friends' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
              {friends.length}
            </span>
          </button>
        </div>

        <div className="text-xs text-slate-400 hidden sm:block">
          {chatMode === 'group' ? (
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
              <span>Doubt solving within your enrolled group cohorts</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Direct 1-on-1 doubt discussion with approved friends</span>
            </span>
          )}
        </div>
      </div>

      {/* Mobile Screen Segmented Switcher (Tablet & Phone) */}
      <div className="flex lg:hidden rounded-2xl bg-slate-900 p-1 border border-slate-800">
        <button
          onClick={() => setMobileView('threads')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer ${
            mobileView === 'threads' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>{chatMode === 'group' ? `Groups (${rooms.length})` : `Friends (${friends.length})`}</span>
        </button>
        <button
          onClick={() => setMobileView('chat')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer ${
            mobileView === 'chat' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Active Discussion</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Channels & Doubt Threads List */}
        <div className={`space-y-4 ${mobileView === 'threads' ? 'block' : 'hidden lg:block'}`}>
          {chatMode === 'group' ? (
            /* Option 1: Particular Group Mode */
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between px-1 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Your Study Groups ({rooms.length})
                  </span>
                </div>
                {rooms.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-2">
                    <Users className="w-6 h-6 text-slate-500 mx-auto" />
                    <p className="text-xs text-slate-400">No study groups joined yet.</p>
                    {onNavigate && (
                      <button
                        type="button"
                        onClick={() => onNavigate('group')}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer"
                      >
                        Join / Create Group
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {rooms.map(r => {
                      const isSelected = activeGroup?.id === r.id;
                      return (
                        <button
                          key={r.id}
                          onClick={() => selectStudyRoomChat(r)}
                          className={`w-full text-left p-2.5 rounded-xl text-xs font-medium transition flex items-center space-x-2.5 cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-xs'
                              : 'text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent'
                          }`}
                        >
                          <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-indigo-400'}`}>
                            <Users className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold truncate text-white">{r.name}</div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {r.subject} &bull; {r.member_count || 1} members
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Task Threads */}
              {tasks.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-2">
                    Task Doubt Threads
                  </div>
                  <div className="space-y-1">
                    {tasks.map(t => (
                      <button
                        key={t.id}
                        onClick={() => selectTaskChat(t)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition flex items-center space-x-2 cursor-pointer ${
                          activeRoomTitle.includes(t.title)
                            ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                            : 'text-slate-400 hover:text-white hover:bg-slate-900'
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate">{t.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Option 2: Friends Mode */
            <div>
              <div className="flex items-center justify-between px-1 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Approved Friends ({friends.length})
                </span>
              </div>
              {friends.length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-2">
                  <UserCheck className="w-6 h-6 text-slate-500 mx-auto" />
                  <p className="text-xs text-slate-400">No approved friends yet.</p>
                  <p className="text-[11px] text-slate-500">Connect with friends using their unique user ID to solve doubts 1-on-1!</p>
                  {onNavigate && (
                    <button
                      type="button"
                      onClick={() => onNavigate('profile')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer"
                    >
                      Connect Friends in Profile
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  {friends.map(f => {
                    const isSelected = activeFriend?.id === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => selectFriendChat(f)}
                        className={`w-full text-left p-2.5 rounded-xl text-xs font-medium transition flex items-center space-x-2.5 cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                            : 'text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent'
                        }`}
                      >
                        <div className="relative shrink-0">
                          <img
                            src={f.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.full_name || 'Friend')}&background=10b981&color=fff`}
                            alt={f.full_name}
                            className="w-8 h-8 rounded-xl object-cover ring-1 ring-emerald-500/40"
                          />
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900"></span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold truncate text-white">{f.full_name}</div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {f.lastMessage?.content ? f.lastMessage.content : `@${f.username}`}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right 3 Columns: Active Chat Thread */}
        <div className={`lg:col-span-3 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl flex-col h-[calc(100vh-210px)] min-h-[500px] lg:h-[670px] overflow-hidden ${
          mobileView === 'chat' ? 'flex' : 'hidden lg:flex'
        }`}>
          {/* Room Header */}
          <div className="px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileView('threads')}
                className="lg:hidden p-1.5 rounded-xl bg-slate-800 text-indigo-300 text-xs font-bold flex items-center space-x-1 border border-slate-700 shrink-0 cursor-pointer"
                title="Switch channel or thread"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Channels</span>
              </button>

              {activeFriend ? (
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={activeFriend.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeFriend.full_name || 'Friend')}&background=10b981&color=fff`}
                      alt={activeFriend.full_name}
                      className="w-9 h-9 rounded-xl object-cover ring-2 ring-emerald-500/40"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-slate-900"></span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-sm text-white truncate max-w-xs sm:max-w-md">{activeFriend.full_name}</h3>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 shrink-0">
                        Friend Doubt Chat
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                      <span className="text-emerald-400 font-mono">@{activeFriend.username}</span>
                      <span>&bull;</span>
                      <span className="text-slate-400">Direct 1-on-1 Discussion</span>
                      <span>&bull;</span>
                      <span className="text-amber-400 font-semibold">+15 XP Solution</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-sm text-white truncate max-w-xs sm:max-w-md">{activeRoomTitle}</h3>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 text-[10px] font-bold border border-indigo-500/30 shrink-0">
                      Group Doubt Chat
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                    <span className="flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-semibold text-emerald-400">{presenceCount} online</span>
                    </span>
                    <span>&bull;</span>
                    <span className="hidden sm:inline text-slate-400">Real-Time Sync Active</span>
                    <span className="hidden sm:inline">&bull;</span>
                    <span className="text-amber-400 font-semibold">+15 XP Solution</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-xs">
                <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p>No messages yet in this study discussion.</p>
                <p className="text-[11px] text-slate-600 mt-1">Ask a question or upload a photo of your problem below!</p>
              </div>
            ) : (
              messages.map(m => {
                const isDoubtPost = m.content?.startsWith('[DOUBT]');
                const displayContent = isDoubtPost ? m.content.replace('[DOUBT]', '').trim() : m.content;

                return (
                  <div
                    key={m.id}
                    className={`flex space-x-3 transition-all ${
                      m.is_solution
                        ? 'bg-emerald-950/20 p-3.5 rounded-2xl border border-emerald-500/30'
                        : isDoubtPost
                        ? 'bg-indigo-950/20 p-3.5 rounded-2xl border border-indigo-500/20'
                        : m.is_pinned
                        ? 'bg-slate-950/40 p-3 rounded-2xl border border-amber-500/30'
                        : ''
                    }`}
                  >
                    <img
                      src={m.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.full_name || 'User')}&background=4f46e5&color=fff`}
                      alt={m.full_name}
                      className="w-8 h-8 rounded-xl object-cover ring-1 ring-slate-700 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="font-semibold text-xs text-white">{m.full_name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>

                        {/* Doubt Badge */}
                        {isDoubtPost && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center space-x-1 border border-amber-500/30">
                            <HelpCircle className="w-3 h-3 text-amber-400" />
                            <span>Study Doubt</span>
                          </span>
                        )}

                        {m.is_pinned ? (
                          <span className="text-[10px] text-amber-400 flex items-center space-x-0.5 font-bold">
                            <Pin className="w-3 h-3 fill-amber-400" />
                            <span>Pinned</span>
                          </span>
                        ) : null}

                        {/* Solution Badge */}
                        {m.is_solution ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center space-x-1 border border-emerald-500/40 shadow-xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Accepted Solution (+15 XP)</span>
                          </span>
                        ) : null}
                      </div>

                      {/* Content */}
                      {displayContent && (
                        <div className="mt-1 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                          {displayContent}
                        </div>
                      )}

                      {/* Real-Time Photo Attachments for Doubt */}
                      {m.attachments && m.attachments.length > 0 && (
                        <div className="mt-2.5 space-y-2">
                          <div className="flex flex-wrap gap-3">
                            {m.attachments.map(att => {
                              const isImg = att.mime_type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(att.file_path);
                              return isImg ? (
                                <div key={att.id} className="relative group max-w-sm rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 shadow-md">
                                  <img
                                    src={att.file_path}
                                    alt={att.original_name}
                                    onClick={() => setEnlargedPhoto(att.file_path)}
                                    className="max-h-64 w-auto rounded-2xl object-cover cursor-pointer hover:opacity-95 transition"
                                  />
                                  <div className="p-2 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-300">
                                    <span className="truncate max-w-[180px] font-medium flex items-center space-x-1">
                                      <Camera className="w-3 h-3 text-indigo-400 shrink-0" />
                                      <span>{att.original_name}</span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setEnlargedPhoto(att.file_path)}
                                      className="text-indigo-400 hover:text-indigo-300 text-[10px] font-semibold flex items-center space-x-0.5 cursor-pointer"
                                    >
                                      <ZoomIn className="w-3 h-3" />
                                      <span>Enlarge</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <a
                                  key={att.id}
                                  href={att.file_path}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center space-x-1.5"
                                >
                                  <Paperclip className="w-3.5 h-3.5" />
                                  <span className="truncate max-w-[150px]">{att.original_name}</span>
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Action Bar */}
                      <div className="mt-2.5 flex items-center space-x-3 text-[11px] text-slate-400">
                        <button
                          onClick={() => markHelpful(m.id)}
                          className="hover:text-indigo-400 flex items-center space-x-1 transition cursor-pointer"
                          title="Upvote response"
                        >
                          <ThumbsUp className="w-3 h-3" />
                          <span>{m.is_helpful_count || 0}</span>
                        </button>

                        <button
                          onClick={() => setReplyParent(m)}
                          className="hover:text-indigo-400 flex items-center space-x-1 transition cursor-pointer"
                        >
                          <CornerDownRight className="w-3 h-3" />
                          <span>Reply</span>
                        </button>

                        {/* Solution Toggle Button (without refresh) */}
                        <button
                          onClick={() => markSolution(m.id)}
                          className={`hover:text-emerald-400 flex items-center space-x-1 transition cursor-pointer ${
                            m.is_solution ? 'text-emerald-400 font-bold' : ''
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{m.is_solution ? 'Solution Verified' : 'Mark Solution'}</span>
                        </button>

                        <button
                          onClick={() => pinMessage(m.id)}
                          className="hover:text-amber-400 flex items-center space-x-1 transition cursor-pointer"
                        >
                          <Pin className="w-3 h-3" />
                          <span>Pin</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Typing Indicator */}
          {isTypingUser && (
            <div className="px-6 py-1 text-[11px] text-slate-400 italic flex items-center space-x-1.5 bg-slate-950/40 border-t border-slate-800/50">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
              <span>{isTypingUser} is typing...</span>
            </div>
          )}

          {/* Reply Context Bar */}
          {replyParent && (
            <div className="px-6 py-2 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="truncate">
                Replying to <span className="font-semibold text-white">{replyParent.full_name}</span>: "{replyParent.content?.slice(0, 50)}..."
              </span>
              <button
                onClick={() => setReplyParent(null)}
                className="text-slate-400 hover:text-white text-xs font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Instant Photo Upload Previews Tray (Before Sending) */}
          {selectedPhotos.length > 0 && (
            <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex items-center space-x-3 overflow-x-auto">
              <div className="text-xs text-indigo-400 font-bold flex items-center space-x-1.5 shrink-0">
                <Camera className="w-4 h-4 text-indigo-400 animate-pulse" />
                <span>Ready to upload ({selectedPhotos.length}):</span>
              </div>
              {selectedPhotos.map((photo, idx) => (
                <div key={idx} className="relative group shrink-0">
                  <img
                    src={photo.previewUrl}
                    alt={photo.name}
                    className="w-16 h-16 rounded-xl object-cover border-2 border-indigo-500 shadow-lg"
                  />
                  <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition flex items-center justify-center pointer-events-none">
                    <span className="text-[9px] text-white font-mono">{photo.size}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white text-xs font-bold flex items-center justify-center shadow-lg hover:bg-rose-500 transition cursor-pointer"
                    title="Remove photo"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input Box & Photo Upload Controls */}
          <form onSubmit={handleSendMessage} className="p-3.5 border-t border-slate-800 bg-slate-950/70 flex items-center space-x-2.5">
            {/* Hidden File Input for Photos */}
            <input
              type="file"
              ref={fileInputRef}
              id="chat-photo-file-upload"
              accept="image/*"
              multiple
              onChange={handlePhotoSelect}
              className="hidden"
            />

            {/* Prominent Upload Photo for Doubt Button */}
            <label
              htmlFor="chat-photo-file-upload"
              className="px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer shrink-0"
              title="Upload photo of handwritten work, textbook question, or diagram"
            >
              <Camera className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">Upload Photo</span>
            </label>

            {/* Doubt Tag Toggle Button */}
            <button
              type="button"
              onClick={() => setIsDoubt(!isDoubt)}
              className={`px-2.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1 transition cursor-pointer shrink-0 ${
                isDoubt
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                  : 'bg-slate-800/70 hover:bg-slate-800 text-slate-400 border border-slate-700/60'
              }`}
              title="Tag as study doubt"
            >
              <HelpCircle className={`w-3.5 h-3.5 ${isDoubt ? 'text-amber-400' : 'text-slate-400'}`} />
              <span className="hidden md:inline">Doubt</span>
            </button>

            {/* Text Input */}
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder={isDoubt ? "Describe your doubt or problem..." : "Ask a doubt, explain logic, or mention @user..."}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 min-w-0"
            />

            {/* Send Button */}
            <button
              type="submit"
              onClick={handleSendMessage}
              disabled={submitting || (!inputText.trim() && selectedPhotos.length === 0)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-indigo-600/30 transition cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Sending...' : 'Send'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Full-Screen Photo Viewer Modal */}
      {enlargedPhoto && (
        <div
          onClick={() => setEnlargedPhoto(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <img
              src={enlargedPhoto}
              alt="Enlarged study doubt photo"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl border border-slate-700"
            />
            <div className="absolute top-3 right-3 flex items-center space-x-2">
              <a
                href={enlargedPhoto}
                target="_blank"
                rel="noreferrer"
                download
                className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 transition"
                title="Download original image"
              >
                <Download className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={() => setEnlargedPhoto(null)}
                className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 transition cursor-pointer"
                title="Close viewer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}