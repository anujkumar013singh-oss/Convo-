import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatMessageTime } from '../../lib/utils';
import { Check, CheckCheck, Copy, Trash2, FileText, Download, Play, Pause, Mic, Reply, Send, Pin, Eye, Loader2 } from 'lucide-react';
import { useState, useRef } from 'react';
import { toast } from 'sonner';
import useChatStore from '../../store/chatStore';
import useUiStore from '../../store/uiStore';
import Avatar from '../common/Avatar';
import MediaLightbox from './MediaLightbox';
import PdfViewerModal from './PdfViewerModal';

export default function MessageBubble({
  message,
  isOwn,
  isRecipientOnline,
  showTimestamp = true,
  isFirstInGroup,
  onReply,
  onForward,
  isPinned,
  isHighlighted,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [lightboxMedia, setLightboxMedia] = useState(null);
  const [pdfViewerDoc, setPdfViewerDoc] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(() => {
    const key = message.attachment?.url || message.id;
    if (!key) return false;
    try {
      const list = JSON.parse(localStorage.getItem('convo-downloaded-files') || '[]');
      return list.includes(key);
    } catch {
      return false;
    }
  });
  const bubbleRef = useRef(null);

  const handleDownloadWithAnimation = async (url, name, fileKey) => {
    if (isDownloading) return;
    setIsDownloading(true);
    toast.info(`Downloading ${name || 'document'}...`);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = name || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      // Persist downloaded status in localStorage
      if (fileKey) {
        try {
          const list = JSON.parse(localStorage.getItem('convo-downloaded-files') || '[]');
          if (!list.includes(fileKey)) {
            list.push(fileKey);
            localStorage.setItem('convo-downloaded-files', JSON.stringify(list));
          }
        } catch {}
      }

      setIsDownloaded(true);
      toast.success('Downloaded to system!');
    } catch {
      const link = document.createElement('a');
      link.href = url;
      link.download = name || 'document.pdf';
      link.target = '_blank';
      link.click();
      setIsDownloaded(true);
    } finally {
      setIsDownloading(false);
    }
  };

  const deleteMessage = useChatStore((s) => s.deleteMessage);
  const togglePinMessage = useChatStore((s) => s.togglePinMessage);
  const nicknames = useChatStore((s) => s.nicknames);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  const startNewConversation = useChatStore((s) => s.startNewConversation);
  const openProfileSheet = useUiStore((s) => s.openProfileSheet);

  const handleOpenSharedProfile = async (e) => {
    e?.stopPropagation();
    const contactUser = message.attachment?.user;
    if (!contactUser) return;
    const targetId = contactUser.id || contactUser._id;
    if (!targetId) return;

    toast.info(`Opening chat with @${contactUser.username}...`);

    // 1. Start or open 1:1 conversation with target user
    await startNewConversation(targetId);

    // 2. Open full profile sheet (email, bio, phone, links)
    openProfileSheet({
      id: targetId,
      _id: targetId,
      username: contactUser.username,
      fullName: contactUser.fullName || contactUser.username,
      avatarUrl: contactUser.avatarUrl || '',
      isOnline: Boolean(contactUser.isOnline),
      lastSeenAt: contactUser.lastSeenAt,
    });
  };

  // Audio Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [currentTimeStr, setCurrentTimeStr] = useState('0:00');
  const audioRef = useRef(null);

  const isMediaOnly = message.attachment && 
    (message.attachment.type === 'image' || message.attachment.type === 'video' || message.attachment.type === 'contact' || message.attachment.type === 'audio') && 
    !message.text && 
    !message.replyTo;

  const handleContextMenu = (e) => {
    e.preventDefault();
    const rect = bubbleRef.current?.getBoundingClientRect();
    setMenuPos({
      x: e.clientX - (rect?.left || 0),
      y: e.clientY - (rect?.top || 0),
    });
    setShowMenu(true);
  };

  const handleCopy = () => {
    if (message.text) {
      navigator.clipboard.writeText(message.text);
    }
    setShowMenu(false);
  };

  const handleDelete = () => {
    if (message.conversationId && message.id && isOwn) {
      deleteMessage(message.conversationId, message.id);
    }
    setShowMenu(false);
  };

  const handlePin = () => {
    if (message.conversationId && message.id) {
      togglePinMessage(message.conversationId, message.id);
    }
    setShowMenu(false);
  };

  const handleReplyAction = () => {
    if (onReply) onReply(message);
    setShowMenu(false);
  };

  const handleForwardAction = () => {
    if (onForward) onForward(message);
    setShowMenu(false);
  };

  // Audio playback event handlers
  const togglePlayAudio = (e) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleAudioTimeUpdate = () => {
    if (!audioRef.current) return;
    const cur = audioRef.current.currentTime;
    const dur = audioRef.current.duration || 1;
    setAudioProgress((cur / dur) * 100);

    const mins = Math.floor(cur / 60);
    const secs = Math.floor(cur % 60);
    setCurrentTimeStr(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setAudioProgress(0);
    setCurrentTimeStr('0:00');
  };

  // Read receipt ticks — WhatsApp-style: ✓ sent, ✓✓ delivered, ✓✓ blue read
  const StatusIcon = () => {
    if (!isOwn || isMediaOnly) return null;
    const status = message.status || 'sent';
    if (status === 'read') {
      return <CheckCheck size={14} className="text-[#53bdeb]" />; // Blue double tick
    }
    if (status === 'delivered') {
      return <CheckCheck size={14} className="text-white/70" />; // Grey double tick
    }
    // 'sent' = single tick
    return <Check size={14} className="text-white/70" />;
  };

  return (
    <>
      <motion.div
        id={`msg-${message.id}`}
        initial={isFirstInGroup ? { opacity: 0, y: 4 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
        className={cn('flex relative', isOwn ? 'justify-end' : 'justify-start')}
      >
        <div
          ref={bubbleRef}
          onContextMenu={handleContextMenu}
          onClick={() => showMenu && setShowMenu(false)}
          className={cn(
            'relative max-w-[85%] sm:max-w-[70%] md:max-w-[55%] select-text cursor-default group transition-all duration-300',
            isHighlighted && 'ring-2 ring-accent/60 shadow-2xl scale-[1.02]',
            isMediaOnly
              ? 'bg-transparent p-0 shadow-none border-none rounded-2xl overflow-hidden'
              : cn(
                  'px-[12px] py-[7px] shadow-bubble',
                  isOwn
                    ? 'bg-bubble-out text-white bubble-out'
                    : 'bg-bubble-in text-text-primary bubble-in'
                )
          )}
        >
          {/* Pinned Indicator Badge */}
          {isPinned && (
            <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center shadow-md z-10">
              <Pin size={11} fill="white" />
            </div>
          )}

          {/* Reply Context Header in Bubble */}
          {message.replyTo && (
            <div className="mb-2 p-2 rounded-lg bg-black/30 border-l-4 border-l-accent text-xs font-sans shadow-inner">
              <p className="font-bold text-accent">
                {message.replyTo.senderId === 'user-self' ? 'You' : 'Replying to message'}
              </p>
              <p className="truncate opacity-90 text-white font-semibold">{message.replyTo.text || 'Attachment'}</p>
            </div>
          )}

          {/* Media, Audio & Contact Attachments */}
          {message.attachment && (
            <div className={cn(isMediaOnly ? 'm-0 rounded-2xl overflow-hidden' : 'mb-1.5 overflow-hidden rounded-md')}>
              {message.attachment.type === 'image' && (
                <div
                  className="relative cursor-pointer group/img"
                  onClick={() => !message.attachment.url?.startsWith('blob:') || document.querySelector(`#img-${message.id}`)?.naturalWidth > 0 ? setLightboxMedia(message.attachment) : null}
                >
                  <img
                    id={`img-${message.id}`}
                    src={message.attachment.url}
                    alt={message.attachment.name || 'Photo attachment'}
                    className="max-h-72 w-full object-cover rounded-2xl group-hover/img:brightness-95 transition-all shadow-md"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = '<div class="flex items-center justify-center w-full h-32 rounded-2xl bg-white/5 border border-white/10 text-text-tertiary text-xs font-sans font-semibold">⚠ Image unavailable</div>';
                    }}
                  />
                </div>
              )}

              {message.attachment.type === 'video' && (
                <div
                  onClick={() => message.attachment.url && !message.attachment.url.startsWith('blob:') ? setLightboxMedia(message.attachment) : null}
                  className="relative rounded-2xl overflow-hidden bg-black max-h-72 w-full cursor-pointer group/vid shadow-md"
                >
                  {message.attachment.url && !message.attachment.url.startsWith('blob:') ? (
                    <video src={message.attachment.url} className="w-full max-h-72 object-cover opacity-85 group-hover/vid:opacity-95 transition-opacity" />
                  ) : (
                    <div className="flex items-center justify-center w-full h-32 text-text-tertiary text-xs font-sans font-semibold">⚠ Video unavailable</div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="w-12 h-12 rounded-full bg-accent text-white flex items-center justify-center shadow-xl">
                      <Play size={22} fill="white" className="ml-0.5" />
                    </div>
                  </div>
                </div>
              )}

              {message.attachment.type === 'file' && (
                <div
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer group/doc shadow-sm min-w-[220px]',
                    isOwn ? 'bg-white/15 border-white/20 hover:bg-white/25' : 'bg-[#1c1c20] border-white/10 hover:bg-white/10'
                  )}
                  onClick={() => window.open(message.attachment.url, '_blank')}
                  title="Click to open PDF in new tab"
                >
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center flex-shrink-0 font-extrabold text-xs">
                    PDF
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold truncate text-white">{message.attachment.name || 'Document.pdf'}</p>
                    <p className="text-xs text-text-tertiary font-medium">{message.attachment.size || 'PDF Document'}</p>
                  </div>
                  <div className="flex items-center flex-shrink-0">
                    <button
                      type="button"
                      disabled={isDownloading}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadWithAnimation(
                          message.attachment.url,
                          message.attachment.name,
                          message.attachment?.url || message.id
                        );
                      }}
                      className={cn(
                        'p-2.5 rounded-xl transition-all cursor-pointer shadow-md active:scale-95 flex items-center justify-center min-w-[36px] min-h-[36px]',
                        isDownloaded
                          ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                          : 'bg-accent hover:bg-accent-hover text-white'
                      )}
                      title={isDownloaded ? 'Downloaded to system' : isDownloading ? 'Downloading file...' : 'Download PDF to system'}
                    >
                      {isDownloading ? (
                        <Loader2 size={16} className="animate-spin text-white" />
                      ) : isDownloaded ? (
                        <motion.div
                          initial={{ scale: 0, rotate: -45 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                        >
                          <Check size={16} className="text-emerald-400 stroke-[3]" />
                        </motion.div>
                      ) : (
                        <Download size={16} />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Real Audio Voice Message Player (Transparent Outer Message Bubble Wrapper) */}
              {message.attachment.type === 'audio' && (
                <div className="flex items-center gap-3 p-3 rounded-2xl border border-white/10 bg-[#212121]/95 backdrop-blur-md shadow-xl min-w-[220px]">
                  {message.attachment.url && (
                    <audio
                      ref={audioRef}
                      src={message.attachment.url}
                      onTimeUpdate={handleAudioTimeUpdate}
                      onEnded={handleAudioEnded}
                      preload="metadata"
                    />
                  )}
                  <button
                    type="button"
                    onClick={togglePlayAudio}
                    className="w-9 h-9 rounded-full bg-accent text-white flex items-center justify-center flex-shrink-0 hover:scale-105 transition-transform cursor-pointer shadow-md"
                  >
                    {isPlaying ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" className="ml-0.5" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="h-1.5 bg-white/20 rounded-full overflow-hidden mb-1.5">
                      <div
                        className="h-full bg-accent transition-all duration-100 rounded-full"
                        style={{ width: `${audioProgress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-white/80">
                      <span>{isPlaying ? currentTimeStr : (message.attachment.duration || '0:14')}</span>
                      <span className="flex items-center gap-1 font-sans text-accent font-bold">
                        <Mic size={11} /> Voice
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Transparent Wrapper WhatsApp-Style Rich Contact Card Attachment */}
              {message.attachment.type === 'contact' && message.attachment.user && (
                <div
                  className="p-3.5 rounded-2xl border border-white/15 bg-[#1c1c20]/95 backdrop-blur-md flex flex-col gap-3 min-w-[240px] shadow-2xl cursor-pointer hover:bg-white/10 transition-all group/card"
                  onClick={handleOpenSharedProfile}
                  title={`Click to open @${message.attachment.user.username}'s profile & chat`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={message.attachment.user.avatarUrl}
                      alt={message.attachment.user.username}
                      size="lg"
                      isOnline={message.attachment.user.isOnline}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="px-2 py-0.5 rounded-full bg-accent/20 border border-accent/30 text-accent font-sans text-[10px] font-extrabold uppercase tracking-wider">
                          Shared Contact
                        </span>
                      </div>
                      <p className="font-sans text-sm sm:text-base font-extrabold text-white truncate group-hover/card:text-accent transition-colors">
                        {message.attachment.user.fullName || message.attachment.user.username}
                      </p>
                      <p className="font-sans text-xs text-text-tertiary truncate font-semibold">
                        @{message.attachment.user.username}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenSharedProfile}
                    className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-sans text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-accent/25 active:scale-95"
                  >
                    <Send size={14} />
                    <span>Message @{message.attachment.user.username}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Message text */}
          {message.text && (
            <p className="font-sans text-[16px] sm:text-[17px] font-semibold leading-[23px] whitespace-pre-wrap break-words">
              {message.text}
            </p>
          )}

          {/* Timestamp + Status Ticks */}
          {showTimestamp && !isMediaOnly && (
            <div className={cn(
              'flex items-center gap-1 mt-1 justify-end font-mono text-xs',
              isOwn ? 'text-white/70' : 'text-text-tertiary'
            )}>
              <span className="text-[11px] leading-none">
                {formatMessageTime(message.createdAt)}
              </span>
              <StatusIcon />
            </div>
          )}

          {/* Context menu: Reply, Forward, Pin, Copy, Delete */}
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              />
              <div
                className="absolute z-50 bg-[#212121] border border-white/10 rounded-xl shadow-2xl py-1 min-w-[145px]"
                style={{ top: menuPos.y, left: menuPos.x }}
              >
                <button
                  onClick={handleReplyAction}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2 text-sm text-text-primary hover:bg-white/10 transition-colors font-sans font-semibold cursor-pointer"
                >
                  <Reply size={15} className="text-accent" />
                  Reply
                </button>

                <button
                  onClick={handleForwardAction}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2 text-sm text-text-primary hover:bg-white/10 transition-colors font-sans font-semibold cursor-pointer"
                >
                  <Send size={15} className="text-blue-400" />
                  Forward
                </button>

                <button
                  onClick={handlePin}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2 text-sm text-text-primary hover:bg-white/10 transition-colors font-sans font-semibold cursor-pointer"
                >
                  <Pin size={15} className="text-amber-400" />
                  {isPinned ? 'Unpin' : 'Pin'}
                </button>

                {!isMediaOnly && (
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2 text-sm text-text-primary hover:bg-white/10 transition-colors font-sans font-semibold cursor-pointer"
                  >
                    <Copy size={15} className="text-text-secondary" />
                    Copy
                  </button>
                )}

                {/* Delete option ONLY for own messages */}
                {isOwn && (
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2 text-sm text-accent-strong hover:bg-white/10 transition-colors font-sans font-semibold cursor-pointer"
                  >
                    <Trash2 size={15} />
                    Delete
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* Media Lightbox Video Player / Photo Viewer */}
      <AnimatePresence>
        {lightboxMedia && (
          <MediaLightbox
            media={lightboxMedia}
            onClose={() => setLightboxMedia(null)}
          />
        )}
        {pdfViewerDoc && (
          <PdfViewerModal
            pdf={pdfViewerDoc}
            onClose={() => setPdfViewerDoc(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
