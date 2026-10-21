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
import ReviewCenterView from './views/ReviewCenterView';
import ChatDiscussionView from './views/ChatDiscussionView';
import GamificationView from './views/GamificationView';
import StreaksView from './views/StreaksView';
import PortfolioView from './views/PortfolioView';
import AnalyticsView from './views/AnalyticsView';

function AppContent() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [deepTaskId, setDeepTaskId] = useState(null);
  const [deepChatRoomId, setDeepChatRoomId] = useState(null);

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
    setActiveTab(tabId);
  }

  function handleOpenTask(taskId) {
    setDeepTaskId(taskId);
    setActiveTab('tasks');
  }

  function handleOpenReview(taskId) {
    setDeepTaskId(taskId);
    setActiveTab('reviews');
  }

  function handleOpenChatRoom(chatRoomId) {
    setDeepChatRoomId(chatRoomId);
    setActiveTab('chat');
  }

  function handleNotificationClick(link) {
    setNotificationsOpen(false);
    if (link.startsWith('/tasks/')) {
      const id = Number(link.split('/')[2]);
      if (id) handleOpenTask(id);
    } else if (link.startsWith('/chat/')) {
      const id = Number(link.split('/')[2]);
      if (id) handleOpenChatRoom(id);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-white">
      {/* Platform Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNotifications={() => setNotificationsOpen(true)}
        onOpenFriends={() => setFriendsOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && <DashboardView onNavigate={handleNavigate} />}
        {activeTab === 'solo' && <SoloStudyView />}
        {activeTab === 'group' && (
          <GroupStudyView
            onNavigate={handleNavigate}
            onOpenTask={handleOpenTask}
            onOpenChatRoom={handleOpenChatRoom}
          />
        )}
        {activeTab === 'tasks' && (
          <TasksSubmissionsView
            initialTaskId={deepTaskId}
            onOpenReview={handleOpenReview}
            onOpenChallenge={() => setActiveTab('challenges')}
          />
        )}
        {activeTab === 'challenges' && (
          <ChallengesView onOpenTask={handleOpenTask} />
        )}
        {activeTab === 'reviews' && (
          <ReviewCenterView initialTaskId={deepTaskId} />
        )}
        {activeTab === 'chat' && (
          <ChatDiscussionView initialChatRoomId={deepChatRoomId} />
        )}
        {activeTab === 'gamification' && <GamificationView />}
        {activeTab === 'streaks' && <StreaksView />}
        {activeTab === 'portfolio' && <PortfolioView />}
        {activeTab === 'analytics' && <AnalyticsView />}
      </main>

      {/* Notification Center Modal */}
      <NotificationModal
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onNotificationClick={handleNotificationClick}
      />

      {/* Friends & Study Buddies Modal */}
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
