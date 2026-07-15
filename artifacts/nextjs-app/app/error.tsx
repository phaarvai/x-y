"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <p className="text-6xl font-bold text-destructive">500</p>
        <h1 className="text-xl font-bold text-slate-900 mt-4">Something went wrong</h1>
        <p className="text-sm text-slate-600 mt-2">
          An unexpected error occurred. Please try again or return to the homepage.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
          <Button onClick={reset}>Try Again</Button>
          <Link href="/">
            <Button variant="outline">Go Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
