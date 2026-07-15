import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export type QuickAction = {
  label: string;
  href: string;
};

type QuickActionsProps = {
  actions: QuickAction[];
  title?: string;
};

export default function QuickActions({ actions, title = "Quick Actions" }: QuickActionsProps) {
  if (actions.length === 0) return null;

  return (
    <section>
      <h2 className="text-sm font-semibold text-slate-900 mb-2">{title}</h2>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Link key={`${action.href}-${action.label}`} href={action.href}>
            <Button variant="outline" size="sm" className="gap-1 border-slate-200 text-slate-700 hover:bg-slate-50">
              {action.label}
              <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        ))}
      </div>
    </section>
  );
}
