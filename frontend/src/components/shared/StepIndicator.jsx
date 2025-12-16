import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const StepIndicator = ({ steps, currentStep, onStepClick, className }) => (
  <nav aria-label="Progress" className={cn("mb-8", className)}>
    <ol className="flex items-center justify-between">
      {steps.map((step, index) => {
        const status = index < currentStep
          ? 'complete'
          : index === currentStep
            ? 'current'
            : 'upcoming';
        const isClickable = onStepClick && index <= currentStep;

        return (
          <li key={step.id} className="relative flex-1">
            {/* Connector line */}
            {index !== 0 && (
              <div
                className={cn(
                  "absolute top-4 left-0 -translate-x-1/2 w-full h-0.5 -z-10",
                  status === 'upcoming' ? 'bg-muted' : 'bg-primary'
                )}
              />
            )}

            <button
              type="button"
              onClick={() => isClickable && onStepClick(index)}
              disabled={!isClickable}
              className={cn(
                "relative flex flex-col items-center group",
                isClickable ? "cursor-pointer" : "cursor-default"
              )}
            >
              {/* Step circle */}
              <span
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  status === 'complete' && "bg-primary text-primary-foreground",
                  status === 'current' && "border-2 border-primary bg-background text-primary",
                  status === 'upcoming' && "border-2 border-muted bg-background text-muted-foreground"
                )}
              >
                {status === 'complete' ? (
                  <Check className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </span>

              {/* Step label */}
              <span
                className={cn(
                  "mt-2 text-xs font-medium text-center max-w-[80px] hidden sm:block",
                  status === 'current' ? "text-primary" : "text-muted-foreground"
                )}
              >
                {step.name}
              </span>
            </button>
          </li>
        );
      })}
    </ol>

    {/* Mobile: Show current step name */}
    <div className="sm:hidden text-center mt-4">
      <span className="text-sm font-medium text-primary">
        Step {currentStep + 1}: {steps[currentStep]?.name}
      </span>
    </div>
  </nav>
);

export { StepIndicator };
