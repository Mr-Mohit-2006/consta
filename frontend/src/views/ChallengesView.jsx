import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Trophy, Flame, Clock, Play, CheckCircle2, Plus, Users, User,
  Sparkles, Award, ArrowRight, ShieldCheck, Square, Check, ChevronLeft
} from 'lucide-react';

export default function ChallengesView({ onOpenTask }) {
  const { user, refreshUserData } = useAuth();
  const [challenges, setChallenges] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [challengeDetails, setChallengeDetails] = useState(null);
  const [scopeFilter, setScopeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [mobileView, setMobileView] = useState('details'); // 'list' | 'details' for mobile responsiveness

  // New challenge modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [chalTitle, setChalTitle] = useState('');
  const [chalDesc, setChalDesc] = useState('');
  const [chalScope, setChalScope] = useState('self'); // 'self' | 'group' | 'friends'
  const [timeLimit, setTimeLimit] = useState(30);
  const [minScore, setMinScore] = useState(4.0);
  const [xpBonus, setXpBonus] = useState(80);

  // Active Sprint timer
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    loadData();
  }, [user]);

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

      if (chalList.length > 0 && !selectedChallenge) {
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

  async function handleCreateChallenge(e) {
    e.preventDefault();
    if (!chalTitle.trim()) return;

    try {
      const res = await apiRequest('/challenges', {
        method: 'POST',
        body: {
          task_id: selectedTaskId ? Number(selectedTaskId) : null,
          room_id: chalScope === 'group' && selectedRoomId ? Number(selectedRoomId) : null,
          title: chalTitle.trim(),
          description: chalDesc.trim(),
          challenge_scope: chalScope,
          time_limit_minutes: Number(timeLimit),
          min_score: Number(minScore),
          xp_reward: Number(xpBonus)
        }
      });

      setShowCreateModal(false);
      setChalTitle('');
      setChalDesc('');
      await loadData();
      loadChallengeDetails(res.id);
      alert('Challenge launched successfully! Notifications dispatched to participants.');
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleStartChallenge(challengeId) {
    try {
      const res = await apiRequest(`/challenges/${challengeId}/start`, { method: 'POST' });
      setTimerSeconds(0);
      setTimerRunning(true);
      await loadChallengeDetails(challengeId);
      alert(`⚡ Challenge started! Push notifications sent to your friends to cheer you on.`);
    } catch (err) {
      alert(err.message);
    }
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

      alert(`🎉 Congratulations! Challenge completed in ${Math.floor(timerSeconds / 60)}m ${timerSeconds % 60}s! You earned +${res.xpReward} bonus XP! Friends have been notified.`);
    } catch (err) {
      alert(err.message);
    }
  }

  const filteredChallenges = challenges.filter(c => {
    if (scopeFilter === 'all') return true;
    return c.challenge_scope === scopeFilter;
  });

  const mins = Math.floor(timerSeconds / 60);
  const secs = timerSeconds % 60;
  const timeFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span>Study Challenges & Sprints</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Turn any study task into a personal sprint or cohort race. Friends receive push alerts when you start!
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-2 shadow-lg shadow-amber-500/20 transition self-start"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Launch Challenge on Task</span>
        </button>
      </div>

      {/* Scope Filter Tabs */}
      <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'All Challenges' },
          { id: 'self', label: 'Self Sprints' },
          { id: 'group', label: 'Cohort Challenges' },
          { id: 'friends', label: 'Study Buddy Challenges' }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setScopeFilter(item.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition whitespace-nowrap ${
              scopeFilter === item.id
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Mobile Screen Segmented Switcher */}
      <div className="flex lg:hidden rounded-2xl bg-slate-900 p-1 border border-slate-800">
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

      {/* Two Column Layout: Challenge List vs Details & Sprint Timer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Challenge List */}
        <div className={`space-y-2.5 ${mobileView === 'list' ? 'block' : 'hidden lg:block'}`}>
          {filteredChallenges.map(c => {
            const isSelected = selectedChallenge?.id === c.id;
            return (
              <div
                key={c.id}
                onClick={() => loadChallengeDetails(c.id)}
                className={`p-4 rounded-2xl border transition cursor-pointer ${
                  isSelected
                    ? 'bg-amber-950/20 border-amber-500/50 shadow-lg'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                    c.challenge_scope === 'self' ? 'bg-indigo-500/20 text-indigo-300' :
                    c.challenge_scope === 'group' ? 'bg-cyan-500/20 text-cyan-300' :
                    'bg-amber-500/20 text-amber-300'
                  }`}>
                    {c.challenge_scope}
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-400">
                    +{c.xp_reward} XP
                  </span>
                </div>

                <h4 className="font-bold text-sm text-white mt-2 line-clamp-1">{c.title}</h4>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{c.description}</p>

                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{c.time_limit_minutes}m target</span>
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
            <div className="text-center py-12 text-xs text-slate-500">
              No challenges found. Click "Launch Challenge on Task" to start one!
            </div>
          )}
        </div>

        {/* Right 2 Columns: Selected Challenge Workspace & Leaderboard */}
        <div className={`lg:col-span-2 ${mobileView === 'details' ? 'block' : 'hidden lg:block'}`}>
          {selectedChallenge && challengeDetails ? (
            <div className="space-y-6">
              {/* Challenge Workspace Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setMobileView('list')}
                        className="lg:hidden p-1.5 rounded-xl bg-slate-800 text-amber-400 text-xs font-bold flex items-center space-x-1 border border-slate-700"
                        title="Back to Challenges List"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Challenges</span>
                      </button>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {selectedChallenge.challenge_scope} sprint
                      </span>
                      {selectedChallenge.task_subject && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {selectedChallenge.task_subject}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-white mt-2">{selectedChallenge.title}</h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{selectedChallenge.description}</p>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <div className="text-2xl font-black text-amber-400 font-mono">+{selectedChallenge.xp_reward} XP</div>
                    <div className="text-xs text-slate-400 mt-0.5">Time limit: {selectedChallenge.time_limit_minutes}m</div>
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

                {/* Live Sprint Timer */}
                <div className="my-8 text-center bg-slate-950/40 p-6 rounded-2xl border border-slate-800/80">
                  <div className="font-mono text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-white to-amber-400 tracking-wider">
                    {timeFormatted}
                  </div>
                  <div className="text-xs text-slate-400 mt-2 flex items-center justify-center space-x-2">
                    <span className={`w-2 h-2 rounded-full ${timerRunning ? 'bg-amber-400 animate-ping' : 'bg-slate-500'}`} />
                    <span>
                      {timerRunning
                        ? 'Sprint timer running (Friends alerted!)'
                        : challengeDetails.myRecord?.is_completed
                        ? 'Challenge completed!'
                        : 'Ready to start'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-center space-x-3 mt-6">
                    {!timerRunning && !challengeDetails.myRecord?.is_completed && (
                      <button
                        onClick={() => handleStartChallenge(selectedChallenge.id)}
                        className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-2 shadow-lg shadow-amber-500/20 transition"
                      >
                        <Play className="w-4 h-4 fill-slate-950" />
                        <span>Start Challenge (Notify Friends)</span>
                      </button>
                    )}

                    {timerRunning && (
                      <button
                        onClick={() => handleCompleteChallenge(selectedChallenge.id)}
                        className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-emerald-600/30 transition"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Complete & Claim +{selectedChallenge.xp_reward} XP</span>
                      </button>
                    )}

                    {challengeDetails.myRecord?.is_completed ? (
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 font-bold text-xs border border-emerald-500/20 flex items-center space-x-2">
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Challenge Conquered! You earned +{selectedChallenge.xp_reward} XP</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Leaderboard Table Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <h4 className="font-bold text-sm text-white">Participants & Challenge Leaderboard</h4>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {challengeDetails.participants?.length || 0} participants
                  </span>
                </div>

                <div className="space-y-2.5">
                  {(challengeDetails.participants || []).map((p, idx) => (
                    <div
                      key={p.user_id}
                      className="p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                          idx === 0 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {idx + 1}
                        </span>
                        <img
                          src={p.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                          alt={p.full_name}
                          className="w-8 h-8 rounded-xl object-cover ring-1 ring-slate-700"
                        />
                        <div>
                          <span className="font-semibold text-xs text-white">{p.full_name}</span>
                          <div className="text-[10px] text-slate-500 capitalize">{p.status}</div>
                        </div>
                      </div>

                      <div className="text-right font-mono text-xs">
                        {p.is_completed ? (
                          <div>
                            <span className="text-emerald-400 font-bold block">
                              {Math.floor(p.time_taken_seconds / 60)}m {p.time_taken_seconds % 60}s
                            </span>
                            <span className="text-[10px] text-slate-500">{p.score_achieved}/5.0 score</span>
                          </div>
                        ) : p.status === 'in_progress' ? (
                          <span className="text-amber-400 font-bold animate-pulse">Running</span>
                        ) : (
                          <span className="text-slate-500">Joined</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 text-xs">
              Select a challenge from the list or launch a new challenge on any task.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Launch Challenge on Task */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-1">Launch Challenge on Task</h3>
            <p className="text-xs text-slate-400 mb-4">
              Turn any study task into a focused speedrun, cohort challenge, or friendly competition.
            </p>

            <form onSubmit={handleCreateChallenge} className="space-y-3.5">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Select Study Task</label>
                <select
                  value={selectedTaskId}
                  onChange={e => setSelectedTaskId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {tasks.map(t => (
                    <option key={t.id} value={t.id}>{t.title} ({t.subject})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Challenge Scope</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'self', label: 'Self Sprint', desc: 'Personal focus' },
                    { id: 'group', label: 'Cohort Group', desc: 'Study room race' },
                    { id: 'friends', label: 'Study Buddies', desc: 'Direct friends' }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setChalScope(item.id)}
                      className={`p-2.5 rounded-xl border text-center transition ${
                        chalScope === item.id
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-semibold">{item.label}</div>
                      <div className="text-[10px] text-slate-500">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {chalScope === 'group' && (
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Assign to Study Room</label>
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
                <label className="text-xs text-slate-400 block mb-1">Challenge Title</label>
                <input
                  type="text"
                  required
                  value={chalTitle}
                  onChange={e => setChalTitle(e.target.value)}
                  placeholder="e.g. 25-Minute LIS Implementation Sprint"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Target Time (mins)</label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={timeLimit}
                    onChange={e => setTimeLimit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Min Score (pts)</label>
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
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Bonus XP</label>
                  <input
                    type="number"
                    min="10"
                    max="500"
                    value={xpBonus}
                    onChange={e => setXpBonus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Description / Rules (Optional)</label>
                <textarea
                  rows={2}
                  value={chalDesc}
                  onChange={e => setChalDesc(e.target.value)}
                  placeholder="Provide any sprint constraints or rules..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 leading-relaxed">
                📢 {chalScope === 'group'
                  ? 'All members of the selected cohort will receive an instant push notification.'
                  : chalScope === 'friends'
                  ? 'All your connected study buddies will receive an instant invite.'
                  : 'Starting this self challenge will notify your study buddies so they can cheer you on!'}
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold"
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
