import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const SidebarNavItem = ({
  item,
  onClick,
  variant = 'default', // 'default' | 'admin'
  isCollapsed = false
}) => {
  const location = useLocation();
  const Icon = item.icon;

  // Check if this item is active
  const isActive = item.path === '/dashboard' || item.path === '/admin'
    ? location.pathname === item.path
    : location.pathname.startsWith(item.path);

  const activeStyles = variant === 'admin'
    ? 'bg-purple-50 text-purple-700 font-medium'
    : 'bg-blue-50 text-blue-700 font-medium';

  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={cn(
        "flex items-center rounded-lg transition-all min-h-[40px] text-sm group relative",
        isCollapsed ? "md:justify-center md:px-0 px-3 py-2.5" : "px-3 py-2.5",
        isActive
          ? activeStyles
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      )}
      aria-current={isActive ? 'page' : undefined}
      title={isCollapsed ? item.label : undefined}
    >
      <Icon className={cn(
        "w-5 h-5 flex-shrink-0 transition-all",
        isCollapsed ? "md:me-0 me-3" : "me-3"
      )} />
      <span className={cn(
        "truncate transition-all duration-300",
        isCollapsed && "md:hidden"
      )}>{item.label}</span>
      {item.badge && !isCollapsed && (
        <span className="ms-auto">{item.badge}</span>
      )}

      {/* Tooltip for collapsed state */}
      {isCollapsed && (
        <div className="hidden md:block absolute start-full ms-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
          {item.label}
        </div>
      )}
    </Link>
  );
};

export { SidebarNavItem };
