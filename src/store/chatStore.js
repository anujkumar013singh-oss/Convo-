import { create } from 'zustand';
import api from '../services/api';

// Load stored nicknames from localStorage
const getStoredNicknames = () => {
  try {
    const data = localStorage.getItem('convo-nicknames');
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

// Load cached conversations from localStorage for instant render
const getCachedConversations = () => {
  try {
    const data = localStorage.getItem('convo-conversations-cache');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const useChatStore = create((set, get) => ({
  conversations: getCachedConversations(), // Pre-load from cache for instant render
  activeConversationId: null,
  messages: {},           // { [conversationId]: Message[] }
  typingUsers: {},        // { [conversationId]: boolean }
  nicknames: getStoredNicknames(), // { [userId]: nicknameString }
  pinnedMessages: {},     // { [conversationId]: messageId }
  isLoadingConversations: false,
  isLoadingMessages: false,

  // ── Toggle Pin message ──
  togglePinMessage: (conversationId, messageId) => {
    set((state) => {
      const currentPinned = state.pinnedMessages[conversationId];
      const updated = { ...state.pinnedMessages };
      if (currentPinned === messageId) {
        delete updated[conversationId];
      } else {
        updated[conversationId] = messageId;
      }
      return { pinnedMessages: updated };
    });
  },

  // ── Set custom nickname for a user ──
  setNickname: (userId, nickname) => {
    set((state) => {
      const updatedNicknames = { ...state.nicknames };
      if (nickname && nickname.trim()) {
        updatedNicknames[userId] = nickname.trim();
      } else {
        delete updatedNicknames[userId];
      }
      localStorage.setItem('convo-nicknames', JSON.stringify(updatedNicknames));
      return { nicknames: updatedNicknames };
    });
  },

  // ── Delete a message permanently in MongoDB Atlas ──
  deleteMessage: async (conversationId, messageId) => {
    get().deleteMessageLocal(conversationId, messageId);
    try {
      await api.deleteMessage(conversationId, messageId);
    } catch (err) {
      console.warn('Failed to delete message from database:', err);
    }
  },

  // ── Delete message local helper ──
  deleteMessageLocal: (conversationId, messageId) => {
    set((state) => {
      const msgs = state.messages[conversationId] || [];
      const updatedMsgs = msgs.filter((m) => m.id !== messageId);
      const newLastMsg = updatedMsgs[updatedMsgs.length - 1];

      const updatedPinned = { ...state.pinnedMessages };
      if (updatedPinned[conversationId] === messageId) {
        delete updatedPinned[conversationId];
      }

      const updatedConversations = state.conversations.map((c) => {
        if (c.id === conversationId) {
          return {
            ...c,
            lastMessage: newLastMsg
              ? {
                  text: newLastMsg.text || (newLastMsg.attachment ? `[${newLastMsg.attachment.type.toUpperCase()}]` : ''),
                  senderId: newLastMsg.senderId,
                  createdAt: newLastMsg.createdAt,
                }
              : null,
          };
        }
        return c;
      });

      return {
        messages: { ...state.messages, [conversationId]: updatedMsgs },
        conversations: updatedConversations,
        pinnedMessages: updatedPinned,
      };
    });
  },

  // ── Delete conversation permanently in MongoDB Atlas ──
  deleteConversation: async (conversationId) => {
    get().removeConversationLocal(conversationId);
    try {
      await api.deleteConversation(conversationId);
    } catch (err) {
      console.warn('Failed to delete conversation from database:', err);
    }
  },

  // ── Continue conversation (Accept new chat request) ──
  continueConversation: async (conversationId) => {
    try {
      const res = await api.continueConversation(conversationId);
      if (res && res.acceptedBy) {
        get().updateConversationAcceptedBy(conversationId, res.acceptedBy);
      }
    } catch (err) {
      console.warn('Failed to continue conversation:', err);
    }
  },

  // ── Block conversation participant ──
  blockConversation: async (conversationId) => {
    try {
      const res = await api.blockConversation(conversationId);
      if (res && res.blockedUsers) {
        const useAuthStore = (await import('./authStore')).default;
        useAuthStore.getState().updateBlockedUsers(res.blockedUsers);
      }
    } catch (err) {
      console.warn('Failed to block user:', err);
    }
  },

  // ── Unblock conversation participant ──
  unblockConversation: async (conversationId) => {
    try {
      const res = await api.unblockConversation(conversationId);
      if (res && res.blockedUsers) {
        const useAuthStore = (await import('./authStore')).default;
        useAuthStore.getState().updateBlockedUsers(res.blockedUsers);
      }
    } catch (err) {
      console.warn('Failed to unblock user:', err);
    }
  },

  // ── Local helper: Update conversation acceptedBy list ──
  updateConversationAcceptedBy: (conversationId, acceptedBy) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, acceptedBy } : c
      ),
    }));
  },

  // ── Remove conversation local helper ──
  removeConversationLocal: (conversationId) => {
    set((state) => {
      const updatedConversations = state.conversations.filter((c) => c.id !== conversationId);
      const updatedMessages = { ...state.messages };
      delete updatedMessages[conversationId];

      return {
        conversations: updatedConversations,
        messages: updatedMessages,
        activeConversationId: state.activeConversationId === conversationId ? null : state.activeConversationId,
      };
    });
  },

  // ── Load conversations from API ──
  loadConversations: async () => {
    set({ isLoadingConversations: true });
    try {
      const res = await api.getConversations();
      const conversations = res.conversations || [];
      // Cache conversations in localStorage for instant render on next page load
      try {
        localStorage.setItem('convo-conversations-cache', JSON.stringify(conversations));
      } catch { /* ignore storage errors */ }
      set({
        conversations,
        isLoadingConversations: false,
      });
    } catch (err) {
      console.warn('Failed to load conversations:', err);
      set({ isLoadingConversations: false });
    }
  },

  // ── Start / Find 1:1 conversation with targetUserId ──
  startNewConversation: async (targetUserId) => {
    try {
      const res = await api.startConversation(targetUserId);
      if (res && res.conversation) {
        const conversation = res.conversation;
        set((state) => {
          const exists = state.conversations.some((c) => c.id === conversation.id);
          const updatedConvs = exists
            ? state.conversations.map((c) => (c.id === conversation.id ? conversation : c))
            : [conversation, ...state.conversations];
          return {
            conversations: updatedConvs,
            activeConversationId: conversation.id,
          };
        });
        return conversation;
      }
    } catch (err) {
      console.error('Failed to start conversation:', err);
    }
    return null;
  },

  // ── Set active conversation ──
  setActiveConversation: (conversationId) => {
    set({ activeConversationId: conversationId });

    // Load messages for this conversation if not already loaded
    const state = get();
    if (conversationId && !state.messages[conversationId]) {
      get().loadMessages(conversationId);
    }

    // Clear unread count when user opens the conversation
    if (conversationId) {
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c
        ),
      }));
    }
  },

  // ── Load messages for a conversation from API ──
  loadMessages: async (conversationId) => {
    set({ isLoadingMessages: true });
    try {
      const res = await api.getMessages(conversationId);
      set((state) => ({
        messages: { ...state.messages, [conversationId]: res.messages || [] },
        isLoadingMessages: false,
      }));
    } catch (err) {
      console.warn('Failed to load messages:', err);
      set({ isLoadingMessages: false });
    }
  },

  // ── Update Message Status ──
  updateMessageStatus: (conversationId, messageId, status) => {
    set((state) => {
      const msgs = state.messages[conversationId] || [];
      const updatedMsgs = msgs.map((m) => (m.id === messageId ? { ...m, status } : m));
      return { messages: { ...state.messages, [conversationId]: updatedMsgs } };
    });
  },

  // ── Bulk update message status (e.g., all messages in a conversation marked as 'read') ──
  bulkUpdateMessageStatus: (conversationId, readByUserId, status) => {
    set((state) => {
      const msgs = state.messages[conversationId] || [];
      const updatedMsgs = msgs.map((m) => {
        // Update messages that were sent BY current user TO the user who read them
        if (m.recipientId === readByUserId && (m.status === 'sent' || m.status === 'delivered')) {
          return { ...m, status };
        }
        return m;
      });
      return { messages: { ...state.messages, [conversationId]: updatedMsgs } };
    });
  },

  // ── Update User Presence ──
  updatePresence: (userId, isOnline, lastSeenAt) => {
    if (!userId) return;
    set((state) => ({
      conversations: state.conversations.map((c) => {
        const p = c.participant;
        if (p && (p.id === userId || p._id?.toString() === userId.toString())) {
          return {
            ...c,
            participant: {
              ...p,
              isOnline: Boolean(isOnline),
              lastSeenAt: lastSeenAt || p.lastSeenAt || new Date().toISOString(),
            },
          };
        }
        return c;
      }),
    }));
  },

  // ── Add / Send message ──
  addMessage: (convIdOrMsg, messageObj) => {
    const message = messageObj || convIdOrMsg;
    const conversationId = message.conversationId || convIdOrMsg;

    set((state) => {
      const existingMsgs = state.messages[conversationId] || [];

      // Check if message with exact ID already exists
      const exactIndex = existingMsgs.findIndex((m) => m.id === message.id);
      if (exactIndex !== -1) {
        const copy = [...existingMsgs];
        copy[exactIndex] = { ...copy[exactIndex], ...message };
        return { messages: { ...state.messages, [conversationId]: copy } };
      }

      // Check if this incoming message matches a local temporary message (by tempId or matching text & sender)
      let tempIndex = -1;
      if (message.tempId) {
        tempIndex = existingMsgs.findIndex((m) => m.id === message.tempId);
      }
      if (tempIndex === -1) {
        tempIndex = existingMsgs.findIndex(
          (m) =>
            (m.senderId === 'user-self' || m.senderId === message.senderId) &&
            typeof m.id === 'string' &&
            m.id.startsWith('temp-') &&
            m.text === message.text
        );
      }

      let updatedMsgs;
      if (tempIndex !== -1) {
        updatedMsgs = [...existingMsgs];
        updatedMsgs[tempIndex] = message; // Replace temp message with server-confirmed message
      } else {
        updatedMsgs = [...existingMsgs, message];
      }

      // Increment unread count if the message is NOT from the current user
      // and this conversation is NOT the currently active (open) one
      const currentUser = JSON.parse(localStorage.getItem('convo-user') || '{}');
      const currentUserId = currentUser?.id || currentUser?._id;
      const isFromOther = message.senderId !== currentUserId && message.senderId !== 'user-self';
      const isNotActiveConv = state.activeConversationId !== conversationId;
      const shouldIncrementUnread = isFromOther && isNotActiveConv && tempIndex === -1;

      let conversationExists = false;
      const updatedConversations = state.conversations.map((c) => {
        if (c.id === conversationId) {
          conversationExists = true;
          return {
            ...c,
            lastMessage: {
              text: message.text || (message.attachment ? `[${message.attachment.type.toUpperCase()}]` : ''),
              senderId: message.senderId,
              createdAt: message.createdAt,
              status: message.status || 'sent',
            },
            updatedAt: message.createdAt,
            unreadCount: shouldIncrementUnread ? (c.unreadCount || 0) + 1 : (c.unreadCount || 0),
          };
        }
        return c;
      });

      if (!conversationExists) {
        setTimeout(() => get().loadConversations(), 50);
      }

      return {
        messages: { ...state.messages, [conversationId]: updatedMsgs },
        conversations: updatedConversations,
      };
    });
  },

  // ── Set typing indicator ──
  setTyping: (conversationId, isTyping) => {
    set((state) => ({
      typingUsers: { ...state.typingUsers, [conversationId]: isTyping },
    }));
  },
}));

export default useChatStore;
