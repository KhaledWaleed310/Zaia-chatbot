import { useMemo } from 'react';

/**
 * Circular score display component for SEO metrics
 * Score range: 0-100
 * Color coding: 0-40 red, 41-70 yellow, 71-100 green
 */
const SEOScoreCircle = ({ score, size = 'md', label, showLabel = true }) => {
  const sizeClasses = {
    sm: { container: 'w-12 h-12', text: 'text-sm', label: 'text-xs' },
    md: { container: 'w-16 h-16', text: 'text-lg', label: 'text-sm' },
    lg: { container: 'w-20 h-20', text: 'text-xl', label: 'text-base' },
    xl: { container: 'w-24 h-24', text: 'text-2xl', label: 'text-base' },
  };

  const { color, bgColor, ringColor } = useMemo(() => {
    if (score >= 71) {
      return {
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        ringColor: 'ring-green-500',
      };
    } else if (score >= 41) {
      return {
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        ringColor: 'ring-yellow-500',
      };
    } else {
      return {
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        ringColor: 'ring-red-500',
      };
    }
  }, [score]);

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const classes = sizeClasses[size] || sizeClasses.md;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`relative ${classes.container}`}>
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-gray-200"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={color}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className={`absolute inset-0 flex items-center justify-center font-bold ${color} ${classes.text}`}>
          {score}
        </div>
      </div>
      {showLabel && label && (
        <span className={`text-gray-500 ${classes.label}`}>{label}</span>
      )}
    </div>
  );
};

export default SEOScoreCircle;
