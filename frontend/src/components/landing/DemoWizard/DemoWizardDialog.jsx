import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { useDemoWizard } from './index';
import { DemoWizardProgress } from './DemoWizardProgress';
import { DemoWizardNavigation } from './DemoWizardNavigation';
import { useLanguage } from '@/context/LanguageContext';

// Step components
import { SignUpStep } from './steps/SignUpStep';
import { CreateChatbotStep } from './steps/CreateChatbotStep';
import { UploadDocsStep } from './steps/UploadDocsStep';
import { CustomizeStep } from './steps/CustomizeStep';
import { TestBotStep } from './steps/TestBotStep';
import { LeadCaptureStep } from './steps/LeadCaptureStep';
import { BookingStep } from './steps/BookingStep';
import { HandoffStep } from './steps/HandoffStep';
import { IntegrationsStep } from './steps/IntegrationsStep';
import { AnalyticsStep } from './steps/AnalyticsStep';
import { EmbedStep } from './steps/EmbedStep';

const stepComponents = [
  SignUpStep,
  CreateChatbotStep,
  UploadDocsStep,
  CustomizeStep,
  TestBotStep,
  LeadCaptureStep,
  BookingStep,
  HandoffStep,
  IntegrationsStep,
  AnalyticsStep,
  EmbedStep
];

// RTL-aware slide variants - direction is flipped for RTL
const getSlideVariants = (isRtl) => ({
  enter: (direction) => ({
    x: isRtl
      ? (direction > 0 ? -50 : 50)  // Flip for RTL
      : (direction > 0 ? 50 : -50),
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1
  },
  exit: (direction) => ({
    x: isRtl
      ? (direction > 0 ? 50 : -50)  // Flip for RTL
      : (direction > 0 ? -50 : 50),
    opacity: 0
  })
});

export const DemoWizardDialog = ({ isOpen }) => {
  const { currentStep, direction, onClose } = useDemoWizard();
  const { isRtl } = useLanguage();
  const StepComponent = stepComponents[currentStep];
  const slideVariants = getSlideVariants(isRtl);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] p-0 overflow-hidden flex flex-col gap-0 bg-white">
        {/* Accessible title (visually hidden) */}
        <DialogTitle className="sr-only">Interactive Product Demo</DialogTitle>
        <DialogDescription className="sr-only">
          Walk through the steps to see how Aiden works
        </DialogDescription>

        {/* Progress Indicator */}
        <DemoWizardProgress />

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 min-h-[400px]">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="h-full"
            >
              <StepComponent />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <DemoWizardNavigation />
      </DialogContent>
    </Dialog>
  );
};

export default DemoWizardDialog;
