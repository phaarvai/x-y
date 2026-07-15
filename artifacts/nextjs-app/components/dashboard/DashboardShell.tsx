import Navbar from "@/components/Navbar";

type DashboardShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  showNavbar?: boolean;
  maxWidth?: "4xl" | "6xl" | "7xl";
};

const WIDTH_CLASS = {
  "4xl": "max-w-4xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
} as const;

export default function DashboardShell({
  title,
  subtitle,
  children,
  showNavbar = true,
  maxWidth = "6xl",
}: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      {showNavbar ? (
        <Navbar />
      ) : (
        <header className="bg-white border-b border-slate-200 px-4 py-4">
          <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        </header>
      )}
      <div className={`${WIDTH_CLASS[maxWidth]} mx-auto px-4 sm:px-6 py-8`}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
