"use client";

import Navbar from "@/components/Navbar";
import ReviewsPanel from "@/components/reviews/ReviewsPanel";

export default function ReviewsPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <ReviewsPanel title="Marketplace reviews" />
      </div>
    </div>
  );
}
