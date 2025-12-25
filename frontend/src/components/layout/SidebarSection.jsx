import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SidebarNavItem } from './SidebarNavItem';

const SidebarSection = ({
  section,
  onNavigate,
  variant = 'default',
  isCollapsed = false
}) => {
  const [isExpanded, setIsExpanded] = useState(section.defaultExpanded ?? true);

  const handleToggle = () => {
    if (section.collapsible && !isCollapsed) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className="mb-1">
      {/* Section title - hide when collapsed */}
      {section.title && !isCollapsed && (
        <button
          onClick={handleToggle}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors",
            section.collapsible ? "cursor-pointer hover:bg-gray-50 rounded-lg" : "cursor-default",
            variant === 'admin' ? "text-purple-400" : "text-gray-400"
          )}
          disabled={!section.collapsible}
        >
          <span>{section.title}</span>
          {section.collapsible && (
            <ChevronDown
              className={cn(
                "w-4 h-4 transition-transform duration-200",
                isExpanded ? "rotate-0" : "-rotate-90"
              )}
            />
          )}
        </button>
      )}

      <div
        className={cn(
          "space-y-0.5 overflow-hidden transition-all duration-200",
          // When collapsed, always show items (no collapsing of sections)
          isCollapsed || isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        {section.items.map((item) => (
          <SidebarNavItem
            key={item.path}
            item={item}
            onClick={onNavigate}
            variant={variant}
            isCollapsed={isCollapsed}
          />
        ))}
      </div>
    </div>
  );
};

export { SidebarSection };
