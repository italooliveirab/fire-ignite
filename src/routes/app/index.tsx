import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatBRL, formatNumber } from "@/lib/format";
import { Target, MessageCircle, Beaker, FileText, CheckCircle, XCircle, Clock, Banknote, Copy, Package, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { TopAffiliatesRanking } from "@/components/TopAffiliatesRanking";

export const Route = createFileRoute("/app/")({ component: AffiliateDashboard });

function ApprovedLinksCard({ affiliateId, affiliateSlug, domain }: { affiliateId: string; affiliateSlug: string; domain: string }) {
  const { data: links } = useQuery({
    queryKey: ["my-approved-links", affiliateId],
    queryFn: async () => {
      const { data } = await supabase
        .from("affiliate_products")
        .select("id, products(name, slug, is_active)")
        .eq("affiliate_id", affiliateId)
        .eq("status", "approved");
      return (data ?? []).filter((r: any) => r.products?.is_active);
    },
  });

  const copy = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  if (!links || links.length === 0) {
    return (
      <div className="border border-border bg-card p-6 mb-6">
        <h3 className="font-display font-semibold mb-2 flex items-center gap-2"><Package className="h-5 w-5 text-fire" /> Seus links de divulgação</h3>
        <p className="text-sm text-muted-foreground mb-3">Você ainda não tem produtos aprovados. Solicite afiliação a um produto para gerar seus links.</p>
        <Button asChild size="sm" variant="outline"><Link to="/app/products">Ver produtos</Link></Button>
      </div>
    );
  }

  return (
    <div className="border border-border bg-card p-6 mb-6">
      <h3 className="font-display font-semibold mb-4 flex items-center gap-2"><Package className="h-5 w-5 text-fire" /> Seus links de divulgação</h3>
      <div className="space-y-2">
        {links.map((row: any) => {
          const url = `https://${domain}/p/${row.products.slug}/${affiliateSlug}`;
          return (
            <div key={row.id} className="flex items-center justify-between gap-3 border border-border bg-background/50 p-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">{row.products.name}</div>
                <div className="text-xs text-muted-foreground truncate font-mono">{url}</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => copy(url)}><Copy className="h-3.5 w-3.5 mr-1" /> Copiar</Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AffiliateDashboard() {
  const { user } = useAuth();
  const [domain, setDomain] = useState("fire.com");

  useEffect(() => {
    supabase.from("settings").select("affiliate_link_domain").limit(1).single()
      .then(({ data }) => { if (data) setDomain(data.affiliate_link_domain); });
  }, []);

  const { data: affiliate } = useQuery({
    queryKey: ["my-aff", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("affiliates").select("*").eq("user_id", user!.id).maybeSingle()).data,
  });

  const { data: stats } = useQuery({
    queryKey: ["my-stats", affiliate?.id],
    enabled: !!affiliate?.id,
    queryFn: async () => {
      const [leads, comm, net] = await Promise.all([
        supabase.from("leads").select("status, created_at, payment_amount").eq("affiliate_id", affiliate!.id),
        supabase.from("commissions").select("status, commission_value").eq("affiliate_id", affiliate!.id),
        supabase.from("network_commissions").select("referrer_amount").eq("referrer_affiliate_id", affiliate!.id),
      ]);
      const L = leads.data ?? [];
      const C = comm.data ?? [];
      const N = net.data ?? [];
      const by = (s: string) => L.filter((l) => l.status === s).length;
      const sumC = (s: string) => C.filter((c) => c.status === s).reduce((a, c) => a + Number(c.commission_value), 0);
      const networkEarnings = N.reduce((a, r) => a + Number(r.referrer_amount ?? 0), 0);

      const days = Array.from({ length: 30 }).map((_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (29 - i));
        const k = d.toISOString().slice(0, 10);
        return { date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), leads: L.filter((l) => l.created_at.slice(0, 10) === k).length };
      });

      return {
        total: L.length, initiated: by("initiated_conversation"), trial: by("generated_trial"),
        gpay: by("generated_payment"), paid: by("paid"), notpaid: by("not_paid"),
        commPending: sumC("pending") + sumC("released"), commPaid: sumC("paid"), networkEarnings, days,
      };
    },
  });

  if (!affiliate) {
    return (
      <DashboardLayout variant="affiliate">
        <div className="border border-border bg-card p-10 text-center">
          <h2 className="font-display text-xl font-bold mb-2">Conta não vinculada</h2>
          <p className="text-muted-foreground text-sm">Sua conta ainda não está vinculada a um perfil de afiliado. Contate o admin FIRE.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout variant="affiliate">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Olá, <span className="text-gradient-fire">{affiliate.full_name.split(" ")[0]}</span> 🔥</h1>
        <p className="text-muted-foreground text-sm mt-1">Sua máquina de vendas, em tempo real.</p>
      </div>

      <ApprovedLinksCard affiliateId={affiliate.id} affiliateSlug={affiliate.slug} domain={domain} />

      {stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
            <StatCard label="Comissão pendente" value={formatBRL(stats.commPending)} icon={Clock} accent="warning" />
            <StatCard label="Comissão paga" value={formatBRL(stats.commPaid)} icon={Banknote} accent="success" />
            <StatCard label="Ganhos da rede" value={formatBRL(stats.networkEarnings)} icon={Network} accent="neon" />
            <StatCard label="Total leads" value={formatNumber(stats.total)} icon={Target} accent="fire" />
            <StatCard label="Pagaram" value={formatNumber(stats.paid)} icon={CheckCircle} accent="success" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Iniciaram" value={formatNumber(stats.initiated)} icon={MessageCircle} accent="neon" />
            <StatCard label="Geraram teste" value={formatNumber(stats.trial)} icon={Beaker} accent="gold" />
            <StatCard label="Geraram pgto" value={formatNumber(stats.gpay)} icon={FileText} accent="warning" />
            <StatCard label="Não pagaram" value={formatNumber(stats.notpaid)} icon={XCircle} accent="fire" />
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 border border-border bg-card">
              <div className="px-5 py-3 border-b border-border flex items-center gap-3">
                <span className="h-1 w-1 bg-primary" />
                <h3 className="font-display uppercase text-sm tracking-wider">Desempenho — últimos 30 dias</h3>
              </div>
              <div className="p-5">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={stats.days}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0 0)" />
                  <XAxis dataKey="date" stroke="oklch(0.6 0 0)" fontSize={11} />
                  <YAxis stroke="oklch(0.6 0 0)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "oklch(0.16 0 0)", border: "1px solid oklch(0.25 0 0)", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="leads" stroke="#FF5A00" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
              </div>
            </div>
            <TopAffiliatesRanking currentAffiliateId={affiliate.id} />
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
