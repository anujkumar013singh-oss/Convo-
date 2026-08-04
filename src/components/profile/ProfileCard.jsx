import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Mail,
  Phone,
  FileText,
  Link as LinkIcon,
  ExternalLink,
  ShieldCheck,
  MessageSquare,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import useUiStore from '../../store/uiStore';
import useAuthStore from '../../store/authStore';
import useChatStore from '../../store/chatStore';
import api from '../../services/api';
import { formatLastSeen } from '../../lib/utils';
import ProfileEditModal from './ProfileEditModal';

// Framer Motion Variants for Smooth, Single Entrance Animation (No double/triple replay)
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const modalVariants = {
  hidden: { scale: 0.96, opacity: 0, y: 12 },
  visible: {
    scale: 1,
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.25,
      ease: [0.25, 0.1, 0.25, 1],
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
  exit: {
    scale: 0.96,
    opacity: 0,
    y: 12,
    transition: { duration: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

export default function ProfileCard() {
  const profileSheetUser = useUiStore((s) => s.profileSheetUser);
  const closeProfileSheet = useUiStore((s) => s.closeProfileSheet);
  const currentUser = useAuthStore((s) => s.user);
  const startNewConversation = useChatStore((s) => s.startNewConversation);
  const navigate = useNavigate();

  const [copiedField, setCopiedField] = useState(null);
  const [fullUser, setFullUser] = useState(null);

  const isOwnProfile = profileSheetUser === null;
  const initialUser = isOwnProfile ? currentUser : profileSheetUser;
  const user = fullUser || initialUser;

  // Fetch target user's full registered profile from MongoDB if viewing another contact
  useEffect(() => {
    if (!isOwnProfile && profileSheetUser) {
      const userId = profileSheetUser.id || profileSheetUser._id;
      if (userId) {
        api
          .getUserById(userId)
          .then((res) => {
            if (res && res.user) {
              setFullUser(res.user);
            }
          })
          .catch((err) => {
            console.warn('Failed to load full user profile:', err);
          });
      }
    } else {
      setFullUser(null);
    }
  }, [isOwnProfile, profileSheetUser]);

  if (!user) return null;

  // Direct Redesigned Edit Screen for Own Profile
  if (isOwnProfile) {
    return <ProfileEditModal user={user} onClose={closeProfileSheet} />;
  }

  const displayName = user.fullName || user.username;
  const cleanUsername = (user.username || '').replace(/^@+/, '');

  const copyToClipboard = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`${fieldName} copied to clipboard!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSendMessage = async () => {
    if (!user.id && !user._id) return;
    const targetId = user.id || user._id;
    closeProfileSheet();
    const conv = await startNewConversation(targetId);
    if (conv) {
      navigate(`/chat/${conv.id}`);
    }
  };

  const handleCopyFullProfile = () => {
    const info = `User Information:\nName: ${displayName}\nUsername: @${cleanUsername}\nEmail: ${user.email || 'N/A'}\nPhone: ${user.phone || 'Not provided'}\nBio: ${user.bio || 'No bio provided.'}`;
    navigator.clipboard.writeText(info);
    toast.success('Full profile copied to clipboard!');
  };

  return (
    <motion.div
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-zinc-950/80 backdrop-blur-md overflow-y-auto"
      onClick={closeProfileSheet}
    >
      {/* ── SHADCN CLASSIC DIALOG CARD ── */}
      <motion.div
        variants={modalVariants}
        className="w-full max-w-[500px] bg-zinc-950 border border-zinc-800 rounded-2xl p-6 sm:p-7 shadow-2xl shadow-black/90 relative flex flex-col max-h-[92vh] overflow-y-auto text-zinc-100 antialiased"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── CARD HEADER ── */}
        <motion.div variants={itemVariants} className="w-full flex items-center justify-between pb-4 border-b border-zinc-800/80 mb-5">
          <div className="flex items-center gap-2">
            <div className="px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-violet-400" />
              <span className="font-sans text-xs font-semibold uppercase tracking-wider text-zinc-300">
                User Information
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={closeProfileSheet}
            className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors flex items-center justify-center cursor-pointer"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </motion.div>

        {/* ── HERO PROFILE SECTION (Shadcn Avatar + Clean Identity Stack) ── */}
        <motion.div variants={itemVariants} className="w-full bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-5 mb-5 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            {/* Avatar with Ring & Status Badge */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full border-2 border-violet-500/40 p-0.5 bg-zinc-900 flex-shrink-0 shadow-lg relative flex items-center justify-center overflow-hidden">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-violet-600/30 text-violet-300 flex items-center justify-center text-3xl font-bold uppercase">
                    {user.username?.charAt(0) || 'U'}
                  </div>
                )}
              </div>

              {/* Status Badge */}
              <div
                className={`w-4 h-4 rounded-full border-2 border-zinc-950 absolute bottom-0.5 right-0.5 ${
                  user.isOnline ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-zinc-600'
                }`}
                title={user.isOnline ? 'Active now' : 'Offline'}
              />
            </div>

            {/* Name, Username & Online Status */}
            <div className="min-w-0 flex-1 text-center sm:text-left flex flex-col items-center sm:items-start">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100 truncate">
                {displayName}
              </h2>

              {/* Username Badge */}
              <button
                type="button"
                onClick={() => copyToClipboard(`@${cleanUsername}`, 'Username')}
                className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-zinc-800/80 border border-zinc-700/60 font-mono text-xs font-medium text-violet-400 hover:bg-zinc-800 hover:border-violet-500/50 cursor-pointer transition-all"
                title="Click to copy username"
              >
                <span>@{cleanUsername}</span>
                {copiedField === 'Username' ? (
                  <Check size={12} className="text-emerald-400" />
                ) : (
                  <Copy size={12} className="text-zinc-400" />
                )}
              </button>

              {/* Status Tag */}
              <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-400">
                <span className={`w-2 h-2 rounded-full ${user.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
                <span>{user.isOnline ? 'Active now' : formatLastSeen(user.lastSeenAt)}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── SHADCN INFO CARDS (Bio, Email, Phone, Social Links) ── */}
        <div className="w-full space-y-3 mb-6">
          {/* Bio Card */}
          <motion.div variants={itemVariants} className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4 transition-all hover:bg-zinc-900/70 hover:border-zinc-700/80">
            <div className="text-xs font-medium uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 mb-1.5">
              <FileText size={14} className="text-violet-400" />
              <span>Bio</span>
            </div>
            <p className="text-sm text-zinc-200 font-normal leading-relaxed">
              {user.bio || 'No bio provided.'}
            </p>
          </motion.div>

          {/* Email Card */}
          <motion.div variants={itemVariants} className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4 transition-all hover:bg-zinc-900/70 hover:border-zinc-700/80 flex items-center justify-between">
            <div className="min-w-0 flex-1 pr-3">
              <div className="text-xs font-medium uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 mb-1">
                <Mail size={14} className="text-violet-400" />
                <span>Email</span>
              </div>
              <p className="text-sm font-semibold text-zinc-100 break-all">
                {user.email || 'Not provided'}
              </p>
            </div>

            {user.email && (
              <button
                type="button"
                onClick={() => copyToClipboard(user.email, 'Email')}
                className="p-1.5 rounded-md bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all cursor-pointer flex-shrink-0"
                title="Copy email"
              >
                {copiedField === 'Email' ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
              </button>
            )}
          </motion.div>

          {/* Phone Card */}
          <motion.div variants={itemVariants} className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4 transition-all hover:bg-zinc-900/70 hover:border-zinc-700/80 flex items-center justify-between">
            <div className="min-w-0 flex-1 pr-3">
              <div className="text-xs font-medium uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 mb-1">
                <Phone size={14} className="text-violet-400" />
                <span>Phone Number</span>
              </div>
              <p className="text-sm font-semibold text-zinc-100">
                {user.phone || 'Not provided'}
              </p>
            </div>

            {user.phone && (
              <button
                type="button"
                onClick={() => copyToClipboard(user.phone, 'Phone number')}
                className="p-1.5 rounded-md bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all cursor-pointer flex-shrink-0"
                title="Copy phone"
              >
                {copiedField === 'Phone number' ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
              </button>
            )}
          </motion.div>

          {/* Social Links Card */}
          {user.links && user.links.length > 0 && (
            <motion.div variants={itemVariants} className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4 transition-all hover:bg-zinc-900/70 hover:border-zinc-700/80">
              <div className="text-xs font-medium uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 mb-2.5">
                <LinkIcon size={14} className="text-violet-400" />
                <span>Social Links</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {user.links.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs font-medium text-violet-400 hover:bg-zinc-800 hover:border-violet-500/40 transition-all cursor-pointer"
                  >
                    <ExternalLink size={12} />
                    <span>{link.label}</span>
                  </a>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* ── FOOTER BUTTONS (Shadcn Primary & Outline Action Buttons) ── */}
        <motion.div variants={itemVariants} className="flex items-center gap-3 pt-3 border-t border-zinc-800/80">
          <button
            type="button"
            onClick={handleSendMessage}
            className="flex-1 h-11 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-violet-950/40 cursor-pointer active:scale-[0.99]"
          >
            <MessageSquare size={16} fill="white" />
            <span>Send Message</span>
          </button>

          <button
            type="button"
            onClick={handleCopyFullProfile}
            className="h-11 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
            title="Copy profile details"
          >
            <Sparkles size={15} className="text-violet-400" />
            <span className="hidden sm:inline">Copy Info</span>
          </button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
