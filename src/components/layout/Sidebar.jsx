import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, MessageSquare, Loader2, SearchX } from 'lucide-react';
import useChatStore from '../../store/chatStore';
import useUiStore from '../../store/uiStore';
import useDebounce from '../../hooks/useDebounce';
import api from '../../services/api';
import TopBar from './TopBar';
import ChatList from '../chat/ChatList';
import Avatar from '../common/Avatar';
import { ChatListSkeleton } from '../common/Skeletons';

export default function Sidebar() {
  const navigate = useNavigate();
  const conversations = useChatStore((s) => s.conversations);
  const isLoading = useChatStore((s) => s.isLoadingConversations);
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  const startNewConversation = useChatStore((s) => s.startNewConversation);

  const searchQuery = useUiStore((s) => s.searchQuery);
  const setSearchQuery = useUiStore((s) => s.setSearchQuery);
  const activeFilter = useUiStore((s) => s.activeFilter);

  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const debouncedQuery = useDebounce(searchQuery, 100);

  // Live user search effect
  useEffect(() => {
    const trimmedQuery = debouncedQuery ? debouncedQuery.trim() : '';

    if (!trimmedQuery) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let isCancelled = false;
    setIsSearching(true);

    api.searchUsers(trimmedQuery).then((res) => {
      if (!isCancelled) {
        setSearchResults(res.users || []);
        setIsSearching(false);
      }
    }).catch(() => {
      if (!isCancelled) {
        setSearchResults([]);
        setIsSearching(false);
      }
    });

    return () => { isCancelled = true; };
  }, [debouncedQuery]);

  // Handle click on existing conversation
  const handleSelectConversation = useCallback(
    (convId) => {
      setActiveConversation(convId);
      navigate(`/chat/${convId}`);
    },
    [setActiveConversation, navigate]
  );

  // Handle click on a searched user to start a new 1:1 chat
  const handleStartChatWithUser = async (targetUser) => {
    setIsSearching(true);
    const conv = await startNewConversation(targetUser.id);
    setIsSearching(false);

    if (conv) {
      setSearchQuery('');
      setActiveConversation(conv.id);
      navigate(`/chat/${conv.id}`);
    }
  };

  // Filter existing conversations locally
  const filteredConversations = conversations.filter((conv) => {
    if (!conv.participant) return false;

    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      const usernameMatch = conv.participant?.username?.toLowerCase().includes(q);
      const nameMatch = conv.participant?.fullName?.toLowerCase().includes(q);
      const msgMatch = conv.lastMessage?.text?.toLowerCase().includes(q);
      if (!usernameMatch && !nameMatch && !msgMatch) return false;
    }

    if (activeFilter === 'unread' && conv.unreadCount === 0) return false;
    if (activeFilter === 'online' && !conv.participant?.isOnline) return false;

    return true;
  });

  const isDebouncing = searchQuery.trim() !== (debouncedQuery ? debouncedQuery.trim() : '');

  return (
    <div className="flex flex-col h-full bg-[#18181a] border-r border-white/10 relative">
      <TopBar />

      <div className="flex-1 overflow-y-auto pb-16">
        {/* If user typed a search query */}
        {searchQuery.trim().length > 0 ? (
          <div className="px-3 py-2 space-y-4">
            {/* Global User Search Section */}
            <div>
              <div className="flex items-center justify-between px-3 py-1.5 text-xs font-bold font-sans uppercase tracking-wider text-text-tertiary">
                <span>Global User Search</span>
                {(isSearching || isDebouncing) && <Loader2 size={14} className="animate-spin text-accent" />}
              </div>

              {isSearching || isDebouncing ? (
                <div className="py-6 text-center text-text-tertiary">
                  <Loader2 size={24} className="animate-spin mx-auto mb-1.5 text-accent" />
                  <p className="font-sans text-xs font-semibold">Searching users...</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-1 mt-1">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleStartChatWithUser(user)}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-accent/20 transition-all text-left group cursor-pointer border border-white/5 hover:border-accent/40"
                    >
                      <Avatar
                        src={user.avatarUrl}
                        alt={user.fullName || user.username}
                        size="md"
                        isOnline={user.isOnline}
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-sans font-bold text-sm text-white truncate group-hover:text-accent transition-colors">
                          {user.fullName || user.username}
                        </h4>
                        <p className="font-sans text-xs text-text-tertiary truncate font-medium">
                          @{user.username}
                        </p>
                      </div>
                      <div className="w-9 h-9 rounded-full bg-accent/15 text-accent flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-all flex-shrink-0">
                        <MessageSquare size={16} />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-text-tertiary">
                  <SearchX size={24} className="mx-auto mb-1.5 opacity-50" />
                  <p className="font-sans text-xs font-semibold">No registered users found for "{searchQuery}"</p>
                </div>
              )}
            </div>

            {/* Existing Conversations Section */}
            {filteredConversations.length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-xs font-bold font-sans uppercase tracking-wider text-text-tertiary">
                  Existing Chats
                </div>
                <ChatList
                  conversations={filteredConversations}
                  activeConversationId={activeConversationId}
                  onSelectConversation={handleSelectConversation}
                />
              </div>
            )}
          </div>
        ) : isLoading ? (
          <ChatListSkeleton />
        ) : (
          <ChatList
            conversations={filteredConversations}
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
          />
        )}
      </div>
    </div>
  );
}
