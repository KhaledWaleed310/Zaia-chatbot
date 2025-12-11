import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import KnowledgeBaseList from '@/pages/KnowledgeBase/List';
import KnowledgeBaseUpload from '@/pages/KnowledgeBase/Upload';
import ChatbotsList from '@/pages/Chatbots/List';
import ChatbotsConfigure from '@/pages/Chatbots/Configure';
import Analytics from '@/pages/Analytics';

// Protected Route wrapper
interface ProtectedRouteProps {
  children: React.ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner w-12 h-12"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { setLoading } = useAuthStore();

  useEffect(() => {
    // Initialize auth state
    setLoading(false);
  }, [setLoading]);

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPlaceholder />} />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="knowledge-bases" element={<KnowledgeBaseList />} />
        <Route path="knowledge-bases/:id/upload" element={<KnowledgeBaseUpload />} />
        <Route path="chatbots" element={<ChatbotsList />} />
        <Route path="chatbots/new" element={<ChatbotsConfigure />} />
        <Route path="chatbots/:id/edit" element={<ChatbotsConfigure />} />
        <Route path="analytics" element={<Analytics />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Temporary login placeholder
function LoginPlaceholder() {
  const { login } = useAuthStore();

  const handleLogin = () => {
    // Mock login for development
    login('mock-token', {
      id: '1',
      email: 'demo@zaia.ai',
      name: 'Demo User',
      created_at: new Date().toISOString(),
    });
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-gray-900 dark:to-gray-800">
      <div className="card p-8 max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            ZAIA Platform
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            RAG Chatbot Platform
          </p>
        </div>
        <button onClick={handleLogin} className="btn btn-primary w-full">
          Login (Demo)
        </button>
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
          This is a demo login. Implement proper authentication in production.
        </p>
      </div>
    </div>
  );
}

export default App;
