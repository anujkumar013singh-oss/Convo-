import { Search, Menu } from 'lucide-react';
import { cn } from '../../lib/utils';
import useUiStore from '../../store/uiStore';
import useChatStore from '../../store/chatStore';

export default function TopBar() {
  const searchQuery = useUiStore((s) => s.searchQuery);
  const setSearchQuery = useUiStore((s) => s.setSearchQuery);
  const activeFilter = useUiStore((s) => s.activeFilter);
  const setActiveFilter = useUiStore((s) => s.setActiveFilter);
  const openProfileSheet = useUiStore((s) => s.openProfileSheet);
  const conversations = useChatStore((s) => s.conversations);

  const totalCount = conversations.length;
  const unreadCount = conversations.reduce((acc, c) => acc + (c.unreadCount > 0 ? 1 : 0), 0);
  const onlineCount = conversations.reduce((acc, c) => acc + (c.participant?.isOnline ? 1 : 0), 0);

  const filters = [
    { id: 'all', label: 'All', count: totalCount },
    { id: 'online', label: 'Online', count: onlineCount },
    { id: 'unread', label: 'Unread', count: unreadCount },
  ];

  return (
    <div className="flex-shrink-0 px-4 pt-4 pb-2.5">
      {/* Top Row: Hamburger Menu + Pill Search */}
      <div className="flex items-center gap-3 mb-3.5">
        <button
          onClick={() => openProfileSheet(null)}
          className="p-2 rounded-full text-text-tertiary hover:text-white hover:bg-white/10 transition-colors focus-ring cursor-pointer flex-shrink-0"
          aria-label="Open sidebar menu"
        >
          <Menu size={22} />
        </button>

        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" size={19} />
          <input
            type="search"
            placeholder="Search by name or @username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#28282b] text-white placeholder-text-tertiary rounded-full h-11 pl-11 pr-4 text-sm font-sans font-semibold focus:outline-none border border-transparent focus:border-white/20 transition-all"
            aria-label="Search users by name or username"
          />
        </div>
      </div>

      {/* Filter Tabs Row */}
      <div className="flex items-center gap-2.5 px-1" role="tablist" aria-label="Chat filters">
        {filters.map((f) => {
          const isActive = activeFilter === f.id;

          return (
            <button
              key={f.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveFilter(f.id)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-sans font-extrabold transition-all duration-fast flex items-center gap-2 cursor-pointer',
                isActive
                  ? 'bg-[#3b2d54] text-white shadow-md'
                  : 'text-text-tertiary hover:text-white hover:bg-white/5'
              )}
            >
              <span>{f.label}</span>
              {f.count > 0 && (
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-mono font-extrabold leading-none',
                  isActive ? 'bg-accent text-white' : 'bg-white/15 text-text-secondary'
                )}>
                  {f.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
