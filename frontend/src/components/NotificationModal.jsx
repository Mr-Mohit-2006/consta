import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { Bell, Check, Clock, Settings, X } from 'lucide-react';

export default function NotificationModal({ isOpen, onClose, onNotificationClick }) {
  const [tab, setTab] = useState('list'); // 'list' | 'preferences'
  const [notifications, setNotifications] = useState([]);
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    loadData();

    // Silent background sync while modal is open (every 3 seconds)
    const interval = setInterval(async () => {
      try {
        const notifs = await apiRequest('/notifications');
        setNotifications(notifs);
      } catch {
        // silent
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isOpen]);

  async function loadData() {
    setLoading(true);
    try {
      const notifs = await apiRequest('/notifications');
      setNotifications(notifs);
      const prefs = await apiRequest('/notifications/preferences');
      setPreferences(prefs);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function markRead(id) {
    await apiRequest(`/notifications/${id}/read`, { method: 'PUT' });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
  }

  async function markAllRead() {
    await apiRequest('/notifications/read-all', { method: 'PUT' });
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
  }

  async function updatePref(field, val) {
    const updated = { ...preferences, [field]: val };
    setPreferences(updated);
    await apiRequest('/notifications/preferences', {
      method: 'PUT',
      body: updated
    });
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-white">Notifications & Alerts</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setTab(tab === 'list' ? 'preferences' : 'list')}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
              title="Preferences"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 pt-2">
          <button
            onClick={() => setTab('list')}
            className={`pb-2 text-sm font-medium mr-6 border-b-2 transition ${
              tab === 'list' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            Recent Alerts ({notifications.filter(n => !n.is_read).length} unread)
          </button>
          <button
            onClick={() => setTab('preferences')}
            className={`pb-2 text-sm font-medium border-b-2 transition ${
              tab === 'preferences' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            Preferences & Quiet Hours
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {tab === 'list' ? (
            <>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-slate-400">Showing last {notifications.length} alerts</span>
                {notifications.some(n => !n.is_read) && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                  >
                    <Check className="w-3.5 h-3.5 mr-1" /> Mark all read
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No notifications yet. You're completely up to date!
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.is_read) markRead(n.id);
                      if (onNotificationClick && n.link) onNotificationClick(n.link);
                    }}
                    className={`p-3.5 rounded-xl border transition cursor-pointer ${
                      n.is_read
                        ? 'bg-slate-900/40 border-slate-800/80 text-slate-400'
                        : 'bg-indigo-950/20 border-indigo-900/50 text-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="font-medium text-sm text-slate-100 flex items-center space-x-2">
                        {!n.is_read && <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />}
                        <span>{n.title}</span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs mt-1 text-slate-300 leading-relaxed">{n.message}</p>
                    {n.type === 'friend_request' && (
                      <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center space-x-2">
                        <span className="text-[11px] font-semibold text-indigo-400">Click to view & approve in Friends Network &rarr;</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </>
          ) : preferences ? (
            <div className="space-y-4 text-sm">
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80 space-y-3">
                <h4 className="font-medium text-slate-200 text-xs uppercase tracking-wider text-slate-400">Alert Categories</h4>
                {[
                  { key: 'session_reminders', label: 'Study session reminders' },
                  { key: 'task_updates', label: 'Study task assignments & status changes' },
                  { key: 'review_alerts', label: 'Peer feedback and review decisions' },
                  { key: 'chat_mentions', label: 'Chat mentions and thread replies' },
                  { key: 'streak_alerts', label: 'Daily streaks and milestone celebrations' }
                ].map(item => (
                  <label key={item.key} className="flex items-center justify-between cursor-pointer py-1">
                    <span className="text-slate-300">{item.label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(preferences[item.key])}
                      onChange={e => updatePref(item.key, e.target.checked ? 1 : 0)}
                      className="rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500 h-4 w-4"
                    />
                  </label>
                ))}
              </div>

              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    <span className="font-medium text-slate-200">Quiet Hours</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(preferences.quiet_hours_enabled)}
                    onChange={e => updatePref('quiet_hours_enabled', e.target.checked ? 1 : 0)}
                    className="rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500 h-4 w-4"
                  />
                </div>
                <p className="text-xs text-slate-400">Mutes push notifications during your designated rest hours.</p>

                {preferences.quiet_hours_enabled ? (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Start Time</label>
                      <input
                        type="time"
                        value={preferences.quiet_hours_start || '22:00'}
                        onChange={e => updatePref('quiet_hours_start', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">End Time</label>
                      <input
                        type="time"
                        value={preferences.quiet_hours_end || '07:00'}
                        onChange={e => updatePref('quiet_hours_end', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
