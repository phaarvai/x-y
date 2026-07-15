"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

type DrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
  side?: "left" | "right";
  className?: string;
};

export function Drawer({
  open,
  onOpenChange,
  title,
  children,
  side = "right",
  className,
}: DrawerProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close drawer overlay"
        className="absolute inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      <aside
        className={cn(
          "absolute top-0 h-full w-full max-w-sm bg-background border shadow-xl p-6 transition-transform",
          side === "right" ? "right-0" : "left-0",
          className,
        )}
      >
        <div className="flex items-center justify-between mb-4">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        {children}
      </aside>
    </div>
  );
}
