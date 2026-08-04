import { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useChatStore from '../store/chatStore';
import useSocket from '../hooks/useSocket';
import AppShell from '../components/layout/AppShell';
import ChatWindow from '../components/chat/ChatWindow';
import EmptyState from '../components/layout/EmptyState';

export default function ChatApp() {
  const { conversationId } = useParams();
  const navigate = useNavigate();

  const loadConversations = useChatStore((s) => s.loadConversations);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const addMessage = useChatStore((s) => s.addMessage);

  const { sendMessage, sendTyping, markAsRead } = useSocket();

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Sync URL → store & emit read receipt
  useEffect(() => {
    if (conversationId) {
      setActiveConversation(conversationId);
      // Mark messages as read when user opens a conversation
      markAsRead(conversationId);
    } else {
      setActiveConversation(null);
    }
  }, [conversationId, setActiveConversation, markAsRead]);

  // ── Handle send message ──
  const handleSendMessage = useCallback(
    (message) => {
      addMessage(message);
      sendMessage(message);
    },
    [addMessage, sendMessage]
  );

  // ── Handle typing ──
  const handleTyping = useCallback(
    (convId, isTyping = true) => {
      sendTyping(convId, isTyping);
    },
    [sendTyping]
  );

  // Use URL param first, fall back to store's active conversation
  const activeId = conversationId || activeConversationId;

  return (
    <AppShell>
      {activeId ? (
        <ChatWindow
          key={activeId}
          conversationId={activeId}
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
        />
      ) : (
        <EmptyState key="empty" />
      )}
    </AppShell>
  );
}
