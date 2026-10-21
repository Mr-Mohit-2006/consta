import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Award, ShieldAlert, History, Trophy, Plus, Check, ArrowUpRight,
  ArrowDownRight, HelpCircle, FileText
} from 'lucide-react';

export default function GamificationView() {
  const { user, progression, refreshUserData } = useAuth();
  const [history, setHistory] = useState([]);
  const [levels, setLevels] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Appeal modal
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [appealReason, setAppealReason] = useState('');

  useEffect(() => {
    loadGamificationData();
  }, [user]);

  async function loadGamificationData() {
    setLoading(true);
    try {
      const hist = await apiRequest('/gamification/history');
      setHistory(hist);

      const lvl = await apiRequest('/gamification/levels');
      setLevels(lvl);

      const ach = await apiRequest('/gamification/achievements');
      setAchievements(ach);

      const app = await apiRequest('/gamification/appeals');
      setAppeals(app);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleFileAppeal(e) {
    e.preventDefault();
    if (!selectedTx || !appealReason.trim()) return;

    try {
      await apiRequest('/gamification/appeal', {
        method: 'POST',
        body: {
          xp_transaction_id: selectedTx.id,
          reason: appealReason.trim()
        }
      });

      setShowAppealModal(false);
      setAppealReason('');
      setSelectedTx(null);
      await loadGamificationData();
      alert('Appeal submitted for mentor/moderator review.');
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <Award className="w-5 h-5 text-indigo-400" />
          <span>Performance-Based XP & Level Progression</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Transparent, auditable gamification system reflecting sustained learning consistency and verified peer feedback.
        </p>
      </div>

      {/* Main Progression Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center font-black text-2xl text-white shadow-xl shadow-indigo-600/30">
              L{progression?.level || 1}
            </div>
            <div>
              <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Current Rank</div>
              <h3 className="text-2xl font-extrabold text-white">{progression?.title || 'Novice Explorer'}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Lifetime earned XP: <span className="font-mono font-semibold text-slate-200">{progression?.lifetimeXp || 0} XP</span>
              </p>
            </div>
          </div>

          <div className="text-left md:text-right">
            <div className="text-3xl font-extrabold text-white font-mono">{progression?.currentXp || 0} XP</div>
            <div className="text-xs text-slate-400 mt-0.5">
              {progression?.nextLevel
                ? `${progression.xpToNextLevel} XP needed for ${progression.nextLevel.title} (Level ${progression.nextLevel.level})`
                : 'Maximum platform mastery reached!'}
            </div>
          </div>
        </div>

        {/* Level Progression Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-xs text-slate-400 mb-1.5 font-medium">
            <span>Level {progression?.level || 1} Progress</span>
            <span>{progression?.progressPercentage || 0}%</span>
          </div>
          <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden p-0.5">
            <div
              className="bg-gradient-to-r from-indigo-500 via-indigo-400 to-cyan-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${progression?.progressPercentage || 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Two Column Layout: Auditable Ledger vs Achievements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Auditable XP Ledger */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <History className="w-4 h-4 text-indigo-400" />
              <h4 className="font-bold text-sm text-white">Auditable XP Transaction Ledger</h4>
            </div>
            <span className="text-[11px] text-slate-500">Every positive and negative adjustment is logged</span>
          </div>

          <div className="space-y-2.5">
            {history.map(tx => {
              const isPositive = tx.amount > 0;
              return (
                <div
                  key={tx.id}
                  className="p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800/80 flex items-center justify-between"
                >
                  <div className="min-w-0 pr-4">
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                        isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {tx.category.replace('_', ' ')}
                      </span>
                      <span className="text-xs font-semibold text-slate-200 truncate">{tx.reason}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center space-x-3">
                      <span>{new Date(tx.created_at).toLocaleString()}</span>
                      {tx.auditor_name && <span>Audited by: {tx.auditor_name}</span>}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    <span className={`text-sm font-bold font-mono ${
                      isPositive ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {isPositive ? `+${tx.amount}` : tx.amount} XP
                    </span>

                    {!isPositive && (
                      <button
                        onClick={() => {
                          setSelectedTx(tx);
                          setShowAppealModal(true);
                        }}
                        className="text-[11px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-500/30"
                      >
                        Appeal
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {history.length === 0 && (
              <div className="text-center py-10 text-xs text-slate-500">
                No XP transactions recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Badges & Achievements */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <h4 className="font-bold text-sm text-white">Learning Achievements</h4>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              {achievements.filter(a => a.is_unlocked).length}/{achievements.length}
            </span>
          </div>

          <div className="space-y-3">
            {achievements.map(a => (
              <div
                key={a.id}
                className={`p-3.5 rounded-2xl border transition ${
                  a.is_unlocked
                    ? 'bg-amber-500/10 border-amber-500/30 text-slate-200'
                    : 'bg-slate-950/30 border-slate-800/80 text-slate-500 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-slate-200 flex items-center space-x-2">
                    <Trophy className={`w-3.5 h-3.5 ${a.is_unlocked ? 'text-amber-400' : 'text-slate-600'}`} />
                    <span>{a.title}</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-indigo-400">+{a.xp_reward} XP</span>
                </div>
                <p className="text-[11px] mt-1 text-slate-400 leading-relaxed">{a.description}</p>
                {a.is_unlocked && a.unlocked_at && (
                  <div className="text-[10px] text-emerald-400 mt-1.5 flex items-center space-x-1">
                    <Check className="w-3 h-3" />
                    <span>Unlocked on {new Date(a.unlocked_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal: File XP Appeal */}
      {showAppealModal && selectedTx && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Dispute Penalty Appeal</h3>
            <p className="text-xs text-slate-400 mb-4">
              All penalties must adhere to documented platform rules. If this deduction was an honest error or disputed moderation action, explain your case below.
            </p>

            <form onSubmit={handleFileAppeal} className="space-y-3.5">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <span className="text-slate-500 block">Deduction Details:</span>
                <span className="font-semibold text-rose-400">{selectedTx.amount} XP</span> - {selectedTx.reason}
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Appeal Justification</label>
                <textarea
                  rows={3}
                  required
                  value={appealReason}
                  onChange={e => setAppealReason(e.target.value)}
                  placeholder="Explain why this deduction should be reversed..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAppealModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Submit Appeal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
