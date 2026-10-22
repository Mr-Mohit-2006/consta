import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  BarChart3, Clock, CheckCircle2, Award, Flame, RefreshCw,
  Users, Layers, ArrowUpRight, ArrowDownRight, BookOpen, ArrowLeft
} from 'lucide-react';

export default function AnalyticsView({ onNavigate, onBack }) {
  const { user } = useAuth();
  const [personalAnalytics, setPersonalAnalytics] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [groupAnalytics, setGroupAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState('personal'); // 'personal' | 'group'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [user]);

  async function loadAnalytics() {
    setLoading(true);
    try {
      const personal = await apiRequest('/analytics/personal');
      setPersonalAnalytics(personal);

      const roomList = await apiRequest('/study-rooms');
      setRooms(roomList);
      if (roomList.length > 0) {
        setSelectedRoomId(roomList[0].id);
        loadGroupStats(roomList[0].id);
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function loadGroupStats(roomId) {
    setSelectedRoomId(roomId);
    try {
      const grp = await apiRequest(`/analytics/group/${roomId}`);
      setGroupAnalytics(grp);
    } catch (e) {
      // ignore
    }
  }

  if (loading) {
    return <div className="text-center py-16 text-slate-500 text-xs">Computing analytics from database records...</div>;
  }

  const overview = personalAnalytics?.overview || {};

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
              <BarChart3 className="w-5 h-5 text-indigo-400" />
              <span>Learning Analytics & Empirical Metrics</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Separates time-on-task from verified learning outcomes. All metrics computed from authentic database entries.
            </p>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-2xl self-start">
          <button
            onClick={() => setActiveTab('personal')}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'personal'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Personal Growth
          </button>
          <button
            onClick={() => setActiveTab('group')}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'group'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Cohort Analytics
          </button>
        </div>
      </div>

      {activeTab === 'personal' ? (
        <div className="space-y-6">
          {/* Key Metric Blocks */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-5 shadow-xl">
              <span className="text-[11px] sm:text-xs text-slate-400 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="truncate">Total Focus Time</span>
              </span>
              <div className="text-xl sm:text-2xl font-bold text-white font-mono mt-1.5 sm:mt-2 truncate">
                {overview.totalFocusMinutes || 0}m
              </div>
              <div className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 truncate">
                Avg {overview.avgSessionMinutes || 0}m / session
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-5 shadow-xl">
              <span className="text-[11px] sm:text-xs text-slate-400 flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">Approval Rate</span>
              </span>
              <div className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono mt-1.5 sm:mt-2 truncate">
                {overview.approvalRate || 0}%
              </div>
              <div className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 truncate">
                {overview.tasksApproved || 0} of {overview.tasksSubmitted || 0} approved
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-5 shadow-xl">
              <span className="text-[11px] sm:text-xs text-slate-400 flex items-center space-x-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">Revision Iterations</span>
              </span>
              <div className="text-xl sm:text-2xl font-bold text-amber-400 font-mono mt-1.5 sm:mt-2 truncate">
                {overview.totalVersions || 0}
              </div>
              <div className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 truncate">
                {overview.revisionsRequested || 0} revisions resolved
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-5 shadow-xl">
              <span className="text-[11px] sm:text-xs text-slate-400 flex items-center space-x-1.5">
                <Award className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate">Avg Review Score</span>
              </span>
              <div className="text-xl sm:text-2xl font-bold text-cyan-400 font-mono mt-1.5 sm:mt-2 truncate">
                {overview.avgReviewScore || 0} / 5.0
              </div>
              <div className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 truncate">
                From {overview.reviewsReceived || 0} reviews
              </div>
            </div>
          </div>

          {/* Two Column Breakdown: Subject Time vs XP Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Subject Breakdown */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  <h4 className="font-bold text-sm text-white">Focused Study Time by Subject</h4>
                </div>
              </div>

              <div className="space-y-3">
                {(personalAnalytics?.subjectBreakdown || []).map((sb, idx) => {
                  const minutes = Math.round(sb.total_seconds / 60);
                  const totalAll = overview.totalFocusMinutes || 1;
                  const pct = Math.min(100, Math.round((minutes / totalAll) * 100));

                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-200">{sb.subject}</span>
                        <span className="font-mono text-slate-400">{minutes} mins ({sb.session_count} sessions)</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}

                {(!personalAnalytics?.subjectBreakdown || personalAnalytics.subjectBreakdown.length === 0) && (
                  <div className="text-center py-8 text-xs text-slate-500">
                    No subject study time recorded yet.
                  </div>
                )}
              </div>
            </div>

            {/* XP Gain & Loss Distribution */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Award className="w-4 h-4 text-cyan-400" />
                  <h4 className="font-bold text-sm text-white">XP Adjustments by Category</h4>
                </div>
              </div>

              <div className="space-y-2.5">
                {(personalAnalytics?.xpBreakdown || []).map((xp, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-200 capitalize">{xp.category.replace('_', ' ')}</span>
                      <div className="text-[11px] text-slate-500">{xp.transaction_count} transaction(s)</div>
                    </div>
                    <div className="text-right font-mono">
                      {xp.xp_gained > 0 && <span className="text-emerald-400 font-bold block">+{xp.xp_gained} XP</span>}
                      {xp.xp_lost > 0 && <span className="text-rose-400 font-bold block">-{xp.xp_lost} XP</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Group Study Room Analytics */
        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-400 font-medium">Select Cohort:</span>
            <select
              value={selectedRoomId || ''}
              onChange={e => loadGroupStats(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-2"
            >
              {rooms.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          {groupAnalytics ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <span className="text-xs text-slate-400 flex items-center space-x-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Active Members</span>
                </span>
                <div className="text-2xl font-bold text-white font-mono mt-2">
                  {groupAnalytics.members}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {groupAnalytics.facilitators} moderators/owners
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <span className="text-xs text-slate-400 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Shared Tasks Completed</span>
                </span>
                <div className="text-2xl font-bold text-emerald-400 font-mono mt-2">
                  {groupAnalytics.taskCompletionRate}%
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {groupAnalytics.completedTasks}/{groupAnalytics.totalTasks} completed
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <span className="text-xs text-slate-400 flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Review Turnaround</span>
                </span>
                <div className="text-2xl font-bold text-cyan-400 font-mono mt-2">
                  {groupAnalytics.avgReviewTurnaroundHours !== null ? `${groupAnalytics.avgReviewTurnaroundHours}h` : 'N/A'}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Submission to review latency
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <span className="text-xs text-slate-400 flex items-center space-x-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span>Accepted Doubt Solutions</span>
                </span>
                <div className="text-2xl font-bold text-amber-400 font-mono mt-2">
                  {groupAnalytics.acceptedSolutions}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {groupAnalytics.helpfulReactions} upvotes received
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-xs text-slate-500">
              No analytics available for this study room.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
