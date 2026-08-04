import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import useChatStore from '../store/chatStore';
import useAuthStore from '../store/authStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (import.meta.env.DEV ? 'http://localhost:3001' : (typeof window !== 'undefined' ? window.location.origin : ''));

// Singleton socket — only ONE connection ever, shared across renders
let globalSocket = null;
let globalSocketConnecting = false;

function getOrCreateSocket(token) {
  if (globalSocket && globalSocket.connected) return globalSocket;
  if (globalSocketConnecting) return globalSocket;

  if (globalSocket) {
    globalSocket.disconnect();
    globalSocket = null;
  }

  globalSocketConnecting = true;
  globalSocket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  globalSocket.on('connect', () => {
    globalSocketConnecting = false;
    console.log('[Socket] Connected:', globalSocket.id);
  });

  globalSocket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
    if (reason === 'io server disconnect') {
      globalSocketConnecting = false;
    }
  });

  globalSocket.on('connect_error', (err) => {
    globalSocketConnecting = false;
    console.error('[Socket] Connection error:', err.message);
  });

  return globalSocket;
}

export function disconnectGlobalSocket() {
  if (globalSocket) {
    globalSocket.disconnect();
    globalSocket = null;
    globalSocketConnecting = false;
  }
}

export function getGlobalSocket() {
  const token = localStorage.getItem('convo-token');
  return getOrCreateSocket(token);
}

export default function useSocket() {
  // Use refs for callbacks to avoid re-creating socket on every render
  const addMessageRef = useRef(null);
  const setTypingRef = useRef(null);
  const updatePresenceRef = useRef(null);
  const updateMessageStatusRef = useRef(null);
  const bulkUpdateMessageStatusRef = useRef(null);
  const deleteMessageLocalRef = useRef(null);
  const removeConversationLocalRef = useRef(null);

  const addMessage = useChatStore((s) => s.addMessage);
  const setTyping = useChatStore((s) => s.setTyping);
  const updatePresence = useChatStore((s) => s.updatePresence);
  const updateMessageStatus = useChatStore((s) => s.updateMessageStatus);
  const bulkUpdateMessageStatus = useChatStore((s) => s.bulkUpdateMessageStatus);
  const deleteMessageLocal = useChatStore((s) => s.deleteMessageLocal);
  const removeConversationLocal = useChatStore((s) => s.removeConversationLocal);

  // Keep refs in sync with latest store functions
  addMessageRef.current = addMessage;
  setTypingRef.current = setTyping;
  updatePresenceRef.current = updatePresence;
  updateMessageStatusRef.current = updateMessageStatus;
  bulkUpdateMessageStatusRef.current = bulkUpdateMessageStatus;
  deleteMessageLocalRef.current = deleteMessageLocal;
  removeConversationLocalRef.current = removeConversationLocal;

  useEffect(() => {
    const token = localStorage.getItem('convo-token');
    if (!token) return;

    const socket = getOrCreateSocket(token);

    // Stable handlers using refs
    function handleMessage(msg) {
      const existingMessages = useChatStore.getState().messages[msg.conversationId] || [];
      const existingMsg = existingMessages.find(
        (m) => m.id === msg.id || (msg.tempId && m.id === msg.tempId)
      );
      if (existingMsg && existingMsg.id === msg.id) {
        updateMessageStatusRef.current?.(msg.conversationId, msg.id, msg.status);
      } else {
        addMessageRef.current?.(msg.conversationId, msg);
      }
    }

    function handleMessageDelete({ conversationId, messageId }) {
      deleteMessageLocalRef.current?.(conversationId, messageId);
    }

    function handleConvDelete({ conversationId }) {
      removeConversationLocalRef.current?.(conversationId);
    }

    function handleTyping({ conversationId, userId, isTyping }) {
      const currentUser = useAuthStore.getState().user;
      const currentUserId = currentUser?.id || currentUser?._id;
      if (!currentUserId || userId !== currentUserId) {
        setTypingRef.current?.(conversationId, isTyping);
      }
    }

    function handlePresence({ userId, isOnline, lastSeenAt }) {
      updatePresenceRef.current?.(userId, isOnline, lastSeenAt);
    }

    // ── message:status — Bulk read receipt from server ──
    function handleMessageStatus({ conversationId, readByUserId, status }) {
      bulkUpdateMessageStatusRef.current?.(conversationId, readByUserId, status);
    }

    // ── conversation:accepted ──
    function handleConvAccepted({ conversationId, acceptedBy }) {
      useChatStore.getState().updateConversationAcceptedBy(conversationId, acceptedBy);
    }

    // ── user:blocked ──
    function handleUserBlocked({ blockedByUserId, blockedUserId }) {
      const currentUser = useAuthStore.getState().user;
      const currentUserId = currentUser?.id || currentUser?._id;
      if (currentUserId && blockedByUserId === currentUserId) {
        const currentBlocked = currentUser.blockedUsers || [];
        if (!currentBlocked.includes(blockedUserId)) {
          useAuthStore.getState().updateBlockedUsers([...currentBlocked, blockedUserId]);
        }
      }
    }

    // ── user:unblocked ──
    function handleUserUnblocked({ unblockedByUserId, unblockedUserId }) {
      const currentUser = useAuthStore.getState().user;
      const currentUserId = currentUser?.id || currentUser?._id;
      if (currentUserId && unblockedByUserId === currentUserId) {
        const currentBlocked = (currentUser.blockedUsers || []).filter((id) => id !== unblockedUserId);
        useAuthStore.getState().updateBlockedUsers(currentBlocked);
      }
    }

    socket.on('message:receive', handleMessage);
    socket.on('message:delete', handleMessageDelete);
    socket.on('conversation:delete', handleConvDelete);
    socket.on('typing', handleTyping);
    socket.on('presence', handlePresence);
    socket.on('message:status', handleMessageStatus);
    socket.on('conversation:accepted', handleConvAccepted);
    socket.on('user:blocked', handleUserBlocked);
    socket.on('user:unblocked', handleUserUnblocked);

    return () => {
      socket.off('message:receive', handleMessage);
      socket.off('message:delete', handleMessageDelete);
      socket.off('conversation:delete', handleConvDelete);
      socket.off('typing', handleTyping);
      socket.off('presence', handlePresence);
      socket.off('message:status', handleMessageStatus);
      socket.off('conversation:accepted', handleConvAccepted);
      socket.off('user:blocked', handleUserBlocked);
      socket.off('user:unblocked', handleUserUnblocked);
    };
  }, []); // Empty deps — run ONCE only

  const sendMessage = useCallback((msg) => {
    const token = localStorage.getItem('convo-token');
    const socket = getOrCreateSocket(token);
    if (socket) {
      socket.emit('message:send', msg);
    }
  }, []);

  const sendTyping = useCallback((conversationId, isTyping = true) => {
    const token = localStorage.getItem('convo-token');
    const socket = getOrCreateSocket(token);
    if (socket && conversationId) {
      socket.emit('typing', { conversationId, isTyping });
    }
  }, []);

  // Emit read receipt when user opens a conversation
  const markAsRead = useCallback((conversationId) => {
    const token = localStorage.getItem('convo-token');
    const socket = getOrCreateSocket(token);
    if (socket && conversationId) {
      socket.emit('message:read', { conversationId });
    }
  }, []);

  return { sendMessage, sendTyping, markAsRead };
}
