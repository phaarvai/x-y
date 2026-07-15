"use client";

import Link from "next/link";
import XiyLogo from "@/components/XiyLogo";

const CARDS = [
  { href: "/browse", title: "Manufacturers", desc: "Find factories and machinery capacity" },
  { href: "/vendors", title: "Vendors", desc: "Raw materials and supply listings" },
  { href: "/labor", title: "Labor", desc: "Skilled workforce and crews" },
  { href: "/logistics", title: "Logistics", desc: "Freight, warehousing, and delivery" },
  { href: "/investors", title: "Investors", desc: "Discover capital partners" },
  { href: "/market-opportunities", title: "Market Opportunities", desc: "Demand signals and leads" },
  { href: "/legal", title: "Legal Services", desc: "Contracts, compliance, and counsel" },
];

export default function MarketplaceHubPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <header className="bg-white border-b h-14 flex items-center px-6">
        <Link href="/"><XiyLogo size="sm" /></Link>
      </header>
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900">Marketplace</h1>
        <p className="text-gray-500 mt-2 mb-8">Browse services across every X!Y persona.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {CARDS.map((c) => (
            <Link key={c.href} href={c.href} className="bg-white border rounded-xl p-5 shadow-sm hover:border-blue-300 transition-colors">
              <div className="font-semibold text-gray-900">{c.title}</div>
              <div className="text-sm text-gray-500 mt-1">{c.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
