import { Link, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard, Users, Target, DollarSign, Banknote, Settings, FileCode2,
  LogOut, Link2, User, ScrollText, ShoppingCart, Package, Inbox, ShieldCheck, Network, Settings2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/BrandMark";
import { supabase } from "@/integrations/supabase/client";

const adminNav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/products", label: "Produtos", icon: Package },
  { to: "/admin/requests", label: "Solicitações", icon: Inbox, badgeKey: "pending-requests" as const },
  { to: "/admin/affiliates", label: "Afiliados", icon: Users },
  { to: "/admin/leads", label: "Leads", icon: Target },
  { to: "/admin/buyers", label: "Compradores", icon: ShoppingCart },
  { to: "/admin/commissions", label: "Comissões", icon: DollarSign },
  { to: "/admin/network", label: "Rede", icon: Network },
  { to: "/admin/network-commissions", label: "Comissões da Rede", icon: DollarSign },
  { to: "/admin/network-rules", label: "Regras da Rede", icon: Settings2 },
  { to: "/admin/payouts", label: "Pagamentos", icon: Banknote },
  { to: "/admin/audit", label: "Auditoria", icon: ShieldCheck },
  { to: "/admin/api", label: "API & Docs", icon: FileCode2 },
  { to: "/admin/settings", label: "Configurações", icon: Settings },
];

const affiliateNav = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/products", label: "Produtos", icon: Package },
  { to: "/app/link", label: "Meus Links", icon: Link2 },
  { to: "/app/leads", label: "Meus Leads", icon: Target },
  { to: "/app/commissions", label: "Comissões", icon: DollarSign },
  { to: "/app/network", label: "Minha Rede", icon: Network },
  { to: "/app/payouts", label: "Pagamentos", icon: Banknote },
  { to: "/app/profile", label: "Perfil", icon: User },
  { to: "/app/rules", label: "Regras", icon: ScrollText },
];

function usePendingRequestsCount(enabled: boolean) {
  const qc = useQueryClient();
  const { data = 0 } = useQuery({
    queryKey: ["pending-requests-count"],
    enabled,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("affiliate_products")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel("sidebar-affiliate-products")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "affiliate_products" },
        () => {
          qc.invalidateQueries({ queryKey: ["pending-requests-count"] });
          qc.invalidateQueries({ queryKey: ["affiliate-requests"] });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [enabled, qc]);

  return data;
}

export function AppSidebar({ variant }: { variant: "admin" | "affiliate" }) {
  const items = variant === "admin" ? adminNav : affiliateNav;
  const { signOut, user } = useAuth();
  const loc = useLocation();
  const pendingRequests = usePendingRequestsCount(variant === "admin");

  return (
    <aside className="hidden md:flex w-64 flex-col bg-sidebar border-r border-sidebar-border h-screen sticky top-0">
      <div className="px-5 py-5">
        <Link to="/">
          <BrandMark size="sm" subtitle={variant === "admin" ? "Admin" : "Afiliado"} />
        </Link>
      </div>

      <div className="px-5 pb-2">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 font-medium">
          Menu
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 overflow-y-auto space-y-0.5">
        {items.map((item) => {
          const active = item.exact ? loc.pathname === item.to : loc.pathname.startsWith(item.to);
          const Icon = item.icon;
          const badge = "badgeKey" in item && item.badgeKey === "pending-requests" ? pendingRequests : 0;
          return (
            <Link
              key={item.to}
              to={item.to}
              preload="intent"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-all group relative",
                active
                  ? "bg-gradient-to-r from-primary/15 via-primary/5 to-transparent text-foreground border border-primary/20"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground border border-transparent",
              )}
            >
              <Icon className={cn("h-[18px] w-[18px] transition-colors", active ? "text-primary" : "group-hover:text-foreground")} strokeWidth={1.8} />
              <span className="flex-1 font-medium">{item.label}</span>
              {badge > 0 && (
                <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold shadow-glow-soft">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border mx-3">
        <div className="px-2 py-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 mb-1 font-medium">
            Sessão
          </div>
          <div className="text-xs text-foreground truncate">{user?.email}</div>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 mb-3 rounded-lg text-xs font-medium text-muted-foreground hover:text-primary hover:bg-sidebar-accent transition-colors"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.8} /> Sair
        </button>
      </div>
    </aside>
  );
}
