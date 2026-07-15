import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminUnauthorizedPage() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 p-8 text-center">
        <h1 className="text-xl font-bold text-slate-900">Access Denied</h1>
        <p className="text-sm text-slate-600 mt-2">
          You don&apos;t have permission to access the admin console. Contact a platform administrator if
          you believe this is an error.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
          <Link href="/">
            <Button variant="outline">Go Home</Button>
          </Link>
          <Link href="/admin/login">
            <Button className="bg-teal-700 hover:bg-teal-800 text-white">Admin Login</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
