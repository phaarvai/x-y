"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  value,
  onChange,
  size = "md",
  readOnly = false,
  label,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: "sm" | "md" | "lg";
  readOnly?: boolean;
  label?: string;
}) {
  const px = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-7 h-7" : "w-5 h-5";
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-gray-500 w-28 shrink-0">{label}</span>}
      <div className="flex items-center gap-0.5" role={readOnly ? "img" : "radiogroup"} aria-label={label || "Rating"}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(n)}
            className={cn("p-0.5", readOnly ? "cursor-default" : "cursor-pointer hover:scale-110 transition-transform")}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
          >
            <Star
              className={cn(px, n <= value ? "fill-amber-400 text-amber-400" : "text-gray-300")}
            />
          </button>
        ))}
      </div>
      {value > 0 && <span className="text-xs text-gray-500">{value}/5</span>}
    </div>
  );
}

export function RatingBadge({
  average,
  count,
  className,
}: {
  average: number;
  count: number;
  className?: string;
}) {
  if (!count) {
    return <span className={cn("text-xs text-gray-400", className)}>No reviews yet</span>;
  }
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm text-gray-700", className)}>
      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
      <span className="font-medium">{average.toFixed(1)}</span>
      <span className="text-gray-400 text-xs">({count} Reviews)</span>
    </span>
  );
}
