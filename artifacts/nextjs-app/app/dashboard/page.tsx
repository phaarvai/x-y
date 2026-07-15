"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  isManufacturerRole,
  isVisionaryRole,
  isServiceProviderRole,
} from "@/lib/analytics-utils";

export default function DashboardRouterPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) return;

    const role = user.primaryRole;
    if (isManufacturerRole(role)) {
      router.replace("/dashboard/manufacturer");
    } else if (isVisionaryRole(role)) {
      router.replace("/dashboard/visionary");
    } else if (isServiceProviderRole(role)) {
      router.replace("/dashboard/provider");
    } else {
      router.replace("/dashboard/payments");
    }
  }, [isLoading, isAuthenticated, user, router]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        {isLoading || isAuthenticated ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-teal-700" />
            <p className="text-sm text-slate-500">Loading your dashboard…</p>
          </div>
        ) : (
          <>
            <p className="text-slate-600 mb-4">Sign in to view your dashboard.</p>
            <Link href="/login">
              <Button className="bg-teal-700 hover:bg-teal-800 text-white">Sign In</Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
