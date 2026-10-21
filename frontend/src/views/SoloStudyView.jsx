import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Play, Pause, Square, RotateCcw, Plus, Check, Clock, AlertTriangle,
  Sparkles, BookOpen, Layers, CheckCircle2, History, ChevronRight,
  Bell, Flame, Award, ArrowLeft
} from 'lucide-react';

export default function SoloStudyView({ onNavigate, onBack }) {
  const { user, refreshUserData } = useAuth();

  // Create session modal or active session state
  const [activeSession, setActiveSession] = useState(null);
  const [objectives, setObjectives] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const timerRef = useRef(null);

  // New session form
  const [showNewModal, setShowNewModal] = useState(false);
  const [subject, setSubject] = useState('Computer Science');
  const [topic, setTopic] = useState('');
  const [learningGoal, setLearningGoal] = useState('');
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [targetDuration, setTargetDuration] = useState(25);
  const [breakInterval, setBreakInterval] = useState(5);
  const [newObjectives, setNewObjectives] = useState(['', '']);

  // Complete session form
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [sessionNotes, setSessionNotes] = useState('');
  const [problemsEncountered, setProblemsEncountered] = useState('');

  // AI Assistant drawer
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Add objective on the fly
  const [quickObjTitle, setQuickObjTitle] = useState('');

  useEffect(() => {
    loadSessions();
  }, []);

  // Timer interval
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

  async function loadSessions() {
    setLoading(true);
    try {
      const list = await apiRequest('/study-sessions');
      setRecentSessions(list);

      const active = list.find(s => s.status === 'active' || s.status === 'paused');
      if (active) {
        setActiveSession(active);
        setObjectives(active.objectives || []);
        setTimerSeconds(active.actual_duration_seconds || 0);
        setTimerRunning(active.status === 'active');
      } else {
        setActiveSession(null);
        setTimerRunning(false);
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleStartSession(e) {
    e.preventDefault();
    if (!topic.trim()) return;

    try {
      const filteredObjs = newObjectives.map(o => o.trim()).filter(Boolean);
      const res = await apiRequest('/study-sessions', {
        method: 'POST',
        body: {
          subject,
          topic,
          learning_goal: learningGoal,
          difficulty,
          target_duration_minutes: Number(targetDuration),
          break_intervals_minutes: Number(breakInterval),
          start_immediately: true,
          objectives: filteredObjs
        }
      });

      setActiveSession(res.session);
      setObjectives(res.objectives);
      setTimerSeconds(0);
      setTimerRunning(true);
      setShowNewModal(false);
      await loadSessions();
    } catch (err) {
      alert(err.message);
    }
  }

  async function toggleTimer() {
    if (!activeSession) return;
    if (timerRunning) {
      // Pause
      setTimerRunning(false);
      await apiRequest(`/study-sessions/${activeSession.id}/pause`, {
        method: 'PUT',
        body: { actual_duration_seconds: timerSeconds }
      });
    } else {
      // Resume
      setTimerRunning(true);
      await apiRequest(`/study-sessions/${activeSession.id}/start`, { method: 'PUT' });
    }
  }

  async function toggleObjective(objId, currentVal) {
    if (!activeSession) return;
    try {
      const updated = await apiRequest(`/study-sessions/${activeSession.id}/objectives/${objId}`, {
        method: 'PUT',
        body: { is_completed: !currentVal }
      });
      setObjectives(prev => prev.map(o => o.id === objId ? updated : o));
    } catch (e) {
      // ignore
    }
  }

  async function handleAddQuickObjective(e) {
    e.preventDefault();
    if (!quickObjTitle.trim() || !activeSession) return;
    try {
      const newObj = await apiRequest(`/study-sessions/${activeSession.id}/objectives`, {
        method: 'POST',
        body: { title: quickObjTitle.trim() }
      });
      setObjectives(prev => [...prev, newObj]);
      setQuickObjTitle('');
    } catch (e) {
      // ignore
    }
  }

  async function handleFinishSession() {
    if (!activeSession) return;
    try {
      const res = await apiRequest(`/study-sessions/${activeSession.id}/complete`, {
        method: 'PUT',
        body: {
          actual_duration_seconds: timerSeconds,
          notes: sessionNotes,
          problems_encountered: problemsEncountered
        }
      });

      setTimerRunning(false);
      setShowCompleteModal(false);
      setActiveSession(null);
      await refreshUserData();
      await loadSessions();

      alert(`🎉 Session completed! You earned ${res.xpAwarded} XP for completing ${res.summary.objectivesCompleted}/${res.summary.totalObjectives} learning objectives.`);
    } catch (err) {
      alert(err.message);
    }
  }

  async function askAiAssistant(e) {
    e.preventDefault();
    if (!aiQuestion.trim()) return;
    setAiLoading(true);
    setAiAnswer(null);
    try {
      const res = await apiRequest('/study-sessions/ai-explain', {
        method: 'POST',
        body: {
          question: aiQuestion.trim(),
          subject: activeSession?.subject || subject
        }
      });
      setAiAnswer(res);
    } catch (err) {
      alert(err.message);
    } finally {
      setAiLoading(false);
    }
  }

  // Format MM:SS
  const mins = Math.floor(timerSeconds / 60);
  const secs = timerSeconds % 60;
  const timeFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  const completedObjsCount = objectives.filter(o => o.is_completed).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
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
              <BookOpen className="w-5 h-5 text-indigo-400" />
              <span>Solo Study Studio</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Focus deeply on learning objectives with built-in timer, concept breakdown, and problem logging.
            </p>
          </div>
        </div>

        {!activeSession && (
          <button
            onClick={() => setShowNewModal(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition self-start"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Study Session</span>
          </button>
        )}
      </div>

      {/* Active Focus Session Workspace */}
      {activeSession ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Timer & Objectives */}
          <div className="lg:col-span-2 space-y-6">
            {/* Timer Card */}
            <div className="bg-slate-900 border border-indigo-900/40 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {activeSession.difficulty} &bull; {activeSession.subject}
                </span>

                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Target: {activeSession.target_duration_minutes}m</span>
                </div>
              </div>

              <div className="mt-4">
                <h3 className="text-xl sm:text-2xl font-bold text-white">{activeSession.topic}</h3>
                {activeSession.learning_goal && (
                  <p className="text-xs text-slate-300 mt-1 italic">"{activeSession.learning_goal}"</p>
                )}
              </div>

              {/* Digital Timer Display */}
              <div className="my-6 sm:my-8 text-center">
                <div className="font-mono text-5xl sm:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-white to-cyan-300 tracking-wider">
                  {timeFormatted}
                </div>
                <div className="text-xs text-slate-400 mt-2 flex items-center justify-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${timerRunning ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                  <span>{timerRunning ? 'Focus timer running' : 'Timer paused'}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md mx-auto">
                <button
                  onClick={toggleTimer}
                  className={`w-full sm:w-auto px-6 py-3 rounded-2xl font-semibold text-xs flex items-center justify-center space-x-2 shadow-lg transition cursor-pointer ${
                    timerRunning
                      ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                  }`}
                >
                  {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                  <span>{timerRunning ? 'Pause Timer' : 'Resume Timer'}</span>
                </button>

                <button
                  onClick={() => setShowCompleteModal(true)}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 transition cursor-pointer"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>Complete & Log Learning</span>
                </button>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 text-center">
                Note: Timer running duration is tracked separately from learning outcomes. Points require verified objectives or submissions.
              </div>
            </div>

            {/* Objectives Checklist Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-bold text-sm text-white flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Learning Objectives Checklist</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Completed {completedObjsCount} of {objectives.length} objectives
                  </p>
                </div>

                <div className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                  {objectives.length > 0 ? Math.round((completedObjsCount / objectives.length) * 100) : 0}%
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-4">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${objectives.length > 0 ? (completedObjsCount / objectives.length) * 100 : 0}%` }}
                />
              </div>

              {/* List of items */}
              <div className="space-y-2 mb-4">
                {objectives.map(obj => (
                  <div
                    key={obj.id}
                    onClick={() => toggleObjective(obj.id, Boolean(obj.is_completed))}
                    className={`p-3 rounded-xl border flex items-center space-x-3 cursor-pointer transition ${
                      obj.is_completed
                        ? 'bg-emerald-950/20 border-emerald-900/40 text-slate-300 line-through'
                        : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-200'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                      obj.is_completed
                        ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                        : 'border-slate-600 bg-slate-800'
                    }`}>
                      {obj.is_completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <span className="text-xs font-medium">{obj.title}</span>
                  </div>
                ))}

                {objectives.length === 0 && (
                  <div className="text-center py-4 text-xs text-slate-500">
                    No learning objectives listed yet. Add one below!
                  </div>
                )}
              </div>

              {/* Add objective form */}
              <form onSubmit={handleAddQuickObjective} className="flex space-x-2">
                <input
                  type="text"
                  value={quickObjTitle}
                  onChange={e => setQuickObjTitle(e.target.value)}
                  placeholder="Add another learning objective..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </form>
            </div>
          </div>

          {/* Right Col: Study Alerts & Notifications */}
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center space-x-2 text-indigo-400 mb-2">
                <Bell className="w-4 h-4" />
                <h4 className="font-bold text-sm text-white">Study Alerts & Notifications</h4>
              </div>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Stay updated with real-time push notifications for your study streaks, break reminders, and buddy milestones.
              </p>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                    <Flame className="w-4 h-4 fill-amber-400" />
                  </div>
                  <div>
                    <div className="font-bold text-white">Streak Milestone Alert</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Completing this session logs persistent progress toward your daily study streak.
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-white">Session Points & XP</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Tracked independently from stopwatch duration to promote genuine learning outcomes.
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                  <span>Real-time buddy alerts active: Friends are notified when you start or complete sessions.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Recent Sessions History & Summaries */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center space-x-2 mb-4">
          <History className="w-4 h-4 text-indigo-400" />
          <h3 className="font-bold text-sm text-white">Daily Study History & Outcomes</h3>
        </div>

        {recentSessions.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            No study sessions recorded yet. Start your first session above!
          </div>
        ) : (
          <div className="space-y-3">
            {recentSessions.map(s => (
              <div
                key={s.id}
                className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-slate-800 text-indigo-300">
                      {s.subject}
                    </span>
                    <span className="font-semibold text-sm text-white">{s.topic}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                      s.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {s.status}
                    </span>
                  </div>

                  {s.notes && (
                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                      <span className="text-slate-500 font-medium">Notes:</span> {s.notes}
                    </p>
                  )}

                  {s.problems_encountered && (
                    <p className="text-xs text-amber-300/90 mt-1 leading-relaxed flex items-start space-x-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span><span className="font-semibold">Problem Encountered:</span> {s.problems_encountered}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-4 text-xs text-slate-400 shrink-0">
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{Math.round((s.actual_duration_seconds || 0) / 60)} mins</span>
                  </div>
                  <div>
                    {new Date(s.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Create Study Session */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Create Solo Study Session</h3>
            <p className="text-xs text-slate-400 mb-4">Set your topic, goal, duration, and objective checklist.</p>

            <form onSubmit={handleStartSession} className="space-y-3.5">
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
                  <label className="text-xs text-slate-400 block mb-1">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                    <option>Expert</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Topic / Chapter</label>
                <input
                  type="text"
                  required
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="e.g. Dynamic Programming & Memoization"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Learning Goal</label>
                <input
                  type="text"
                  value={learningGoal}
                  onChange={e => setLearningGoal(e.target.value)}
                  placeholder="e.g. Master top-down vs bottom-up subproblem tabulation"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Focus Duration (mins)</label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={targetDuration}
                    onChange={e => setTargetDuration(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Break Interval (mins)</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={breakInterval}
                    onChange={e => setBreakInterval(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Learning Objectives (Checklist)</label>
                {newObjectives.map((obj, i) => (
                  <input
                    key={i}
                    type="text"
                    value={obj}
                    onChange={e => {
                      const updated = [...newObjectives];
                      updated[i] = e.target.value;
                      setNewObjectives(updated);
                    }}
                    placeholder={`Objective ${i + 1}`}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white mb-2"
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setNewObjectives([...newObjectives, ''])}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  + Add another objective
                </button>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Start Focus Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Complete Session Summary & Problem Logger */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Complete Study Session</h3>
            <p className="text-xs text-slate-400 mb-4">
              Log your reflections, notes, and any problems encountered during learning.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Session Reflections & Key Takeaways</label>
                <textarea
                  rows={3}
                  value={sessionNotes}
                  onChange={e => setSessionNotes(e.target.value)}
                  placeholder="What did you learn? Summarize the key concepts..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1 flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Problems / Doubts Encountered (Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={problemsEncountered}
                  onChange={e => setProblemsEncountered(e.target.value)}
                  placeholder="Any difficult roadblocks or questions to follow up with peers?"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
                Objectives completed: <span className="font-bold text-emerald-400">{completedObjsCount}/{objectives.length}</span>. Completing learning objectives awards verified study XP!
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Back to Timer
                </button>
                <button
                  type="button"
                  onClick={handleFinishSession}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Save & Log Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
