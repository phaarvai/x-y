"use client";

import type { DateRangePreset } from "@/lib/analytics-utils";

const PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "TODAY", label: "Today" },
  { value: "LAST_7_DAYS", label: "Last 7 days" },
  { value: "LAST_30_DAYS", label: "Last 30 days" },
  { value: "LAST_90_DAYS", label: "Last 90 days" },
  { value: "THIS_MONTH", label: "This month" },
  { value: "LAST_MONTH", label: "Last month" },
  { value: "THIS_YEAR", label: "This year" },
];

type DateRangeFilterProps = {
  value: string;
  onChange: (preset: string) => void;
  className?: string;
};

export default function DateRangeFilter({ value, onChange, className }: DateRangeFilterProps) {
  return (
    <div className={className}>
      <label htmlFor="date-range" className="sr-only">
        Date range
      </label>
      <select
        id="date-range"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
      >
        {PRESETS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
    </div>
  );
}
