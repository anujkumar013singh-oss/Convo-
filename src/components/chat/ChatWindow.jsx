import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AtSign, ArrowDown, FolderArchive, Images, X, FileText, ExternalLink, Play, Link as LinkIcon, Music, Pin, ShieldAlert, Ban, CheckCircle2, Phone, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import useChatStore from '../../store/chatStore';
import useAuthStore from '../../store/authStore';
import useUiStore from '../../store/uiStore';
import { cn, formatLastSeen, formatDateSeparator } from '../../lib/utils';
import Avatar from '../common/Avatar';
import MessageBubble from './MessageBubble';
import Composer from './Composer';
import TypingIndicator from './TypingIndicator';
import EmptyConversation from './EmptyConversation';
import MediaLightbox from './MediaLightbox';
import ForwardModal from './ForwardModal';
import { MessageSkeleton } from '../common/Skeletons';
import { getGlobalSocket } from '../../hooks/useSocket';

export default function ChatWindow({ conversationId, onSendMessage, onTyping }) {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const currentUserId = currentUser?.id || currentUser?._id;
  const conversations = useChatStore((s) => s.conversations);
  const isLoadingConversations = useChatStore((s) => s.isLoadingConversations);
  const messages = useChatStore((s) => s.messages[conversationId]) || [];
  const isLoading = useChatStore((s) => s.isLoadingMessages);
  const isTyping = useChatStore((s) => s.typingUsers[conversationId]);
  const nicknames = useChatStore((s) => s.nicknames);
  const setNickname = useChatStore((s) => s.setNickname);
  const pinnedMessages = useChatStore((s) => s.pinnedMessages);
  const togglePinMessage = useChatStore((s) => s.togglePinMessage);
  const isMobile = useUiStore((s) => s.isMobile);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  const openProfileSheet = useUiStore((s) => s.openProfileSheet);

  const continueConversation = useChatStore((s) => s.continueConversation);
  const blockConversation = useChatStore((s) => s.blockConversation);
  const unblockConversation = useChatStore((s) => s.unblockConversation);

  const conversation = conversations.find((c) => c.id === conversationId);
  const participant = conversation?.participant;
  const nickname = participant ? nicknames[participant.id] : null;
  const displayName = nickname || participant?.username;

  // Instant 1st-click local optimistic state overrides
  const [localBlockedOverride, setLocalBlockedOverride] = useState(null); // null | boolean
  const [localAcceptedOverride, setLocalAcceptedOverride] = useState(null); // null | boolean

  // Reset local overrides when switching conversations
  useEffect(() => {
    setLocalBlockedOverride(null);
    setLocalAcceptedOverride(null);
  }, [conversationId]);

  // Block & Accept State Calculation
  const targetParticipantId = participant?.id || participant?._id;
  const isDbBlocked = Boolean(
    targetParticipantId &&
      currentUser?.blockedUsers?.some((id) => id?.toString() === targetParticipantId?.toString())
  );
  const isBlocked = localBlockedOverride !== null ? localBlockedOverride : isDbBlocked;

  const acceptedByList = conversation?.acceptedBy || [];
  const isDbAccepted = Boolean(
    currentUserId && acceptedByList.some((id) => id?.toString() === currentUserId?.toString())
  );
  const isAcceptedByMe = localAcceptedOverride !== null ? localAcceptedOverride : isDbAccepted;

  const showBlockContinuePrompt = !isBlocked && !isAcceptedByMe;
  const effectiveIsTyping = isBlocked ? false : isTyping;

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);

  // Modals & States
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [activeMediaTab, setActiveMediaTab] = useState('media'); // 'media' | 'links' | 'docs'
  const [lightboxMedia, setLightboxMedia] = useState(null);

  // Reply & Forward & Highlight State
  const [replyingTo, setReplyingTo] = useState(null);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState(null);

  const pinnedMessageId = pinnedMessages[conversationId];
  const pinnedMsg = messages.find((m) => m.id === pinnedMessageId);

  // Jump to Pinned Message with WhatsApp-Style Scroll & 1-Second Line Highlight
  const handleJumpToPinned = () => {
    if (!pinnedMsg) return;
    const el = document.getElementById(`msg-${pinnedMsg.id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMsgId(pinnedMsg.id);
      setTimeout(() => {
        setHighlightedMsgId(null);
      }, 1200);
    }
  };

  // Safe DOM Auto-scroll (prevents "Node cannot be found" DOM reconciliation exceptions)
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    requestAnimationFrame(() => {
      try {
        if (messagesEndRef.current && document.body.contains(messagesEndRef.current)) {
          messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
        }
      } catch {}
    });
  }, []);

  useEffect(() => {
    if (isNearBottom) {
      scrollToBottom('auto');
    }
  }, [messages.length, isTyping, isNearBottom, scrollToBottom]);

  useEffect(() => {
    scrollToBottom('auto');
  }, [conversationId, scrollToBottom]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom < 100;
    setIsNearBottom(nearBottom);
    setShowScrollBtn(!nearBottom);
  };

  const handleBack = () => {
    setActiveConversation(null);
    navigate('/chat');
  };

  // Open Nickname Dialog
  const handleOpenNicknameModal = () => {
    setNicknameInput(nickname || '');
    setShowNicknameModal(true);
  };

  const handleSaveNickname = (e) => {
    e.preventDefault();
    if (participant) {
      setNickname(participant.id, nicknameInput);
    }
    setShowNicknameModal(false);
  };

  // Shared Media items
  const sharedMediaItems = messages.filter((m) => m.attachment && (m.attachment.type === 'image' || m.attachment.type === 'video'));
  const sharedLinksItems = messages.filter((m) => m.text && /(https?:\/\/[^\s]+)/g.test(m.text));
  const sharedDocsItems = messages.filter((m) => m.attachment && (m.attachment.type === 'file' || m.attachment.type === 'audio'));

  const getActiveTabMedia = () => {
    if (activeMediaTab === 'media') return sharedMediaItems;
    if (activeMediaTab === 'links') return sharedLinksItems;
    return sharedDocsItems;
  };

  const activeMediaList = getActiveTabMedia();

  if (!participant) {
    if (isLoadingConversations || conversations.length === 0) {
      return (
        <div className="flex flex-col h-full bg-bg-base">
          <div className="h-16 border-b border-border-subtle bg-bg-raised flex items-center px-4">
            <div className="w-10 h-10 rounded-full bg-bg-hover animate-pulse" />
            <div className="ml-3 space-y-2">
              <div className="w-32 h-4 bg-bg-hover rounded animate-pulse" />
              <div className="w-20 h-3 bg-bg-hover rounded animate-pulse" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <MessageSkeleton count={6} />
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full bg-bg-base text-center p-6">
        <h3 className="font-heading text-xl font-bold mb-2">Conversation not found</h3>
        <p className="text-text-secondary text-sm mb-4 font-sans">
          The selected chat may have been removed or is unavailable.
        </p>
        <button
          onClick={handleBack}
          className="px-5 py-2 rounded-xl bg-accent text-white font-heading font-bold text-sm hover:bg-accent-hover transition-colors cursor-pointer"
        >
          Return to chats
        </button>
      </div>
    );
  }

  // Group messages & track date separators
  let lastDateSeparator = null;

  return (
    <div className="flex flex-col h-full relative bg-doodle">
      {/* ── Centralized Top Floating Header Bar ── */}
      <div className="w-full px-3 sm:px-4 pt-2.5 flex-shrink-0 z-20">
        <div className="max-w-[760px] mx-auto w-full px-3 sm:px-4 py-2 rounded-2xl bg-[#181818]/95 backdrop-blur-md border border-white/10 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {isMobile && (
              <button
                onClick={handleBack}
                className="p-1.5 rounded-full hover:bg-white/10 transition-colors focus-ring cursor-pointer"
                aria-label="Go back to chat list"
              >
                <ArrowLeft size={20} className="text-white" />
              </button>
            )}

            <button
              className="flex items-center gap-3 min-w-0 focus-ring rounded-xl py-0.5 px-1 hover:bg-white/5 transition-colors text-left"
              onClick={() => openProfileSheet(participant)}
            >
              <Avatar
                src={participant.avatarUrl}
                alt={participant.username}
                size="md"
                isOnline={participant.isOnline}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2 truncate">
                  <h2 className="font-heading text-sm sm:text-base text-white font-bold truncate">
                    {displayName}
                  </h2>
                </div>
                <p className="text-xs text-text-tertiary truncate font-sans font-medium">
                  {isTyping
                    ? <span className="text-accent font-semibold">typing...</span>
                    : participant.isOnline
                      ? 'online'
                      : formatLastSeen(participant.lastSeenAt)}
                </p>
              </div>
            </button>
          </div>

          {/* Clean Header Controls: Media Gallery & Nickname */}
          <div className="flex items-center gap-1 sm:gap-1.5 relative">

            {/* Shared Media Gallery Icon */}
            <button
              onClick={() => setShowMediaModal(true)}
              className="p-2 rounded-full text-text-tertiary hover:text-white hover:bg-white/10 transition-colors focus-ring cursor-pointer"
              title="Shared Media & Links"
              aria-label="Shared media"
            >
              <Images size={19} />
            </button>

            {/* Custom Nickname (@) Icon */}
            <button
              onClick={handleOpenNicknameModal}
              className={cn(
                'p-2 rounded-full transition-colors focus-ring cursor-pointer',
                nickname
                  ? 'text-accent bg-accent/20'
                  : 'text-text-tertiary hover:text-white hover:bg-white/10'
              )}
              title="Set Custom Nickname"
              aria-label="Set custom nickname"
            >
              <AtSign size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Pinned Message Banner (Tap to Jump with WhatsApp 1-Sec Highlight) ── */}
      {pinnedMsg && (
        <div className="w-full px-3 sm:px-4 pt-1.5 flex-shrink-0 z-10">
          <div
            onClick={handleJumpToPinned}
            className="max-w-[760px] mx-auto w-full px-4 py-2 rounded-xl bg-[#212121]/95 backdrop-blur-md border border-white/10 flex items-center justify-between shadow-md cursor-pointer hover:bg-white/10 transition-colors group"
            title="Tap to jump to pinned message"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Pin size={16} fill="white" className="text-amber-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
              <div className="min-w-0">
                <span className="font-sans text-xs font-bold text-amber-400">Pinned Message</span>
                <p className="font-sans text-xs text-white truncate">{pinnedMsg.text || pinnedMsg.attachment?.name || 'Attachment'}</p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePinMessage(conversationId, pinnedMsg.id);
              }}
              className="p-1 rounded-full hover:bg-white/10 text-text-tertiary hover:text-white transition-colors cursor-pointer"
              title="Unpin message"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Strictly Centered Message Thread Column ── */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 sm:px-6 py-3"
      >
        <div className="max-w-[760px] mx-auto w-full flex flex-col min-h-full justify-end">
          {isLoading ? (
            <MessageSkeleton />
          ) : messages.length === 0 ? (
            <EmptyConversation
              participantName={displayName}
              onSendGreeting={(text) => {
                onSendMessage({
                  id: Date.now().toString(),
                  conversationId,
                  senderId: 'user-self',
                  recipientId: participant.id,
                  text,
                  createdAt: new Date().toISOString(),
                  status: 'sent',
                });
              }}
            />
          ) : (
            <div className="flex flex-col">
              {messages.map((msg, i) => {
                const prevMsg = messages[i - 1];
                const isNewGroup = !prevMsg || prevMsg.senderId !== msg.senderId;

                // Telegram-style Date Separator Logic
                const dateSeparator = formatDateSeparator(msg.createdAt);
                const showDateHeader = dateSeparator !== lastDateSeparator;
                if (showDateHeader) {
                  lastDateSeparator = dateSeparator;
                }

                const gap = isNewGroup ? 'mt-2.5' : 'mt-[3px]';

                return (
                  <div key={msg.id || i}>
                    {/* Date Separator Pill */}
                    {showDateHeader && (
                      <div className="my-4 flex items-center justify-center">
                        <span className="px-3.5 py-1 rounded-full bg-[#181818]/90 border border-white/10 backdrop-blur-md font-sans text-xs font-bold text-white/90 shadow-md">
                          {dateSeparator}
                        </span>
                      </div>
                    )}

                    <div className={i > 0 && !showDateHeader ? gap : ''}>
                      <MessageBubble
                        message={msg}
                        isOwn={msg.senderId === 'user-self' || (Boolean(currentUserId) && msg.senderId?.toString() === currentUserId?.toString())}
                        isRecipientOnline={participant?.isOnline}
                        isFirstInGroup={isNewGroup}
                        isPinned={pinnedMessageId === msg.id}
                        isHighlighted={highlightedMsgId === msg.id}
                        onReply={(m) => setReplyingTo(m)}
                        onForward={(m) => setForwardingMessage(m)}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator (Suppressed if user is blocked) */}
              {effectiveIsTyping && <TypingIndicator />}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            onClick={() => scrollToBottom()}
            className="absolute bottom-20 right-6 w-10 h-10 rounded-full bg-[#212121] border border-white/10
                       shadow-xl flex items-center justify-center hover:bg-white/10 transition-colors focus-ring z-10 text-accent cursor-pointer"
            aria-label="Scroll to bottom"
          >
            <ArrowDown size={18} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── BLOCK / CONTINUE ACTION BAR FOR NEW CHATS (Responsive Mobile & Tablet Layout) ── */}
      {isBlocked ? (
        <div className="flex-shrink-0 px-2 sm:px-3 pb-3 pt-1 w-full z-20">
          <div className="max-w-[760px] mx-auto w-full bg-rose-950/60 border border-rose-800/80 rounded-2xl p-3.5 sm:p-4 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-white">
            <div className="flex items-center gap-3 min-w-0">
              <Ban size={20} className="text-rose-400 flex-shrink-0" />
              <p className="font-sans text-xs sm:text-sm font-bold text-rose-200 truncate">
                You have blocked @{participant?.username || 'this user'}. You cannot send or receive messages.
              </p>
            </div>

            <button
              type="button"
              onClick={async () => {
                setLocalBlockedOverride(false);
                toast.success(`Unblocked @${participant?.username}`);
                await unblockConversation(conversationId);
              }}
              className="w-full sm:w-auto min-h-[42px] px-5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-200 font-sans font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center flex-shrink-0 active:scale-95"
            >
              Unblock
            </button>
          </div>
        </div>
      ) : showBlockContinuePrompt ? (
        <div className="flex-shrink-0 px-2 sm:px-3 pb-3 pt-1 w-full z-20">
          <div className="max-w-[760px] mx-auto w-full bg-[#1c1c20]/95 border border-white/15 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4.5 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 text-white">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center flex-shrink-0 shadow-sm">
                <ShieldAlert size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-sans text-sm sm:text-base font-extrabold text-white truncate">
                  Chat request from @{participant?.username || 'user'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto flex-shrink-0">
              <button
                type="button"
                onClick={async () => {
                  setLocalBlockedOverride(true);
                  toast.error(`Blocked @${participant?.username}`);
                  await blockConversation(conversationId);
                }}
                className="flex-1 sm:flex-initial min-h-[44px] px-5 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-sans font-extrabold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Ban size={16} />
                <span>Block</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  setLocalAcceptedOverride(true);
                  toast.success(`Chat request accepted! You can now message @${participant?.username}`);
                  await continueConversation(conversationId);
                }}
                className="flex-1 sm:flex-initial min-h-[44px] px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-sans font-extrabold text-xs sm:text-sm shadow-lg shadow-accent/30 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
              >
                <CheckCircle2 size={16} />
                <span>Continue</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Standard Composer */
        <Composer
          conversationId={conversationId}
          recipientId={participant?.id || participant?._id}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          onSendMessage={onSendMessage}
          onTyping={onTyping}
        />
      )}

      {/* ── Set Nickname Dialog Modal ── */}
      <AnimatePresence>
        {showNicknameModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
            onClick={() => setShowNicknameModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-[#212121] rounded-xl border border-white/10 w-full max-w-md p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AtSign size={20} className="text-accent" />
                  <h3 className="font-sans text-base font-bold text-white">Set Custom Nickname</h3>
                </div>
                <button
                  onClick={() => setShowNicknameModal(false)}
                  className="p-1 rounded-full hover:bg-white/10 text-text-tertiary hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="font-sans text-sm text-text-secondary mb-4">
                Set a special nickname for <span className="text-white font-bold">@{participant.username}</span>.
              </p>

              <form onSubmit={handleSaveNickname} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={nicknameInput}
                    onChange={(e) => setNicknameInput(e.target.value)}
                    placeholder="Enter nickname..."
                    className="convo-input font-sans text-sm"
                    autoFocus
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  {nickname && (
                    <button
                      type="button"
                      onClick={() => {
                        setNickname(participant.id, null);
                        setShowNicknameModal(false);
                      }}
                      className="px-3.5 py-2 rounded-lg text-xs font-sans font-semibold text-accent-strong hover:bg-accent-strong/10 transition-colors"
                    >
                      Reset Name
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowNicknameModal(false)}
                    className="px-3.5 py-2 rounded-lg text-xs font-sans font-semibold text-text-secondary hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-xs font-sans font-bold bg-accent text-white hover:bg-accent-hover transition-colors shadow-md"
                  >
                    Save Nickname
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Forward Modal ── */}
      <AnimatePresence>
        {forwardingMessage && (
          <ForwardModal
            messageToForward={forwardingMessage}
            onClose={() => setForwardingMessage(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Shared Media & Links Modal ── */}
      <AnimatePresence>
        {showMediaModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
            onClick={() => setShowMediaModal(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-[#1c1c1c] rounded-2xl border border-white/10 w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Bar: Centered Segment Pill Tabs */}
              <div className="flex items-center justify-center px-5 py-4 border-b border-white/10 bg-[#1c1c1c] flex-shrink-0 relative">
                {/* Centered Segment Pill Filter Tabs (Media | Links | Docs) */}
                <div className="bg-[#2b2b2b] rounded-full p-1 flex items-center gap-1 border border-white/5">
                  <button
                    onClick={() => setActiveMediaTab('media')}
                    className={cn(
                      'px-5 py-1 rounded-full text-xs font-sans font-semibold transition-all cursor-pointer',
                      activeMediaTab === 'media'
                        ? 'bg-white/20 text-white font-bold shadow-sm'
                        : 'text-text-tertiary hover:text-white'
                    )}
                  >
                    Media
                  </button>

                  <button
                    onClick={() => setActiveMediaTab('links')}
                    className={cn(
                      'px-5 py-1 rounded-full text-xs font-sans font-semibold transition-all cursor-pointer',
                      activeMediaTab === 'links'
                        ? 'bg-white/20 text-white font-bold shadow-sm'
                        : 'text-text-tertiary hover:text-white'
                    )}
                  >
                    Links
                  </button>

                  <button
                    onClick={() => setActiveMediaTab('docs')}
                    className={cn(
                      'px-5 py-1 rounded-full text-xs font-sans font-semibold transition-all cursor-pointer',
                      activeMediaTab === 'docs'
                        ? 'bg-white/20 text-white font-bold shadow-sm'
                        : 'text-text-tertiary hover:text-white'
                    )}
                  >
                    Docs
                  </button>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col justify-between">
                <div>
                  {/* Section Title */}
                  <h4 className="font-sans text-sm font-bold text-white mb-4">
                    This month
                  </h4>

                  {activeMediaList.length === 0 ? (
                    <div className="py-14 flex flex-col items-center justify-center text-center">
                      <FolderArchive size={42} className="text-text-tertiary mb-3 opacity-50" />
                      <p className="font-sans text-base font-bold text-white mb-1">
                        No {activeMediaTab === 'media' ? 'images or videos' : activeMediaTab === 'links' ? 'links' : 'documents'} shared yet
                      </p>
                      <p className="font-sans text-xs text-text-tertiary font-medium">
                        Items sent in this chat will appear here.
                      </p>
                    </div>
                  ) : (
                    <div>
                      {activeMediaTab === 'media' && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                          {activeMediaList.map((m) => (
                            <div
                              key={m.id}
                              onClick={() => setLightboxMedia(m.attachment)}
                              className="relative rounded-lg overflow-hidden bg-white/5 border border-white/10 aspect-square group cursor-pointer hover:border-accent/50 transition-all"
                            >
                              {m.attachment.type === 'image' ? (
                                <img src={m.attachment.url} alt="Shared photo" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                              ) : (
                                <div className="relative w-full h-full bg-black">
                                  <video src={m.attachment.url} className="w-full h-full object-cover opacity-80" />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors">
                                    <div className="w-9 h-9 rounded-full bg-accent text-white flex items-center justify-center shadow-lg">
                                      <Play size={16} fill="white" className="ml-0.5" />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {activeMediaTab === 'links' && (
                        <div className="space-y-2.5">
                          {activeMediaList.map((m) => (
                            <div key={m.id} className="p-3 rounded-lg bg-white/5 border border-white/10 flex items-center gap-3 hover:bg-white/10 transition-colors">
                              <LinkIcon className="text-blue-400 flex-shrink-0" size={20} />
                              <div className="min-w-0 flex-1">
                                <p className="font-sans text-sm font-semibold truncate text-white">
                                  {m.text}
                                </p>
                                <p className="font-mono text-xs text-text-tertiary">Web Link</p>
                              </div>
                              {m.text && (
                                <a
                                  href={m.text.match(/(https?:\/\/[^\s]+)/g)?.[0]}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded bg-accent/20 text-accent hover:bg-accent/30 transition-colors"
                                >
                                  <ExternalLink size={16} />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {activeMediaTab === 'docs' && (
                        <div className="space-y-2.5">
                          {activeMediaList.map((m) => (
                            <div key={m.id} className="p-3 rounded-lg bg-white/5 border border-white/10 flex items-center gap-3 hover:bg-white/10 transition-colors">
                              {m.attachment?.type === 'file' ? (
                                <FileText className="text-emerald-400 flex-shrink-0" size={22} />
                              ) : (
                                <Music className="text-purple-400 flex-shrink-0" size={22} />
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="font-sans text-sm font-semibold truncate text-white">
                                  {m.attachment.name}
                                </p>
                                <p className="font-mono text-xs text-text-tertiary">
                                  {m.attachment.size || 'Document'}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Summary Count Text */}
                <div className="mt-8 text-center font-sans text-base font-bold text-white">
                  {activeMediaList.length} {activeMediaTab === 'media' ? (activeMediaList.length === 1 ? 'Photo' : 'Photos') : activeMediaTab === 'links' ? (activeMediaList.length === 1 ? 'Link' : 'Links') : (activeMediaList.length === 1 ? 'Doc' : 'Docs')}
                </div>
              </div>

              {/* Bottom Footer Bar */}
              <div className="px-6 py-3.5 border-t border-white/10 bg-[#1c1c1c] flex items-center justify-end flex-shrink-0">
                <button
                  onClick={() => setShowMediaModal(false)}
                  className="px-6 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white font-sans font-bold text-sm transition-colors cursor-pointer shadow-md"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media Lightbox Video Player / Photo Viewer */}
      <AnimatePresence>
        {lightboxMedia && (
          <MediaLightbox
            media={lightboxMedia}
            onClose={() => setLightboxMedia(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
