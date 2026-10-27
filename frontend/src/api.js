const BACKEND_URL = import.meta.env.VITE_API_URL || '';
const API_BASE = BACKEND_URL ? `${BACKEND_URL.replace(/\/$/, '')}/api` : '/api';

export function getAssetUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
  if (!BACKEND_URL) return path;
  return `${BACKEND_URL.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
}

export function getStoredToken() {
  return localStorage.getItem('consta_token');
}

export function setStoredToken(token) {
  if (token) {
    localStorage.setItem('consta_token', token);
  } else {
    localStorage.removeItem('consta_token');
  }
}

export async function apiRequest(endpoint, options = {}, retries = 2) {
  const token = getStoredToken();
  const headers = { ...(options.headers || {}) };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method: options.method || 'GET',
    headers,
    body: (options.body instanceof FormData || typeof options.body === 'string') 
      ? options.body 
      : (options.body ? JSON.stringify(options.body) : undefined)
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json().catch(() => ({}));

    // If server is spinning up from cold sleep (e.g. Render free tier 502/503/504), wait and retry
    if ([502, 503, 504].includes(response.status) && retries > 0) {
      await new Promise(r => setTimeout(r, 2000));
      return apiRequest(endpoint, options, retries - 1);
    }

    if (!response.ok) {
      const error = new Error(data.error || `HTTP error ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    // Retry on network drops / connection refused during cold boots
    if (retries > 0 && (err.name === 'TypeError' || err.message?.includes('fetch'))) {
      await new Promise(r => setTimeout(r, 2500));
      return apiRequest(endpoint, options, retries - 1);
    }
    throw err;
  }
}

// WebSocket connection singleton
export class ChatSocket {
  constructor(onMessage) {
    this.ws = null;
    this.onMessage = onMessage;
    this.reconnectTimeout = null;
    this.disconnected = false;
    this.currentRoomId = null;
    this.queue = [];
    this.connect();
  }

  connect() {
    if (this.disconnected) return;
    const token = getStoredToken();
    let wsUrl = '';
    if (import.meta.env.VITE_WS_URL) {
      wsUrl = `${import.meta.env.VITE_WS_URL.replace(/\/$/, '')}/ws?token=${token || ''}`;
    } else if (BACKEND_URL) {
      const wsProto = BACKEND_URL.startsWith('https:') ? 'wss:' : 'ws:';
      const host = BACKEND_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
      wsUrl = `${wsProto}//${host}/ws?token=${token || ''}`;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}/ws?token=${token || ''}`;
    }

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      if (token) {
        this.sendImmediate({ type: 'AUTH', token });
      }
      if (this.currentRoomId) {
        this.sendImmediate({ type: 'JOIN_ROOM', chatRoomId: this.currentRoomId, token });
      }
      // Flush any queued messages that were sent before connection opened
      while (this.queue.length > 0) {
        const item = this.queue.shift();
        this.sendImmediate(item);
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (this.onMessage) this.onMessage(data);
      } catch (e) {
        // ignore invalid json
      }
    };

    this.ws.onclose = () => {
      if (!this.disconnected) {
        this.reconnectTimeout = setTimeout(() => this.connect(), 2000);
      }
    };

    this.ws.onerror = () => {
      // Handled by onclose reconnect
    };
  }

  sendImmediate(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  send(data) {
    if (!this.sendImmediate(data)) {
      this.queue.push(data);
    }
  }

  joinRoom(chatRoomId) {
    if (!chatRoomId) return;
    this.currentRoomId = Number(chatRoomId);
    const token = getStoredToken();
    this.send({ type: 'JOIN_ROOM', chatRoomId: this.currentRoomId, token });
  }

  leaveRoom(chatRoomId) {
    if (Number(this.currentRoomId) === Number(chatRoomId)) {
      this.currentRoomId = null;
    }
    this.send({ type: 'LEAVE_ROOM', chatRoomId: Number(chatRoomId) });
  }

  sendTyping(chatRoomId, isTyping) {
    this.send({ type: 'TYPING', chatRoomId: Number(chatRoomId), isTyping });
  }

  broadcastChatMessage(chatRoomId, payload) {
    this.send({ type: 'CHAT_MESSAGE', chatRoomId: Number(chatRoomId), payload });
  }

  disconnect() {
    this.disconnected = true;
    this.queue = [];
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
    }
  }
}
