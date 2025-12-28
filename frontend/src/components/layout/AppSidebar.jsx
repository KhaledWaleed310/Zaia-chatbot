import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  MessageSquare,
  Settings,
  BarChart3,
  LogOut,
  Home,
  X,
  PlayCircle,
  Shield,
  Users,
  Database,
  TrendingUp,
  DollarSign,
  Server,
  PanelLeftClose,
  PanelLeft,
  Globe,
  Megaphone,
  Search,
  Brain
} from 'lucide-react';
import { SidebarSection } from './SidebarSection';
import { LanguageDropdown } from '@/components/shared/LanguageSwitcher';
import { cn } from '@/lib/utils';

// Sidebar navigation configuration - using translation keys
const getSidebarSections = (t) => [
  {
    id: 'home',
    title: null,
    collapsible: false,
    defaultExpanded: true,
    items: [
      { path: '/dashboard', icon: Home, label: t('sidebar.dashboard') }
    ]
  },
  {
    id: 'chatbots',
    title: t('sidebar.chatbots'),
    collapsible: true,
    defaultExpanded: true,
    items: [
      { path: '/chatbots', icon: MessageSquare, label: t('sidebar.chatbots') },
      { path: '/test-chatbot', icon: PlayCircle, label: t('sidebar.testChatbot', 'Test Chatbot') }
    ]
  },
  {
    id: 'insights',
    title: t('sidebar.insights', 'Insights'),
    collapsible: true,
    defaultExpanded: true,
    items: [
      { path: '/analytics', icon: BarChart3, label: t('sidebar.analytics') }
    ]
  },
  {
    id: 'account',
    title: t('sidebar.account', 'Account'),
    collapsible: true,
    defaultExpanded: false,
    items: [
      { path: '/settings', icon: Settings, label: t('sidebar.settings') }
    ]
  }
];

const getAdminSection = (t) => ({
  id: 'admin',
  title: t('sidebar.administration', 'Administration'),
  collapsible: true,
  defaultExpanded: false,
  items: [
    { path: '/admin', icon: Shield, label: t('sidebar.adminDashboard', 'Admin Dashboard') },
    { path: '/admin/marketing', icon: Megaphone, label: t('sidebar.marketing', 'Marketing') },
    { path: '/admin/seo', icon: Search, label: t('sidebar.seoTools', 'SEO Tools') },
    { path: '/admin/analytics', icon: TrendingUp, label: t('sidebar.businessAnalytics', 'Business Analytics') },
    { path: '/admin/finance', icon: DollarSign, label: t('sidebar.financeAnalysis', 'Finance Analysis') },
    { path: '/admin/server', icon: Server, label: t('sidebar.serverMonitor', 'Server Monitor') },
    { path: '/admin/learning', icon: Brain, label: t('sidebar.aidenLearning', 'AIDEN Learning') },
    { path: '/admin/users', icon: Users, label: t('sidebar.manageUsers', 'Manage Users') },
    { path: '/admin/chatbots', icon: MessageSquare, label: t('sidebar.manageChatbots', 'Manage Chatbots') },
    { path: '/admin/databases', icon: Database, label: t('sidebar.databases', 'Databases') },
    { path: '/admin/settings', icon: Settings, label: t('sidebar.systemSettings', 'System Settings') }
  ]
});

const getMarketingSection = (t) => ({
  id: 'marketing',
  title: t('sidebar.marketing', 'Marketing'),
  collapsible: true,
  defaultExpanded: true,
  items: [
    { path: '/admin/marketing', icon: Megaphone, label: t('sidebar.marketingDashboard', 'Marketing Dashboard') },
    { path: '/admin/seo', icon: Search, label: t('sidebar.seoTools', 'SEO Tools') }
  ]
});

const AppSidebar = ({
  isOpen,
  onClose,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const { t } = useTranslation('dashboard');
  const { user, logout } = useAuth();
  const { isRtl, toggleLanguage } = useLanguage();
  const navigate = useNavigate();

  // Generate translated sections
  const SIDEBAR_SECTIONS = getSidebarSections(t);
  const ADMIN_SECTION = getAdminSection(t);
  const MARKETING_SECTION = getMarketingSection(t);

  // Check if user has marketing role but is not admin
  const isMarketingOnly = user?.role === 'marketing' && !user?.is_admin;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavigate = () => {
    // Close sidebar on mobile after navigation
    if (onClose) {
      onClose();
    }
  };

  return (
    <aside
      className={cn(
        "fixed inset-y-0 bg-white shadow-lg z-50 transform transition-all duration-300 ease-in-out flex flex-col",
        isRtl ? "right-0" : "left-0",
        isOpen
          ? 'translate-x-0'
          : isRtl ? 'translate-x-full' : '-translate-x-full',
        "md:translate-x-0",
        isCollapsed ? "md:w-16" : "md:w-64",
        "w-64" // Always full width on mobile
      )}
      aria-label="Main navigation"
    >
      {/* Logo & Close/Collapse Button */}
      <div className={cn(
        "flex items-center border-b flex-shrink-0 transition-all duration-300",
        isCollapsed ? "md:justify-center md:px-2 px-4" : "justify-between px-4",
        "py-4"
      )}>
        <Link to="/dashboard" className={cn(
          "flex items-center",
          isCollapsed ? "md:justify-center" : "space-x-2"
        )}>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <span className={cn(
            "text-xl font-bold text-gray-900 transition-all duration-300",
            isCollapsed && "md:hidden"
          )}>Aiden Link</span>
          <span className={cn(
            "px-1.5 py-0.5 text-[10px] font-bold bg-orange-500 text-white rounded uppercase",
            isCollapsed && "md:hidden"
          )}>Beta</span>
        </Link>
        {/* Close button - only visible on mobile */}
        <button
          onClick={onClose}
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Close menu"
        >
          <X className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* Navigation */}
      <nav className={cn(
        "flex-1 py-4 space-y-1 overflow-y-auto transition-all duration-300",
        isCollapsed ? "md:px-2 px-3" : "px-3"
      )}>
        {SIDEBAR_SECTIONS.map((section) => (
          <SidebarSection
            key={section.id}
            section={section}
            onNavigate={handleNavigate}
            isCollapsed={isCollapsed}
          />
        ))}

        {/* Marketing Section - For marketing role users who are not admins */}
        {isMarketingOnly && (
          <div className="pt-3 mt-3 border-t border-gray-200">
            <SidebarSection
              section={MARKETING_SECTION}
              onNavigate={handleNavigate}
              variant="admin"
              isCollapsed={isCollapsed}
            />
          </div>
        )}

        {/* Admin Section */}
        {user?.is_admin && (
          <div className="pt-3 mt-3 border-t border-gray-200">
            <SidebarSection
              section={ADMIN_SECTION}
              onNavigate={handleNavigate}
              variant="admin"
              isCollapsed={isCollapsed}
            />
          </div>
        )}
      </nav>

      {/* Language Switcher - Above collapse button */}
      <div className={cn(
        "border-t py-3 transition-all duration-300",
        isCollapsed ? "md:px-2 md:flex md:justify-center px-4" : "px-4"
      )}>
        {isCollapsed ? (
          // Collapsed: show just globe icon that toggles language
          <button
            onClick={toggleLanguage}
            className="hidden md:flex p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title={isRtl ? "English" : "العربية"}
          >
            <Globe className="w-5 h-5" />
          </button>
        ) : null}
        {/* Always show dropdown on mobile, only when expanded on desktop */}
        <div className={cn(isCollapsed && "md:hidden")}>
          <LanguageDropdown variant="default" />
        </div>
      </div>

      {/* Collapse Toggle Button - Desktop only */}
      <div className={cn(
        "hidden md:flex border-t py-2 transition-all duration-300",
        isCollapsed ? "justify-center px-2" : "justify-end px-4"
      )}>
        <button
          onClick={onToggleCollapse}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label={isCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
          title={isCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
        >
          {isCollapsed ? (
            <PanelLeft className={cn("w-5 h-5", isRtl && "rotate-180")} />
          ) : (
            <PanelLeftClose className={cn("w-5 h-5", isRtl && "rotate-180")} />
          )}
        </button>
      </div>

      {/* User section */}
      <div className={cn(
        "py-4 border-t flex-shrink-0 transition-all duration-300",
        isCollapsed ? "md:px-2 px-4" : "px-4"
      )}>
        <div className={cn(
          "flex items-center",
          isCollapsed ? "md:justify-center justify-between" : "justify-between"
        )}>
          <div className={cn(
            "flex items-center min-w-0",
            isCollapsed && "md:justify-center"
          )}>
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-gray-600">
                {user?.email?.[0]?.toUpperCase()}
              </span>
            </div>
            <div className={cn(
              "ms-3 min-w-0 transition-all duration-300",
              isCollapsed && "md:hidden"
            )}>
              <p className="text-sm font-medium text-gray-700 truncate">
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className={cn(
              "p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0",
              isCollapsed && "md:hidden"
            )}
            aria-label="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export { AppSidebar };
