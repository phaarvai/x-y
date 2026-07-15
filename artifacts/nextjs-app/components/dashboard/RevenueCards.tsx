import { IndianRupee } from "lucide-react";

type RevenueCardsProps = {
  today: string | number;
  month: string | number;
  year: string | number;
  loading?: boolean;
  currency?: string;
};

function formatAmount(value: string | number, currency: string) {
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  const prefix = currency === "INR" ? "₹" : `${currency} `;
  return `${prefix}${n.toLocaleString()}`;
}

export default function RevenueCards({ today, month, year, loading, currency = "INR" }: RevenueCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 animate-pulse">
            <div className="h-3 w-20 bg-slate-100 rounded" />
            <div className="mt-3 h-7 w-24 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const items = [
    { label: "Today", value: today },
    { label: "This Month", value: month },
    { label: "This Year", value: year },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {items.map((item) => (
        <div key={item.label} className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{item.label}</p>
            <IndianRupee className="w-4 h-4 text-teal-700" />
          </div>
          <p className="mt-2 text-xl font-semibold text-slate-900">{formatAmount(item.value, currency)}</p>
        </div>
      ))}
    </div>
  );
}
