"use client";

import { BadgeCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api-url";
import { cn } from "@/lib/utils";

export function VerifiedBadge({
  entityType,
  entityId,
  className,
  showLabel = true,
}: {
  entityType: string;
  entityId: number | string;
  className?: string;
  showLabel?: boolean;
}) {
  const { data } = useQuery({
    queryKey: ["verification", entityType, entityId],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/verifications/${entityType}/${entityId}`));
      if (!res.ok) return { isVerified: false };
      return res.json();
    },
    staleTime: 60_000,
  });

  if (!data?.isVerified) return null;

  return (
    <span
      title={data.active?.verificationType ? `Verified: ${data.active.verificationType}` : "Verified"}
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full",
        className,
      )}
    >
      <BadgeCheck className="w-3.5 h-3.5" />
      {showLabel && "Verified"}
    </span>
  );
}
