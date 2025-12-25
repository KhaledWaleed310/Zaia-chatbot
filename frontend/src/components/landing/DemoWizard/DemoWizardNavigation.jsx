import { ArrowLeft, ArrowRight, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDemoWizard } from './index';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';

export const DemoWizardNavigation = () => {
  const {
    isFirstStep,
    isLastStep,
    nextStep,
    prevStep,
    currentStep,
    totalSteps,
    onClose
  } = useDemoWizard();
  const { isRtl } = useLanguage();

  return (
    <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
      {/* Start: Previous Button */}
      <div>
        {!isFirstStep && (
          <Button variant="ghost" onClick={prevStep} className="gap-2">
            <ArrowLeft className={cn("w-4 h-4", isRtl && "rotate-180")} />
            <span className="hidden sm:inline">Previous</span>
          </Button>
        )}
      </div>

      {/* Center: Step indicator (mobile) */}
      <div className="sm:hidden text-sm text-gray-500">
        {currentStep + 1} / {totalSteps}
      </div>

      {/* End: Next/Skip Buttons */}
      <div className="flex items-center gap-3">
        {!isLastStep && (
          <>
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-gray-500 hidden sm:flex"
            >
              <SkipForward className={cn("w-4 h-4 me-2", isRtl && "rotate-180")} />
              Skip Demo
            </Button>
            <Button onClick={nextStep} className="gap-2">
              <span>Next</span>
              <ArrowRight className={cn("w-4 h-4", isRtl && "rotate-180")} />
            </Button>
          </>
        )}

        {isLastStep && (
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        )}
      </div>
    </div>
  );
};

export default DemoWizardNavigation;
