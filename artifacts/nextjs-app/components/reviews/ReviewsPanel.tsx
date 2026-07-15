"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Flag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StarRating, RatingBadge } from "@/components/reviews/StarRating";
import { apiUrl } from "@/lib/api-url";
import { useAuthContext } from "@/hooks/use-auth";

type Review = {
  id: number;
  overallRating: number;
  qualityRating: number;
  communicationRating: number;
  timelinessRating: number;
  comment: string | null;
  createdAt: string;
  reviewerName?: string | null;
  isVerifiedBooking?: boolean;
  reviewerUserId: number;
};

type Summary = {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<string, number>;
  categoryAverages: {
    quality: number;
    communication: number;
    timeliness: number;
    overall: number;
  };
};

export default function ReviewsPanel({
  facilityId,
  reviewedUserId,
  title = "Reviews",
}: {
  facilityId?: number;
  reviewedUserId?: number;
  title?: string;
}) {
  const { token } = useAuthContext();
  const [sort, setSort] = useState("newest");
  const [rating, setRating] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [reportId, setReportId] = useState<number | null>(null);

  const summaryKey = facilityId
    ? ["facility-rating", facilityId]
    : ["user-rating", reviewedUserId];
  const summaryUrl = facilityId
    ? `/api/facilities/${facilityId}/rating-summary`
    : `/api/users/${reviewedUserId}/rating-summary`;

  const summary = useQuery<Summary>({
    queryKey: summaryKey,
    enabled: !!(facilityId || reviewedUserId),
    queryFn: async () => {
      const res = await fetch(apiUrl(summaryUrl));
      if (!res.ok) throw new Error("Failed to load summary");
      return res.json();
    },
  });

  const params = new URLSearchParams({
    page: String(page),
    limit: "10",
    sort,
  });
  if (rating !== "all") params.set("rating", rating);
  if (q) params.set("q", q);
  if (facilityId) params.set("facilityId", String(facilityId));
  if (reviewedUserId) params.set("reviewedUserId", String(reviewedUserId));

  const list = useQuery<{ items: Review[]; total: number }>({
    queryKey: ["reviews", params.toString()],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/reviews?${params}`));
      if (!res.ok) throw new Error("Failed to load reviews");
      return res.json();
    },
  });

  const report = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(apiUrl(`/api/reviews/${id}/report`), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: "OTHER", description: "Reported from UI" }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Report failed");
      return body;
    },
    onSuccess: (_d, id) => setReportId(id),
  });

  const dist = summary.data?.ratingDistribution ?? {};
  const total = summary.data?.totalReviews ?? 0;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          {summary.isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-600 mt-2" />
          ) : (
            <RatingBadge
              average={summary.data?.averageRating ?? 0}
              count={summary.data?.totalReviews ?? 0}
              className="mt-1"
            />
          )}
        </div>
      </div>

      {summary.data && total > 0 && (
        <div className="grid sm:grid-cols-2 gap-4 bg-white border border-gray-200 rounded-xl p-4">
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const n = Number(dist[star] || 0);
              const pct = total ? Math.round((n / total) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="w-8">{star}★</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded overflow-hidden">
                    <div className="h-full bg-amber-400" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-right">{n}</span>
                </div>
              );
            })}
          </div>
          <div className="space-y-2 text-sm text-gray-700">
            <p>Quality: {summary.data.categoryAverages.quality.toFixed(1)}</p>
            <p>Communication: {summary.data.categoryAverages.communication.toFixed(1)}</p>
            <p>Timeliness: {summary.data.categoryAverages.timeliness.toFixed(1)}</p>
            <p>Overall: {summary.data.categoryAverages.overall.toFixed(1)}</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1); }}>
          <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Sort" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="highest">Highest rating</SelectItem>
            <SelectItem value="lowest">Lowest rating</SelectItem>
          </SelectContent>
        </Select>
        <Select value={rating} onValueChange={(v) => { setRating(v); setPage(1); }}>
          <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Stars" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stars</SelectItem>
            {[5, 4, 3, 2, 1].map((s) => (
              <SelectItem key={s} value={String(s)}>{s} star</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Search reviews…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-9 max-w-xs"
        />
      </div>

      {list.isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-600" /></div>
      ) : (list.data?.items?.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500 text-sm">
          No reviews match your filters.
        </div>
      ) : (
        <div className="space-y-3">
          {list.data!.items.map((r) => (
            <article key={r.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{r.reviewerName || `User #${r.reviewerUserId}`}</p>
                  <p className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  {r.isVerifiedBooking && (
                    <span className="text-[10px] uppercase tracking-wide bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">Booking verified</span>
                  )}
                  <StarRating value={r.overallRating} readOnly size="sm" />
                </div>
              </div>
              {r.comment && <p className="text-sm text-gray-600 whitespace-pre-wrap">{r.comment}</p>}
              <div className="mt-2 flex gap-4 text-xs text-gray-500">
                <span>Quality {r.qualityRating}</span>
                <span>Comm {r.communicationRating}</span>
                <span>Time {r.timelinessRating}</span>
              </div>
              {token && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="mt-2 h-7 text-xs text-gray-500 gap-1"
                  disabled={report.isPending || reportId === r.id}
                  onClick={() => report.mutate(r.id)}
                >
                  <Flag className="w-3 h-3" />
                  {reportId === r.id ? "Reported" : "Report review"}
                </Button>
              )}
            </article>
          ))}
        </div>
      )}

      {(list.data?.total ?? 0) > 10 && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <Button size="sm" variant="outline" disabled={page * 10 >= (list.data?.total ?? 0)} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </section>
  );
}
