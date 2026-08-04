import { motion } from 'framer-motion';
import { Phone, PhoneOff, Video } from 'lucide-react';
import Avatar from '../common/Avatar';

export default function IncomingCallScreen({ incomingCall, onAccept, onDecline }) {
  if (!incomingCall) return null;

  const { from, callType } = incomingCall;
  const username = from?.username || 'User';
  const avatarUrl = from?.avatarUrl || '';
  const isVideo = callType === 'video';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/90 backdrop-blur-2xl p-6 text-white"
    >
      {/* Top Header */}
      <div className="w-full max-w-md text-center pt-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/20 border border-accent/40 text-accent font-sans text-xs font-extrabold uppercase tracking-wider mb-2">
          {isVideo ? <Video size={14} /> : <Phone size={14} />}
          <span>Incoming {isVideo ? 'Video' : 'Audio'} Call</span>
        </div>
        <p className="text-text-tertiary font-sans text-xs font-medium">
          Convo Real-Time Calling
        </p>
      </div>

      {/* Center Avatar Ringtone Pulsing Canvas */}
      <div className="flex flex-col items-center justify-center my-auto text-center">
        <div className="relative mb-8">
          {/* Infinite Ringtone Pulse Animations */}
          <motion.div
            animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0.15, 0.6] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -inset-6 rounded-full bg-accent/30"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.8, 0.3, 0.8] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
            className="absolute -inset-3 rounded-full bg-accent/40"
          />

          <Avatar src={avatarUrl} alt={username} size="xl" />
        </div>

        <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-white mb-1">
          @{username}
        </h2>
        <p className="font-sans text-sm text-text-tertiary">
          Incoming {isVideo ? 'HD Video' : 'HD Voice'} Call...
        </p>
      </div>

      {/* Bottom Accept / Decline Buttons */}
      <div className="w-full max-w-sm flex items-center justify-around pb-12 z-10">
        {/* Decline Button (Red) */}
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={onDecline}
            className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-xl shadow-rose-600/30 transition-transform active:scale-95 cursor-pointer"
            title="Decline Call"
          >
            <PhoneOff size={26} />
          </button>
          <span className="font-sans text-xs font-bold text-rose-400">Decline</span>
        </div>

        {/* Accept Button (Green) */}
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={onAccept}
            className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-xl shadow-emerald-500/40 transition-transform active:scale-95 cursor-pointer animate-bounce"
            title="Accept Call"
          >
            <Phone size={28} />
          </button>
          <span className="font-sans text-xs font-bold text-emerald-400">Accept</span>
        </div>
      </div>
    </motion.div>
  );
}
