import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm">
        <p className="text-5xl font-bold text-amber-600">403</p>
        <h1 className="text-xl font-bold text-slate-900 mt-4">Access forbidden</h1>
        <p className="text-sm text-slate-600 mt-2">
          You don&apos;t have permission to view this page. Sign in with the correct account or
          contact support if you believe this is an error.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
          <Link href="/login">
            <Button>Sign In</Button>
          </Link>
          <Link href="/">
            <Button variant="outline">Go Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
