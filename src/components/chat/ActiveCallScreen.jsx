import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import Avatar from '../common/Avatar';

export default function ActiveCallScreen({
  callInfo, // { peerUser, callType, startedAt }
  localStream,
  remoteStream,
  isMuted,
  isVideoOff,
  onToggleMute,
  onToggleVideo,
  onEndCall,
}) {
  const [durationSeconds, setDurationSeconds] = useState(0);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Bind Local Stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Bind Remote Stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Cosmetic Stopwatch Timer (Purely display-only, counts up indefinitely with NO time limit cap)
  useEffect(() => {
    const timer = setInterval(() => {
      setDurationSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const isVideo = callInfo?.callType === 'video';
  const username = callInfo?.peerUser?.username || 'User';
  const avatarUrl = callInfo?.peerUser?.avatarUrl || '';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/95 backdrop-blur-2xl p-4 sm:p-6 text-white"
    >
      {/* Top Header Bar */}
      <div className="w-full max-w-4xl flex items-center justify-between z-20 pt-2">
        <div className="flex items-center gap-3">
          <Avatar src={avatarUrl} alt={username} size="md" />
          <div>
            <h3 className="font-sans text-base sm:text-lg font-extrabold text-white">
              {username}
            </h3>
            <p className="font-sans text-xs text-emerald-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{formatTimer(durationSeconds)}</span>
            </p>
          </div>
        </div>

        <div className="px-3.5 py-1.5 rounded-full bg-accent/20 border border-accent/40 text-accent font-sans text-xs font-extrabold uppercase tracking-wider">
          {isVideo ? 'HD Video Call' : 'HD Voice Call'}
        </div>
      </div>

      {/* Main Calling Canvas Container */}
      <div className="flex-1 w-full max-w-4xl my-4 relative rounded-3xl overflow-hidden bg-zinc-900 border border-white/10 flex items-center justify-center shadow-2xl">
        {isVideo ? (
          <>
            {/* Remote Full Screen Video */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover rounded-3xl"
            />

            {/* Local PIP Camera Preview Box */}
            <div className="absolute bottom-4 right-4 w-32 sm:w-44 h-44 sm:h-56 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          </>
        ) : (
          /* Voice Call Avatar View */
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <div className="relative mb-6">
              <div className="absolute -inset-4 rounded-full bg-emerald-500/15 animate-pulse" />
              <Avatar src={avatarUrl} alt={username} size="xl" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
              @{username}
            </h2>
            <p className="text-sm text-emerald-400 font-semibold flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Connected • Unlimited Call</span>
            </p>
          </div>
        )}
      </div>

      {/* Bottom Action Controls Bar */}
      <div className="w-full max-w-md flex items-center justify-center gap-6 z-20 pb-4">
        {/* Mic Toggle Button */}
        <button
          type="button"
          onClick={onToggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg ${
            isMuted
              ? 'bg-rose-500/20 border border-rose-500/40 text-rose-400'
              : 'bg-white/10 hover:bg-white/20 text-white'
          }`}
          title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        >
          {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
        </button>

        {/* Video Toggle Button (Video Calls Only) */}
        {isVideo && (
          <button
            type="button"
            onClick={onToggleVideo}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg ${
              isVideoOff
                ? 'bg-rose-500/20 border border-rose-500/40 text-rose-400'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
          >
            {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
          </button>
        )}

        {/* End Call Button (Red) */}
        <button
          type="button"
          onClick={onEndCall}
          className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-xl shadow-rose-600/40 transition-transform active:scale-95 cursor-pointer"
          title="End Call"
        >
          <PhoneOff size={26} />
        </button>
      </div>
    </motion.div>
  );
}
