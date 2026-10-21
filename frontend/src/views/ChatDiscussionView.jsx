import React, { useState, useEffect, useRef } from 'react';
import { apiRequest, ChatSocket } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  MessageSquare, Send, Paperclip, Pin, CheckCircle2, ThumbsUp,
  Search, Flag, CornerDownRight, Check, Sparkles, Users, Clock
} from 'lucide-react';

export default function ChatDiscussionView({ initialChatRoomId }) {
  const { user, refreshUserData } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activeChatRoomId, setActiveChatRoomId] = useState(initialChatRoomId || null);
  const [activeRoomTitle, setActiveRoomTitle] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyParent, setReplyParent] = useState(null);
  const [isTypingUser, setIsTypingUser] = useState(null);
  const [presenceCount, setPresenceCount] = useState(1);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadChatNav();
  }, [user]);

  useEffect(() => {
    // Initialize WebSocket
    socketRef.current = new ChatSocket((data) => {
      if (data.type === 'NEW_CHAT_MESSAGE') {
        if (Number(data.chatRoomId) === Number(activeChatRoomId)) {
          setMessages(prev => {
            if (prev.some(m => m.id === data.message.id)) return prev;
            return [...prev, data.message];
          });
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
      }
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [activeChatRoomId]);

  useEffect(() => {
    if (activeChatRoomId) {
      loadMessages(activeChatRoomId);
      if (socketRef.current) {
        socketRef.current.joinRoom(activeChatRoomId);
      }
    }
  }, [activeChatRoomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadChatNav() {
    try {
      const roomList = await apiRequest('/study-rooms');
      setRooms(roomList);

      const taskList = await apiRequest('/study-tasks');
      setTasks(taskList);

      if (!activeChatRoomId) {
        if (roomList.length > 0) {
          selectStudyRoomChat(roomList[0]);
        } else if (taskList.length > 0) {
          selectTaskChat(taskList[0]);
        }
      }
    } catch (e) {
      // ignore
    }
  }

  async function selectStudyRoomChat(room) {
    const details = await apiRequest(`/study-rooms/${room.id}`);
    setActiveChatRoomId(details.chatRoomId);
    setActiveRoomTitle(`Cohort: ${room.name}`);
  }

  async function selectTaskChat(task) {
    const details = await apiRequest(`/study-tasks/${task.id}`);
    setActiveChatRoomId(details.chatRoomId);
    setActiveRoomTitle(`Task Doubt Thread: ${task.title}`);
  }

  async function loadMessages(chatRoomId) {
    try {
      const msgs = await apiRequest(`/chat/room/${chatRoomId}/messages${searchQuery ? `?search=${searchQuery}` : ''}`);
      setMessages(msgs);
    } catch (e) {
      // ignore
    }
  }

  async function handleSendMessage(e) {
    e.preventDefault();
    if (!inputText.trim() && uploadFiles.length === 0) return;
    if (!activeChatRoomId) return;

    setSubmitting(true);
    try {
      // Detect mentions, e.g. @alex_learner
      const mentions = (inputText.match(/@([a-zA-Z0-9_]+)/g) || []).map(m => m.slice(1));

      const formData = new FormData();
      formData.append('content', inputText.trim());
      if (replyParent) formData.append('parent_id', replyParent.id);
      if (mentions.length > 0) formData.append('mentions', JSON.stringify(mentions));

      for (let i = 0; i < uploadFiles.length; i++) {
        formData.append('attachments', uploadFiles[i]);
      }

      const newMsg = await apiRequest(`/chat/room/${activeChatRoomId}/messages`, {
        method: 'POST',
        body: formData
      });

      // Broadcast via WebSocket
      if (socketRef.current) {
        socketRef.current.broadcastChatMessage(activeChatRoomId, newMsg);
      }

      setMessages(prev => [...prev, newMsg]);
      setInputText('');
      setUploadFiles([]);
      setReplyParent(null);
    } catch (err) {
      alert(err.message);
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
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
            <span>Doubt-Solving Discussions & Live Chat</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time doubt resolution, peer explanations, code snippets, thread replies, and accepted solutions.
          </p>
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
              placeholder="Search discussions..."
              className="bg-slate-900 border border-slate-700 text-xs text-white rounded-xl pl-8 pr-3 py-1.5 focus:outline-hidden focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Channels / Threads List */}
        <div className="space-y-4">
          {/* Cohorts */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-2">
              Cohort Rooms
            </div>
            <div className="space-y-1">
              {rooms.map(r => (
                <button
                  key={r.id}
                  onClick={() => selectStudyRoomChat(r)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition flex items-center space-x-2 ${
                    activeRoomTitle.includes(r.name)
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="truncate">{r.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Task Threads */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-2">
              Task Doubt Threads
            </div>
            <div className="space-y-1">
              {tasks.map(t => (
                <button
                  key={t.id}
                  onClick={() => selectTaskChat(t)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition flex items-center space-x-2 ${
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
        </div>

        {/* Right 3 Columns: Active Chat Thread */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl flex flex-col h-[650px] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-3.5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-white truncate max-w-md">{activeRoomTitle}</h3>
              <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{presenceCount} online</span>
                </span>
                <span>&bull;</span>
                <span>Marking accepted solution awards +15 XP</span>
              </div>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map(m => {
              const isMe = m.sender_id === user?.id;
              return (
                <div key={m.id} className={`flex space-x-3 ${m.is_pinned ? 'bg-indigo-950/20 p-3 rounded-2xl border border-indigo-900/30' : ''}`}>
                  <img
                    src={m.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                    alt={m.full_name}
                    className="w-8 h-8 rounded-xl object-cover ring-1 ring-slate-700 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-xs text-white">{m.full_name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {m.is_pinned ? (
                        <span className="text-[10px] text-amber-400 flex items-center space-x-0.5 font-bold">
                          <Pin className="w-3 h-3 fill-amber-400" />
                          <span>Pinned</span>
                        </span>
                      ) : null}
                      {m.is_solution ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center space-x-1 border border-emerald-500/30">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Accepted Solution</span>
                        </span>
                      ) : null}
                    </div>

                    {/* Content */}
                    <div className="mt-1 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {m.content}
                    </div>

                    {/* Attachments */}
                    {m.attachments && m.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {m.attachments.map(att => (
                          <a
                            key={att.id}
                            href={att.file_path}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
                          >
                            <Paperclip className="w-3 h-3" />
                            <span className="truncate max-w-[120px]">{att.original_name}</span>
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="mt-2 flex items-center space-x-3 text-[11px] text-slate-400">
                      <button
                        onClick={() => markHelpful(m.id)}
                        className="hover:text-indigo-400 flex items-center space-x-1"
                      >
                        <ThumbsUp className="w-3 h-3" />
                        <span>{m.is_helpful_count || 0}</span>
                      </button>

                      <button
                        onClick={() => setReplyParent(m)}
                        className="hover:text-indigo-400 flex items-center space-x-1"
                      >
                        <CornerDownRight className="w-3 h-3" />
                        <span>Reply</span>
                      </button>

                      {/* Solution Toggle */}
                      <button
                        onClick={() => markSolution(m.id)}
                        className={`hover:text-emerald-400 flex items-center space-x-1 ${
                          m.is_solution ? 'text-emerald-400 font-bold' : ''
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{m.is_solution ? 'Solution Verified' : 'Mark Solution'}</span>
                      </button>

                      <button
                        onClick={() => pinMessage(m.id)}
                        className="hover:text-amber-400 flex items-center space-x-1"
                      >
                        <Pin className="w-3 h-3" />
                        <span>Pin</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Typing indicator */}
          {isTypingUser && (
            <div className="px-6 py-1 text-[11px] text-slate-500 italic">
              {isTypingUser} is typing...
            </div>
          )}

          {/* Reply Context Bar */}
          {replyParent && (
            <div className="px-6 py-2 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="truncate">
                Replying to <span className="font-semibold text-white">{replyParent.full_name}</span>: "{replyParent.content.slice(0, 50)}..."
              </span>
              <button
                onClick={() => setReplyParent(null)}
                className="text-slate-400 hover:text-white text-xs font-bold ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* Input Box */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center space-x-3">
            <input
              type="file"
              id="chat-file-upload"
              multiple
              onChange={e => setUploadFiles(Array.from(e.target.files))}
              className="hidden"
            />
            <label
              htmlFor="chat-file-upload"
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl cursor-pointer transition"
              title="Attach screenshot or document"
            >
              <Paperclip className="w-4 h-4" />
            </label>

            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Ask a question, explain an algorithm, or mention @username..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
            />

            <button
              type="submit"
              disabled={submitting || (!inputText.trim() && uploadFiles.length === 0)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center space-x-1.5 shadow-lg shadow-indigo-600/30 transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
