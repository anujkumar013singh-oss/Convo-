import { Phone, Video } from 'lucide-react';

export default function CallButton({ onInitiateAudioCall, onInitiateVideoCall, disabled = false }) {
  return (
    <div className="flex items-center gap-1 sm:gap-1.5">
      {/* Audio Call Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={onInitiateAudioCall}
        className="p-2 rounded-full text-text-tertiary hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors focus-ring cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        title="Start Voice Call"
        aria-label="Start Voice Call"
      >
        <Phone size={19} />
      </button>

      {/* Video Call Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={onInitiateVideoCall}
        className="p-2 rounded-full text-text-tertiary hover:text-accent hover:bg-accent/10 transition-colors focus-ring cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        title="Start Video Call"
        aria-label="Start Video Call"
      >
        <Video size={19} />
      </button>
    </div>
  );
}
