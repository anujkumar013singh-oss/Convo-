import axios from 'axios';
import { mockConversations, mockMessages, mockUsers } from './fixtures';
import { delay } from '../lib/utils';

const USE_MOCKS = false;
const BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api');

// ── Axios instance ──
const http = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 30s to handle MongoDB Atlas cold starts (remote DB can take 3-5s)
  headers: { 'Content-Type': 'application/json' },
});

// Attach auth token to every request
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('convo-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 Unauthorized globally for protected routes (skipping login/register routes)
http.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthRoute = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register');
    if (error.response && error.response.status === 401 && !isAuthRoute) {
      localStorage.removeItem('convo-token');
      localStorage.removeItem('convo-user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ── Mock API layer ──
const mockApi = {
  login: async (email, password) => {
    await delay(600);
    return { user: { id: 'user-1', username: email.split('@')[0], email }, token: 'mock-jwt-' + Date.now() };
  },

  register: async ({ username, email, phone }) => {
    await delay(600);
    return {
      user: { id: 'user-1', username, email, phone: phone || '' },
      token: 'mock-jwt-' + Date.now(),
    };
  },

  sendOtp: async (email, otp) => {
    await delay(500);
    return { success: true };
  },

  verifyOtp: async (email, otp) => {
    await delay(500);
    return { success: true };
  },

  resetPassword: async (email, password) => {
    await delay(500);
    return { success: true };
  },

  checkEmailPhone: async (email, phone) => {
    await delay(200);
    return { available: true };
  },

  checkUsername: async (username) => {
    await delay(200);
    return { available: true };
  },

  searchUsers: async (query) => {
    await delay(300);
    return { users: [] };
  },

  startConversation: async (targetUserId) => {
    await delay(300);
    return { conversation: null };
  },

  getConversations: async () => {
    await delay(300);
    return { conversations: mockConversations };
  },

  getMessages: async (conversationId) => {
    await delay(300);
    return { messages: mockMessages[conversationId] || [] };
  },

  deleteMessage: async (conversationId, messageId) => {
    await delay(200);
    return { success: true };
  },

  deleteConversation: async (conversationId) => {
    await delay(200);
    return { success: true };
  },

  getProfile: async () => {
    await delay(300);
    return { user: mockUsers[0] || null };
  },

  updateProfile: async (updates) => {
    await delay(400);
    return { user: updates };
  },

  uploadAvatar: async (formData) => {
    await delay(600);
    return { avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}` };
  },
};

// ── Real API layer ──
const realApi = {
  login: async (email, password) => {
    const { data } = await http.post('/auth/login', { email, password });
    return data;
  },

  register: async (payload) => {
    const { data } = await http.post('/auth/register', payload);
    return data;
  },

  sendOtp: async (email, otp, isForgotPassword = false) => {
    const { data } = await http.post('/auth/send-otp', { email, otp, isForgotPassword });
    return data;
  },

  verifyOtp: async (email, otp) => {
    const { data } = await http.post('/auth/verify-otp', { email, otp });
    return data;
  },

  resetPassword: async (email, password) => {
    const { data } = await http.post('/auth/reset-password', { email, password });
    return data;
  },

  checkEmailPhone: async (email, phone) => {
    const { data } = await http.get(`/users/check-email-phone?email=${encodeURIComponent(email || '')}&phone=${encodeURIComponent(phone || '')}`);
    return data;
  },

  checkUsername: async (username) => {
    const { data } = await http.get(`/users/check-username?username=${encodeURIComponent(username)}`);
    return data;
  },

  searchUsers: async (query) => {
    const { data } = await http.get(`/users/search?query=${encodeURIComponent(query)}`);
    return data;
  },

  startConversation: async (targetUserId) => {
    const { data } = await http.post('/conversations/start', { targetUserId });
    return data;
  },

  getConversations: async () => {
    const { data } = await http.get('/conversations');
    return data;
  },

  getMessages: async (conversationId) => {
    const { data } = await http.get(`/conversations/${conversationId}/messages`);
    return data;
  },

  deleteMessage: async (conversationId, messageId) => {
    const { data } = await http.delete(`/conversations/${conversationId}/messages/${messageId}`);
    return data;
  },

  deleteConversation: async (conversationId) => {
    const { data } = await http.delete(`/conversations/${conversationId}`);
    return data;
  },

  continueConversation: async (conversationId) => {
    const { data } = await http.post(`/conversations/${conversationId}/continue`);
    return data;
  },

  blockConversation: async (conversationId) => {
    const { data } = await http.post(`/conversations/${conversationId}/block`);
    return data;
  },

  unblockConversation: async (conversationId) => {
    const { data } = await http.post(`/conversations/${conversationId}/unblock`);
    return data;
  },

  getProfile: async () => {
    const { data } = await http.get('/users/me');
    return data;
  },

  updateProfile: async (updates) => {
    const { data } = await http.patch('/users/me', updates);
    return data;
  },

  uploadAvatar: async (formData) => {
    const { data } = await http.post('/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  getUserById: async (userId) => {
    const { data } = await http.get(`/users/${userId}`);
    return data; // { user: UserObject }
  },

  // Upload any file (image/video/audio/doc) to Cloudinary via server
  uploadFile: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await http.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000, // 60s for large file uploads
    });
    return data; // { url, type, name, size }
  },
};

// ── Export active API layer ──
const api = USE_MOCKS ? mockApi : realApi;
export default api;
export { http };
