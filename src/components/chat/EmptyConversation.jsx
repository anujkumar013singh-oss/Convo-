import { MessageSquare } from 'lucide-react';

export default function EmptyConversation({ participantName }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-8 text-center">
      <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-text-tertiary mb-3 shadow-inner">
        <MessageSquare size={24} className="text-accent" />
      </div>
      <h3 className="font-sans text-base font-bold text-white mb-1">
        No messages here yet
      </h3>
      <p className="font-sans text-xs text-text-tertiary font-medium">
        Send a message to start chatting with {participantName || 'this user'}.
      </p>
    </div>
  );
}
