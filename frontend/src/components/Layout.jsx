import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Settings, BarChart3, LogOut, Home, Menu, X, PlayCircle, Shield, Users, Database, TrendingUp, DollarSign, Server } from 'lucide-react';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { PageHeader } from '@/components/shared/PageHeader';
import { cn } from '@/lib/utils';

const Layout = ({
  children,
  breadcrumbs,
  pageTitle,
  pageDescription,
  pageIcon,
  pageActions,
  className
}) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/chatbots', icon: MessageSquare, label: 'Chatbots' },
    { path: '/test-chatbot', icon: PlayCircle, label: 'Test Chatbot' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const adminNavItems = [
    { path: '/admin', icon: Shield, label: 'Admin Dashboard' },
    { path: '/admin/analytics', icon: TrendingUp, label: 'Business Analytics' },
    { path: '/admin/finance', icon: DollarSign, label: 'Finance Analysis' },
    { path: '/admin/server', icon: Server, label: 'Server Monitor' },
    { path: '/admin/users', icon: Users, label: 'Manage Users' },
    { path: '/admin/chatbots', icon: MessageSquare, label: 'Manage Chatbots' },
    { path: '/admin/databases', icon: Database, label: 'Databases' },
    { path: '/admin/settings', icon: Settings, label: 'System Settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Skip to content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-[60] focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white shadow-md z-30 flex items-center px-4">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors touch-target"
          aria-label="Toggle menu"
          aria-expanded={isSidebarOpen}
        >
          <Menu className="w-6 h-6 text-gray-700" />
        </button>
        <div className="flex items-center ml-4 space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">Aiden</span>
          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-orange-500 text-white rounded uppercase">Beta</span>
        </div>
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
      <aside
        className={cn(
          "fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out",
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
          "md:translate-x-0"
        )}
        aria-label="Main navigation"
      >
        <div className="flex flex-col h-full">
          {/* Logo & Close Button */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Aiden</span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-orange-500 text-white rounded uppercase">Beta</span>
            </Link>
            {/* Close button - only visible on mobile */}
            <button
              onClick={closeSidebar}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors touch-target"
              aria-label="Close menu"
            >
              <X className="w-5 h-5 text-gray-700" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path ||
                (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={closeSidebar}
                  className={cn(
                    "flex items-center px-4 py-3 rounded-lg transition-colors min-h-[44px]",
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}

            {/* Admin Section */}
            {user?.is_admin && (
              <div className="pt-4 mt-4 border-t border-gray-200">
                <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Admin
                </p>
                {adminNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.path === '/admin'
                    ? location.pathname === '/admin'
                    : location.pathname.startsWith(item.path);

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={closeSidebar}
                      className={cn(
                        "flex items-center px-4 py-3 rounded-lg transition-colors min-h-[44px]",
                        isActive
                          ? 'bg-purple-50 text-purple-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      )}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </nav>

          {/* User section */}
          <div className="px-4 py-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center min-w-0">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-gray-600">
                    {user?.email?.[0]?.toUpperCase()}
                  </span>
                </div>
                <div className="ml-3 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 touch-target"
                aria-label="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main
        id="main-content"
        className="min-h-screen pt-16 md:pt-0 md:ml-64"
      >
        <div className={cn("p-4 sm:p-6 lg:p-8", className)}>
          {/* Breadcrumb navigation */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <Breadcrumb items={breadcrumbs} />
          )}

          {/* Page header */}
          {(pageTitle || pageActions) && (
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

export default Layout;
