import { useState, useEffect } from 'react';
import { useParams, useNavigate, Outlet, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, Menu, X, Settings, FileText, Link2, BarChart3, Users, Headphones, Calendar, Share2, Code } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ChatbotHeader } from './ChatbotHeader';
import { ChatbotSidebar } from './ChatbotSidebar';
import { chatbots, leads, handoff, translation } from '@/utils/api';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';

// Mobile navigation tabs - labels will be translated in component
const MOBILE_TABS = [
  { path: 'settings', icon: Settings, labelKey: 'nav.settings' },
  { path: 'knowledge', icon: FileText, labelKey: 'nav.knowledge' },
  { path: 'integrations', icon: Link2, labelKey: 'nav.integrations' },
  { path: 'analytics', icon: BarChart3, labelKey: 'nav.analytics' },
  { path: 'leads', icon: Users, labelKey: 'nav.leads' },
  { path: 'livechat', icon: Headphones, labelKey: 'nav.livechat' },
  { path: 'bookings', icon: Calendar, labelKey: 'nav.bookings' },
  { path: 'share', icon: Share2, labelKey: 'nav.share' },
  { path: 'embed', icon: Code, labelKey: 'nav.embed' }
];

const ChatbotLayout = () => {
  const { t } = useTranslation('dashboard');
  const { isRtl } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [bot, setBot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [features, setFeatures] = useState({
    leads: false,
    handoff: false,
    bookings: false,
    multiLanguage: false
  });

  // Determine the current section name for breadcrumbs
  const getCurrentSection = () => {
    const path = location.pathname.split('/').pop();
    const sectionKeys = {
      settings: 'nav.settings',
      knowledge: 'nav.knowledge',
      integrations: 'nav.integrations',
      analytics: 'nav.analytics',
      leads: 'nav.leads',
      livechat: 'nav.livechat',
      bookings: 'nav.bookings',
      share: 'nav.share',
      embed: 'nav.embed'
    };
    return t(sectionKeys[path] || 'nav.settings');
  };

  const loadChatbot = async () => {
    try {
      const [botRes, leadConfigRes, handoffConfigRes, bookingConfigRes, langConfigRes] = await Promise.all([
        chatbots.get(id),
        leads.getFormConfig(id).catch(() => ({ data: { enabled: false } })),
        handoff.getConfig(id).catch(() => ({ data: { enabled: false } })),
        handoff.getBookingConfig(id).catch(() => ({ data: { enabled: false } })),
        translation.getConfig(id).catch(() => ({ data: { enabled: false } }))
      ]);

      setBot(botRes.data);
      setFeatures({
        leads: leadConfigRes.data?.enabled || false,
        handoff: handoffConfigRes.data?.enabled || false,
        bookings: bookingConfigRes.data?.enabled || false,
        multiLanguage: langConfigRes.data?.enabled || false
      });
    } catch (error) {
      console.error('Failed to load chatbot:', error);
      navigate('/chatbots');
    } finally {
      setLoading(false);
    }
  };

  const reloadBot = async () => {
    await loadChatbot();
  };

  useEffect(() => {
    loadChatbot();
  }, [id]);

  // Redirect to settings if on base path
  useEffect(() => {
    if (location.pathname === `/chatbots/${id}` || location.pathname === `/chatbots/${id}/`) {
      navigate(`/chatbots/${id}/settings`, { replace: true });
    }
  }, [location.pathname, id, navigate]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </AppLayout>
    );
  }

  const isPersonal = bot?.is_personal || false;

  return (
    <AppLayout
      breadcrumbs={[
        { href: '/chatbots', label: t('chatbots.title') },
        { href: `/chatbots/${id}/settings`, label: bot?.name || t('chatbots.title') },
        { label: getCurrentSection() }
      ]}
      fullHeight
    >
      <div className="flex h-full overflow-hidden">
        {/* Chatbot Sidebar */}
        <aside className="hidden md:flex flex-col w-56 bg-white border-r flex-shrink-0">
          <ChatbotHeader bot={bot} features={features} isPersonal={isPersonal} />
          <div className="flex-1 overflow-y-auto">
            <ChatbotSidebar bot={bot} features={features} isPersonal={isPersonal} />
          </div>
        </aside>

        {/* Mobile Navigation for Chatbot */}
        <div className="md:hidden fixed top-16 left-0 right-0 bg-white border-b z-20">
          {/* Bot Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: bot?.primary_color || '#3B82F6' }}
              >
                <span className="text-white text-sm font-bold">
                  {bot?.name?.[0]?.toUpperCase() || 'C'}
                </span>
              </div>
              <span className="font-medium text-gray-900 truncate text-sm">
                {bot?.name}
              </span>
            </div>
          </div>
          {/* Tab Navigation - Scrollable */}
          <div className="overflow-x-auto">
            <div className="flex px-2 py-2 gap-1 min-w-max">
              {MOBILE_TABS.map((tab) => {
                // Filter out engagement items in personal mode
                if (isPersonal && ['leads', 'livechat', 'bookings'].includes(tab.path)) {
                  return null;
                }
                const currentPath = location.pathname.split('/').pop();
                const isActive = currentPath === tab.path;
                const Icon = tab.icon;
                return (
                  <Link
                    key={tab.path}
                    to={`/chatbots/${id}/${tab.path}`}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                      isActive
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t(tab.labelKey)}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <main className={cn(
          "flex-1 overflow-y-auto bg-gray-50",
          "pt-24 md:pt-0" // Add padding on mobile for the header + tabs
        )}>
          <div className="p-4 sm:p-6 max-w-5xl mx-auto">
            <Outlet context={{ bot, features, reloadBot, isPersonal }} />
          </div>
        </main>
      </div>
    </AppLayout>
  );
};

export { ChatbotLayout };
