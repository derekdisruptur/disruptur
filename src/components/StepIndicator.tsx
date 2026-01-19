import { cn } from "@/lib/utils";
import { Check, Lock } from "lucide-react";

interface StepIndicatorProps {
  stepNumber: number;
  currentStep: number;
  totalSteps: number;
}

export function StepIndicator({ stepNumber, currentStep, totalSteps }: StepIndicatorProps) {
  const isActive = stepNumber === currentStep;
  const isCompleted = stepNumber < currentStep;
  const isLocked = stepNumber > currentStep;

  return (
    <div
      className={cn(
        "step-indicator",
        isActive && "active",
        isCompleted && "completed",
        isLocked && "locked"
      )}
    >
      {isCompleted ? (
        <Check className="w-4 h-4" />
      ) : isLocked ? (
        <Lock className="w-3 h-3" />
      ) : (
        <span>{stepNumber}</span>
      )}
    </div>
  );
}

interface StepProgressProps {
  currentStep: number;
  totalSteps: number;
}

export function StepProgress({ currentStep, totalSteps }: StepProgressProps) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div key={i} className="flex items-center">
          <StepIndicator
            stepNumber={i + 1}
            currentStep={currentStep}
            totalSteps={totalSteps}
          />
          {i < totalSteps - 1 && (
            <div 
              className={cn(
                "w-4 h-[2px]",
                i + 1 < currentStep ? "bg-foreground" : "bg-muted"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
