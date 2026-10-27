import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { apiRequest, setStoredToken, getStoredToken, ChatSocket } from '../api';

const AuthContext = createContext(null);

// Client device vault helper for resilient persistent access across container sleep/restarts
function getDeviceVault() {
  try {
    const raw = localStorage.getItem('consta_device_vault');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveToDeviceVault(userData) {
  if (!userData) return;
  try {
    const vault = getDeviceVault();
    const idKey = (userData.username || userData.email || '').toLowerCase();
    if (idKey) {
      vault[idKey] = {
        username: userData.username,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role || 'student',
        timezone: userData.timezone || 'UTC'
      };
      if (userData.email) {
        vault[userData.email.toLowerCase()] = vault[idKey];
      }
      localStorage.setItem('consta_device_vault', JSON.stringify(vault));
    }
  } catch {
    // ignore storage write errors
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('consta_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [profile, setProfile] = useState(() => {
    try {
      const cached = localStorage.getItem('consta_profile');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [streaks, setStreaks] = useState(null);
  const [progression, setProgression] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(() => {
    const token = getStoredToken();
    const cachedUser = localStorage.getItem('consta_user');
    return !!token && !cachedUser;
  });

  const retryTimerRef = useRef(null);

  async function loadMe(isRetry = false) {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const data = await apiRequest('/auth/me');
      setUser(data.user);
      setProfile(data.profile);
      setStreaks(data.streaks);
      setProgression(data.progression);

      // Persist latest verified session profile
      localStorage.setItem('consta_user', JSON.stringify(data.user));
      if (data.profile) {
        localStorage.setItem('consta_profile', JSON.stringify(data.profile));
      }

      const notifData = await apiRequest('/notifications/unread-count').catch(() => ({ unreadCount: 0 }));
      setUnreadNotifications(notifData.unreadCount || 0);
    } catch (err) {
      // ONLY clear stored token on explicit 401 unauthenticated or 403 forbidden response from server
      if (err.status === 401 || err.status === 403) {
        setStoredToken(null);
        localStorage.removeItem('consta_user');
        localStorage.removeItem('consta_profile');
        setUser(null);
        setProfile(null);
        setStreaks(null);
        setProgression(null);
      } else {
        // Cold start (Render free instance waking up) or temporary network disconnect
        console.warn('Backend waking up or network offline. Retaining cached user session.', err.message);
        if (!isRetry) {
          if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
          retryTimerRef.current = setTimeout(() => {
            if (getStoredToken()) {
              loadMe(true);
            }
          }, 4000);
        }
      }
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

    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  // Real-time notification and activity sync across the entire platform
  useEffect(() => {
    if (!user) return;

    let socket = null;
    try {
      socket = new ChatSocket((data) => {
        if (data.type === 'NOTIFICATION') {
          setUnreadNotifications(prev => prev + 1);
          loadMe(true);
          if (data.payload?.type && data.payload.type.startsWith('friend_')) {
            window.dispatchEvent(new CustomEvent('consta:friend-update', { detail: data.payload }));
          }
        } else if (data.type === 'FRIEND_UPDATE') {
          window.dispatchEvent(new CustomEvent('consta:friend-update', { detail: data }));
          loadMe(true);
        }
      });
    } catch {
      // ignore
    }

    // Background unread count poll every 4 seconds
    const pollInterval = setInterval(() => {
      apiRequest('/notifications/unread-count')
        .then(res => {
          if (res && res.unreadCount !== undefined) {
            setUnreadNotifications(res.unreadCount);
          }
        })
        .catch(() => {});
    }, 4000);

    return () => {
      if (socket) socket.disconnect();
      clearInterval(pollInterval);
    };
  }, [user?.id]);

  async function login(identifier, password) {
    const cleanId = (identifier || '').trim().toLowerCase();
    const vault = getDeviceVault();
    const cachedRecovery = vault[cleanId] || null;

    let res;
    try {
      res = await apiRequest('/auth/login', {
        method: 'POST',
        body: { identifier, password, clientRecovery: cachedRecovery }
      });
    } catch (loginErr) {
      // If 401 and we have cached recovery data on this device, attempt self-healing account restore
      if (loginErr.status === 401 && cachedRecovery) {
        try {
          res = await apiRequest('/auth/recover-account', {
            method: 'POST',
            body: { identifier, password, userProfile: cachedRecovery }
          });
        } catch {
          throw loginErr;
        }
      } else {
        throw loginErr;
      }
    }

    setStoredToken(res.token);
    if (res.user) {
      setUser(res.user);
      localStorage.setItem('consta_user', JSON.stringify(res.user));
      saveToDeviceVault(res.user);
    }
    await loadMe();
    return res.user;
  }

  async function register(userData) {
    const res = await apiRequest('/auth/register', {
      method: 'POST',
      body: userData
    });
    setStoredToken(res.token);
    if (res.user) {
      setUser(res.user);
      localStorage.setItem('consta_user', JSON.stringify(res.user));
      saveToDeviceVault({
        ...res.user,
        username: userData.username,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role || 'student',
        timezone: userData.timezone || 'UTC'
      });
    }
    await loadMe();
    return res.user;
  }

  function logout() {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    setStoredToken(null);
    localStorage.removeItem('consta_user');
    localStorage.removeItem('consta_profile');
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
      logout,
      refreshUserData: () => loadMe(false)
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
