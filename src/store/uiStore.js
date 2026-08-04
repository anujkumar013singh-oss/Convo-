import { create } from 'zustand';

const useUiStore = create((set) => ({
  isMobile: false,
  isTablet: false,
  sidebarOpen: true,
  profileSheetOpen: false,
  profileSheetUser: null,   // null = own profile, User object = other's profile
  searchQuery: '',
  activeFilter: 'all',      // 'all' | 'unread' | 'online'

  setIsMobile: (val) => set({ isMobile: val }),
  setIsTablet: (val) => set({ isTablet: val }),
  setSidebarOpen: (val) => set({ sidebarOpen: val }),

  openProfileSheet: (user = null) =>
    set({ profileSheetOpen: true, profileSheetUser: user }),
  closeProfileSheet: () =>
    set({ profileSheetOpen: false, profileSheetUser: null }),

  setSearchQuery: (query) => set({ searchQuery: query }),
  setActiveFilter: (filter) => set({ activeFilter: filter }),
}));

export default useUiStore;
