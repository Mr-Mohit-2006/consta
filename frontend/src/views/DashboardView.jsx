import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api';
import {
  Sparkles, BookOpen, Users, CheckSquare, Flame, Award, ArrowRight,
  Clock, CheckCircle, AlertCircle, PlusCircle, HelpCircle
} from 'lucide-react';

export default function DashboardView({ onNavigate }) {
  const { user, streaks, progression } = useAuth();
  const [summary, setSummary] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, [user]);

  async function loadDashboard() {
    setLoading(true);
    try {
      const stats = await apiRequest('/study-sessions/stats/summary').catch(() => null);
      setSummary(stats);

      const taskList = await apiRequest('/study-tasks?assigned_to_me=true&limit=5').catch(() => []);
      setTasks(taskList);

      const sessions = await apiRequest('/study-sessions?status=active').catch(() => []);
      if (sessions && sessions.length > 0) {
        setActiveSession(sessions[0]);
      } else {
        setActiveSession(null);
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 border border-indigo-900/40 p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>CONSTA Collaborative Growth Module</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Welcome back, {user?.full_name?.split(' ')[0] || 'Learner'}!
          </h1>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            Ready for today's learning? Track focused study sessions, collaborate in study groups, submit work with multi-version revisions, and level up your consistency streak.
          </p>

          <div className="flex flex-wrap gap-3 mt-5">
            <button
              onClick={() => onNavigate('solo')}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition"
            >
              <BookOpen className="w-4 h-4" />
              <span>Start Solo Study Session</span>
            </button>
            <button
              onClick={() => onNavigate('group')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs flex items-center space-x-2 transition"
            >
              <Users className="w-4 h-4" />
              <span>Join Study Rooms</span>
            </button>
            <button
              onClick={() => onNavigate('tasks')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs flex items-center space-x-2 transition"
            >
              <CheckSquare className="w-4 h-4" />
              <span>View Tasks & Submissions</span>
            </button>
          </div>
        </div>

        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Active Session Alert if running */}
      {activeSession && (
        <div className="bg-indigo-950/40 border border-indigo-500/40 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping inline-block" />
            <div>
              <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Active Study Session</div>
              <div className="text-sm font-semibold text-white">{activeSession.topic} ({activeSession.subject})</div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('solo')}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <span>Resume Focus Timer</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Study Streak */}
        <div
          onClick={() => onNavigate('streaks')}
          className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4.5 hover:border-amber-500/40 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Study Streak</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">{streaks?.study?.current_streak || 0}</span>
            <span className="text-xs text-amber-400 font-semibold">days active</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Longest streak: {streaks?.study?.longest_streak || 0} days
          </div>
        </div>

        {/* Focus Time */}
        <div
          onClick={() => onNavigate('solo')}
          className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4.5 hover:border-indigo-500/40 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Focused Study Time</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">{summary?.totalMinutes || 0}</span>
            <span className="text-xs text-indigo-400 font-semibold">minutes</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Across {summary?.completedSessions || 0} completed session(s)
          </div>
        </div>

        {/* Current Level & XP */}
        <div
          onClick={() => onNavigate('gamification')}
          className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4.5 hover:border-cyan-500/40 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Experience Level</span>
            <Award className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">Lvl {progression?.level || 1}</span>
            <span className="text-xs text-cyan-400 font-semibold">{progression?.currentXp || 0} XP</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {progression?.xpToNextLevel} XP needed for Level {(progression?.level || 1) + 1}
          </div>
        </div>

        {/* Pending Tasks */}
        <div
          onClick={() => onNavigate('tasks')}
          className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4.5 hover:border-purple-500/40 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Assigned Tasks</span>
            <CheckSquare className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">{tasks.length}</span>
            <span className="text-xs text-purple-400 font-semibold">in queue</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {tasks.filter(t => t.status === 'under_review').length} under review
          </div>
        </div>
      </div>

      {/* Two Column Layout: Assigned Tasks & Weekly Consistency */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Assigned Study Tasks */}
        <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <CheckSquare className="w-4 h-4 text-indigo-400" />
              <h3 className="font-semibold text-sm text-white">Assigned Study Tasks</h3>
            </div>
            <button
              onClick={() => onNavigate('tasks')}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
            >
              <span>View all tasks</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {tasks.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No tasks assigned yet. Create one or join a study room!
            </div>
          ) : (
            <div className="space-y-2.5">
              {tasks.map(t => (
                <div
                  key={t.id}
                  onClick={() => onNavigate('tasks')}
                  className="p-3.5 bg-slate-950/40 hover:bg-slate-800/60 border border-slate-800/80 rounded-xl flex items-center justify-between cursor-pointer transition"
                >
                  <div className="min-w-0 pr-4">
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                        t.priority === 'urgent' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                        t.priority === 'high' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {t.priority}
                      </span>
                      <span className="text-xs font-semibold text-slate-200 truncate">{t.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 truncate">
                      {t.subject} &bull; {t.topic}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${
                      t.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      t.status === 'revision_requested' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                      t.status === 'under_review' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Col: 7-Day Consistency Snapshot */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <h3 className="font-semibold text-sm text-white">7-Day Study Calendar</h3>
              </div>
              <button
                onClick={() => onNavigate('streaks')}
                className="text-xs text-amber-400 hover:text-amber-300"
              >
                Heatmap
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Streaks require verified study actions (completing a study session with objectives met or having a task approved).
            </p>

            {/* 7 Day Blocks */}
            <div className="grid grid-cols-7 gap-1.5">
              {(summary?.weeklyActivity || []).map((day, idx) => {
                const hasActivity = day.total > 0;
                const dayName = new Date(day.date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'narrow' });
                return (
                  <div key={idx} className="flex flex-col items-center">
                    <span className="text-[10px] text-slate-500 mb-1">{dayName}</span>
                    <div
                      className={`w-full aspect-square rounded-lg flex items-center justify-center text-[10px] font-bold transition ${
                        hasActivity
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs shadow-amber-500/20'
                          : 'bg-slate-950/60 text-slate-600 border border-slate-800/80'
                      }`}
                      title={`${day.date}: ${day.total} activities`}
                    >
                      {hasActivity ? '✓' : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 bg-slate-950/30 p-3 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-400">Total Focus Sessions</div>
              <div className="text-sm font-bold text-white">{summary?.totalSessions || 0} logged</div>
            </div>
            <button
              onClick={() => onNavigate('analytics')}
              className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 text-xs font-semibold"
            >
              Full Analytics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
