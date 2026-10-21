import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest, setStoredToken, getStoredToken } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [streaks, setStreaks] = useState(null);
  const [progression, setProgression] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(true);

  async function loadMe() {
    try {
      const data = await apiRequest('/auth/me');
      setUser(data.user);
      setProfile(data.profile);
      setStreaks(data.streaks);
      setProgression(data.progression);

      const notifData = await apiRequest('/notifications/unread-count').catch(() => ({ unreadCount: 0 }));
      setUnreadNotifications(notifData.unreadCount || 0);
    } catch (err) {
      setStoredToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      loadMe();
    } else {
      setLoading(false);
    }
  }, []);

  async function login(identifier, password) {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: { identifier, password }
    });
    setStoredToken(res.token);
    await loadMe();
    return res.user;
  }

  async function register(userData) {
    const res = await apiRequest('/auth/register', {
      method: 'POST',
      body: userData
    });
    setStoredToken(res.token);
    await loadMe();
    return res.user;
  }

  async function switchUser(username) {
    setLoading(true);
    try {
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: { identifier: username, password: 'password123' }
      });
      setStoredToken(res.token);
      await loadMe();
    } catch (e) {
      setLoading(false);
    }
  }

  function logout() {
    setStoredToken(null);
    setUser(null);
    setProfile(null);
    setStreaks(null);
    setProgression(null);
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      streaks,
      progression,
      unreadNotifications,
      loading,
      login,
      register,
      switchUser,
      logout,
      refreshUserData: loadMe
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
