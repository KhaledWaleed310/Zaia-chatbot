import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'sonner';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import ChatbotList from './pages/ChatbotList';
import ChatbotNew from './pages/ChatbotNew';
import ChatbotDetail from './pages/ChatbotDetail';
import ChatbotSetup from './pages/ChatbotSetup';
import ChatbotAnalytics from './pages/ChatbotAnalytics';
import ChatbotLeads from './pages/ChatbotLeads';
import ChatbotHandoff from './pages/ChatbotHandoff';
import ChatbotBookings from './pages/ChatbotBookings';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Landing from './pages/Landing';
import TestChatbot from './pages/TestChatbot';
import SharedChat from './pages/SharedChat';
import PrivacyPolicy from './pages/PrivacyPolicy';

// Components
import CookieConsent from './components/CookieConsent';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminChatbots from './pages/AdminChatbots';
import AdminDatabases from './pages/AdminDatabases';
import AdminSettings from './pages/AdminSettings';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminFinance from './pages/AdminFinance';
import AdminServer from './pages/AdminServer';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/chat/:botId" element={<SharedChat />} />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <ForgotPassword />
          </PublicRoute>
        }
      />
      <Route
        path="/reset-password"
        element={
          <PublicRoute>
            <ResetPassword />
          </PublicRoute>
        }
      />
      <Route
        path="/verify-email"
        element={
          <PublicRoute>
            <VerifyEmail />
          </PublicRoute>
        }
      />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chatbots"
        element={
          <ProtectedRoute>
            <ChatbotList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chatbots/new"
        element={
          <ProtectedRoute>
            <ChatbotNew />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chatbots/:id"
        element={
          <ProtectedRoute>
            <ChatbotDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chatbots/:id/setup"
        element={
          <ProtectedRoute>
            <ChatbotSetup />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chatbots/:id/analytics"
        element={
          <ProtectedRoute>
            <ChatbotAnalytics />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chatbots/:id/leads"
        element={
          <ProtectedRoute>
            <ChatbotLeads />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chatbots/:id/handoff"
        element={
          <ProtectedRoute>
            <ChatbotHandoff />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chatbots/:id/bookings"
        element={
          <ProtectedRoute>
            <ChatbotBookings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/test-chatbot"
        element={
          <ProtectedRoute>
            <TestChatbot />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <Analytics />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute>
            <AdminUsers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/chatbots"
        element={
          <ProtectedRoute>
            <AdminChatbots />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/databases"
        element={
          <ProtectedRoute>
            <AdminDatabases />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute>
            <AdminSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/analytics"
        element={
          <ProtectedRoute>
            <AdminAnalytics />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/finance"
        element={
          <ProtectedRoute>
            <AdminFinance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/server"
        element={
          <ProtectedRoute>
            <AdminServer />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      <CookieConsent />
      <Toaster position="bottom-right" richColors closeButton />
    </AuthProvider>
  );
}

export default App;
