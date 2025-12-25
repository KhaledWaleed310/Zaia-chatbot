import { useState, useEffect } from 'react';
import { Menu, MessageSquare, Globe } from 'lucide-react';
import { AppSidebar } from './AppSidebar';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { PageHeader } from '@/components/shared/PageHeader';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';

const AppLayout = ({
  children,
  breadcrumbs,
  pageTitle,
  pageDescription,
  pageIcon,
  pageActions,
  className,
  fullHeight = false
}) => {
  const { isRtl, toggleLanguage, currentLanguage } = useLanguage();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    // Initialize from localStorage
    const saved = localStorage.getItem('sidebar_collapsed');
    return saved === 'true';
  });

  // Persist collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className={cn("min-h-screen bg-gray-50", fullHeight && "h-screen overflow-hidden")}>
      {/* Skip to content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-[60] focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 inset-x-0 h-16 bg-white shadow-md z-30 flex items-center justify-between px-4">
        <div className="flex items-center">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
            aria-expanded={isSidebarOpen}
          >
            <Menu className="w-6 h-6 text-gray-700" />
          </button>
          <div className="flex items-center ms-3 gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Aiden Link</span>
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-orange-500 text-white rounded uppercase">Beta</span>
          </div>
        </div>
        {/* Language Toggle for Mobile */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm font-medium text-gray-700"
          aria-label={currentLanguage === 'en' ? 'Switch to Arabic' : 'Switch to English'}
        >
          <Globe className="w-4 h-4" />
          <span>{currentLanguage === 'en' ? 'ع' : 'EN'}</span>
        </button>
      </header>

      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <AppSidebar
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />

      {/* Main content */}
      <main
        id="main-content"
        className={cn(
          "pt-16 md:pt-0 transition-all duration-300",
          isSidebarCollapsed ? "md:ms-16" : "md:ms-64",
          fullHeight ? "h-screen" : "min-h-screen"
        )}
      >
        <div className={cn(
          fullHeight ? "h-full flex flex-col" : "",
          !fullHeight && "p-4 sm:p-6 lg:p-8",
          className
        )}>
          {/* Breadcrumb navigation */}
          {breadcrumbs && breadcrumbs.length > 0 && !fullHeight && (
            <Breadcrumb items={breadcrumbs} />
          )}

          {/* Page header */}
          {(pageTitle || pageActions) && !fullHeight && (
            <PageHeader
              title={pageTitle}
              description={pageDescription}
              icon={pageIcon}
              actions={pageActions}
            />
          )}

          {children}
        </div>
      </main>
    </div>
  );
};

export { AppLayout };
