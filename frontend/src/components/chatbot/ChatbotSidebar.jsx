import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Settings,
  FileText,
  Link2,
  BarChart3,
  Users,
  Headphones,
  Calendar,
  Share2,
  Code
} from 'lucide-react';
import { FeatureDot } from '@/components/shared/FeatureBadge';
import { cn } from '@/lib/utils';

// Navigation configuration for chatbot dashboard - labels are translation keys
const CHATBOT_NAV_SECTIONS = [
  {
    id: 'configuration',
    titleKey: 'nav.configuration',
    items: [
      { path: 'settings', icon: Settings, labelKey: 'nav.settings' },
      { path: 'knowledge', icon: FileText, labelKey: 'nav.knowledge' },
      { path: 'integrations', icon: Link2, labelKey: 'nav.integrations' }
    ]
  },
  {
    id: 'engagement',
    titleKey: 'nav.engagement',
    items: [
      { path: 'analytics', icon: BarChart3, labelKey: 'nav.analytics', feature: 'analytics' },
      { path: 'leads', icon: Users, labelKey: 'nav.leads', feature: 'leads' },
      { path: 'livechat', icon: Headphones, labelKey: 'nav.livechat', feature: 'handoff' },
      { path: 'bookings', icon: Calendar, labelKey: 'nav.bookings', feature: 'bookings' }
    ]
  },
  {
    id: 'distribution',
    titleKey: 'nav.distribution',
    items: [
      { path: 'share', icon: Share2, labelKey: 'nav.share' },
      { path: 'embed', icon: Code, labelKey: 'nav.embed' }
    ]
  }
];

const ChatbotNavItem = ({ item, botId, isActive, features, isPersonal, t }) => {
  const Icon = item.icon;

  // Check if this feature should show indicator
  const showFeatureIndicator = item.feature && features?.[item.feature];

  // Hide engagement items in personal mode (except analytics)
  if (isPersonal && item.feature && item.feature !== 'analytics') {
    return null;
  }

  return (
    <Link
      to={`/chatbots/${botId}/${item.path}`}
      className={cn(
        "flex items-center px-3 py-2 rounded-lg transition-colors text-sm",
        isActive
          ? "bg-blue-50 text-blue-700 font-medium"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      )}
    >
      <Icon className="w-4 h-4 me-3 flex-shrink-0" />
      <span className="flex-1">{t(item.labelKey)}</span>
      {showFeatureIndicator && (
        <FeatureDot active={true} color="green" />
      )}
    </Link>
  );
};

const ChatbotSidebar = ({ bot, features, isPersonal }) => {
  const { t } = useTranslation('dashboard');
  const location = useLocation();
  const { id: botId } = useParams();

  // Determine active path
  const currentPath = location.pathname.split('/').pop();

  return (
    <nav className="p-2 space-y-4">
      {CHATBOT_NAV_SECTIONS.map((section) => {
        // Filter out engagement section items in personal mode
        const visibleItems = section.items.filter((item) => {
          if (isPersonal && section.id === 'engagement' && item.feature && item.feature !== 'analytics') {
            return false;
          }
          return true;
        });

        // Don't render section if all items are hidden
        if (visibleItems.length === 0) {
          return null;
        }

        return (
          <div key={section.id}>
            <p className="px-3 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {t(section.titleKey)}
            </p>
            <div className="space-y-0.5">
              {visibleItems.map((item) => (
                <ChatbotNavItem
                  key={item.path}
                  item={item}
                  botId={botId}
                  isActive={currentPath === item.path}
                  features={features}
                  isPersonal={isPersonal}
                  t={t}
                />
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
};

export { ChatbotSidebar };
