import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function useAuth() {
  const navigate = useNavigate();
  const store = useAuthStore();
  const [error, setError] = useState(null);

  const login = useCallback(
    async (email, password) => {
      setError(null);
      const result = await store.login(email, password);
      if (result.success) {
        navigate('/chat');
      } else {
        setError(result.error || 'Login failed');
      }
      return result;
    },
    [store, navigate]
  );

  const register = useCallback(
    async (data) => {
      setError(null);
      const result = await store.register(data);
      if (result.success) {
        navigate('/chat');
      } else {
        setError(result.error || 'Registration failed');
      }
      return result;
    },
    [store, navigate]
  );

  const logout = useCallback(() => {
    store.logout();
    navigate('/login');
  }, [store, navigate]);

  return {
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    error: error || store.error,
    login,
    register,
    logout,
  };
}
