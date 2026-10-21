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

export async function apiRequest(endpoint, options = {}) {
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

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `HTTP error ${response.status}`);
  }

  return data;
}

// WebSocket connection singleton
export class ChatSocket {
  constructor(onMessage) {
    this.ws = null;
    this.onMessage = onMessage;
    this.reconnectTimeout = null;
    this.connect();
  }

  connect() {
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
        this.send({ type: 'AUTH', token });
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
      this.reconnectTimeout = setTimeout(() => this.connect(), 3000);
    };
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  joinRoom(chatRoomId) {
    this.send({ type: 'JOIN_ROOM', chatRoomId });
  }

  leaveRoom(chatRoomId) {
    this.send({ type: 'LEAVE_ROOM', chatRoomId });
  }

  sendTyping(chatRoomId, isTyping) {
    this.send({ type: 'TYPING', chatRoomId, isTyping });
  }

  broadcastChatMessage(chatRoomId, payload) {
    this.send({ type: 'CHAT_MESSAGE', chatRoomId, payload });
  }

  disconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.ws) this.ws.close();
  }
}
