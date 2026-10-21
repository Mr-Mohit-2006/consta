import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck, Sparkles, CheckCircle, CheckCircle2, AlertTriangle, XCircle, FileText,
  ExternalLink, Send, Award, HelpCircle, ChevronRight, Check, ChevronLeft, ThumbsUp, RefreshCw
} from 'lucide-react';

export default function ReviewCenterView({ initialTaskId }) {
  const { user, refreshUserData } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState(initialTaskId || null);
  const [submissions, setSubmissions] = useState([]);
  const [selectedSub, setSelectedSub] = useState(null);
  const [rubrics, setRubrics] = useState([]);
  const [activeRubric, setActiveRubric] = useState(null);
  const [mobileView, setMobileView] = useState('review'); // 'queue' | 'review' for tablet/phone responsiveness

  // Scorecard state
  const [decision, setDecision] = useState('approved'); // 'approved' | 'revision_requested' | 'rejected'
  const [criterionScores, setCriterionScores] = useState({});
  const [whatDoneWell, setWhatDoneWell] = useState('');
  const [whatNeedsImprovement, setWhatNeedsImprovement] = useState('');
  const [specificMistakes, setSpecificMistakes] = useState('');
  const [suggestedNextSteps, setSuggestedNextSteps] = useState('');
  const [learningResources, setLearningResources] = useState('');
  const [generalComments, setGeneralComments] = useState('');

  // AI Review Assistant
  const [aiLoading, setAiLoading] = useState(false);
  const [aiEvaluation, setAiEvaluation] = useState(null);
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    loadReviewCenter();
  }, [user]);

  useEffect(() => {
    if (initialTaskId) {
      setSelectedTaskId(initialTaskId);
      loadTaskSubmissions(initialTaskId);
    }
  }, [initialTaskId]);

  async function loadReviewCenter() {
    try {
      const taskList = await apiRequest('/study-tasks');
      setTasks(taskList || []);

      const rubList = await apiRequest('/reviews/rubrics');
      setRubrics(rubList || []);
      if (rubList && rubList.length > 0) setActiveRubric(rubList[0]);

      const tId = initialTaskId || selectedTaskId || (taskList && taskList.length > 0 ? taskList[0].id : null);
      if (tId) {
        setSelectedTaskId(tId);
        await loadTaskSubmissions(tId);
      }
    } catch (e) {
      // ignore
    }
  }

  async function loadTaskSubmissions(tId) {
    if (!tId) return;
    setSelectedTaskId(tId);
    try {
      const subs = await apiRequest(`/submissions/${tId}/all`);
      setSubmissions(subs || []);
      if (subs && subs.length > 0) {
        selectSubmission(subs[0]);
      } else {
        setSelectedSub(null);
      }
    } catch (e) {
      // ignore
    }
  }

  function selectSubmission(sub) {
    setSelectedSub(sub);
    setMobileView('review');
    setAiEvaluation(null);
    setDecision('approved');
    setWhatDoneWell('');
    setWhatNeedsImprovement('');
    setSpecificMistakes('');
    setSuggestedNextSteps('');
    setGeneralComments('');

    // Pre-fill criterion scores
    if (activeRubric) {
      const initialScores = {};
      activeRubric.criteria.forEach(c => {
        initialScores[c.id] = { score: c.max_score, comment: 'Meets criteria well.' };
      });
      setCriterionScores(initialScores);
    }
  }

  async function runAiEvaluation() {
    if (!selectedSub) return;
    setAiLoading(true);
    try {
      const res = await apiRequest('/reviews/ai-assist', {
        method: 'POST',
        body: {
          submission_id: selectedSub.id,
          version_id: selectedSub.latest_version_id
        }
      });
      setAiEvaluation(res);

      // Auto-populate scorecard with AI suggestions
      setDecision(res.decision);
      setWhatDoneWell(res.whatDoneWell);
      setWhatNeedsImprovement(res.whatNeedsImprovement);
      setSpecificMistakes(res.specificMistakes);
      setSuggestedNextSteps(res.suggestedNextSteps);
      setLearningResources(res.learningResources);

      if (res.criteriaEvaluations) {
        const scores = {};
        res.criteriaEvaluations.forEach(ce => {
          scores[ce.criterion_id] = { score: ce.score, comment: ce.comment };
        });
        setCriterionScores(scores);
      }
    } catch (err) {
      alert('AI evaluation failed: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSubmitReview(e) {
    e.preventDefault();
    if (!selectedSub) return;

    setSubmittingReview(true);
    try {
      const formattedScores = Object.entries(criterionScores).map(([critId, val]) => ({
        criterion_id: Number(critId),
        score: Number(val.score),
        comment: val.comment
      }));

      await apiRequest('/reviews/submit', {
        method: 'POST',
        body: {
          submission_id: selectedSub.id,
          version_id: selectedSub.latest_version_id,
          reviewer_type: user?.role === 'mentor' ? 'mentor' : 'peer',
          decision,
          what_done_well: whatDoneWell,
          what_needs_improvement: whatNeedsImprovement,
          specific_mistakes: specificMistakes,
          suggested_next_steps: suggestedNextSteps,
          learning_resources: learningResources,
          general_comments: generalComments,
          criterion_scores: formattedScores,
          is_ai_review: 0
        }
      });

      await refreshUserData();
      await loadTaskSubmissions(selectedTaskId);

      alert(`Review submitted! Task decision: ${decision.toUpperCase()}. Points have been awarded to both parties.`);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingReview(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <span>Submission Review & Verification Center</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Conduct rubric evaluations, highlight mistakes, suggest improvements, and leverage assistive AI analysis.
          </p>
        </div>

        {/* Task Selector */}
        <select
          value={selectedTaskId || ''}
          onChange={e => loadTaskSubmissions(Number(e.target.value))}
          className="bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-2"
        >
          {tasks.map(t => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>
      </div>

      {/* Mobile Screen Segmented Switcher */}
      <div className="flex lg:hidden rounded-2xl bg-slate-900 p-1 border border-slate-800">
        <button
          onClick={() => setMobileView('queue')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer ${
            mobileView === 'queue' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Queue ({submissions.length})</span>
        </button>
        <button
          onClick={() => setMobileView('review')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer ${
            mobileView === 'review' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Review Form & Scorecard</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Submission Queue */}
        <div className={`space-y-3 ${mobileView === 'queue' ? 'block' : 'hidden lg:block'}`}>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            Submissions Queue ({submissions.length})
          </div>

          <div className="space-y-2.5">
            {submissions.map(s => {
              const isSelected = selectedSub?.id === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => selectSubmission(s)}
                  className={`p-4 rounded-2xl border transition cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500/50 shadow-lg'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={s.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                      alt={s.full_name}
                      className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-700"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-xs text-white truncate">{s.full_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">Version {s.current_version}</div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                      s.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                      s.status === 'revision_requested' ? 'bg-rose-500/10 text-rose-400' :
                      'bg-amber-500/10 text-amber-400'
                    }`}>
                      {s.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              );
            })}

            {submissions.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-400 glass-card rounded-2xl p-5 space-y-3">
                <FileText className="w-8 h-8 text-slate-600 mx-auto" />
                <p>No submissions found for this task yet.</p>
                {tasks.length > 1 && (
                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-[11px] text-slate-500 font-semibold block mb-2">Switch to another task:</span>
                    <div className="flex flex-col gap-1.5">
                      {tasks.filter(t => t.id !== selectedTaskId).map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => loadTaskSubmissions(t.id)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs text-left truncate transition cursor-pointer"
                        >
                          {t.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right 2 Cols: Submission Content & Review Scorecard */}
        <div className={`lg:col-span-2 ${mobileView === 'review' ? 'block' : 'hidden lg:block'}`}>
          {selectedSub ? (
            <div className="space-y-6">
              {/* Submission Work Preview Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => setMobileView('queue')}
                      className="lg:hidden p-1.5 rounded-xl bg-slate-800 text-indigo-300 text-xs font-bold flex items-center space-x-1 border border-slate-700"
                      title="Back to queue"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Queue</span>
                    </button>
                    <div>
                      <h3 className="font-bold text-sm text-white">
                        Submission by {selectedSub.full_name} (Version {selectedSub.current_version})
                      </h3>
                      <span className="text-[11px] text-slate-500">
                        Submitted on {new Date(selectedSub.submitted_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={runAiEvaluation}
                      disabled={aiLoading}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition cursor-pointer"
                      title="Run AI review to evaluate submission against rubric criteria"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>{aiLoading ? 'AI Evaluating...' : 'Run AI Evaluation'}</span>
                    </button>

                    <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
                      <CheckCircle className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Evaluation Mode</span>
                    </div>
                  </div>
                </div>

                {/* Submitted text */}
                <div className="mt-4">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Submitted Answer / Logic:
                  </span>
                  <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-mono">
                    {selectedSub.text_content || 'No written text provided.'}
                  </div>
                </div>

                {selectedSub.link_url && (
                  <div className="mt-3 text-xs flex items-center space-x-2">
                    <span className="text-slate-400">Project / Code Link:</span>
                    <a
                      href={selectedSub.link_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 underline flex items-center space-x-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>{selectedSub.link_url}</span>
                    </a>
                  </div>
                )}

                {/* Attachments */}
                {selectedSub.attachments && selectedSub.attachments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Attachments ({selectedSub.attachments.length}):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {selectedSub.attachments.map(att => (
                        <a
                          key={att.id}
                          href={att.file_path}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 flex items-center space-x-1.5 transition"
                        >
                          <FileText className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="truncate max-w-[180px]">{att.original_name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* AI Evaluation Suggestion Banner */}
              {aiEvaluation && (
                <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-bold text-white">AI-Assisted Evaluation Recommendation</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                      aiEvaluation.decision === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      aiEvaluation.decision === 'revision_requested' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>
                      Rec: {aiEvaluation.decision.replace('_', ' ')} ({Math.round((aiEvaluation.ai_confidence || 0.85) * 100)}% confidence)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    AI evaluation scores and feedback have been populated into the scorecard below. You can adjust scores, edit feedback, and set the final decision before submitting.
                  </p>
                </div>
              )}

              {/* Review Scorecard Form */}
              <form onSubmit={handleSubmitReview} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <h4 className="font-bold text-sm text-white">Reviewer Scorecard & Rubric Assessment</h4>

                {/* Rubric Criteria Evaluation */}
                {activeRubric && (
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Rubric Scoring ({activeRubric.title}):
                    </span>
                    {activeRubric.criteria.map(crit => {
                      const current = criterionScores[crit.id] || { score: crit.max_score, comment: '' };
                      return (
                        <div key={crit.id} className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <div>
                              <span className="font-semibold text-slate-200">{crit.title}</span>
                              <span className="text-slate-500 text-[11px] ml-2">({crit.description})</span>
                            </div>
                            <div className="flex items-center space-x-1.5 font-mono">
                              <span className="text-slate-400">Score:</span>
                              <select
                                value={current.score}
                                onChange={e => {
                                  setCriterionScores({
                                    ...criterionScores,
                                    [crit.id]: { ...current, score: Number(e.target.value) }
                                  });
                                }}
                                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                              >
                                {[...Array(crit.max_score + 1).keys()].map(n => (
                                  <option key={n} value={n}>{n} / {crit.max_score}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <input
                            type="text"
                            value={current.comment}
                            onChange={e => {
                              setCriterionScores({
                                ...criterionScores,
                                [crit.id]: { ...current, comment: e.target.value }
                              });
                            }}
                            placeholder="Criterion-specific feedback..."
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Feedback Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">What the learner did well</label>
                    <textarea
                      rows={2}
                      value={whatDoneWell}
                      onChange={e => setWhatDoneWell(e.target.value)}
                      placeholder="Recognize strengths and good practices..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">What needs improvement</label>
                    <textarea
                      rows={2}
                      value={whatNeedsImprovement}
                      onChange={e => setWhatNeedsImprovement(e.target.value)}
                      placeholder="Constructive areas for revision..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Specific mistakes or missing steps</label>
                    <textarea
                      rows={2}
                      value={specificMistakes}
                      onChange={e => setSpecificMistakes(e.target.value)}
                      placeholder="Point out exact logical gaps or errors..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Suggested next steps & resources</label>
                    <textarea
                      rows={2}
                      value={suggestedNextSteps}
                      onChange={e => setSuggestedNextSteps(e.target.value)}
                      placeholder="Recommended readings, links, exercises..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                    />
                  </div>
                </div>

                {/* Decision Selector & Submit Button */}
                <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400 font-medium">Final Decision:</span>
                    <div className="flex space-x-1.5">
                      {[
                        { val: 'approved', label: 'Approve', color: 'bg-emerald-600' },
                        { val: 'revision_requested', label: 'Request Revision', color: 'bg-amber-600' },
                        { val: 'rejected', label: 'Reject', color: 'bg-rose-600' }
                      ].map(d => (
                        <button
                          key={d.val}
                          type="button"
                          onClick={() => setDecision(d.val)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                            decision === d.val
                              ? `${d.color} text-white shadow-md`
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center space-x-1.5 shadow-lg shadow-indigo-600/30 transition"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submittingReview ? 'Submitting...' : 'Submit Official Review'}</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 text-xs">
              Select a submission from the queue to start peer or mentor review.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
