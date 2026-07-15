import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type LoadingSpinnerProps = {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
};

const sizeClass = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

export function LoadingSpinner({ size = "md", label, className }: LoadingSpinnerProps) {
  return (
    <div role="status" aria-live="polite" className={cn("inline-flex items-center gap-2", className)}>
      <Loader2 className={cn("animate-spin text-primary", sizeClass[size])} />
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
      <span className="sr-only">{label ?? "Loading"}</span>
    </div>
  );
}
