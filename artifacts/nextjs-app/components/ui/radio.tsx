"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type RadioGroupContextValue = {
  value: string;
  onValueChange: (value: string) => void;
  name: string;
};

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(null);

type RadioGroupProps = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  children: React.ReactNode;
  className?: string;
};

export function RadioGroup({
  value,
  defaultValue = "",
  onValueChange,
  name = "radio-group",
  children,
  className,
}: RadioGroupProps) {
  const [internal, setInternal] = React.useState(defaultValue);
  const current = value ?? internal;
  const setValue = (next: string) => {
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
  };

  return (
    <RadioGroupContext.Provider value={{ value: current, onValueChange: setValue, name }}>
      <div role="radiogroup" className={cn("grid gap-2", className)}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

type RadioGroupItemProps = React.InputHTMLAttributes<HTMLInputElement> & { value: string };

export const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, value, id, ...props }, ref) => {
    const ctx = React.useContext(RadioGroupContext);
    const inputId = id ?? `${ctx?.name}-${value}`;
    return (
      <input
        ref={ref}
        type="radio"
        id={inputId}
        name={ctx?.name}
        value={value}
        checked={ctx?.value === value}
        onChange={() => ctx?.onValueChange(value)}
        className={cn(
          "h-4 w-4 rounded-full border border-primary text-primary focus:ring-1 focus:ring-ring",
          className,
        )}
        {...props}
      />
    );
  },
);
RadioGroupItem.displayName = "RadioGroupItem";

export { RadioGroupItem as Radio };
