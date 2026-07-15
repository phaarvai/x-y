export default function XiyLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? 20 : size === "lg" ? 36 : 28;
  return (
    <div className="flex items-center gap-2">
      <svg width={sz} height={sz} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <rect width="28" height="28" rx="6" fill="#EEF2FF" />
        <path d="M6 20V12l4-4h8l4 4v8H6z" stroke="#2563EB" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
        <rect x="11" y="14" width="2.5" height="6" rx="0.5" fill="#2563EB" />
        <rect x="14.5" y="14" width="2.5" height="6" rx="0.5" fill="#2563EB" />
        <path d="M10 12h8" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="20" cy="8" r="3" fill="#7C3AED" />
        <path d="M19 8l1 1 1.5-1.5" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className={`font-bold text-[#2563EB] tracking-tight ${size === "sm" ? "text-lg" : size === "lg" ? "text-3xl" : "text-xl"}`}>X!Y</span>
    </div>
  );
}
