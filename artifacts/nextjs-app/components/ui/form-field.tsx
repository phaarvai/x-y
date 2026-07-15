"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FormFieldProps = {
  id: string;
  label: string;
  description?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  counter?: { value: number; max: number };
  children: React.ReactNode;
  className?: string;
  helpHref?: string;
};

/**
 * Accessible form field wrapper — labels, hints, errors, character counters (NFR usability).
 */
export function FormField({
  id,
  label,
  description,
  hint,
  error,
  required,
  counter,
  children,
  className,
  helpHref,
}: FormFieldProps) {
  const describedBy = [
    description ? `${id}-desc` : null,
    hint ? `${id}-hint` : null,
    error ? `${id}-error` : null,
    counter ? `${id}-counter` : null,
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
          {required ? <span className="text-red-600" aria-hidden> *</span> : null}
        </Label>
        {helpHref ? (
          <a href={helpHref} className="text-xs text-blue-600 hover:underline" target="_blank" rel="noreferrer">
            Help
          </a>
        ) : null}
      </div>
      {description ? (
        <p id={`${id}-desc`} className="text-xs text-gray-500">{description}</p>
      ) : null}
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-gray-400" title={hint}>
          Example: {hint}
        </p>
      ) : null}
      <div
        // Clone child to inject a11y ids when possible
      >
        {React.isValidElement(children)
          ? React.cloneElement(children as React.ReactElement<{ id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean; "aria-required"?: boolean }>, {
              id,
              "aria-describedby": describedBy,
              "aria-invalid": !!error || undefined,
              "aria-required": required || undefined,
            })
          : children}
      </div>
      <div className="flex items-start justify-between gap-2">
        {error ? (
          <p id={`${id}-error`} role="alert" className="text-xs text-red-600">{error}</p>
        ) : (
          <span />
        )}
        {counter ? (
          <p
            id={`${id}-counter`}
            className={cn("text-xs tabular-nums", counter.value > counter.max ? "text-red-600" : "text-gray-400")}
            aria-live="polite"
          >
            {counter.value}/{counter.max}
          </p>
        ) : null}
      </div>
    </div>
  );
}
