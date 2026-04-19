import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, Target, DollarSign, Banknote, Settings, FileCode2,
  LogOut, Flame, Link2, User, ScrollText, ShoppingCart,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const adminNav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/affiliates", label: "Afiliados", icon: Users },
  { to: "/admin/leads", label: "Leads", icon: Target },
  { to: "/admin/buyers", label: "Compradores", icon: ShoppingCart },
  { to: "/admin/commissions", label: "Comissões", icon: DollarSign },
  { to: "/admin/payouts", label: "Pagamentos", icon: Banknote },
  { to: "/admin/api", label: "API & Docs", icon: FileCode2 },
  { to: "/admin/settings", label: "Configurações", icon: Settings },
];

const affiliateNav = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/link", label: "Meu Link", icon: Link2 },
  { to: "/app/leads", label: "Meus Leads", icon: Target },
  { to: "/app/commissions", label: "Comissões", icon: DollarSign },
  { to: "/app/payouts", label: "Pagamentos", icon: Banknote },
  { to: "/app/profile", label: "Perfil", icon: User },
  { to: "/app/rules", label: "Regras", icon: ScrollText },
];

export function AppSidebar({ variant }: { variant: "admin" | "affiliate" }) {
  const items = variant === "admin" ? adminNav : affiliateNav;
  const { signOut, user } = useAuth();
  const loc = useLocation();

  return (
    <aside className="hidden md:flex w-64 flex-col bg-sidebar border-r border-sidebar-border h-screen sticky top-0">
      <div className="px-6 py-6 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-gradient-fire flex items-center justify-center shadow-fire">
            <Flame className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display font-bold text-lg leading-none text-foreground">FIRE</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-0.5">
              {variant === "admin" ? "Admin" : "Afiliado"}
            </div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const active = item.exact ? loc.pathname === item.to : loc.pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                active
                  ? "bg-gradient-to-r from-primary/15 to-transparent text-foreground border-l-2 border-primary"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
              )}
            >
              <Icon className={cn("h-4 w-4 transition-colors", active && "text-primary")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <div className="px-3 py-2 mb-2">
          <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
        </div>
        <Button onClick={signOut} variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground">
          <LogOut className="h-4 w-4" /> Sair
        </Button>
      </div>
    </aside>
  );
}
