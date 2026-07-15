"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type AccordionContextValue = {
  type: "single" | "multiple";
  open: Set<string>;
  toggle: (value: string) => void;
};

const AccordionContext = React.createContext<AccordionContextValue | null>(null);

type AccordionProps = {
  type?: "single" | "multiple";
  defaultValue?: string | string[];
  children: React.ReactNode;
  className?: string;
};

export function Accordion({ type = "single", defaultValue, children, className }: AccordionProps) {
  const initial = new Set(
    Array.isArray(defaultValue) ? defaultValue : defaultValue ? [defaultValue] : [],
  );
  const [open, setOpen] = React.useState(initial);

  const toggle = (value: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (type === "single") {
        return next.has(value) ? new Set() : new Set([value]);
      }
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  return (
    <AccordionContext.Provider value={{ type, open, toggle }}>
      <div className={className}>{children}</div>
    </AccordionContext.Provider>
  );
}

export const AccordionItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, value, children, ...props }, ref) => (
  <div ref={ref} data-value={value} className={cn("border-b", className)} {...props}>
    {children}
  </div>
));
AccordionItem.displayName = "AccordionItem";

export const AccordionTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }
>(({ className, value, children, ...props }, ref) => {
  const ctx = React.useContext(AccordionContext);
  const isOpen = ctx?.open.has(value) ?? false;
  return (
    <h3 className="flex">
      <button
        ref={ref}
        type="button"
        aria-expanded={isOpen}
        className={cn(
          "flex flex-1 items-center justify-between py-4 text-sm font-medium transition-all hover:underline text-left",
          className,
        )}
        onClick={() => ctx?.toggle(value)}
        {...props}
      >
        {children}
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
      </button>
    </h3>
  );
});
AccordionTrigger.displayName = "AccordionTrigger";

export const AccordionContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, value, children, ...props }, ref) => {
  const ctx = React.useContext(AccordionContext);
  if (!ctx?.open.has(value)) return null;
  return (
    <div ref={ref} className={cn("overflow-hidden text-sm pb-4 pt-0", className)} {...props}>
      {children}
    </div>
  );
});
AccordionContent.displayName = "AccordionContent";
