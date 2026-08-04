import { AnimatePresence, motion } from 'framer-motion';
import useUiStore from '../../store/uiStore';
import useMediaQuery from '../../hooks/useMediaQuery';
import Sidebar from './Sidebar';
import ProfileSheet from '../profile/ProfileCard';

export default function AppShell({ children }) {
  useMediaQuery();
  const isMobile = useUiStore((s) => s.isMobile);
  const profileSheetOpen = useUiStore((s) => s.profileSheetOpen);

  return (
    <div className="flex h-screen h-[100dvh] overflow-hidden bg-[#0a0a0c] p-2 sm:p-3.5 gap-3">
      {/* Sidebar — Floating card panel with outer padding and 28px rounded corners */}
      {(!isMobile || !children || children.key === 'empty') && (
        <motion.div
          initial={false}
          className="flex-shrink-0 h-full rounded-3xl bg-[#18181a] border border-white/10 shadow-2xl overflow-hidden flex flex-col"
          style={{ width: isMobile ? '100%' : '390px' }}
        >
          <Sidebar />
        </motion.div>
      )}

      {/* Main Content Area — Floating card panel with outer padding and 28px rounded corners */}
      <AnimatePresence mode="wait">
        {isMobile ? (
          children && children.key !== 'empty' && (
            <motion.div
              key="chat-panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
              className="fixed inset-0 z-20 bg-[#0a0a0c] p-2 flex flex-col"
            >
              <div className="w-full h-full rounded-3xl bg-doodle border border-white/10 shadow-2xl overflow-hidden flex flex-col">
                {children}
              </div>
            </motion.div>
          )
        ) : (
          <div className="flex-1 min-w-0 h-full rounded-3xl bg-doodle border border-white/10 shadow-2xl overflow-hidden flex flex-col">
            {children}
          </div>
        )}
      </AnimatePresence>

      {/* Profile Sheet */}
      <AnimatePresence>
        {profileSheetOpen && <ProfileSheet />}
      </AnimatePresence>
    </div>
  );
}
