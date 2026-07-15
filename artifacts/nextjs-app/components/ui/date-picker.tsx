"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type DatePickerProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
};

function DatePickerInner(
  { className, label, id, ...props }: DatePickerProps,
  ref: React.ForwardedRef<HTMLInputElement>,
) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  return (
    <div className={cn("grid gap-2", className)}>
      {label && <Label htmlFor={inputId}>{label}</Label>}
      <Input ref={ref} id={inputId} type="date" {...props} />
    </div>
  );
}

export const DatePicker = React.forwardRef(DatePickerInner);
DatePicker.displayName = "DatePicker";
