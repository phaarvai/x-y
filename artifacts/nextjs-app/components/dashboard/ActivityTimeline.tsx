import { Clock } from "lucide-react";

export type ActivityItem = {
  type: string;
  label: string;
  createdAt: string;
};

type ActivityTimelineProps = {
  items: ActivityItem[];
  loading?: boolean;
  title?: string;
};

const TYPE_COLORS: Record<string, string> = {
  LISTING_CREATED: "bg-blue-50 text-blue-700",
  BOOKING_RECEIVED: "bg-teal-50 text-teal-700",
  BOOKING: "bg-teal-50 text-teal-700",
  REVIEW_RECEIVED: "bg-amber-50 text-amber-800",
  REVIEW: "bg-amber-50 text-amber-800",
  PAYMENT_RECEIVED: "bg-emerald-50 text-emerald-700",
  PAYMENT: "bg-emerald-50 text-emerald-700",
  REVENUE: "bg-emerald-50 text-emerald-700",
  NOTIFICATION: "bg-slate-100 text-slate-700",
  REQUIREMENT: "bg-violet-50 text-violet-700",
  AD: "bg-orange-50 text-orange-700",
};

export default function ActivityTimeline({ items, loading, title = "Recent Activity" }: ActivityTimelineProps) {
  if (loading) {
    return (
      <section className="bg-white border border-slate-200 rounded-xl p-4">
        <h2 className="font-semibold text-slate-900 mb-3">{title}</h2>
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-slate-50 rounded-lg" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-4">
      <h2 className="font-semibold text-slate-900 mb-3">{title}</h2>
      {items.length === 0 ? (
        <div className="text-center py-8 text-sm text-slate-500">
          <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          No recent activity yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item, idx) => (
            <li
              key={`${item.type}-${item.createdAt}-${idx}`}
              className="flex items-start justify-between gap-3 text-sm py-2 border-b border-slate-50 last:border-0"
            >
              <div className="min-w-0">
                <span
                  className={`inline-block text-xs px-1.5 py-0.5 rounded font-medium mr-2 ${
                    TYPE_COLORS[item.type] || "bg-slate-100 text-slate-600"
                  }`}
                >
                  {item.type.replace(/_/g, " ")}
                </span>
                <span className="text-slate-700">{item.label}</span>
              </div>
              <time className="text-xs text-slate-400 shrink-0 whitespace-nowrap">
                {new Date(item.createdAt).toLocaleString()}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
