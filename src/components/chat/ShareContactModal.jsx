import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Search, UserCheck, Send } from 'lucide-react';
import useChatStore from '../../store/chatStore';
import Avatar from '../common/Avatar';
import { generateId } from '../../lib/utils';
import { toast } from 'sonner';

export default function ShareContactModal({ conversationId, recipientId, onSendMessage, onClose }) {
  const conversations = useChatStore((s) => s.conversations);
  const nicknames = useChatStore((s) => s.nicknames);

  const [selectedConvoId, setSelectedConvoId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter contacts by search query
  const filteredContacts = conversations.filter((c) => {
    const nickname = nicknames[c.participant.id];
    const name = nickname || c.participant.username;
    const q = searchQuery.toLowerCase().trim();
    return name.toLowerCase().includes(q) || c.participant.username.toLowerCase().includes(q);
  });

  const handleShareContact = (convo) => {
    const contactUser = convo.participant;

    const contactMsg = {
      id: generateId(),
      conversationId,
      senderId: 'user-self',
      recipientId,
      text: '',
      attachment: {
        type: 'contact',
        user: {
          id: contactUser.id || contactUser._id,
          username: contactUser.username,
          fullName: contactUser.fullName || contactUser.username,
          avatarUrl: contactUser.avatarUrl,
          isOnline: contactUser.isOnline,
          lastSeenAt: contactUser.lastSeenAt,
          convoId: convo.id,
        },
      },
      createdAt: new Date().toISOString(),
      status: 'sent',
    };

    onSendMessage(contactMsg);
    toast.success(`Shared ${contactUser.username}'s contact profile!`);
    onClose();
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
              <UserCheck size={18} />
            </div>
            <div>
              <h3 className="font-sans text-base font-bold text-white">Share Contact Profile</h3>
              <p className="font-sans text-xs text-text-tertiary">Select a friend's profile to send</p>
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
              placeholder="Search contact profile..."
              className="w-full bg-[#242426] text-white placeholder-text-tertiary rounded-xl pl-9 pr-4 py-2.5 font-sans text-xs font-semibold outline-none border border-white/10 focus:border-accent"
            />
          </div>
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
          {filteredContacts.length === 0 ? (
            <div className="py-8 text-center text-text-tertiary font-sans text-xs">
              No contacts found matching "{searchQuery}"
            </div>
          ) : (
            filteredContacts.map((c) => {
              const nickname = nicknames[c.participant.id];
              const name = nickname || c.participant.username;

              return (
                <div
                  key={c.id}
                  onClick={() => handleShareContact(c)}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/10 transition-colors cursor-pointer border border-transparent hover:border-white/10"
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

                  <div className="px-3.5 py-1.5 rounded-xl bg-accent text-white font-sans text-xs font-bold hover:bg-accent-hover transition-colors flex items-center gap-1">
                    <Send size={12} /> Send Profile
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
