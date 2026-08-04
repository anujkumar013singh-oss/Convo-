import { motion } from 'framer-motion';

const EMOJIS = [
  '😊', '😂', '❤️', '🔥', '👍', '😍', '🎉', '🤔',
  '😎', '🙌', '💪', '✨', '🌟', '💜', '🎮', '☕',
  '📸', '🎵', '🐱', '🌸', '🚀', '💡', '🎯', '👋',
  '😅', '🤣', '😇', '🥰', '😘', '🤗', '🙃', '😏',
  '🥳', '😭', '🤩', '💀', '👀', '🫡', '💯', '⚡',
  '🎈', '🌈', '🍕', '🎸', '📚', '🏆', '💎', '🦋',
];

export default function EmojiPicker({ onSelect, onClose }) {
  return (
    <>
      {/* Backdrop to close */}
      <div className="fixed inset-0 z-30" onClick={onClose} />
      
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="absolute bottom-full left-0 mb-2 z-40
                   bg-bg-raised border border-border-subtle rounded-xs shadow-card
                   p-3 w-[280px]"
      >
        <p className="text-xs text-text-tertiary mb-2 font-medium">Pick an emoji</p>
        <div className="grid grid-cols-8 gap-1">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onSelect(emoji)}
              className="w-8 h-8 flex items-center justify-center text-lg rounded-md
                         hover:bg-bg-hover transition-colors focus-ring"
              aria-label={`Emoji ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </motion.div>
    </>
  );
}
