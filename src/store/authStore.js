import { create } from 'zustand';
import api from '../services/api';
import { disconnectGlobalSocket } from '../hooks/useSocket';

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.login(email, password);
      const { user, token, accessToken } = res;
      const activeToken = token || accessToken;

      localStorage.setItem('convo-token', activeToken);
      localStorage.setItem('convo-user', JSON.stringify(user));

      set({
        user,
        token: activeToken,
        isAuthenticated: true,
        isLoading: false,
      });
      return { success: true, user };
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Login failed';
      set({ error: errorMsg, isLoading: false });
      return { success: false, error: errorMsg };
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.register(data);
      const { user, token, accessToken } = res;
      const activeToken = token || accessToken;

      localStorage.setItem('convo-token', activeToken);
      localStorage.setItem('convo-user', JSON.stringify(user));

      set({
        user,
        token: activeToken,
        isAuthenticated: true,
        isLoading: false,
      });
      return { success: true, user };
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Registration failed';
      set({ error: errorMsg, isLoading: false });
      return { success: false, error: errorMsg };
    }
  },

  updateBlockedUsers: (blockedList) => {
    set((state) => {
      if (!state.user) return state;
      const updatedUser = { ...state.user, blockedUsers: blockedList };
      localStorage.setItem('convo-user', JSON.stringify(updatedUser));
      return { user: updatedUser };
    });
  },

  updateProfile: async (updates) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.updateProfile(updates);
      const updatedUser = res.user || { ...get().user, ...updates };

      localStorage.setItem('convo-user', JSON.stringify(updatedUser));

      set({
        user: updatedUser,
        isLoading: false,
      });
      return { success: true, user: updatedUser };
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Profile update failed';
      set({ error: errorMsg, isLoading: false });
      return { success: false, error: errorMsg };
    }
  },

  logout: () => {
    disconnectGlobalSocket(); // Close socket connection on logout
    localStorage.removeItem('convo-token');
    localStorage.removeItem('convo-user');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },

  hydrate: () => {
    get().initAuth();
  },

  initAuth: async () => {
    const token = localStorage.getItem('convo-token');
    const userStr = localStorage.getItem('convo-user');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({
          user,
          token,
          isAuthenticated: true,
        });

        // Optionally fetch latest profile from server
        api.getProfile?.().then((res) => {
          if (res?.user) {
            localStorage.setItem('convo-user', JSON.stringify(res.user));
            set({ user: res.user });
          }
        }).catch(() => {});
      } catch {
        localStorage.removeItem('convo-token');
        localStorage.removeItem('convo-user');
      }
    }
  },
}));

export default useAuthStore;
