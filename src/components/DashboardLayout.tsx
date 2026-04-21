import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Menu, Flame, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AppSidebar } from "./AppSidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

interface Props {
  variant: "admin" | "affiliate";
  title?: string;
  children: ReactNode;
}

export function DashboardLayout({ variant, title, children }: Props) {
  const { user, role, loading, signOut } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const target = variant === "admin" ? "/admin/login" : "/login";
      nav({ to: target, search: { redirect: loc.pathname } });
      return;
    }
    if (role === null) return;
    if (variant === "admin" && role !== "admin") nav({ to: "/app" });
    if (variant === "affiliate" && role !== "affiliate" && role !== "admin") nav({ to: "/login" });
  }, [user, role, loading, variant, nav, loc.pathname]);

  if (loading || !user || role === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-1 w-24 rounded-full bg-gradient-fire mx-auto mb-4 animate-pulse" />
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
            Carregando
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <AppSidebar variant={variant} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-20 h-16 border-b border-border/60 bg-background/80 backdrop-blur-xl flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" strokeWidth={2} />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 bg-sidebar border-sidebar-border">
                <AppSidebar variant={variant} />
              </SheetContent>
            </Sheet>
            <Link to="/" className="md:hidden flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-fire flex items-center justify-center shadow-glow-soft">
                <Flame className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
              </div>
              <span className="font-display text-lg font-semibold">FIRE</span>
            </Link>
            {title && (
              <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
                <span className="capitalize">{variant}</span>
                <span className="text-muted-foreground/40">/</span>
                <span className="text-foreground font-medium">{title}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-2 text-[11px] font-medium px-2.5 py-1 rounded-full border border-success/30 bg-success/10 text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Online
            </span>
            <Button variant="ghost" size="icon" className="md:hidden" onClick={signOut}>
              <LogOut className="h-4 w-4" strokeWidth={2} />
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 lg:p-10 max-w-[1600px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
