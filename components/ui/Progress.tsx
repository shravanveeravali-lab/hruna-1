import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export function ProgressBar({ percent, className }: { percent: number; className?: string }) {
  return (
    <div className={cn("w-full h-2 rounded-full bg-surface-container overflow-hidden", className)}>
      <div
        className="h-full rounded-full bg-primary transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}

export function Stepper({
  steps,
  currentIndex,
}: {
  steps: string[];
  currentIndex: number;
}) {
  return (
    <div className="flex items-center w-full">
      {steps.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  "flex items-center justify-center w-9 h-9 rounded-full text-sm font-medium border transition-colors shrink-0",
                  done && "bg-primary border-primary text-white",
                  active && "border-primary text-primary bg-primary-container",
                  !done && !active && "border-outline-variant text-outline bg-surface-lowest"
                )}
              >
                {done ? <Check size={16} /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-xs text-center max-w-[80px] hidden sm:block",
                  active ? "text-ink font-medium" : "text-outline"
                )}
              >
                {step}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-px mx-2 transition-colors",
                  done ? "bg-primary" : "bg-outline-variant"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function Timeline({
  stages,
  currentStage,
}: {
  stages: string[];
  currentStage: string;
}) {
  const currentIndex = stages.indexOf(currentStage);
  return (
    <ol className="flex flex-col gap-0">
      {stages.map((stage, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <li key={stage} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-3 h-3 rounded-full border-2 shrink-0 mt-1",
                  done && "bg-primary border-primary",
                  active && "border-primary bg-primary-container",
                  !done && !active && "border-outline-variant bg-surface-lowest"
                )}
              />
              {i < stages.length - 1 && (
                <div className={cn("w-px flex-1 min-h-[28px]", done ? "bg-primary" : "bg-outline-variant")} />
              )}
            </div>
            <p
              className={cn(
                "pb-6 text-sm",
                active ? "text-ink font-medium" : done ? "text-ink-variant" : "text-outline"
              )}
            >
              {stage}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
