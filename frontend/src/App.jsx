import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
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
import ChatbotSetup from './pages/ChatbotSetup';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Landing from './pages/Landing';
import TestChatbot from './pages/TestChatbot';
import SharedChat from './pages/SharedChat';
import AgentChat from './pages/AgentChat';
import DirectHandoff from './pages/DirectHandoff';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';

// Unified Chatbot Dashboard
import { ChatbotLayout } from './components/chatbot/ChatbotLayout';
import { SettingsPanel } from './components/chatbot/settings/SettingsPanel';
import { KnowledgePanel } from './components/chatbot/knowledge/KnowledgePanel';
import { IntegrationsPanel } from './components/chatbot/integrations/IntegrationsPanel';
import { AnalyticsPanel } from './components/chatbot/analytics/AnalyticsPanel';
import { LeadsPanel } from './components/chatbot/leads/LeadsPanel';
import { LiveChatPanel } from './components/chatbot/livechat/LiveChatPanel';
import { BookingsPanel } from './components/chatbot/bookings/BookingsPanel';
import { SharePanel } from './components/chatbot/sharing/SharePanel';
import { EmbedPanel } from './components/chatbot/sharing/EmbedPanel';

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
import AdminMarketing from './pages/AdminMarketing';
import AdminSEO from './pages/AdminSEO';

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
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/chat/:botId" element={<SharedChat />} />
      <Route path="/handoff/direct/:botId/:handoffId" element={<DirectHandoff />} />
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
      {/* Unified Chatbot Dashboard with Nested Routes */}
      <Route
        path="/chatbots/:id"
        element={
          <ProtectedRoute>
            <ChatbotLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="settings" replace />} />
        <Route path="settings" element={<SettingsPanel />} />
        <Route path="knowledge" element={<KnowledgePanel />} />
        <Route path="integrations" element={<IntegrationsPanel />} />
        <Route path="analytics" element={<AnalyticsPanel />} />
        <Route path="leads" element={<LeadsPanel />} />
        <Route path="livechat" element={<LiveChatPanel />} />
        <Route path="bookings" element={<BookingsPanel />} />
        <Route path="share" element={<SharePanel />} />
        <Route path="embed" element={<EmbedPanel />} />
      </Route>
      {/* Agent Chat - Full-screen dedicated chat page for live handoff */}
      <Route
        path="/chatbots/:id/chat/:handoffId"
        element={
          <ProtectedRoute>
            <AgentChat />
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
      {/* Backwards compatibility redirects for old routes */}
      <Route path="/chatbots/:id/handoff" element={<Navigate to="../livechat" replace />} />
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
      <Route
        path="/admin/marketing"
        element={
          <ProtectedRoute>
            <AdminMarketing />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/seo"
        element={
          <ProtectedRoute>
            <AdminSEO />
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
    <LanguageProvider>
      <AuthProvider>
        <AppRoutes />
        <CookieConsent />
        <Toaster position="bottom-right" richColors closeButton />
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
