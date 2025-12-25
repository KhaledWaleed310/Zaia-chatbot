import { Users, Headphones, Calendar, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

const FEATURE_CONFIG = {
  leads: {
    color: 'bg-blue-100 text-blue-600',
    icon: Users,
    label: 'Leads'
  },
  livechat: {
    color: 'bg-green-100 text-green-600',
    icon: Headphones,
    label: 'Live'
  },
  bookings: {
    color: 'bg-amber-100 text-amber-600',
    icon: Calendar,
    label: 'Book'
  },
  multilang: {
    color: 'bg-purple-100 text-purple-600',
    icon: Globe,
    label: 'Multi'
  }
};

const FeatureBadge = ({
  type,
  showLabel = false,
  size = 'sm', // 'xs' | 'sm' | 'md'
  className
}) => {
  const config = FEATURE_CONFIG[type];
  if (!config) return null;

  const Icon = config.icon;

  const sizeClasses = {
    xs: 'px-1 py-0.5 text-[10px]',
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-sm'
  };

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-4 h-4'
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded font-medium",
        config.color,
        sizeClasses[size],
        className
      )}
    >
      <Icon className={iconSizes[size]} />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
};

// Dot indicator for sidebar
const FeatureDot = ({ active = false, color = 'green' }) => {
  const colors = {
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    purple: 'bg-purple-500'
  };

  return (
    <span
      className={cn(
        "w-2 h-2 rounded-full",
        active ? colors[color] : 'bg-gray-300'
      )}
    />
  );
};

export { FeatureBadge, FeatureDot };
