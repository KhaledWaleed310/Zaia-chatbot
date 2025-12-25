import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const FEATURE_COLORS = {
  blue: {
    bg: 'bg-gradient-to-r from-blue-50 to-white',
    border: 'border-blue-100',
    iconBg: 'bg-blue-100',
    iconText: 'text-blue-600',
    activeBg: 'from-blue-100'
  },
  green: {
    bg: 'bg-gradient-to-r from-green-50 to-white',
    border: 'border-green-100',
    iconBg: 'bg-green-100',
    iconText: 'text-green-600',
    activeBg: 'from-green-100'
  },
  amber: {
    bg: 'bg-gradient-to-r from-amber-50 to-white',
    border: 'border-amber-100',
    iconBg: 'bg-amber-100',
    iconText: 'text-amber-600',
    activeBg: 'from-amber-100'
  },
  purple: {
    bg: 'bg-gradient-to-r from-purple-50 to-white',
    border: 'border-purple-100',
    iconBg: 'bg-purple-100',
    iconText: 'text-purple-600',
    activeBg: 'from-purple-100'
  },
  indigo: {
    bg: 'bg-gradient-to-r from-indigo-50 to-white',
    border: 'border-indigo-100',
    iconBg: 'bg-indigo-100',
    iconText: 'text-indigo-600',
    activeBg: 'from-indigo-100'
  }
};

const FeatureToggle = ({
  enabled,
  onChange,
  icon: Icon,
  color = 'blue',
  title,
  description,
  disabled = false,
  loading = false,
  children
}) => {
  const colorConfig = FEATURE_COLORS[color] || FEATURE_COLORS.blue;

  return (
    <div
      className={cn(
        "p-4 rounded-xl border transition-all",
        colorConfig.bg,
        colorConfig.border,
        enabled && colorConfig.activeBg,
        disabled && "opacity-60"
      )}
    >
      <div className="flex items-start sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
          <div className={cn(
            "p-2 sm:p-2.5 rounded-lg sm:rounded-xl flex-shrink-0",
            colorConfig.iconBg
          )}>
            <Icon className={cn("w-4 h-4 sm:w-5 sm:h-5", colorConfig.iconText)} />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 text-sm sm:text-base">{title}</p>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{description}</p>
          </div>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onChange}
          disabled={disabled || loading}
          className="flex-shrink-0"
        />
      </div>
      {children && enabled && (
        <div className="mt-4">
          {children}
        </div>
      )}
    </div>
  );
};

export { FeatureToggle };
