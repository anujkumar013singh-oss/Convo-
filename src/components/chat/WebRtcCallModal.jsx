import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';
import Avatar from '../common/Avatar';

export default function WebRtcCallModal({
  callState, // { isIncoming, isConnected, isOutgoing, caller, recipient, type, conversationId }
  onAccept,
  onDecline,
  onEnd,
  localStream,
  remoteStream,
}) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Bind local stream to local video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Bind remote stream to remote video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Call Duration Timer
  useEffect(() => {
    if (!callState?.isConnected) return;
    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [callState?.isConnected]);

  if (!callState) return null;

  const isVideoCall = callState.type === 'video';
  const targetUser = callState.isIncoming ? callState.caller : callState.recipient;
  const username = targetUser?.username || 'User';
  const avatarUrl = targetUser?.avatarUrl || '';

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted((prev) => !prev);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff((prev) => !prev);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/95 backdrop-blur-2xl p-4 sm:p-6"
    >
      {/* Top Header Controls Bar */}
      <div className="w-full max-w-4xl flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <Avatar src={avatarUrl} alt={username} size="md" />
          <div>
            <h3 className="font-sans text-base sm:text-lg font-extrabold text-white">
              {username}
            </h3>
            <p className="font-sans text-xs text-text-tertiary font-medium">
              {callState.isConnected
                ? `In Call • ${formatDuration(callDuration)}`
                : callState.isIncoming
                ? 'Incoming Call...'
                : 'Ringing...'}
            </p>
          </div>
        </div>

        <div className="px-3 py-1.5 rounded-full bg-accent/20 border border-accent/40 text-accent text-xs font-extrabold uppercase tracking-wider">
          {isVideoCall ? 'WebRTC HD Video' : 'WebRTC HD Voice'}
        </div>
      </div>

      {/* Main Video & Canvas View */}
      <div className="flex-1 w-full max-w-4xl my-4 relative rounded-3xl overflow-hidden bg-zinc-900 border border-white/10 flex items-center justify-center shadow-2xl">
        {isVideoCall && callState.isConnected ? (
          <>
            {/* Remote Video Canvas */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover rounded-3xl"
            />

            {/* Local Pip Video Window */}
            <div className="absolute bottom-4 right-4 w-32 sm:w-44 h-48 sm:h-60 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black">
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
          /* Avatar Calling Screen */
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <div className="relative mb-6">
              <div className="absolute -inset-4 rounded-full bg-accent/20 animate-ping opacity-50" />
              <Avatar src={avatarUrl} alt={username} size="xl" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
              @{username}
            </h2>
            <p className="text-sm text-text-tertiary font-medium">
              {callState.isConnected
                ? 'Voice Call Connected'
                : callState.isIncoming
                ? 'Incoming Voice Call'
                : 'Connecting via WebRTC STUN...'}
            </p>
          </div>
        )}
      </div>

      {/* Bottom Action Controls */}
      <div className="w-full max-w-md flex items-center justify-center gap-6 z-20 pb-4">
        {callState.isIncoming && !callState.isConnected ? (
          /* Incoming Call Actions: Accept or Decline */
          <>
            <button
              type="button"
              onClick={onDecline}
              className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-xl transition-transform active:scale-95 cursor-pointer"
              title="Decline Call"
            >
              <PhoneOff size={24} />
            </button>

            <button
              type="button"
              onClick={onAccept}
              className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-xl shadow-emerald-500/30 transition-transform active:scale-95 cursor-pointer animate-pulse"
              title="Accept Call"
            >
              <Phone size={28} />
            </button>
          </>
        ) : (
          /* Active Call Controls */
          <>
            <button
              type="button"
              onClick={toggleMute}
              className={`w-13 h-13 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg ${
                isMuted
                  ? 'bg-rose-500/20 border border-rose-500/40 text-rose-400'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
            >
              {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
            </button>

            {isVideoCall && (
              <button
                type="button"
                onClick={toggleVideo}
                className={`w-13 h-13 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg ${
                  isVideoOff
                    ? 'bg-rose-500/20 border border-rose-500/40 text-rose-400'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
                title={isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
              >
                {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
              </button>
            )}

            <button
              type="button"
              onClick={onEnd}
              className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-xl shadow-rose-600/30 transition-transform active:scale-95 cursor-pointer"
              title="End Call"
            >
              <PhoneOff size={24} />
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}
