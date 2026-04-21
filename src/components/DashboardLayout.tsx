import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Menu, Flame, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AppSidebar } from "./AppSidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { FireLoader } from "./FireLoader";
import { lazy, Suspense, useEffect, useState } from "react";

const EmberCanvas = lazy(() =>
  import("./EmberCanvas").then((m) => ({ default: m.EmberCanvas })),
);

// Detect mobile once at module load to avoid render-time matchMedia calls
const isMobileDevice = typeof window !== "undefined"
  && window.matchMedia?.("(max-width: 768px)").matches;

interface Props {
  variant: "admin" | "affiliate";
  title?: string;
  children: ReactNode;
}

export function DashboardLayout({ variant, title, children }: Props) {
  const { user, role, loading, signOut } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => { setSheetOpen(false); }, [loc.pathname]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const target = variant === "admin" ? "/admin/login" : "/login";
      nav({ to: target, search: { redirect: loc.pathname } });
      return;
    }
    // Wait until role is resolved before deciding to redirect
    if (role === null) return;
    if (variant === "admin" && role !== "admin") nav({ to: "/app" });
    if (variant === "affiliate" && role !== "affiliate" && role !== "admin") nav({ to: "/login" });
  }, [user, role, loading, variant, nav, loc.pathname]);

  if (loading || !user || role === null) {
    return <FireLoader label="Carregando seu painel..." />;
  }

  return (
    <div className="min-h-screen flex">
      {!isMobileDevice && (
        <Suspense fallback={null}>
          <EmberCanvas density={20} />
        </Suspense>
      )}
      <AppSidebar variant={variant} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-20 h-16 border-b border-border bg-background/80 backdrop-blur-xl flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3">
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 bg-sidebar border-sidebar-border">
                <AppSidebar variant={variant} inSheet />
              </SheetContent>
            </Sheet>
            <Link to="/" className="md:hidden flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-gradient-fire flex items-center justify-center">
                <Flame className="h-4 w-4 text-white" />
              </div>
              <span className="font-display font-bold">FIRE</span>
            </Link>
            {title && <h1 className="hidden md:block text-sm text-muted-foreground">{title}</h1>}
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-success/15 text-success border border-success/30">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> online
            </span>
            <Button variant="ghost" size="icon" className="md:hidden" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 max-w-[1600px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
