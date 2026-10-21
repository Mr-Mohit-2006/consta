const API_BASE = '/api';

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
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?token=${token || ''}`;

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
