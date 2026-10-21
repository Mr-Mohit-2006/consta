import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Flame, Calendar, CheckCircle2, Shield, Sparkles, Plus, Clock, Award, ArrowLeft
} from 'lucide-react';

export default function StreaksView({ onNavigate, onBack }) {
  const { user, streaks, refreshUserData } = useAuth();
  const [weekly, setWeekly] = useState([]);
  const [heatmap, setHeatmap] = useState({});
  const [habitName, setHabitName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStreakData();
  }, [user]);

  async function loadStreakData() {
    setLoading(true);
    try {
      const wk = await apiRequest('/streaks/weekly');
      setWeekly(wk);

      const hm = await apiRequest('/streaks/heatmap?days=90');
      setHeatmap(hm);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleRecordHabit(e) {
    e.preventDefault();
    if (!habitName.trim()) return;

    try {
      await apiRequest('/streaks/record-habit', {
        method: 'POST',
        body: { habit_name: habitName.trim() }
      });
      setHabitName('');
      await refreshUserData();
      await loadStreakData();
      alert('Habit consistency logged for today!');
    } catch (err) {
      alert(err.message);
    }
  }

  // Render 90-day heatmap grid
  const daysArray = [];
  const today = new Date();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const count = heatmap[dateStr] || 0;
    daysArray.push({ date: dateStr, count });
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
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold">Back</span>
          </button>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <Flame className="w-5 h-5 text-amber-400" />
              <span>Daily Streaks & Learning Consistency</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Streaks reflect disciplined study habits. Calculated on the backend using persistent completion records.
            </p>
          </div>
        </div>
      </div>

      {/* Streak Category Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { key: 'study', title: 'Study Streak', icon: Flame, color: 'text-amber-400', border: 'border-amber-500/30', desc: 'Verified task or session completion' },
          { key: 'overall', title: 'Overall Consistency', icon: Award, color: 'text-indigo-400', border: 'border-indigo-500/30', desc: 'All sustained learning actions' },
          { key: 'habit', title: 'Habit Streak', icon: CheckCircle2, color: 'text-emerald-400', border: 'border-emerald-500/30', desc: 'Custom daily focus habits' },
          { key: 'subject', title: 'Subject Mastery', icon: Sparkles, color: 'text-cyan-400', border: 'border-cyan-500/30', desc: 'Subject-specific cadence' }
        ].map(cat => {
          const s = streaks?.[cat.key] || { current_streak: 0, longest_streak: 0 };
          const Icon = cat.icon;

          return (
            <div key={cat.key} className={`bg-slate-900 border ${cat.border} rounded-2xl p-5 shadow-xl`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">{cat.title}</span>
                <Icon className={`w-4 h-4 ${cat.color}`} />
              </div>

              <div className="mt-3 flex items-baseline space-x-2">
                <span className="text-3xl font-extrabold text-white font-mono">{s.current_streak}</span>
                <span className="text-xs text-slate-400 font-semibold">day streak</span>
              </div>

              <div className="text-[11px] text-slate-500 mt-1">
                Longest record: <span className="text-slate-300 font-semibold">{s.longest_streak} days</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-800">
                {cat.desc}
              </div>
            </div>
          );
        })}
      </div>

      {/* 90-Day Consistency Heatmap */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div>
            <h4 className="font-bold text-sm text-white flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>90-Day Consistency Heatmap</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Completed day history is permanently preserved even if a streak resets.
            </p>
          </div>

          <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 self-start sm:self-auto">
            <span>Less</span>
            <div className="w-3 h-3 rounded-xs bg-slate-800" />
            <div className="w-3 h-3 rounded-xs bg-amber-500/20" />
            <div className="w-3 h-3 rounded-xs bg-amber-500/50" />
            <div className="w-3 h-3 rounded-xs bg-amber-500/80" />
            <div className="w-3 h-3 rounded-xs bg-amber-400" />
            <span>More</span>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="grid grid-flow-col grid-rows-7 gap-1.5 overflow-x-auto py-2 scrollbar-none touch-pan-x">
          {daysArray.map((day, idx) => {
            const count = day.count;
            const bgClass =
              count === 0 ? 'bg-slate-950/70 border-slate-800/80' :
              count === 1 ? 'bg-amber-500/20 border-amber-500/30' :
              count === 2 ? 'bg-amber-500/50 border-amber-500/50' :
              count === 3 ? 'bg-amber-500/80 border-amber-500/80' :
              'bg-amber-400 border-amber-300';

            return (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-xs border transition hover:scale-125 cursor-pointer ${bgClass}`}
                title={`${day.date}: ${count} verified learning activities`}
              />
            );
          })}
        </div>
      </div>

      {/* Two Column Layout: Weekly Activity Breakdown vs Log Habit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Activity Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h4 className="font-bold text-sm text-white">7-Day Activity Breakdown</h4>
          <div className="space-y-2.5">
            {weekly.map((w, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-white">{w.date}</span>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {Object.entries(w.categories || {}).map(([cat, c]) => `${c} ${cat}`).join(', ') || 'No recorded activity'}
                  </div>
                </div>
                <span className="font-mono font-bold text-amber-400">
                  {w.total} {w.total === 1 ? 'activity' : 'activities'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Manual Habit / Milestone Logger */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h4 className="font-bold text-sm text-white">Log Daily Focus Habit</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Cultivate consistency by logging daily complementary study habits (e.g., "Read 10 pages of Computer Systems", "Solved 1 LeetCode problem", "Reviewed Flashcards").
          </p>

          <form onSubmit={handleRecordHabit} className="space-y-3">
            <input
              type="text"
              required
              value={habitName}
              onChange={e => setHabitName(e.target.value)}
              placeholder="e.g. Reviewed 20 Dynamic Programming Flashcards"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center space-x-1.5 shadow-lg shadow-indigo-600/30 transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Log Habit for Today</span>
            </button>
          </form>

          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 space-y-1">
            <span className="font-semibold text-slate-400 block">Streak Rules & Safeguards:</span>
            <p>&bull; Missed days reset current streak but permanently preserve your longest streak and completed-day history.</p>
            <p>&bull; Duplicate activities on the same calendar day are logged accurately without falsely inflating streak days.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
