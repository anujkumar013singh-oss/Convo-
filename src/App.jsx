import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import useAuthStore from './store/authStore';
import Login from './pages/Login';
import Register from './pages/Register';
import ChatApp from './pages/ChatApp';
import NotFound from './pages/NotFound';
import { PageLoader } from './components/common/Loader';

function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AuthRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/chat" replace />;
  }

  return children;
}

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate);

  // Restore session on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'var(--color-bg-raised)',
            border: '1px solid var(--color-border-subtle)',
            color: 'var(--color-text-primary)',
          },
        }}
        richColors
      />

      <Routes>
        <Route path="/" element={<Navigate to="/chat" replace />} />

        <Route
          path="/login"
          element={
            <AuthRoute>
              <Login />
            </AuthRoute>
          }
        />

        <Route
          path="/register"
          element={
            <AuthRoute>
              <Register />
            </AuthRoute>
          }
        />

        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatApp />
            </ProtectedRoute>
          }
        />

        <Route
          path="/chat/:conversationId"
          element={
            <ProtectedRoute>
              <ChatApp />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
