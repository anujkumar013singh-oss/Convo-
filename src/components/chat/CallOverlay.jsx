import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2, ShieldCheck, Sparkles } from 'lucide-react';
import Avatar from '../common/Avatar';

export default function CallOverlay({
  callState, // 'outgoing' | 'incoming' | 'connected'
  callType, // 'audio' | 'video'
  peerUser, // { username, avatarUrl }
  localStream,
  remoteStream,
  isMuted,
  isVideoOff,
  onAccept,
  onDecline,
  onEndCall,
  onToggleMute,
  onToggleVideo,
}) {
  const [durationSeconds, setDurationSeconds] = useState(0);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  // Bind local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Bind remote stream to Video or Audio elements
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  // Active call duration stopwatch (runs ONLY when callState === 'connected')
  useEffect(() => {
    if (callState !== 'connected') {
      setDurationSeconds(0);
      return;
    }
    const timer = setInterval(() => {
      setDurationSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [callState]);

  if (!callState) return null;

  const username = peerUser?.username || 'User';
  const avatarUrl = peerUser?.avatarUrl || '';
  const isVideo = callType === 'video';

  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60).toString().padStart(2, '0');
    const remainderSecs = (secs % 60).toString().padStart(2, '0');
    return `${mins}:${remainderSecs}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-zinc-950/95 backdrop-blur-3xl p-4 sm:p-8 text-white select-none overflow-hidden"
    >
      {/* Invisible Audio Element for HD Voice Streams */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* Top Header Bar */}
      <div className="w-full max-w-4xl flex items-center justify-between z-20 pt-2">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar src={avatarUrl} alt={username} size="md" />
            {callState === 'connected' && (
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-black animate-pulse" />
            )}
          </div>
          <div>
            <h3 className="font-heading text-lg sm:text-xl font-black text-white tracking-tight">
              @{username}
            </h3>
            <p className="font-sans text-xs font-semibold text-text-tertiary flex items-center gap-2">
              {callState === 'connected' ? (
                <span className="text-emerald-400 flex items-center gap-1.5 font-mono font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  {formatTimer(durationSeconds)}
                </span>
              ) : callState === 'outgoing' ? (
                <span className="text-accent flex items-center gap-1">
                  Ringing<span className="animate-pulse">...</span>
                </span>
              ) : (
                <span className="text-emerald-400 animate-bounce">
                  Incoming HD Call...
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/80 font-sans text-xs font-extrabold uppercase tracking-wider backdrop-blur-md shadow-lg">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>{isVideo ? 'WebRTC HD Video' : 'WebRTC HD Voice'}</span>
        </div>
      </div>

      {/* Center Display Area */}
      <div className="flex-1 w-full max-w-4xl my-6 relative rounded-3xl overflow-hidden bg-zinc-900/60 border border-white/10 flex items-center justify-center shadow-2xl backdrop-blur-xl">
        {isVideo && callState === 'connected' ? (
          <>
            {/* Full Screen Remote Video Canvas */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover rounded-3xl"
            />

            {/* PIP Local Video Window */}
            <div className="absolute bottom-6 right-6 w-36 sm:w-52 h-48 sm:h-64 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black">
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
          /* Avatar Ambient Ring View for Voice or Ringing */
          <div className="flex flex-col items-center justify-center p-8 text-center relative z-10">
            {/* Multi-layered Pulsing Aura Rings */}
            <div className="relative mb-8">
              <motion.div
                animate={
                  callState === 'connected'
                    ? { scale: [1, 1.12, 1], opacity: [0.3, 0.6, 0.3] }
                    : { scale: [1, 1.4, 1], opacity: [0.7, 0.2, 0.7] }
                }
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className={`absolute -inset-8 rounded-full ${
                  callState === 'connected'
                    ? 'bg-emerald-500/20'
                    : callState === 'incoming'
                    ? 'bg-emerald-400/30'
                    : 'bg-accent/30'
                }`}
              />
              <motion.div
                animate={
                  callState === 'connected'
                    ? { scale: [1, 1.06, 1], opacity: [0.4, 0.8, 0.4] }
                    : { scale: [1, 1.25, 1], opacity: [0.8, 0.4, 0.8] }
                }
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
                className={`absolute -inset-4 rounded-full ${
                  callState === 'connected'
                    ? 'bg-emerald-500/30'
                    : callState === 'incoming'
                    ? 'bg-emerald-400/40'
                    : 'bg-accent/40'
                }`}
              />

              <Avatar src={avatarUrl} alt={username} size="xl" />
            </div>

            <h2 className="font-heading text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight">
              @{username}
            </h2>

            <p className="font-sans text-sm sm:text-base font-medium text-text-tertiary max-w-sm">
              {callState === 'connected'
                ? 'HD Voice Encrypted • High Quality Audio'
                : callState === 'outgoing'
                ? 'Waiting for recipient to answer...'
                : 'Incoming call request...'}
            </p>

            {/* Audio Wave Visualizer Bars for Connected Voice Call */}
            {callState === 'connected' && !isVideo && (
              <div className="flex items-center gap-1.5 mt-6">
                {[40, 70, 30, 90, 50, 80, 40].map((h, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: ['12px', `${h}%`, '12px'] }}
                    transition={{
                      duration: 0.8 + (i % 3) * 0.2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className="w-1.5 bg-emerald-400 rounded-full"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div className="w-full max-w-md flex items-center justify-center gap-6 z-20 pb-4">
        {callState === 'incoming' ? (
          /* Incoming Call Actions: Accept (Green) / Decline (Red) */
          <>
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={onDecline}
                className="w-16 h-16 rounded-full bg-gradient-to-tr from-rose-700 to-rose-500 hover:from-rose-800 hover:to-rose-600 text-white flex items-center justify-center shadow-2xl shadow-rose-600/50 transition-all active:scale-95 cursor-pointer"
                title="Decline Call"
              >
                <PhoneOff size={26} />
              </button>
              <span className="font-sans text-xs font-bold text-rose-400">Decline</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={onAccept}
                className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-400 hover:from-emerald-700 hover:to-emerald-500 text-white flex items-center justify-center shadow-2xl shadow-emerald-500/50 transition-all active:scale-95 cursor-pointer animate-pulse"
                title="Accept Call"
              >
                <Phone size={28} />
              </button>
              <span className="font-sans text-xs font-bold text-emerald-400">Accept</span>
            </div>
          </>
        ) : callState === 'outgoing' ? (
          /* Outgoing Ringing Action: Cancel Call (Red Pill) */
          <button
            type="button"
            onClick={onEndCall}
            className="px-8 py-3.5 rounded-full bg-rose-600/90 hover:bg-rose-700 text-white font-sans text-sm font-extrabold flex items-center gap-2.5 shadow-2xl shadow-rose-600/40 transition-all active:scale-95 cursor-pointer border border-rose-500/30"
          >
            <PhoneOff size={20} />
            <span>Cancel Call</span>
          </button>
        ) : (
          /* Connected Call Controls */
          <>
            {/* Mic Mute Toggle */}
            <button
              type="button"
              onClick={onToggleMute}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xl ${
                isMuted
                  ? 'bg-rose-500/20 border border-rose-500/40 text-rose-400'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
            >
              {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
            </button>

            {/* Camera Toggle (Video Calls Only) */}
            {isVideo && (
              <button
                type="button"
                onClick={onToggleVideo}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xl ${
                  isVideoOff
                    ? 'bg-rose-500/20 border border-rose-500/40 text-rose-400'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
                title={isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
              >
                {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
              </button>
            )}

            {/* End Call Button */}
            <button
              type="button"
              onClick={onEndCall}
              className="w-16 h-16 rounded-full bg-gradient-to-tr from-rose-700 to-rose-500 hover:from-rose-800 hover:to-rose-600 text-white flex items-center justify-center shadow-2xl shadow-rose-600/50 transition-all active:scale-95 cursor-pointer"
              title="End Call"
            >
              <PhoneOff size={26} />
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}
