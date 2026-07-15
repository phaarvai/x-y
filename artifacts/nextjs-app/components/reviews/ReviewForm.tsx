"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/reviews/StarRating";
import { apiUrl } from "@/lib/api-url";

const MAX = 1000;

export default function ReviewForm({
  bookingId,
  token,
  onSuccess,
}: {
  bookingId: string | number;
  token: string | null;
  onSuccess?: () => void;
}) {
  const qc = useQueryClient();
  const [overall, setOverall] = useState(0);
  const [quality, setQuality] = useState(0);
  const [communication, setCommunication] = useState(0);
  const [timeliness, setTimeliness] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = useMutation({
    mutationFn: async () => {
      if (!overall || !quality || !communication || !timeliness) {
        throw new Error("Please rate all categories (1–5 stars).");
      }
      const res = await fetch(apiUrl(`/api/bookings/${bookingId}/reviews`), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          overallRating: overall,
          qualityRating: quality,
          communicationRating: communication,
          timelinessRating: timeliness,
          comment: comment.trim() || null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to submit review");
      return body;
    },
    onSuccess: () => {
      setSuccess(true);
      setError(null);
      qc.invalidateQueries({ queryKey: ["booking-reviews", String(bookingId)] });
      onSuccess?.();
    },
    onError: (e: Error) => setError(e.message),
  });

  if (success) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        Thank you! Your review was submitted
        {submit.data?.status === "PENDING" ? " and is pending moderation." : "."}
      </div>
    );
  }

  return (
    <form
      className="space-y-4 rounded-xl border border-gray-200 bg-white p-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit.mutate();
      }}
    >
      <h3 className="font-semibold text-gray-900">Leave a review</h3>
      <div className="space-y-3">
        <StarRating label="Overall" value={overall} onChange={setOverall} />
        <StarRating label="Quality" value={quality} onChange={setQuality} />
        <StarRating label="Communication" value={communication} onChange={setCommunication} />
        <StarRating label="Timeliness" value={timeliness} onChange={setTimeliness} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-gray-500">Comment (optional)</Label>
        <Textarea
          rows={4}
          maxLength={MAX}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share details about your experience…"
        />
        <p className="text-xs text-gray-400 text-right">{comment.length}/{MAX}</p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" className="bg-blue-600 text-white" disabled={submit.isPending}>
        {submit.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit review"}
      </Button>
    </form>
  );
}
