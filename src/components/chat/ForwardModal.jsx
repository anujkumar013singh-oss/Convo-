import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Send, Check, Search } from 'lucide-react';
import useChatStore from '../../store/chatStore';
import Avatar from '../common/Avatar';
import { generateId } from '../../lib/utils';
import { toast } from 'sonner';

export default function ForwardModal({ messageToForward, onClose }) {
  const conversations = useChatStore((s) => s.conversations);
  const addMessage = useChatStore((s) => s.addMessage);
  const nicknames = useChatStore((s) => s.nicknames);

  const [selectedConvoIds, setSelectedConvoIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSending, setIsSending] = useState(false);

  if (!messageToForward) return null;

  // Filter conversations by search query
  const filteredConversations = conversations.filter((c) => {
    const nickname = nicknames[c.participant.id];
    const name = nickname || c.participant.username;
    const q = searchQuery.toLowerCase().trim();
    return name.toLowerCase().includes(q) || c.participant.username.toLowerCase().includes(q);
  });

  const toggleSelectConvo = (convoId) => {
    setSelectedConvoIds((prev) =>
      prev.includes(convoId) ? prev.filter((id) => id !== convoId) : [...prev, convoId]
    );
  };

  const selectAll = () => {
    if (selectedConvoIds.length === filteredConversations.length) {
      setSelectedConvoIds([]);
    } else {
      setSelectedConvoIds(filteredConversations.map((c) => c.id));
    }
  };

  const handleSendBulkForward = () => {
    if (selectedConvoIds.length === 0) return;

    setIsSending(true);

    selectedConvoIds.forEach((convoId) => {
      const convo = conversations.find((c) => c.id === convoId);
      if (!convo) return;

      const forwardedMsg = {
        id: generateId(),
        conversationId: convoId,
        senderId: 'user-self',
        recipientId: convo.participant.id,
        text: messageToForward.text || '',
        attachment: messageToForward.attachment ? { ...messageToForward.attachment } : null,
        createdAt: new Date().toISOString(),
        status: 'sent',
        isForwarded: true,
      };

      addMessage(forwardedMsg);
    });

    toast.success(
      `Message forwarded to ${selectedConvoIds.length} ${selectedConvoIds.length === 1 ? 'chat' : 'chats'}!`
    );

    setTimeout(() => {
      onClose();
    }, 400);
  };

  const selectedCount = selectedConvoIds.length;

  // Get selected names/nicknames for dynamic button label
  const getSendButtonText = () => {
    if (isSending) return 'Sending...';
    if (selectedConvoIds.length === 0) return 'Select chats to send';

    const selectedNames = selectedConvoIds
      .map((id) => {
        const convo = conversations.find((c) => c.id === id);
        if (!convo) return null;
        const nickname = nicknames[convo.participant.id];
        return nickname || convo.participant.username;
      })
      .filter(Boolean);

    if (selectedNames.length === 1) {
      return `Send to ${selectedNames[0]}`;
    }
    if (selectedNames.length === 2) {
      return `Send to ${selectedNames[0]} & ${selectedNames[1]}`;
    }
    return `Send to ${selectedNames[0]}, ${selectedNames[1]} & ${selectedNames.length - 2} more`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 8 }}
        transition={{ duration: 0.2 }}
        className="bg-[#18181a] rounded-[24px] border border-white/10 w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#18181a]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center">
              <Send size={16} />
            </div>
            <div>
              <h3 className="font-sans text-base font-bold text-white">Forward Message</h3>
              <p className="font-sans text-xs text-text-tertiary">Select one or multiple chats</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-text-tertiary hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="p-4 pb-2 border-b border-white/5 bg-[#18181a]">
          <div className="relative flex items-center">
            <Search size={16} className="absolute left-3 text-text-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users or chats..."
              className="w-full bg-[#242426] text-white placeholder-text-tertiary rounded-xl pl-9 pr-4 py-2.5 font-sans text-xs font-semibold outline-none border border-white/10 focus:border-accent"
            />
          </div>

          <div className="flex items-center justify-between mt-2.5 px-1">
            <span className="font-sans text-xs font-bold text-text-tertiary">
              {selectedCount > 0 ? `${selectedCount} selected` : 'Select recipients'}
            </span>
            <button
              onClick={selectAll}
              className="font-sans text-xs font-bold text-accent hover:underline cursor-pointer"
            >
              {selectedCount === filteredConversations.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>
        </div>

        {/* Message Content Preview */}
        <div className="px-4 py-2.5 mx-4 mt-3 rounded-xl bg-white/5 border border-white/10 text-xs font-sans text-text-secondary flex items-center gap-2">
          <span className="font-bold text-accent flex-shrink-0">Forwarding:</span>
          <span className="truncate text-white">
            {messageToForward.text || messageToForward.attachment?.name || 'Attachment'}
          </span>
        </div>

        {/* Contact Selection List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
          {filteredConversations.length === 0 ? (
            <div className="py-8 text-center text-text-tertiary font-sans text-xs">
              No contacts found matching "{searchQuery}"
            </div>
          ) : (
            filteredConversations.map((c) => {
              const nickname = nicknames[c.participant.id];
              const name = nickname || c.participant.username;
              const isSelected = selectedConvoIds.includes(c.id);

              return (
                <div
                  key={c.id}
                  onClick={() => toggleSelectConvo(c.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl transition-colors cursor-pointer border ${
                    isSelected
                      ? 'bg-accent/15 border-accent/40'
                      : 'hover:bg-white/5 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      src={c.participant.avatarUrl}
                      alt={name}
                      size="md"
                      isOnline={c.participant.isOnline}
                    />
                    <div className="min-w-0">
                      <p className="font-sans text-sm font-bold text-white truncate">{name}</p>
                      <p className="font-sans text-xs text-text-tertiary truncate">@{c.participant.username}</p>
                    </div>
                  </div>

                  {/* Circular Checkbox Selector */}
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all border ${
                      isSelected
                        ? 'bg-accent border-accent text-white scale-110 shadow-md'
                        : 'border-white/30 text-transparent'
                    }`}
                  >
                    <Check size={14} strokeWidth={3} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Floating Action Bar & Send Button */}
        <div className="p-4 border-t border-white/10 bg-[#18181a] flex-shrink-0">
          <button
            onClick={handleSendBulkForward}
            disabled={selectedCount === 0 || isSending}
            className="w-full h-[52px] rounded-full bg-accent text-white font-sans font-extrabold text-[15px] flex items-center justify-center gap-2 shadow-xl hover:bg-accent-hover transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer truncate px-4"
          >
            <Send size={18} className="flex-shrink-0" />
            <span className="truncate">{getSendButtonText()}</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
