import { Check, CheckCheck } from 'lucide-react';
import { cn, truncate, formatRelativeTime } from '../../lib/utils';
import useChatStore from '../../store/chatStore';
import Avatar from '../common/Avatar';
import TypingDots from './TypingIndicator';

export default function ChatList({ conversations, activeConversationId, onSelectConversation }) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <p className="font-sans text-text-secondary text-lg font-bold">No conversations found</p>
        <p className="text-text-tertiary text-sm mt-1 font-sans font-medium">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col py-1.5 relative min-h-full" role="listbox" aria-label="Conversations">
      {conversations.map((conv) => (
        <ChatListItem
          key={conv.id}
          conversation={conv}
          isActive={conv.id === activeConversationId}
          onSelect={() => onSelectConversation(conv.id)}
        />
      ))}
    </div>
  );
}

// Tick status icon for the last message preview in the sidebar
function LastMessageTick({ status, isActive }) {
  if (!status) return null;
  if (status === 'read') {
    return <CheckCheck size={14} className={cn('flex-shrink-0', isActive ? 'text-white/90' : 'text-[#53bdeb]')} />;
  }
  if (status === 'delivered') {
    return <CheckCheck size={14} className={cn('flex-shrink-0', isActive ? 'text-white/70' : 'text-text-tertiary')} />;
  }
  return <Check size={14} className={cn('flex-shrink-0', isActive ? 'text-white/70' : 'text-text-tertiary')} />;
}

function ChatListItem({ conversation, isActive, onSelect }) {
  const { participant, lastMessage, unreadCount, updatedAt } = conversation;
  const isTyping = useChatStore((s) => s.typingUsers[conversation.id]);
  const nicknames = useChatStore((s) => s.nicknames);
  const nickname = participant ? nicknames[participant.id] : null;
  const displayName = nickname || participant?.username || 'User';

  const currentUser = JSON.parse(localStorage.getItem('convo-user') || '{}');
  const currentUserId = currentUser?.id || currentUser?._id;
  const isSelf = lastMessage?.senderId === currentUserId || lastMessage?.senderId === 'user-self';

  const hasUnread = unreadCount > 0 && !isActive;

  return (
    <div className="px-2.5 py-1 group/item relative">
      <button
        type="button"
        role="option"
        aria-selected={isActive}
        onClick={onSelect}
        className={cn(
          'w-full flex items-center gap-3.5 px-3.5 py-3 text-left transition-all duration-fast rounded-2xl cursor-pointer relative',
          isActive
            ? 'bg-accent text-white shadow-xl'
            : 'hover:bg-white/5 text-text-primary'
        )}
      >
        {/* Avatar */}
        {participant && (
          <Avatar
            src={participant.avatarUrl}
            alt={participant.username}
            size="lg"
            isOnline={participant.isOnline}
          />
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <span className={cn(
                'font-sans text-[16px] sm:text-[17px] font-extrabold truncate tracking-tight',
                isActive ? 'text-white' : hasUnread ? 'text-white' : 'text-text-primary'
              )}>
                {displayName}
              </span>
            </div>
            <span className={cn(
              'text-xs font-sans flex-shrink-0 ml-2 font-bold',
              isActive ? 'text-white/85' : hasUnread ? 'text-accent' : 'text-text-tertiary'
            )}>
              {formatRelativeTime(lastMessage?.createdAt || updatedAt)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-1">
            <span className={cn(
              'font-sans text-[14px] sm:text-[15px] truncate flex-1 mr-1',
              isActive ? 'text-white/95 font-semibold' : hasUnread ? 'text-white font-bold' : 'text-text-secondary font-semibold'
            )}>
              {isTyping ? (
                <span className={cn('flex items-center gap-1.5 font-bold', isActive ? 'text-white' : 'text-accent')}>
                  <TypingDots inline />
                  <span>typing...</span>
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  {isSelf && <LastMessageTick status={lastMessage?.status} isActive={isActive} />}
                  {isSelf && <span className={isActive ? 'text-white/75' : 'text-text-tertiary'}>You: </span>}
                  {truncate(lastMessage?.text || (lastMessage ? 'Attachment' : 'No messages yet'), 30)}
                </span>
              )}
            </span>

            {/* Unread badge */}
            {hasUnread && (
              <span className={cn(
                'min-w-[22px] h-[22px] px-1.5 text-[11px] font-sans font-extrabold leading-none rounded-full flex-shrink-0 shadow-sm flex items-center justify-center',
                'bg-accent text-white'
              )}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
        </div>
      </button>
    </div>
  );
}
