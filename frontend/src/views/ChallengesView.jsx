import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Trophy, Flame, Clock, Play, CheckCircle2, Plus, Users, User,
  Sparkles, Award, ArrowRight, ShieldCheck, Square, Check, ChevronLeft,
  Calendar, Zap, CalendarDays, Pause, RotateCcw, Timer, Eye, EyeOff, Hourglass, Trash2
} from 'lucide-react';

export default function ChallengesView({ initialChallengeId, onOpenTask }) {
  const { user, refreshUserData } = useAuth();
  const [challenges, setChallenges] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [challengeDetails, setChallengeDetails] = useState(null);
  const [scopeFilter, setScopeFilter] = useState('all');
  const [durationFilter, setDurationFilter] = useState('all'); // 'all' | 'daily' | 'weekly' | 'monthly'
  const [loading, setLoading] = useState(true);
  const [mobileView, setMobileView] = useState('details'); // 'list' | 'details'

  // New challenge modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [chalTitle, setChalTitle] = useState('');
  const [chalDesc, setChalDesc] = useState('');
  const [chalScope, setChalScope] = useState('self'); // 'self' | 'group' | 'friends'
  const [chalDuration, setChalDuration] = useState('weekly'); // 'daily' | 'weekly' | 'monthly'
  const [chalScheduledDate, setChalScheduledDate] = useState(''); // Schedule for specific date
  const [timeLimit, setTimeLimit] = useState(10080); // 7 days in minutes
  const [includeTimer, setIncludeTimer] = useState(true); // User wants timer or not
  const [customTimerMinutes, setCustomTimerMinutes] = useState(25);
  const [minScore, setMinScore] = useState(4.0);
  const [xpBonus, setXpBonus] = useState(250);

  // Active Sprint timer
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState('stopwatch'); // 'stopwatch' | 'countdown'
  const [showWorkspaceTimer, setShowWorkspaceTimer] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    if (initialChallengeId) {
      loadChallengeDetails(initialChallengeId);
    }
  }, [initialChallengeId]);

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  async function loadData() {
    setLoading(true);
    try {
      const chalList = await apiRequest('/challenges');
      setChallenges(chalList);

      const taskList = await apiRequest('/study-tasks');
      setTasks(taskList);
      if (taskList.length > 0 && !selectedTaskId) {
        setSelectedTaskId(taskList[0].id);
      }

      const roomList = await apiRequest('/study-rooms');
      setRooms(roomList);
      if (roomList.length > 0 && !selectedRoomId) {
        setSelectedRoomId(roomList[0].id);
      }

      if (initialChallengeId) {
        loadChallengeDetails(initialChallengeId);
      } else if (chalList.length > 0 && !selectedChallenge) {
        loadChallengeDetails(chalList[0].id);
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function loadChallengeDetails(id) {
    setMobileView('details');
    try {
      const details = await apiRequest(`/challenges/${id}`);
      setSelectedChallenge(details.challenge);
      setChallengeDetails(details);

      // Determine default timer visibility based on challenge configuration
      if (details.challenge.has_timer === 0) {
        setShowWorkspaceTimer(false);
      } else {
        setShowWorkspaceTimer(true);
      }

      // Check if user is in progress
      if (details.myRecord?.status === 'in_progress') {
        const startMs = new Date(details.myRecord.started_at).getTime();
        const elapsed = Math.max(0, Math.round((Date.now() - startMs) / 1000));
        setTimerSeconds(elapsed);
        setTimerRunning(true);
      } else {
        setTimerRunning(false);
        setTimerSeconds(details.myRecord?.time_taken_seconds || 0);
      }
    } catch (err) {
      alert(err.message);
    }
  }

  function handleSelectDuration(dur) {
    setChalDuration(dur);
    if (dur === 'weekly') {
      setTimeLimit(7 * 24 * 60);
      setCustomTimerMinutes(45);
      setXpBonus(250);
      if (!chalTitle) setChalTitle('7-Day Study Mastery Sprint');
    } else if (dur === 'monthly') {
      setTimeLimit(30 * 24 * 60);
      setCustomTimerMinutes(60);
      setXpBonus(600);
      if (!chalTitle) setChalTitle('30-Day Cohort Marathon Quest');
    } else {
      setTimeLimit(60);
      setCustomTimerMinutes(25);
      setXpBonus(100);
      if (!chalTitle) setChalTitle('Quick 60-Minute Focus Challenge');
    }
  }

  async function handleCreateChallenge(e) {
    e.preventDefault();
    if (!chalTitle.trim()) return;

    try {
      const finalTimeLimit = includeTimer ? Number(customTimerMinutes || timeLimit) : 0;
      const res = await apiRequest('/challenges', {
        method: 'POST',
        body: {
          task_id: selectedTaskId ? Number(selectedTaskId) : null,
          room_id: chalScope === 'group' && selectedRoomId ? Number(selectedRoomId) : null,
          title: chalTitle.trim(),
          description: chalDesc.trim(),
          challenge_scope: chalScope,
          duration_type: chalDuration,
          scheduled_date: chalScheduledDate || null,
          time_limit_minutes: finalTimeLimit,
          has_timer: includeTimer,
          min_score: Number(minScore),
          xp_reward: Number(xpBonus)
        }
      });

      setShowCreateModal(false);
      setChalTitle('');
      setChalDesc('');
      setChalScheduledDate('');
      await loadData();
      loadChallengeDetails(res.id);
      alert('Challenge launched successfully! Notifications dispatched to participants.');
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDeleteChallenge(chalId, e) {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this challenge?')) return;
    try {
      await apiRequest(`/challenges/${chalId}`, { method: 'DELETE' });
      await loadData();
      if (selectedChallenge?.id === chalId) {
        setSelectedChallenge(null);
        setChallengeDetails(null);
      }
      alert('Challenge removed successfully.');
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleStartChallenge(challengeId) {
    try {
      await apiRequest(`/challenges/${challengeId}/start`, { method: 'POST' });
      setTimerSeconds(0);
      setTimerRunning(true);
      setShowWorkspaceTimer(true);
      await loadChallengeDetails(challengeId);
      alert(`⚡ Challenge started! Push notifications sent to your friends to cheer you on.`);
    } catch (err) {
      alert(err.message);
    }
  }

  function handleToggleTimer() {
    setTimerRunning(prev => !prev);
  }

  function handleResetTimer() {
    setTimerRunning(false);
    setTimerSeconds(0);
  }

  async function handleCompleteChallenge(challengeId) {
    try {
      const res = await apiRequest(`/challenges/${challengeId}/complete`, {
        method: 'POST',
        body: {
          time_taken_seconds: timerSeconds,
          score_achieved: 5.0
        }
      });

      setTimerRunning(false);
      await refreshUserData();
      await loadChallengeDetails(challengeId);
      await loadData();

      const timeMsg = timerSeconds > 0
        ? `completed in ${Math.floor(timerSeconds / 60)}m ${timerSeconds % 60}s`
        : `completed successfully`;

      alert(`🎉 Congratulations! Challenge ${timeMsg}! You earned +${res.xpReward} bonus XP! Friends have been notified.`);
    } catch (err) {
      alert(err.message);
    }
  }

  const filteredChallenges = challenges.filter(c => {
    if (scopeFilter !== 'all' && c.challenge_scope !== scopeFilter) return false;
    if (durationFilter !== 'all') {
      const dType = c.duration_type || (c.time_limit_minutes >= 20000 ? 'monthly' : c.time_limit_minutes >= 1440 ? 'weekly' : 'daily');
      if (dType !== durationFilter) return false;
    }
    return true;
  });

  // Calculate stopwatch vs countdown values
  const targetMinutes = (selectedChallenge?.time_limit_minutes && selectedChallenge.time_limit_minutes > 0 && selectedChallenge.time_limit_minutes <= 1440)
    ? selectedChallenge.time_limit_minutes
    : (selectedChallenge?.has_timer === 0 ? 0 : 25);

  const targetTotalSeconds = targetMinutes * 60;
  const remainingCountdownSeconds = Math.max(0, targetTotalSeconds - timerSeconds);

  // Stopwatch formatted (counts up)
  const swMins = Math.floor(timerSeconds / 60);
  const swSecs = timerSeconds % 60;
  const stopwatchFormatted = `${swMins.toString().padStart(2, '0')}:${swSecs.toString().padStart(2, '0')}`;

  // Countdown formatted (counts down)
  const cdMins = Math.floor(remainingCountdownSeconds / 60);
  const cdSecs = remainingCountdownSeconds % 60;
  const countdownFormatted = `${cdMins.toString().padStart(2, '0')}:${cdSecs.toString().padStart(2, '0')}`;

  const displayTime = timerMode === 'countdown' && targetMinutes > 0 ? countdownFormatted : stopwatchFormatted;
  const countdownPercent = targetTotalSeconds > 0 ? Math.min(100, Math.round((timerSeconds / targetTotalSeconds) * 100)) : 0;

  function formatTimeRemaining(c) {
    if (c.end_date) {
      const msLeft = new Date(c.end_date) - new Date();
      if (msLeft > 0) {
        const days = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
        return `${days}d remaining`;
      }
      return 'Expiring soon';
    }
    if (c.duration_type === 'weekly') return '7-Day window';
    if (c.duration_type === 'monthly') return '30-Day window';
    return c.time_limit_minutes > 0 ? `${c.time_limit_minutes}m target` : 'Untimed challenge';
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <span>Study Challenges & Quests</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Tackle Daily Sprints, Weekly Milestones (7 Days), or Monthly Quests (30 Days). Earn massive XP bonuses!
          </p>
        </div>

        <button
          onClick={() => {
            setShowCreateModal(true);
            handleSelectDuration('weekly');
          }}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-xs flex items-center space-x-2 shadow-lg shadow-amber-500/20 transition self-start cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Launch Challenge on Task</span>
        </button>
      </div>

      {/* Filter Tabs: Scope and Duration */}
      <div className="space-y-2.5">
        {/* Scope Filters */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 shrink-0">Scope:</span>
          {[
            { id: 'all', label: 'All Challenges' },
            { id: 'self', label: 'Self Sprints' },
            { id: 'group', label: 'Cohort Challenges' },
            { id: 'friends', label: 'Study Buddy Challenges' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setScopeFilter(item.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                scopeFilter === item.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Duration Filters */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 shrink-0">Duration:</span>
          {[
            { id: 'all', label: 'All Durations', icon: Clock },
            { id: 'daily', label: 'Daily Sprints', icon: Zap },
            { id: 'weekly', label: 'Weekly (7 Days)', icon: Calendar },
            { id: 'monthly', label: 'Monthly (30 Days)', icon: CalendarDays }
          ].map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setDurationFilter(item.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap flex items-center space-x-1.5 cursor-pointer ${
                  durationFilter === item.id
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Screen Segmented Switcher */}
      <div className="flex lg:hidden rounded-2xl bg-slate-900/90 p-1 border border-slate-800">
        <button
          onClick={() => setMobileView('list')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer ${
            mobileView === 'list' ? 'bg-amber-500 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Challenges ({filteredChallenges.length})</span>
        </button>
        <button
          onClick={() => setMobileView('details')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer ${
            mobileView === 'details' ? 'bg-amber-500 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Sprint Workspace</span>
        </button>
      </div>

      {/* Two Column Layout: Challenge List vs Details & Timer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Challenge List */}
        <div className={`space-y-2.5 ${mobileView === 'list' ? 'block' : 'hidden lg:block'}`}>
          {filteredChallenges.map(c => {
            const isSelected = selectedChallenge?.id === c.id;
            const dType = c.duration_type || (c.time_limit_minutes >= 20000 ? 'monthly' : c.time_limit_minutes >= 1440 ? 'weekly' : 'daily');

            return (
              <div
                key={c.id}
                onClick={() => loadChallengeDetails(c.id)}
                className={`p-4 rounded-2xl border transition cursor-pointer ${
                  isSelected
                    ? 'bg-amber-950/20 border-amber-500/50 shadow-lg'
                    : 'glass-card glass-card-hover'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                      c.challenge_scope === 'self' ? 'bg-indigo-500/20 text-indigo-300' :
                      c.challenge_scope === 'group' ? 'bg-cyan-500/20 text-cyan-300' :
                      'bg-amber-500/20 text-amber-300'
                    }`}>
                      {c.challenge_scope}
                    </span>

                    {/* Duration Badge */}
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                      dType === 'weekly' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                      dType === 'monthly' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                      'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                    }`}>
                      {dType === 'weekly' ? '📅 Weekly' : dType === 'monthly' ? '🗓️ Monthly' : '⚡ Daily'}
                    </span>
                  </div>

                  <span className="text-xs font-mono font-bold text-amber-400">
                    +{c.xp_reward} XP
                  </span>
                </div>

                <h4 className="font-bold text-sm text-white mt-2 line-clamp-1">{c.title}</h4>

                {c.scheduled_date && (
                  <div className="mt-1 flex items-center space-x-1.5">
                    <span className="text-[10px] text-amber-300 flex items-center space-x-1 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 font-medium">
                      <Calendar className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                      <span>Scheduled: {new Date(c.scheduled_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </span>
                  </div>
                )}

                <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{c.description}</p>

                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center space-x-1 text-slate-400">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{formatTimeRemaining(c)}</span>
                  </span>
                  {c.my_completed ? (
                    <span className="text-emerald-400 font-bold flex items-center space-x-1">
                      <Check className="w-3 h-3" />
                      <span>Completed</span>
                    </span>
                  ) : c.my_status === 'in_progress' ? (
                    <span className="text-amber-400 font-bold animate-pulse">In Progress</span>
                  ) : (
                    <span className="text-slate-500">Not attempted</span>
                  )}
                </div>
              </div>
            );
          })}

          {filteredChallenges.length === 0 && (
            <div className="text-center py-12 text-xs text-slate-500 glass-card rounded-2xl p-6">
              No challenges found in this filter. Click "Launch Challenge on Task" to start a Weekly or Monthly challenge!
            </div>
          )}
        </div>

        {/* Right 2 Columns: Selected Challenge Workspace & Leaderboard */}
        <div className={`lg:col-span-2 ${mobileView === 'details' ? 'block' : 'hidden lg:block'}`}>
          {selectedChallenge && challengeDetails ? (
            <div className="space-y-6">
              {/* Challenge Workspace Card */}
              <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setMobileView('list')}
                        className="lg:hidden p-1.5 rounded-xl bg-slate-800 text-amber-400 text-xs font-bold flex items-center space-x-1 border border-slate-700 cursor-pointer"
                        title="Back to Challenges List"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>All Challenges</span>
                      </button>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {selectedChallenge.challenge_scope} sprint
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                        {selectedChallenge.duration_type || 'weekly'} Duration
                      </span>
                      {selectedChallenge.scheduled_date && (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-amber-400" />
                          <span>Scheduled: {new Date(selectedChallenge.scheduled_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </span>
                      )}
                      {selectedChallenge.task_subject && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {selectedChallenge.task_subject}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-3 mt-2">
                      <h3 className="text-xl font-bold text-white">{selectedChallenge.title}</h3>
                      {(selectedChallenge.creator_id === user?.id || user?.role === 'admin') && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteChallenge(selectedChallenge.id, e)}
                          className="p-1 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 border border-rose-500/20 transition cursor-pointer"
                          title="Delete this challenge"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{selectedChallenge.description}</p>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <div className="text-2xl font-black text-amber-400 font-mono">+{selectedChallenge.xp_reward} XP</div>
                    <div className="text-xs text-slate-400 mt-0.5">{formatTimeRemaining(selectedChallenge)}</div>
                  </div>
                </div>

                {/* Linked task preview */}
                {selectedChallenge.task_title && (
                  <div className="mt-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Tied to Task:</span>
                      <span className="font-semibold text-xs text-white">{selectedChallenge.task_title}</span>
                    </div>
                    {onOpenTask && selectedChallenge.task_id && (
                      <button
                        onClick={() => onOpenTask(selectedChallenge.task_id)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1"
                      >
                        <span>View Task</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}

                {/* Sprint Timer & Action Control Workspace */}
                <div className="mt-6 rounded-2xl bg-slate-950/80 border border-slate-800/80 p-5 sm:p-6 shadow-inner space-y-4">
                  {/* Timer Header & User Preference Controls */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                    <div className="flex items-center space-x-2.5">
                      <div className={`p-2 rounded-xl transition ${timerRunning ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-900 text-slate-400'}`}>
                        <Timer className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs text-white">Focus Timer</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            {timerMode === 'countdown' && targetMinutes > 0 ? `Countdown (${targetMinutes}m)` : 'Stopwatch (Count Up)'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {showWorkspaceTimer
                            ? 'Timer is active for this study sprint. You can pause or reset anytime.'
                            : 'Timer hidden — focus at your own relaxed pace.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 self-start sm:self-auto">
                      {/* Stopwatch vs Countdown Mode Selector */}
                      {showWorkspaceTimer && (
                        <div className="flex rounded-xl bg-slate-900 p-0.5 border border-slate-800 text-[11px]">
                          <button
                            type="button"
                            onClick={() => setTimerMode('stopwatch')}
                            className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                              timerMode === 'stopwatch'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-slate-400 hover:text-white'
                            }`}
                            title="Count up elapsed time"
                          >
                            Stopwatch
                          </button>
                          <button
                            type="button"
                            onClick={() => setTimerMode('countdown')}
                            className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                              timerMode === 'countdown'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-slate-400 hover:text-white'
                            }`}
                            title="Count down from target focus duration"
                          >
                            Countdown
                          </button>
                        </div>
                      )}

                      {/* User Toggle: Enable or hide timer */}
                      <button
                        type="button"
                        onClick={() => setShowWorkspaceTimer(prev => !prev)}
                        className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center space-x-1 transition cursor-pointer"
                        title={showWorkspaceTimer ? "Hide timer if you prefer untimed study" : "Show focus timer"}
                      >
                        {showWorkspaceTimer ? <EyeOff className="w-3.5 h-3.5 text-slate-400" /> : <Eye className="w-3.5 h-3.5 text-amber-400" />}
                        <span className="hidden sm:inline">{showWorkspaceTimer ? 'Hide Timer' : 'Show Timer'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Timer Display & Playback Row */}
                  {showWorkspaceTimer ? (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
                      <div className="flex items-center space-x-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-mono text-xl font-black ${
                          timerRunning
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse'
                            : 'bg-slate-900 text-slate-400 border border-slate-800'
                        }`}>
                          <Clock className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 font-medium flex items-center space-x-1.5">
                            <span>{timerMode === 'countdown' ? 'Remaining Time' : 'Time Elapsed'}</span>
                            {timerRunning && (
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            )}
                          </div>
                          <div className="text-3xl font-black text-white font-mono tracking-wider">
                            {displayTime}
                          </div>
                        </div>
                      </div>

                      {/* Timer Playback Buttons */}
                      <div className="flex items-center space-x-2">
                        {!timerRunning ? (
                          <button
                            type="button"
                            onClick={handleToggleTimer}
                            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center space-x-1.5 shadow-md shadow-amber-500/20 transition cursor-pointer"
                          >
                            <Play className="w-4 h-4 fill-slate-950" />
                            <span>{timerSeconds > 0 ? 'Resume Timer' : 'Start Timer'}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleToggleTimer}
                            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md transition cursor-pointer"
                          >
                            <Pause className="w-4 h-4" />
                            <span>Pause</span>
                          </button>
                        )}

                        {timerSeconds > 0 && (
                          <button
                            type="button"
                            onClick={handleResetTimer}
                            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                            title="Reset Timer to 00:00"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                      <span className="flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                        <span>Untimed Focus Mode: Work at your own pace without ticking timer pressure.</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowWorkspaceTimer(true)}
                        className="text-amber-400 hover:underline font-semibold cursor-pointer shrink-0 ml-2"
                      >
                        Enable Timer
                      </button>
                    </div>
                  )}

                  {/* Complete & Submit Action Row */}
                  <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="text-xs text-slate-400">
                      Finished your work? Click complete to claim your <strong className="text-amber-300 font-bold">+{selectedChallenge.xp_reward} XP</strong> bonus!
                    </span>

                    {challengeDetails.myRecord?.is_completed ? (
                      <div className="px-4 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Challenge Completed!</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleCompleteChallenge(selectedChallenge.id)}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-extrabold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/30 transition cursor-pointer shrink-0"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Finish & Complete Challenge (+{selectedChallenge.xp_reward} XP)</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Leaderboard Table */}
              <div className="glass-panel rounded-3xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-sm text-white flex items-center space-x-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>Sprint Participants Leaderboard</span>
                  </h4>
                  <span className="text-xs text-slate-400">
                    {challengeDetails.participants?.length || 0} enrolled
                  </span>
                </div>

                <div className="space-y-2">
                  {(challengeDetails.participants || []).map((p, idx) => {
                    const isWinner = idx === 0 && p.is_completed;
                    const pMins = Math.floor((p.time_taken_seconds || 0) / 60);
                    const pSecs = (p.time_taken_seconds || 0) % 60;

                    return (
                      <div
                        key={p.user_id}
                        className={`p-3 rounded-xl border flex items-center justify-between ${
                          isWinner
                            ? 'bg-amber-500/10 border-amber-500/30'
                            : 'bg-slate-950/60 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className={`w-6 text-center text-xs font-bold ${
                            idx === 0 ? 'text-amber-400' : 'text-slate-500'
                          }`}>
                            #{idx + 1}
                          </span>
                          <img
                            src={p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name)}&background=4f46e5&color=fff`}
                            alt={p.full_name}
                            className="w-7 h-7 rounded-lg object-cover ring-1 ring-slate-700"
                          />
                          <div>
                            <div className="text-xs font-semibold text-white flex items-center space-x-1.5">
                              <span>{p.full_name}</span>
                              {p.user_id === user?.id && (
                                <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 rounded">You</span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">@{p.username}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          {p.is_completed ? (
                            <div>
                              <div className="text-xs font-bold text-emerald-400 font-mono">
                                {pMins}m {pSecs}s
                              </div>
                              <div className="text-[10px] text-slate-400">Score: {p.score_achieved}/5.0</div>
                            </div>
                          ) : p.status === 'in_progress' ? (
                            <span className="text-xs text-amber-400 font-bold animate-pulse">Running</span>
                          ) : (
                            <span className="text-xs text-slate-500">Joined</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel rounded-3xl p-10 sm:p-14 text-center text-slate-400 text-xs border border-dashed border-slate-800/80">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-500/10">
                <Trophy className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-white mb-1.5">No Challenge Selected</h4>
              <p className="text-slate-400 max-w-sm mx-auto mb-5 leading-relaxed text-xs">
                {challenges.length === 0
                  ? 'No challenges scheduled yet. Launch a new Daily, Weekly, or Monthly focus sprint on any task!'
                  : 'Select a challenge from the list to view sprint goals, timer controls, and leaderboard.'}
              </p>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs inline-flex items-center space-x-1.5 shadow-lg shadow-amber-500/20 transition cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Launch Challenge</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Launch Challenge */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="glass-panel border-slate-700 rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-1">Launch Challenge on Task</h3>
            <p className="text-xs text-slate-400 mb-4">
              Set up a Daily, Weekly, or Monthly goal sprint on any study task.
            </p>

            <form onSubmit={handleCreateChallenge} className="space-y-4">
              {/* Duration Selector */}
              <div>
                <label className="text-xs text-slate-300 block mb-1.5 font-medium">Challenge Duration</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'daily', label: '⚡ Daily Sprint', desc: '1 Day · +100 XP' },
                    { id: 'weekly', label: '📅 Weekly', desc: '7 Days · +250 XP' },
                    { id: 'monthly', label: '🗓️ Monthly', desc: '30 Days · +600 XP' }
                  ].map(dur => (
                    <button
                      key={dur.id}
                      type="button"
                      onClick={() => handleSelectDuration(dur.id)}
                      className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                        chalDuration === dur.id
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-xs'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-bold">{dur.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{dur.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Task Selector */}
              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">Select Task</label>
                <select
                  value={selectedTaskId}
                  onChange={e => setSelectedTaskId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {tasks.map(t => (
                    <option key={t.id} value={t.id}>
                      [{t.subject}] {t.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Scope Selector */}
              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">Who Can Participate?</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'self', label: 'Self Sprint', desc: 'Just for you' },
                    { id: 'group', label: 'Cohort', desc: 'Entire room' },
                    { id: 'friends', label: 'Study Buddies', desc: 'Notify friends' }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setChalScope(item.id)}
                      className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                        chalScope === item.id
                          ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-semibold">{item.label}</div>
                      <div className="text-[10px] text-slate-400">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {chalScope === 'group' && (
                <div>
                  <label className="text-xs text-slate-300 block mb-1 font-medium">Assign to Study Room</label>
                  <select
                    value={selectedRoomId}
                    onChange={e => setSelectedRoomId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {rooms.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">Challenge Title</label>
                <input
                  type="text"
                  required
                  value={chalTitle}
                  onChange={e => setChalTitle(e.target.value)}
                  placeholder="e.g. 7-Day Algorithm Marathon Challenge"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              {/* Schedule For Date (Optional or Specific Date) */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Schedule For Date</span>
                  </label>
                  <span className="text-[11px] font-semibold text-amber-300">
                    {chalScheduledDate ? `Scheduled: ${new Date(chalScheduledDate).toLocaleDateString()}` : 'Starts immediately today'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="date"
                    value={chalScheduledDate}
                    onChange={e => setChalScheduledDate(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                  />
                  {chalScheduledDate && (
                    <button
                      type="button"
                      onClick={() => setChalScheduledDate('')}
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
                        onClick={() => setChalScheduledDate(iso)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition cursor-pointer ${
                          chalScheduledDate === iso
                            ? 'bg-indigo-600 text-white border-indigo-500'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Timer Configuration (User can add timer if they want) */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className={`p-2 rounded-xl transition ${includeTimer ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-900 text-slate-500'}`}>
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-white block">Add Timer (If you want)?</label>
                      <span className="text-[11px] text-slate-400">
                        {includeTimer ? 'Focus countdown & stopwatch will be provided' : 'Untimed goal — complete at your own pace'}
                      </span>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeTimer}
                      onChange={e => setIncludeTimer(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {includeTimer && (
                  <div className="pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-slate-300 font-medium">Session Focus Timer:</span>
                    <div className="flex items-center space-x-1.5">
                      {[15, 25, 45, 60].map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setCustomTimerMinutes(m)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                            customTimerMinutes === m
                              ? 'bg-amber-500 text-slate-950 font-bold'
                              : 'bg-slate-900 border border-slate-700 text-slate-300 hover:text-white'
                          }`}
                        >
                          {m}m
                        </button>
                      ))}
                      <div className="flex items-center space-x-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1">
                        <input
                          type="number"
                          min="1"
                          max="1440"
                          value={customTimerMinutes}
                          onChange={e => setCustomTimerMinutes(Math.max(1, Number(e.target.value)))}
                          className="w-12 bg-transparent text-xs text-white focus:outline-hidden text-right font-bold"
                        />
                        <span className="text-[11px] text-slate-400">min</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1 font-medium">Bonus XP Reward</label>
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={xpBonus}
                    onChange={e => setXpBonus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1 font-medium">Minimum Passing Score</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="5"
                    value={minScore}
                    onChange={e => setMinScore(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">Description / Rules (Optional)</label>
                <textarea
                  rows={2}
                  value={chalDesc}
                  onChange={e => setChalDesc(e.target.value)}
                  placeholder="Provide any rules, guidelines or milestones..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer"
                >
                  Launch Challenge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
