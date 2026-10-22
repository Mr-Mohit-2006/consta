import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import NotificationModal from './components/NotificationModal';
import FriendsModal from './components/FriendsModal';
import AuthView from './views/AuthView';
import DashboardView from './views/DashboardView';
import SoloStudyView from './views/SoloStudyView';
import GroupStudyView from './views/GroupStudyView';
import TasksSubmissionsView from './views/TasksSubmissionsView';
import ChallengesView from './views/ChallengesView';
import ChatDiscussionView from './views/ChatDiscussionView';
import GamificationView from './views/GamificationView';
import StreaksView from './views/StreaksView';
import ProfileView from './views/ProfileView';
import AnalyticsView from './views/AnalyticsView';

function AppContent() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [history, setHistory] = useState(['dashboard']);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [deepTaskId, setDeepTaskId] = useState(null);
  const [deepChatRoomId, setDeepChatRoomId] = useState(null);
  const [deepChallengeId, setDeepChallengeId] = useState(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
          Loading CONSTA Collaborative Study Module...
        </span>
      </div>
    );
  }

  // If user is not authenticated, show modern Registration & Login View
  if (!user) {
    return <AuthView onSuccess={() => setActiveTab('dashboard')} />;
  }

  function handleNavigate(tabId) {
    if (tabId !== activeTab) {
      setHistory(prev => [...prev, activeTab]);
      setActiveTab(tabId);
    }
  }

  function handleBack() {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory(h => h.slice(0, -1));
      setActiveTab(prev || 'dashboard');
    } else {
      setActiveTab('dashboard');
    }
  }

  function handleOpenTask(taskId) {
    setDeepTaskId(taskId);
    handleNavigate('tasks');
  }

  function handleOpenChatRoom(chatRoomId) {
    setDeepChatRoomId(chatRoomId);
    handleNavigate('chat');
  }

  function handleOpenChallenge(challengeId) {
    setDeepChallengeId(challengeId);
    handleNavigate('challenges');
  }

  function handleNotificationClick(link) {
    setNotificationsOpen(false);
    if (!link) return;
    if (link === '/friends' || link.startsWith('/friends')) {
      setFriendsOpen(true);
    } else if (link.startsWith('/tasks/')) {
      const id = Number(link.split('/')[2]);
      if (id) handleOpenTask(id);
    } else if (link.startsWith('/chat/')) {
      const id = Number(link.split('/')[2]);
      if (id) handleOpenChatRoom(id);
    } else if (link.startsWith('/profile')) {
      handleNavigate('profile');
    } else if (link.startsWith('/group')) {
      handleNavigate('group');
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-white">
      {/* Platform Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={handleNavigate}
        onOpenNotifications={() => setNotificationsOpen(true)}
        onOpenFriends={() => setFriendsOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 overflow-x-clip min-w-0">
        {activeTab === 'dashboard' && <DashboardView onNavigate={handleNavigate} />}
        {activeTab === 'solo' && (
          <SoloStudyView onNavigate={handleNavigate} onBack={handleBack} />
        )}
        {activeTab === 'group' && (
          <GroupStudyView
            onNavigate={handleNavigate}
            onBack={handleBack}
            onOpenTask={handleOpenTask}
            onOpenChatRoom={handleOpenChatRoom}
            onOpenChallenge={handleOpenChallenge}
          />
        )}
        {activeTab === 'tasks' && (
          <TasksSubmissionsView
            initialTaskId={deepTaskId}
            onOpenChallenge={handleOpenChallenge}
            onNavigate={handleNavigate}
            onBack={handleBack}
          />
        )}
        {activeTab === 'challenges' && (
          <ChallengesView
            initialChallengeId={deepChallengeId}
            onOpenTask={handleOpenTask}
            onNavigate={handleNavigate}
            onBack={handleBack}
          />
        )}
        {activeTab === 'chat' && (
          <ChatDiscussionView
            initialChatRoomId={deepChatRoomId}
            onNavigate={handleNavigate}
            onBack={handleBack}
          />
        )}
        {activeTab === 'gamification' && (
          <GamificationView onNavigate={handleNavigate} onBack={handleBack} />
        )}
        {activeTab === 'streaks' && (
          <StreaksView onNavigate={handleNavigate} onBack={handleBack} />
        )}
        {activeTab === 'profile' && (
          <ProfileView
            onOpenFriends={() => setFriendsOpen(true)}
            onNavigate={handleNavigate}
            onBack={handleBack}
          />
        )}
        {activeTab === 'analytics' && (
          <AnalyticsView onNavigate={handleNavigate} onBack={handleBack} />
        )}
      </main>

      {/* Notification Center Modal */}
      <NotificationModal
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onNotificationClick={handleNotificationClick}
      />

      {/* Friends Modal */}
      <FriendsModal
        isOpen={friendsOpen}
        onClose={() => setFriendsOpen(false)}
        onNavigateToTask={handleOpenTask}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
