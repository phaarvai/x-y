"use client";

import * as React from "react";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type FilterPanelProps = {
  title?: string;
  children: React.ReactNode;
  onApply?: () => void;
  onReset?: () => void;
  applyLabel?: string;
  resetLabel?: string;
  className?: string;
  defaultOpen?: boolean;
};

export function FilterPanel({
  title = "Filters",
  children,
  onApply,
  onReset,
  applyLabel = "Apply",
  resetLabel = "Reset",
  className,
  defaultOpen = true,
}: FilterPanelProps) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div className={cn("rounded-lg border bg-card", className)}>
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="inline-flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          {title}
        </span>
        <span className="text-muted-foreground text-xs">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="border-t px-4 py-4 space-y-4">
          {children}
          {(onApply || onReset) && (
            <div className="flex items-center gap-2 pt-2">
              {onApply && (
                <Button type="button" size="sm" onClick={onApply}>
                  {applyLabel}
                </Button>
              )}
              {onReset && (
                <Button type="button" size="sm" variant="outline" onClick={onReset}>
                  {resetLabel}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
