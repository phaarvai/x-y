import Navbar from "@/components/Navbar";

type PublicLayoutProps = {
  children: React.ReactNode;
  showNavbar?: boolean;
  className?: string;
};

export default function PublicLayout({
  children,
  showNavbar = true,
  className = "",
}: PublicLayoutProps) {
  return (
    <div className={`min-h-screen bg-background ${className}`}>
      {showNavbar && <Navbar />}
      <main>{children}</main>
    </div>
  );
}
