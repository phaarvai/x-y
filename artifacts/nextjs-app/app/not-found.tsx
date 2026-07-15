import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <p className="text-6xl font-bold text-primary">404</p>
        <h1 className="text-xl font-bold text-slate-900 mt-4">Page not found</h1>
        <p className="text-sm text-slate-600 mt-2">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
          <Link href="/browse">
            <Button variant="outline">Browse Manufacturers</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
