import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile, Paperclip, Send, Mic, Square, Image as ImageIcon, Video, FileText, UserCheck, X, Keyboard, Reply, Loader2 } from 'lucide-react';
import { cn, generateId } from '../../lib/utils';
import EmojiPicker from './EmojiPicker';
import ShareContactModal from './ShareContactModal';
import api from '../../services/api';

export default function Composer({ conversationId, recipientId, replyingTo, onCancelReply, onSendMessage, onTyping }) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showShareContactModal, setShowShareContactModal] = useState(false);
  const [attachment, setAttachment] = useState(null); // { type, name, size, url, file? }
  const [isUploading, setIsUploading] = useState(false);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const hasContent = text.trim().length > 0 || attachment !== null;

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = '0';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
  }, [text]);

  const handleChange = (e) => {
    const val = e.target.value;
    setText(val);

    if (onTyping) {
      onTyping(conversationId, true);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(conversationId, false);
      }, 2000);
    }
  };

  const handleSend = useCallback(async () => {
    if ((!text.trim() && !attachment) || isUploading) return;

    if (onTyping) {
      clearTimeout(typingTimeoutRef.current);
      onTyping(conversationId, false);
    }

    let finalAttachment = null;

    if (attachment) {
      // If the attachment has a raw File object, upload it first
      if (attachment.file) {
        setIsUploading(true);
        try {
          const uploaded = await api.uploadFile(attachment.file);
          finalAttachment = {
            type: uploaded.type || attachment.type,
            name: uploaded.name || attachment.name,
            size: uploaded.size || attachment.size,
            url: uploaded.url, // Cloudinary URL — accessible by everyone
            duration: attachment.duration || undefined,
          };
        } catch (err) {
          console.error('File upload failed:', err);
          setIsUploading(false);
          return; // Don't send the message if upload failed
        }
        setIsUploading(false);
      } else {
        // Contact cards or other non-file attachments pass through as-is
        finalAttachment = { ...attachment };
        delete finalAttachment.file;
      }
    }

    const tempId = 'temp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const message = {
      id: tempId,
      tempId,
      conversationId,
      senderId: 'user-self',
      recipientId,
      text: text.trim(),
      attachment: finalAttachment,
      replyTo: replyingTo ? { id: replyingTo.id, text: replyingTo.text || replyingTo.attachment?.name || 'Attachment', senderId: replyingTo.senderId } : null,
      createdAt: new Date().toISOString(),
      status: 'sent',
    };

    onSendMessage(message);
    setText('');
    setAttachment(null);
    setShowAttachMenu(false);
    setShowEmoji(false);
    if (onCancelReply) onCancelReply();

    setTimeout(() => textareaRef.current?.focus(), 0);
  }, [text, attachment, replyingTo, conversationId, recipientId, onSendMessage, onCancelReply, onTyping, isUploading]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = (emoji) => {
    setText((prev) => prev + emoji);
    textareaRef.current?.focus();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const type = file.type.startsWith('image/')
      ? 'image'
      : file.type.startsWith('video/')
      ? 'video'
      : 'file';

    // Create blob URL for LOCAL preview only (sender sees it instantly)
    const previewUrl = URL.createObjectURL(file);

    setAttachment({
      type,
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`,
      url: previewUrl, // Local preview only
      file, // Raw File object — will be uploaded to Cloudinary on send
    });

    setShowAttachMenu(false);
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  // Audio Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const mins = Math.floor(recordingSeconds / 60);
        const secs = Math.floor(recordingSeconds % 60);
        const durStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

        // Create a File object from the blob for uploading
        const audioFile = new File([audioBlob], `voice-message-${Date.now()}.webm`, { type: 'audio/webm' });

        setAttachment({
          type: 'audio',
          name: 'Voice message',
          duration: durStr || '0:05',
          url: audioUrl,
          file: audioFile, // Will be uploaded to Cloudinary on send
        });

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch {
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      const mins = Math.floor(recordingSeconds / 60);
      const secs = Math.floor(recordingSeconds % 60);
      setAttachment({
        type: 'audio',
        name: 'Voice message',
        duration: `${mins}:${secs < 10 ? '0' : ''}${secs}`,
        url: '',
      });
    }
  };

  const cancelRecording = () => {
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    audioChunksRef.current = [];
  };

  const formatSecs = (totalSecs) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="flex-shrink-0 px-3 pb-3 pt-1 w-full">
      {/* Centered Composer Layout Box */}
      <div className="max-w-[760px] mx-auto w-full relative">

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          aria-label="Upload file"
        />

        {/* Replying To Preview Banner */}
        {replyingTo && (
          <div className="mb-2 p-2.5 rounded-xl bg-[#212121] border-l-4 border-l-accent border border-white/10 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2.5 min-w-0">
              <Reply size={16} className="text-accent flex-shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="font-sans text-xs font-bold text-accent">
                  Replying to {replyingTo.senderId === 'user-self' ? 'Yourself' : 'Message'}
                </span>
                <span className="font-sans text-xs text-text-tertiary truncate">
                  {replyingTo.text || replyingTo.attachment?.name || 'Attachment'}
                </span>
              </div>
            </div>
            <button
              onClick={onCancelReply}
              className="p-1 rounded-full hover:bg-white/10 text-text-tertiary hover:text-white transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Draft Attachment Preview Banner */}
        {attachment && (
          <div className="mb-2 p-2.5 rounded-lg bg-[#212121] border border-white/10 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3 min-w-0">
              {attachment.type === 'image' && (
                <img src={attachment.url} alt="Preview" className="w-10 h-10 rounded object-cover flex-shrink-0 border border-white/10" />
              )}
              {attachment.type === 'video' && <Video className="text-accent flex-shrink-0" size={20} />}
              {attachment.type === 'file' && <FileText className="text-accent flex-shrink-0" size={20} />}
              {attachment.type === 'audio' && <Mic className="text-accent flex-shrink-0" size={20} />}
              <div className="min-w-0">
                <p className="font-sans text-xs font-semibold text-text-primary truncate">{attachment.name}</p>
                <p className="font-mono text-[11px] text-text-tertiary">{attachment.type.toUpperCase()} {attachment.duration ? `• ${attachment.duration}` : ''}</p>
              </div>
            </div>
            <button
              onClick={() => setAttachment(null)}
              className="p-1 rounded-full hover:bg-bg-active text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Upload Progress Banner */}
        {isUploading && (
          <div className="mb-2 p-2.5 rounded-lg bg-accent/10 border border-accent/30 flex items-center gap-2.5 shadow-lg">
            <Loader2 size={16} className="text-accent animate-spin flex-shrink-0" />
            <span className="font-sans text-xs font-bold text-accent">Uploading file...</span>
          </div>
        )}

        {/* Voice Recording Status Banner */}
        {isRecording && (
          <div className="mb-2 p-2.5 rounded-lg bg-accent-strong/15 border border-accent-strong/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-accent-strong animate-ping" />
              <span className="font-mono text-xs font-bold text-accent-strong">Recording... {formatSecs(recordingSeconds)}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={cancelRecording}
                className="text-xs font-sans font-medium text-text-tertiary hover:text-text-primary px-2 py-1 rounded hover:bg-bg-hover"
              >
                Cancel
              </button>
              <button
                onClick={stopRecording}
                className="px-3 py-1 rounded bg-accent text-white font-sans font-semibold text-xs flex items-center gap-1 cursor-pointer"
              >
                <Square size={12} fill="white" /> Finish
              </button>
            </div>
          </div>
        )}

        {/* Input Bar — Matching Telegram Web Pill Layout */}
        <div className="flex items-center gap-2">
          {/* Main Floating Pill Container */}
          <div className="flex-1 min-w-0 flex items-center bg-[#212121] rounded-full px-3 py-1.5 border border-white/10 shadow-xl relative">
            
            {/* Attachment Button (Paperclip) on Far Left inside Pill */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => {
                  setShowAttachMenu(!showAttachMenu);
                  setShowEmoji(false);
                }}
                className={cn(
                  'p-2 rounded-full transition-colors focus-ring cursor-pointer',
                  showAttachMenu
                    ? 'text-accent bg-accent/15'
                    : 'text-text-tertiary hover:text-text-primary'
                )}
                aria-label="Attach media or file"
              >
                <Paperclip size={20} className="-rotate-45" />
              </button>

              {/* Attachment Popup Menu */}
              <AnimatePresence>
                {showAttachMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full left-0 mb-3 z-40 bg-[#212121] border border-white/10 rounded-xl shadow-2xl p-1.5 min-w-[190px]"
                  >
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-white/10 text-xs font-sans font-semibold text-text-primary transition-colors cursor-pointer"
                      >
                        <ImageIcon size={18} className="text-accent" />
                        Photo & Media
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-white/10 text-xs font-sans font-semibold text-text-primary transition-colors cursor-pointer"
                      >
                        <Video size={18} className="text-blue-400" />
                        Video File
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-white/10 text-xs font-sans font-semibold text-text-primary transition-colors cursor-pointer"
                      >
                        <FileText size={18} className="text-emerald-400" />
                        Document File
                      </button>
                      <button
                        onClick={() => {
                          setShowAttachMenu(false);
                          setShowShareContactModal(true);
                        }}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-white/10 text-xs font-sans font-semibold text-text-primary transition-colors cursor-pointer"
                      >
                        <UserCheck size={18} className="text-amber-400" />
                        Share Profile
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Input Textarea Area */}
            <div className="flex-1 min-w-0 px-2 py-1">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder="Message"
                rows={1}
                className="composer-textarea font-sans text-[16px] sm:text-[17px] font-semibold leading-[22px] bg-transparent outline-none border-none focus:outline-none focus:ring-0 shadow-none text-white placeholder-text-tertiary"
                style={{ outline: 'none', boxShadow: 'none' }}
                aria-label="Message input"
              />
            </div>

            {/* Emoji Button (Smile) on Right inside Pill */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => {
                  setShowEmoji(!showEmoji);
                  setShowAttachMenu(false);
                }}
                className="p-2 rounded-full text-text-tertiary hover:text-text-primary transition-colors focus-ring cursor-pointer"
                aria-label={showEmoji ? 'Show keyboard' : 'Show emoji picker'}
              >
                {showEmoji ? <Keyboard size={20} className="text-accent" /> : <Smile size={20} />}
              </button>

              <AnimatePresence>
                {showEmoji && (
                  <EmojiPicker
                    onSelect={handleEmojiSelect}
                    onClose={() => setShowEmoji(false)}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Purple Circular Action Button (Mic / Send) on Far Right outside Pill */}
          <button
            onClick={hasContent ? handleSend : (isRecording ? stopRecording : startRecording)}
            disabled={isUploading}
            className={cn(
              'w-11 h-11 rounded-full bg-accent hover:bg-accent-hover text-white flex items-center justify-center shadow-lg flex-shrink-0 cursor-pointer transition-transform hover:scale-105',
              isUploading && 'opacity-60 cursor-not-allowed hover:scale-100'
            )}
            aria-label={hasContent ? 'Send message' : 'Record voice message'}
          >
            <AnimatePresence mode="wait" initial={false}>
              {isUploading ? (
                <motion.div
                  key="uploading"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Loader2 size={18} className="animate-spin" />
                </motion.div>
              ) : hasContent ? (
                <motion.div
                  key="send"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Send size={18} className="ml-0.5" />
                </motion.div>
              ) : isRecording ? (
                <motion.div
                  key="stop"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Square size={16} fill="white" />
                </motion.div>
              ) : (
                <motion.div
                  key="mic"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Mic size={20} />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Share Contact Profile Modal */}
      <AnimatePresence>
        {showShareContactModal && (
          <ShareContactModal
            conversationId={conversationId}
            recipientId={recipientId}
            onSendMessage={onSendMessage}
            onClose={() => setShowShareContactModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
