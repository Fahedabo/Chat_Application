
const WebSocket = require('ws');
const http = require('http');
const axios = require('axios');

class PresenceManager {
  constructor() {
    this.onlineUsers = new Map();   // userId -> { ws, lastSeen }
    this.userSockets = new Map();   // ws -> userId
  }

  addUser(userId, ws) {
    if (this.onlineUsers.has(userId)) {
      const oldWs = this.onlineUsers.get(userId).ws;
      if (oldWs !== ws && oldWs.readyState === WebSocket.OPEN) {
        oldWs.close();
      }
    }
    this.onlineUsers.set(userId, { ws, lastSeen: new Date().toISOString() });
    this.userSockets.set(ws, userId);
    console.log(`User ${userId} connected. Online: ${this.onlineUsers.size}`);
    this.broadcastUserStatus(userId, true, ws);
  }

  removeUser(ws) {
    const userId = this.userSockets.get(ws);
    if (userId) {
      this.onlineUsers.delete(userId);
      this.userSockets.delete(ws);
      console.log(`User ${userId} disconnected. Online: ${this.onlineUsers.size}`);
      this.broadcastUserStatus(userId, false);
    }
  }

  getOnlineUsers() {
    return [...this.onlineUsers.keys()];
  }

  sendToUser(userId, message) {
    const user = this.onlineUsers.get(userId);
    if (user?.ws.readyState === WebSocket.OPEN) {
      user.ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  broadcastUserStatus(userId, isOnline, excludeWs = null) {
    const statusMsg = JSON.stringify({
      type: isOnline ? 'user_connected' : 'user_disconnected',
      userId,
      timestamp: new Date().toISOString()
    });

    this.onlineUsers.forEach((user) => {
      if (user.ws !== excludeWs && user.ws.readyState === WebSocket.OPEN) {
        user.ws.send(statusMsg);
      }
    });
  }
}

class ChatServer {
  constructor(port = 3000) {
    this.port = port;
    this.presence = new PresenceManager();
    this.server = http.createServer();
    this.wss = new WebSocket.Server({ server: this.server });
    //update yours
    this.firebaseFunctionUrl = 'http://127.0.0.1:5001/chatapp-3a46e/us-central1/sendNotificationHTTP';

    this.setupWebSocketHandlers();
  }

  setupWebSocketHandlers() {
    this.wss.on('connection', (ws) => {
      ws.isAlive = true;
      ws.userId = null;

      ws.on('pong', () => (ws.isAlive = true));
      ws.on('message', (data) => this.handleMessage(ws, data));
      ws.on('close', () => this.presence.removeUser(ws));
      ws.on('error', () => this.presence.removeUser(ws));
    });
    this.setupHeartbeat();
  }

  setupHeartbeat() {
    const interval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (!ws.isAlive) {
          this.presence.removeUser(ws);
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    this.wss.on('close', () => clearInterval(interval));
  }

  handleMessage(ws, raw) {
    try {
      const msg = JSON.parse(raw);
      const { type } = msg;

      switch (type) {
        case 'auth': return this.handleAuth(ws, msg.userId);
        case 'get_online_users': return this.sendOnlineUsers(ws);
        case 'message': return this.handleChatMessage(ws, msg);
        case 'typing': return this.handleTyping(ws, msg);
        case 'disconnect': return this.presence.removeUser(ws);
        default: this.sendError(ws, 'Unknown message type');
      }
    } catch {
      this.sendError(ws, 'Invalid message format');
    }
  }

  handleAuth(ws, userId) {
    if (!userId) return this.sendError(ws, 'User ID required');
    ws.userId = userId;
    this.presence.addUser(userId, ws);
    this.send(ws, { type: 'auth_success', userId, timestamp: new Date().toISOString() });
    this.sendOnlineUsers(ws);
  }

  sendOnlineUsers(ws) {
    this.send(ws, {
      type: 'online_users',
      users: this.presence.getOnlineUsers(),
      timestamp: new Date().toISOString()
    });
  }

  async handleChatMessage(ws, { senderId, receiverId, message, senderName }) {
    if (!senderId || !receiverId || !message) {
      return this.sendError(ws, 'Invalid message data');
    }

    const msgObj = {
      type: 'message',
      id: this.generateMessageId(),
      senderId,
      receiverId,
      message,
      timestamp: new Date().toISOString()
    };

    const delivered = this.presence.sendToUser(receiverId, msgObj);
    this.send(ws, { type: 'message_sent', messageId: msgObj.id, sent: delivered, timestamp: msgObj.timestamp });

    try {
      await this.triggerPushNotification({ senderId, receiverId, message, senderName: senderName || senderId });
    } catch (err) {
      console.error('Push notification failed:', err.message);
    }
  }

  handleTyping(ws, { senderId, receiverId, isTyping }) {
    if (!senderId || !receiverId) return this.sendError(ws, 'Invalid typing data');
    this.presence.sendToUser(receiverId, {
      type: 'typing',
      senderId,
      isTyping,
      timestamp: new Date().toISOString()
    });
  }

  async triggerPushNotification(data) {
    return axios.post(this.firebaseFunctionUrl, data, { headers: { 'Content-Type': 'application/json' }, timeout: 5000 });
  }

  send(ws, message) {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
  }

  sendError(ws, error) {
    this.send(ws, { type: 'error', error, timestamp: new Date().toISOString() });
  }

  generateMessageId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  start() {
    this.server.listen(this.port, () => {
      console.log(`Chat server running on ws://localhost:${this.port}`);
    });
  }
}

// Start server
const chatServer = new ChatServer(3000);
chatServer.start();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down...');
  process.exit(0);
});

module.exports = ChatServer;
