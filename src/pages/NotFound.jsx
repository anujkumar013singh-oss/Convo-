import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, MessageCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-bg-base px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center max-w-sm"
      >
        <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6">
          <MessageCircle size={40} className="text-accent" strokeWidth={1.5} />
        </div>
        <h1 className="text-4xl font-bold text-text-primary mb-2">404</h1>
        <p className="text-text-secondary mb-8">
          Oops! This page doesn't exist. Looks like you took a wrong turn.
        </p>
        <Link
          to="/chat"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-accent text-white font-medium
                     hover:bg-accent-hover transition-colors focus-ring"
        >
          <Home size={18} />
          Back to Convo
        </Link>
      </motion.div>
    </div>
  );
}
