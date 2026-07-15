"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Bell, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import XiyLogo from "@/components/XiyLogo";
import { useAuth, useAuthContext } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api-url";

function roleLinks(role?: string | null) {
  switch (role) {
    case "MANUFACTURER":
      return [
        { href: "/provider-setup", label: "Factory" },
        { href: "/availability", label: "Availability" },
        { href: "/requests?inbox=manufacturer", label: "Inbox" },
      ];
    case "VISIONARY":
      return [
        { href: "/browse", label: "Browse" },
        { href: "/requirements/new", label: "Requirements" },
        { href: "/favorites", label: "Saved" },
        { href: "/requests", label: "Requests" },
      ];
    case "VENDOR":
      return [{ href: "/vendors", label: "Materials" }, { href: "/marketplace", label: "Hub" }];
    case "LABOR_SUPPLIER":
      return [{ href: "/labor", label: "Labor" }, { href: "/marketplace", label: "Hub" }];
    case "LOGISTICS_PROVIDER":
      return [{ href: "/logistics", label: "Logistics" }, { href: "/marketplace", label: "Hub" }];
    case "INVESTOR":
      return [{ href: "/investors", label: "Investors" }, { href: "/marketplace", label: "Hub" }];
    case "MARKET_LEAD":
      return [{ href: "/market-opportunities", label: "Opportunities" }, { href: "/marketplace", label: "Hub" }];
    case "LEGAL_PROVIDER":
      return [{ href: "/legal", label: "Legal" }];
    default:
      return [{ href: "/marketplace", label: "Marketplace" }];
  }
}

const primaryLinks = [
  { href: "/#how-it-works", label: "How it Works" },
  { href: "/browse", label: "Browse" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/legal", label: "Legal" },
  { href: "/pricing", label: "Pricing" },
];

const navLinkClass =
  "inline-flex items-center h-9 px-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors whitespace-nowrap";

export default function Navbar() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { token, logout } = useAuthContext();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin =
    user?.primaryRole === "PLATFORM_ADMIN" ||
    !!(user as { isAdminUser?: boolean } | undefined)?.isAdminUser;
  const persona = roleLinks(user?.primaryRole);

  const handleLogout = async () => {
    try {
      await fetch(apiUrl("/api/auth/logout"), {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {}
    logout();
    queryClient.clear();
    setMobileOpen(false);
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <Link href="/" className="shrink-0" onClick={() => setMobileOpen(false)}>
            <XiyLogo />
          </Link>

          <nav
            className="hidden md:flex flex-1 items-center justify-center gap-1 lg:gap-2 text-sm font-medium"
            role="navigation"
            aria-label="Primary"
          >
            {primaryLinks.map((l) => (
              <Link key={l.href} href={l.href} className={navLinkClass}>
                {l.label}
              </Link>
            ))}
            <Link
              href="/ai-assistant"
              className="inline-flex items-center gap-1.5 h-9 ml-1 px-3 rounded-full border border-violet-300 text-violet-600 hover:bg-violet-50 transition-colors text-sm font-medium whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" /> AI Assistant
            </Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {isAuthenticated ? (
              <>
                <div className="hidden lg:flex items-center gap-1 text-sm">
                  <Link href="/dashboard" className={navLinkClass}>
                    Dashboard
                  </Link>
                  {persona.map((l) => (
                    <Link key={l.href} href={l.href} className={navLinkClass}>
                      {l.label}
                    </Link>
                  ))}
                  <Link href="/notifications" className={`${navLinkClass} gap-1`}>
                    <Bell className="w-3.5 h-3.5" /> Alerts
                  </Link>
                  <Link href="/bookings" className={navLinkClass}>
                    Bookings
                  </Link>
                  {isAdmin && (
                    <Link href="/admin" className={navLinkClass}>
                      Admin
                    </Link>
                  )}
                </div>
                <span className="text-sm text-gray-600 hidden sm:inline max-w-[8rem] truncate">
                  Hi, {user?.name?.split(" ")[0]}
                </span>
                <Button variant="ghost" size="sm" className="text-gray-700" onClick={handleLogout}>
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link href="/login" className="hidden sm:inline-flex">
                  <Button variant="ghost" size="sm" className="text-gray-700 font-medium">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 sm:px-5 rounded-lg"
                  >
                    Get Started
                  </Button>
                </Link>
              </>
            )}
            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-lg text-gray-700 hover:bg-gray-100"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((o) => !o)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 py-3 pb-4">
            <nav className="flex flex-col gap-1" aria-label="Mobile">
              {primaryLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="px-2 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
                  onClick={() => setMobileOpen(false)}
                >
                  {l.label}
                </Link>
              ))}
              <Link
                href="/ai-assistant"
                className="px-2 py-2.5 text-sm font-medium text-violet-600 hover:bg-violet-50 rounded-lg inline-flex items-center gap-1.5"
                onClick={() => setMobileOpen(false)}
              >
                <Sparkles className="w-3.5 h-3.5" /> AI Assistant
              </Link>
              {isAuthenticated ? (
                <>
                  <Link
                    href="/dashboard"
                    className="px-2 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
                    onClick={() => setMobileOpen(false)}
                  >
                    Dashboard
                  </Link>
                  {persona.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="px-2 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
                      onClick={() => setMobileOpen(false)}
                    >
                      {l.label}
                    </Link>
                  ))}
                  <Link
                    href="/notifications"
                    className="px-2 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
                    onClick={() => setMobileOpen(false)}
                  >
                    Alerts
                  </Link>
                  <Link
                    href="/bookings"
                    className="px-2 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
                    onClick={() => setMobileOpen(false)}
                  >
                    Bookings
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="px-2 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
                      onClick={() => setMobileOpen(false)}
                    >
                      Admin
                    </Link>
                  )}
                </>
              ) : (
                <Link
                  href="/login"
                  className="px-2 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg sm:hidden"
                  onClick={() => setMobileOpen(false)}
                >
                  Sign In
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
