import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useDemoWizard } from './index';
import { useLanguage } from '@/context/LanguageContext';

const colorClasses = {
  blue: { active: 'bg-blue-600', ring: 'ring-blue-100' },
  purple: { active: 'bg-purple-600', ring: 'ring-purple-100' },
  green: { active: 'bg-green-600', ring: 'ring-green-100' },
  amber: { active: 'bg-amber-600', ring: 'ring-amber-100' },
  emerald: { active: 'bg-emerald-600', ring: 'ring-emerald-100' },
  cyan: { active: 'bg-cyan-600', ring: 'ring-cyan-100' },
  indigo: { active: 'bg-indigo-600', ring: 'ring-indigo-100' },
  rose: { active: 'bg-rose-600', ring: 'ring-rose-100' },
  orange: { active: 'bg-orange-600', ring: 'ring-orange-100' },
  pink: { active: 'bg-pink-600', ring: 'ring-pink-100' },
  violet: { active: 'bg-violet-600', ring: 'ring-violet-100' }
};

export const DemoWizardProgress = () => {
  const { steps, currentStep, goToStep } = useDemoWizard();
  const { isRtl } = useLanguage();

  return (
    <div className="px-6 pt-6 pb-4 border-b bg-white">
      {/* Desktop: Full step indicators */}
      <div className="hidden sm:flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = index <= currentStep;
          const colors = colorClasses[step.color];

          return (
            <div key={step.id} className="flex items-center flex-1">
              <button
                onClick={() => isClickable && goToStep(index)}
                disabled={!isClickable}
                className={cn(
                  'flex flex-col items-center group',
                  isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                )}
              >
                {/* Step Circle */}
                <motion.div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all',
                    isCompleted && `${colors.active} text-white`,
                    isCurrent && `${colors.active} text-white ring-4 ${colors.ring}`,
                    !isCompleted && !isCurrent && 'bg-gray-200 text-gray-500'
                  )}
                  animate={isCurrent ? { scale: [1, 1.05, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : step.number}
                </motion.div>

                {/* Step Label */}
                <span
                  className={cn(
                    'mt-2 text-xs font-medium text-center transition-colors',
                    isCurrent ? 'text-gray-900' : 'text-gray-500'
                  )}
                >
                  {step.name}
                </span>
              </button>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-0.5 mx-3 bg-gray-200 overflow-hidden">
                  <motion.div
                    className={cn('h-full', colors.active)}
                    initial={{ width: 0 }}
                    animate={{ width: isCompleted ? '100%' : '0%' }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: Compact progress */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-900">
            Step {currentStep + 1} of {steps.length}
          </span>
          <span className="text-sm text-gray-500">{steps[currentStep].name}</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-blue-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    </div>
  );
};

export default DemoWizardProgress;
