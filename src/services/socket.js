import { io } from 'socket.io-client';

const USE_MOCKS = false;
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

function createMockAdapter() {
  return {
    connect() {},
    disconnect() {},
    onMessage() { return () => {}; },
    onMessageDelete() { return () => {}; },
    onConversationDelete() { return () => {}; },
    emitMessage() {},
    onTyping() { return () => {}; },
    emitTyping() {},
    onPresence() { return () => {}; },
  };
}

function createRealAdapter() {
  let socket = null;

  return {
    connect() {
      const token = localStorage.getItem('convo-token');
      if (!token) return;

      socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
      });

      socket.on('connect', () => {
        console.log('[Socket] Connected to backend:', socket.id);
      });

      socket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason);
      });

      socket.on('connect_error', (err) => {
        console.error('[Socket] Connection error:', err.message);
      });
    },

    disconnect() {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    },

    onMessage(cb) {
      if (!socket) return () => {};
      socket.on('message:receive', cb);
      return () => {
        socket.off('message:receive', cb);
      };
    },

    onMessageDelete(cb) {
      if (!socket) return () => {};
      socket.on('message:delete', cb);
      return () => {
        socket.off('message:delete', cb);
      };
    },

    onConversationDelete(cb) {
      if (!socket) return () => {};
      socket.on('conversation:delete', cb);
      return () => {
        socket.off('conversation:delete', cb);
      };
    },

    emitMessage(msg) {
      if (socket) {
        socket.emit('message:send', msg);
      }
    },

    onTyping(cb) {
      if (!socket) return () => {};
      socket.on('typing', cb);
      return () => socket.off('typing', cb);
    },

    emitTyping(conversationId, isTyping = true) {
      if (socket) {
        socket.emit('typing', { conversationId, isTyping });
      }
    },

    onPresence(cb) {
      if (!socket) return () => {};
      socket.on('presence', cb);
      return () => socket.off('presence', cb);
    },
  };
}

// ── Export active adapter ──
export function createSocket() {
  return USE_MOCKS ? createMockAdapter() : createRealAdapter();
}

export default createSocket;
