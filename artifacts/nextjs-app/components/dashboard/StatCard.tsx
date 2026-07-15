import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  loading?: boolean;
};

export default function StatCard({ label, value, icon: Icon, loading }: StatCardProps) {
  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-4 animate-pulse">
        <div className="h-3 w-24 bg-slate-100 rounded" />
        <div className="mt-3 h-7 w-16 bg-slate-100 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <Icon className="w-4 h-4 text-teal-700 shrink-0" />
      </div>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
