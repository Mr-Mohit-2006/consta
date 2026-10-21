import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  CheckSquare, Plus, Clock, FileText, Image as ImageIcon, Link as LinkIcon,
  CheckCircle2, AlertCircle, RefreshCw, ChevronRight, Eye, Send, UploadCloud,
  FileCheck, Shield, ExternalLink, Trophy, Play, Flame, Zap, ChevronLeft
} from 'lucide-react';

export default function TasksSubmissionsView({ initialTaskId, onOpenReview, onOpenChallenge }) {
  const { user, refreshUserData } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskDetails, setTaskDetails] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [mobileView, setMobileView] = useState('details'); // 'list' | 'details' for mobile responsiveness

  // Challenge modal for this task
  const [showTaskChallengeModal, setShowTaskChallengeModal] = useState(false);
  const [taskChalTitle, setTaskChalTitle] = useState('');
  const [taskChalScope, setTaskChalScope] = useState('self'); // 'self' | 'group' | 'friends'
  const [taskChalTime, setTaskChalTime] = useState(25);
  const [taskChalScore, setTaskChalScore] = useState(4.5);
  const [taskChalXp, setTaskChalXp] = useState(80);

  // New task modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [subject, setSubject] = useState('Computer Science');
  const [topic, setTopic] = useState('');
  const [priority, setPriority] = useState('medium');
  const [expectedOutcome, setExpectedOutcome] = useState('');
  const [reviewType, setReviewType] = useState('peer');
  const [referenceLinks, setReferenceLinks] = useState(['']);

  // Submit / Resubmit form
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitText, setSubmitText] = useState('');
  const [submitLink, setSubmitLink] = useState('');
  const [submitNotes, setSubmitNotes] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTasks();
  }, [user]);

  useEffect(() => {
    if (initialTaskId) {
      loadTaskDetails(initialTaskId);
    }
  }, [initialTaskId]);

  async function loadTasks() {
    setLoading(true);
    try {
      const data = await apiRequest('/study-tasks');
      setTasks(data);
      if (data.length > 0 && !selectedTask && !initialTaskId) {
        loadTaskDetails(data[0].id);
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function loadTaskDetails(id) {
    setMobileView('details');
    try {
      const details = await apiRequest(`/study-tasks/${id}`);
      setSelectedTask(details.task);
      setTaskDetails(details);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleCreateTask(e) {
    e.preventDefault();
    if (!title.trim() || !instructions.trim()) return;

    try {
      const refMaterials = referenceLinks
        .map(l => l.trim())
        .filter(Boolean)
        .map(url => ({ title: 'Resource Link', url }));

      const res = await apiRequest('/study-tasks', {
        method: 'POST',
        body: {
          title: title.trim(),
          instructions: instructions.trim(),
          subject,
          topic,
          priority,
          expected_outcome: expectedOutcome,
          review_type: reviewType,
          reference_materials: refMaterials
        }
      });

      setShowCreateModal(false);
      setTitle('');
      setInstructions('');
      setTopic('');
      setExpectedOutcome('');
      await loadTasks();
      loadTaskDetails(res.id);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleSubmitWork(e) {
    e.preventDefault();
    if (!selectedTask) return;

    if (!submitText.trim() && selectedFiles.length === 0 && !submitLink.trim()) {
      alert('Please provide text, file attachments, or a project link.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('text_content', submitText.trim());
      formData.append('link_url', submitLink.trim());
      formData.append('notes', submitNotes.trim());

      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append('attachments', selectedFiles[i]);
      }

      await apiRequest(`/submissions/${selectedTask.id}/submit`, {
        method: 'POST',
        body: formData
      });

      setShowSubmitModal(false);
      setSubmitText('');
      setSubmitLink('');
      setSubmitNotes('');
      setSelectedFiles([]);

      await refreshUserData();
      await loadTasks();
      await loadTaskDetails(selectedTask.id);

      alert('Work submitted successfully! Task status moved to Under Review.');
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStartTask(taskId) {
    try {
      const res = await apiRequest(`/study-tasks/${taskId}/start`, { method: 'POST' });
      await refreshUserData();
      await loadTasks();
      if (selectedTask?.id === taskId) {
        await loadTaskDetails(taskId);
      }
      alert(`🚀 Task started! Push notifications sent to your study buddies so they know you are studying.`);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleCreateTaskChallenge(e) {
    e.preventDefault();
    if (!selectedTask || !taskChalTitle.trim()) return;

    try {
      const res = await apiRequest('/challenges', {
        method: 'POST',
        body: {
          task_id: selectedTask.id,
          room_id: selectedTask.room_id || null,
          title: taskChalTitle.trim(),
          challenge_scope: taskChalScope,
          time_limit_minutes: Number(taskChalTime),
          min_score: Number(taskChalScore),
          xp_reward: Number(taskChalXp)
        }
      });

      setShowTaskChallengeModal(false);
      setTaskChalTitle('');
      alert(`⚡ Challenge "${res.title}" created successfully! Notifications sent to your ${taskChalScope === 'group' ? 'cohort members' : 'study buddies'}.`);

      if (onOpenChallenge) {
        onOpenChallenge(res.id);
      }
    } catch (err) {
      alert(err.message);
    }
  }

  const filteredTasks = tasks.filter(t => {
    if (statusFilter === 'all') return true;
    return t.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <CheckSquare className="w-5 h-5 text-indigo-400" />
            <span>Study Tasks & Submissions</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Submit multi-format answers (text, handwritten photos, code, documents, links) with full versioning.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Create Study Task</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
        {['all', 'not_started', 'in_progress', 'submitted', 'under_review', 'revision_requested', 'approved'].map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition whitespace-nowrap ${
              statusFilter === status
                ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {status.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Mobile Screen Segmented Switcher */}
      <div className="flex lg:hidden rounded-2xl bg-slate-900 p-1 border border-slate-800">
        <button
          onClick={() => setMobileView('list')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer ${
            mobileView === 'list' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Task List ({filteredTasks.length})</span>
        </button>
        <button
          onClick={() => setMobileView('details')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer ${
            mobileView === 'details' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Task Details & Submissions</span>
        </button>
      </div>

      {/* Two Column Layout: Task List vs Task Details & Submissions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task List */}
        <div className={`space-y-2.5 ${mobileView === 'list' ? 'block' : 'hidden lg:block'}`}>
          {filteredTasks.map(t => {
            const isSelected = selectedTask?.id === t.id;
            return (
              <div
                key={t.id}
                onClick={() => loadTaskDetails(t.id)}
                className={`p-4 rounded-2xl border transition cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-950/40 border-indigo-500/50 shadow-lg'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                    t.priority === 'urgent' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                    t.priority === 'high' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    'bg-slate-800 text-slate-300'
                  }`}>
                    {t.priority}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-semibold capitalize ${
                    t.status === 'approved' ? 'text-emerald-400 bg-emerald-500/10' :
                    t.status === 'revision_requested' ? 'text-rose-400 bg-rose-500/10' :
                    t.status === 'under_review' ? 'text-amber-400 bg-amber-500/10' :
                    'text-slate-400 bg-slate-800'
                  }`}>
                    {t.status.replace('_', ' ')}
                  </span>
                </div>

                <h4 className="font-bold text-sm text-white mt-2 line-clamp-1">{t.title}</h4>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{t.instructions}</p>

                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{t.subject}</span>
                  <span className="capitalize">{t.review_type} review</span>
                </div>
              </div>
            );
          })}

          {filteredTasks.length === 0 && (
            <div className="text-center py-12 text-xs text-slate-500">
              No tasks found matching filter.
            </div>
          )}
        </div>

        {/* Task Details & Submissions View */}
        <div className={`lg:col-span-2 ${mobileView === 'details' ? 'block' : 'hidden lg:block'}`}>
          {taskDetails && selectedTask ? (
            <div className="space-y-6">
              {/* Task Header & Instructions */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setMobileView('list')}
                        className="lg:hidden p-1.5 rounded-xl bg-slate-800 text-indigo-300 text-xs font-bold flex items-center space-x-1 border border-slate-700"
                        title="Back to Task List"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Tasks</span>
                      </button>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {selectedTask.subject} &bull; {selectedTask.topic}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        selectedTask.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        selectedTask.status === 'revision_requested' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {selectedTask.status.replace('_', ' ')}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-white mt-2.5">{selectedTask.title}</h3>
                  </div>

                  <div className="flex flex-wrap gap-2 shrink-0">
                    {selectedTask.status === 'not_started' && (
                      <button
                        onClick={() => handleStartTask(selectedTask.id)}
                        className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center space-x-1.5 shadow-lg shadow-emerald-600/20 transition"
                        title="Start task and push notification to study buddies"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Start Task (Notify Buddies)</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setTaskChalTitle(`${selectedTask.title} Sprint`);
                        setShowTaskChallengeModal(true);
                      }}
                      className="px-3.5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-semibold text-xs flex items-center space-x-1.5 transition"
                      title="Turn this task into a self or group sprint challenge"
                    >
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span>⚡ Turn into Challenge</span>
                    </button>

                    <button
                      onClick={() => setShowSubmitModal(true)}
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition"
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>{taskDetails.mySubmission ? 'Submit Revision' : 'Submit Work'}</span>
                    </button>

                    {onOpenReview && (
                      <button
                        onClick={() => onOpenReview(selectedTask.id)}
                        className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center space-x-1.5 transition"
                      >
                        <Shield className="w-4 h-4 text-indigo-400" />
                        <span>Review Center</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Task Instructions:</h5>
                  <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">{selectedTask.instructions}</p>
                </div>

                {selectedTask.expected_outcome && (
                  <div className="mt-3.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
                    <span className="font-semibold text-indigo-300 block mb-0.5">Expected Outcome & Completion Criteria:</span>
                    <p className="text-slate-300 leading-relaxed">{selectedTask.expected_outcome}</p>
                  </div>
                )}

                {/* Rubric Criteria Snippet */}
                {taskDetails.rubric && (
                  <div className="mt-4 pt-3 border-t border-slate-800">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Review Rubric Criteria:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {(taskDetails.rubric.criteria || []).map(c => (
                        <div key={c.id} className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800 text-[11px]">
                          <div className="font-semibold text-slate-200">{c.title}</div>
                          <div className="text-slate-500 mt-0.5">Max {c.max_score} pts</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Submissions & Versions Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-bold text-sm text-white flex items-center space-x-2">
                      <FileCheck className="w-4 h-4 text-emerald-400" />
                      <span>My Submissions & Version History</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {taskDetails.mySubmission ? `Version ${taskDetails.mySubmission.current_version} current` : 'No work submitted yet.'}
                    </p>
                  </div>
                </div>

                {taskDetails.mySubmission?.versions?.length > 0 ? (
                  <div className="space-y-4">
                    {taskDetails.mySubmission.versions.map((v, idx) => (
                      <div
                        key={v.id}
                        className={`p-4 rounded-2xl border transition ${
                          idx === 0
                            ? 'bg-slate-950/70 border-indigo-900/50 ring-1 ring-indigo-500/20'
                            : 'bg-slate-950/30 border-slate-800/80'
                        }`}
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-indigo-400">Version {v.version_number}</span>
                            {idx === 0 && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold uppercase">
                                Latest
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {new Date(v.submitted_at).toLocaleString()}
                          </span>
                        </div>

                        {v.text_content && (
                          <div className="mt-3 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800/60">
                            {v.text_content}
                          </div>
                        )}

                        {v.link_url && (
                          <div className="mt-2 text-xs">
                            <a
                              href={v.link_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span className="underline truncate">{v.link_url}</span>
                            </a>
                          </div>
                        )}

                        {/* Attachments */}
                        {v.attachments && v.attachments.length > 0 && (
                          <div className="mt-3">
                            <span className="text-[11px] text-slate-400 font-medium block mb-1.5">Attachments:</span>
                            <div className="flex flex-wrap gap-2">
                              {v.attachments.map(att => (
                                <a
                                  key={att.id}
                                  href={att.file_path}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-xs text-slate-300 flex items-center space-x-1.5 transition"
                                >
                                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                                  <span className="truncate max-w-[150px]">{att.original_name}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Reviews & Feedback received on this version */}
                        {v.reviews && v.reviews.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                              Reviewer Evaluation:
                            </span>
                            {v.reviews.map(r => (
                              <div key={r.id} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-white">
                                    {r.reviewer_name || (r.is_ai_review ? 'AI Evaluation' : 'Reviewer')}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                                    r.decision === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                                  }`}>
                                    {r.decision.replace('_', ' ')}
                                  </span>
                                </div>
                                {r.what_done_well && (
                                  <p className="text-emerald-300/90"><span className="font-semibold text-slate-300">Well done:</span> {r.what_done_well}</p>
                                )}
                                {r.what_needs_improvement && (
                                  <p className="text-amber-300/90"><span className="font-semibold text-slate-300">Improvements needed:</span> {r.what_needs_improvement}</p>
                                )}
                                {r.specific_mistakes && (
                                  <p className="text-rose-300/90"><span className="font-semibold text-slate-300">Mistakes:</span> {r.specific_mistakes}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-xs text-slate-500">
                    You haven't submitted an answer for this task yet. Click "Submit Work" to upload your solution.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 text-xs">
              Select a study task from the left to inspect instructions and submit work.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create Study Task */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Create Study Task</h3>
            <p className="text-xs text-slate-400 mb-4">Set clear instructions, expected outcomes, and review rubric.</p>

            <form onSubmit={handleCreateTask} className="space-y-3.5">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Graph Traversal: BFS vs DFS Trace with Proof"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

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
                  <label className="text-xs text-slate-400 block mb-1">Topic</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    placeholder="e.g. Graph Algorithms"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Instructions</label>
                <textarea
                  rows={3}
                  required
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                  placeholder="Provide detailed prompts, constraints, and questions..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Expected Outcome / Criteria</label>
                <textarea
                  rows={2}
                  value={expectedOutcome}
                  onChange={e => setExpectedOutcome(e.target.value)}
                  placeholder="e.g. Step-by-step trace diagram and formal complexity proof."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Review Method</label>
                  <select
                    value={reviewType}
                    onChange={e => setReviewType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="peer">Peer Review (Cohort)</option>
                    <option value="mentor">Mentor Review</option>
                    <option value="self">Self Review</option>
                  </select>
                </div>
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
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Submit Work / Resubmit Version */}
      {showSubmitModal && selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-1">
              {taskDetails?.mySubmission ? `Submit Revision (v${taskDetails.mySubmission.current_version + 1})` : 'Submit Work for Review'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Upload your written text, handwritten screenshots, documents, or repository link.
            </p>

            <form onSubmit={handleSubmitWork} className="space-y-3.5">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Written Explanation / Derivation</label>
                <textarea
                  rows={4}
                  value={submitText}
                  onChange={e => setSubmitText(e.target.value)}
                  placeholder="Explain your approach, stepwise reasoning, code or theorem..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Project / Repository Link (Optional)</label>
                <input
                  type="url"
                  value={submitLink}
                  onChange={e => setSubmitLink(e.target.value)}
                  placeholder="https://github.com/username/project"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Upload Attachments (Images, Handwritten Photos, Multi-page PDF, Documents)
                </label>
                <input
                  type="file"
                  multiple
                  onChange={e => setSelectedFiles(Array.from(e.target.files))}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Permitted: PNG, JPG, WebP, PDF, DOCX, TXT, PY, JS. Max 15MB.
                </span>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Revision Notes (Optional)</label>
                <input
                  type="text"
                  value={submitNotes}
                  onChange={e => setSubmitNotes(e.target.value)}
                  placeholder="What was added or fixed in this version?"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Submitting...' : 'Confirm Submission'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal: Turn Task into Challenge */}
      {showTaskChallengeModal && selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1 flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span>Launch Challenge on "{selectedTask.title}"</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Set speedrun and score goals for yourself, your cohort, or your study buddies.
            </p>

            <form onSubmit={handleCreateTaskChallenge} className="space-y-3.5">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Challenge Scope</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'self', label: 'Self Sprint', desc: 'Focus timer' },
                    { id: 'group', label: 'Cohort Group', desc: 'Shared room' },
                    { id: 'friends', label: 'Study Buddies', desc: 'Notify friends' }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTaskChalScope(item.id)}
                      className={`p-2.5 rounded-xl border text-center transition ${
                        taskChalScope === item.id
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

              <div>
                <label className="text-xs text-slate-400 block mb-1">Challenge Title</label>
                <input
                  type="text"
                  required
                  value={taskChalTitle}
                  onChange={e => setTaskChalTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Time Limit (mins)</label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={taskChalTime}
                    onChange={e => setTaskChalTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Min Score</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="5"
                    value={taskChalScore}
                    onChange={e => setTaskChalScore(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Bonus XP</label>
                  <input
                    type="number"
                    min="10"
                    max="500"
                    value={taskChalXp}
                    onChange={e => setTaskChalXp(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 leading-relaxed">
                📢 {taskChalScope === 'group'
                  ? 'All members of the study room will receive an alert.'
                  : taskChalScope === 'friends'
                  ? 'All your connected study buddies will receive an instant invite.'
                  : 'Starting this self challenge will notify your study buddies to cheer you on!'}
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTaskChallengeModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  Create & Launch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
