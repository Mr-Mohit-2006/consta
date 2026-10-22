const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const { db } = require('../db/database');
const NotificationService = require('../services/notification_service');

// Map of chatRoomId -> Set of ws clients
const roomSubscriptions = new Map();

function broadcastToChatRoom(chatRoomId, data) {
  const rId = Number(chatRoomId);
  if (roomSubscriptions.has(rId)) {
    const outMsg = typeof data === 'string' ? data : JSON.stringify(data);
    for (const client of roomSubscriptions.get(rId)) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(outMsg);
      }
    }
  }
}

function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    let authenticatedUser = null;

    // Check token from query string, e.g. ws://localhost:5000/ws?token=...
    try {
      const url = new URL(req.url, 'http://localhost:5000');
      const token = url.searchParams.get('token');
      if (token) {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = db.prepare('SELECT id, username, full_name FROM users WHERE id = ?').get(decoded.id);
        if (user) {
          authenticatedUser = user;
          NotificationService.registerClient(user.id, ws);
        }
      }
    } catch {
      // Unauthenticated client can still authenticate via AUTH message
    }

    const currentRooms = new Set();

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case 'AUTH': {
            if (message.token) {
              try {
                const decoded = jwt.verify(message.token, JWT_SECRET);
                const user = db.prepare('SELECT id, username, full_name FROM users WHERE id = ?').get(decoded.id);
                if (user) {
                  authenticatedUser = user;
                  NotificationService.registerClient(user.id, ws);
                  ws.send(JSON.stringify({ type: 'AUTH_SUCCESS', user }));
                }
              } catch (e) {
                ws.send(JSON.stringify({ type: 'AUTH_ERROR', error: 'Invalid token' }));
              }
            }
            break;
          }

          case 'JOIN_ROOM': {
            const chatRoomId = Number(message.chatRoomId);
            if (!chatRoomId) return;

            // Security check - authenticate from message token if not yet authenticated
            if (!authenticatedUser && message.token) {
              try {
                const decoded = jwt.verify(message.token, JWT_SECRET);
                const user = db.prepare('SELECT id, username, full_name FROM users WHERE id = ?').get(decoded.id);
                if (user) {
                  authenticatedUser = user;
                  NotificationService.registerClient(user.id, ws);
                }
              } catch {}
            }

            if (authenticatedUser) {
              const room = db.prepare('SELECT * FROM chat_rooms WHERE id = ?').get(chatRoomId);
              if (!room) return;

              if (!roomSubscriptions.has(chatRoomId)) {
                roomSubscriptions.set(chatRoomId, new Set());
              }
              roomSubscriptions.get(chatRoomId).add(ws);
              currentRooms.add(chatRoomId);

              // Broadcast user joined/presence
              const presenceMsg = JSON.stringify({
                type: 'ROOM_PRESENCE',
                chatRoomId,
                activeCount: roomSubscriptions.get(chatRoomId).size
              });
              for (const client of roomSubscriptions.get(chatRoomId)) {
                if (client.readyState === WebSocket.OPEN) client.send(presenceMsg);
              }
            }
            break;
          }

          case 'LEAVE_ROOM': {
            const chatRoomId = Number(message.chatRoomId);
            if (chatRoomId && roomSubscriptions.has(chatRoomId)) {
              roomSubscriptions.get(chatRoomId).delete(ws);
              currentRooms.delete(chatRoomId);

              const presenceMsg = JSON.stringify({
                type: 'ROOM_PRESENCE',
                chatRoomId,
                activeCount: roomSubscriptions.get(chatRoomId).size
              });
              for (const client of roomSubscriptions.get(chatRoomId)) {
                if (client.readyState === WebSocket.OPEN) client.send(presenceMsg);
              }
            }
            break;
          }

          case 'CHAT_MESSAGE': {
            // Broadcast message payload to everyone subscribed to chatRoomId
            const chatRoomId = Number(message.chatRoomId);
            const payload = message.payload;

            if (chatRoomId && roomSubscriptions.has(chatRoomId) && payload) {
              const outMsg = JSON.stringify({
                type: 'NEW_CHAT_MESSAGE',
                chatRoomId,
                message: payload
              });

              for (const client of roomSubscriptions.get(chatRoomId)) {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(outMsg);
                }
              }
            }
            break;
          }

          case 'TYPING': {
            const chatRoomId = Number(message.chatRoomId);
            if (chatRoomId && roomSubscriptions.has(chatRoomId) && authenticatedUser) {
              const typingMsg = JSON.stringify({
                type: 'USER_TYPING',
                chatRoomId,
                user: { id: authenticatedUser.id, username: authenticatedUser.username, fullName: authenticatedUser.full_name },
                isTyping: Boolean(message.isTyping)
              });

              for (const client of roomSubscriptions.get(chatRoomId)) {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                  client.send(typingMsg);
                }
              }
            }
            break;
          }
        }
      } catch (err) {
        // Invalid json or format
      }
    });

    ws.on('close', () => {
      if (authenticatedUser) {
        NotificationService.unregisterClient(authenticatedUser.id, ws);
      }
      for (const roomId of currentRooms) {
        if (roomSubscriptions.has(roomId)) {
          roomSubscriptions.get(roomId).delete(ws);
          if (roomSubscriptions.get(roomId).size === 0) {
            roomSubscriptions.delete(roomId);
          } else {
            const presenceMsg = JSON.stringify({
              type: 'ROOM_PRESENCE',
              chatRoomId: roomId,
              activeCount: roomSubscriptions.get(roomId).size
            });
            for (const client of roomSubscriptions.get(roomId)) {
              if (client.readyState === WebSocket.OPEN) client.send(presenceMsg);
            }
          }
        }
      }
    });
  });

  return wss;
}

module.exports = { setupWebSocket, broadcastToChatRoom };
