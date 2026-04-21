import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatBRL, formatNumber, formatDate } from "@/lib/format";
import { Network, Users, Banknote, Copy, Share2, UserCheck, TrendingUp, Trophy, Target } from "lucide-react";

export const Route = createFileRoute("/app/network")({ component: MyNetwork });

function MyNetwork() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [origin, setOrigin] = useState("");

  useEffect(() => { setOrigin(window.location.origin); }, []);

  const { data: affiliate } = useQuery({
    queryKey: ["my-aff-net", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("affiliates").select("id, full_name, referral_code").eq("user_id", user!.id).maybeSingle()).data,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["my-network-members", affiliate?.id],
    enabled: !!affiliate?.id,
    refetchOnMount: "always",
    staleTime: 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("affiliate_network")
        .select("id, status, linked_at, affiliate_id")
        .eq("referrer_id", affiliate!.id)
        .order("linked_at", { ascending: false });
      const ids = (data ?? []).map((r) => r.affiliate_id);
      if (ids.length === 0) return [];
      const { data: affs } = await supabase.from("affiliates").select("id, full_name, email, slug").in("id", ids);
      return (data ?? []).map((link) => {
        const aff = (affs ?? []).find((a) => a.id === link.affiliate_id);
        return { ...link, aff };
      });
    },
  });

  // Se EU sou indicado, busca meu afiliador
  const { data: myReferrer } = useQuery({
    queryKey: ["my-referrer", affiliate?.id],
    enabled: !!affiliate?.id,
    refetchOnMount: "always",
    queryFn: async () => {
      const { data: link } = await supabase
        .from("affiliate_network")
        .select("status, linked_at, referrer_id")
        .eq("affiliate_id", affiliate!.id)
        .maybeSingle();
      if (!link?.referrer_id) return null;
      const { data: ref } = await supabase
        .from("affiliates")
        .select("id, full_name, email")
        .eq("id", link.referrer_id)
        .maybeSingle();
      return ref ? { ...ref, status: link.status, linked_at: link.linked_at } : null;
    },
  });

  const { data: networkComm = [] } = useQuery({
    queryKey: ["my-network-comm", affiliate?.id],
    enabled: !!affiliate?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("network_commissions")
        .select("id, payment_amount, referrer_amount, seller_affiliate_id, created_at, payment_cycle")
        .eq("referrer_affiliate_id", affiliate!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const totalEarnings = networkComm.reduce((a, c) => a + Number(c.referrer_amount), 0);
  const totalSold = networkComm.reduce((a, c) => a + Number(c.payment_amount), 0);
  const renewalsCount = networkComm.filter((c) => (c.payment_cycle ?? 1) > 1).length;
  const renewalsRevenue = networkComm.filter((c) => (c.payment_cycle ?? 1) > 1).reduce((a, c) => a + Number(c.referrer_amount), 0);

  // Leads de toda a minha rede (indicados) — para métricas de desempenho/funil
  const memberIds = members.map((m) => m.affiliate_id);
  const { data: networkLeads = [] } = useQuery({
    queryKey: ["my-network-leads", affiliate?.id, memberIds.join(",")],
    enabled: !!affiliate?.id && memberIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select("id, affiliate_id, status, payment_amount, created_at, paid_at")
        .in("affiliate_id", memberIds)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const totalLeads = networkLeads.length;
  const totalPaidLeads = networkLeads.filter((l) => l.status === "paid").length;
  const conversionRate = totalLeads > 0 ? (totalPaidLeads / totalLeads) * 100 : 0;

  // Métricas por indicado (ranking)
  const memberStats = members.map((m) => {
    const leads = networkLeads.filter((l) => l.affiliate_id === m.affiliate_id);
    const paidLeads = leads.filter((l) => l.status === "paid");
    const sold = paidLeads.reduce((a, l) => a + Number(l.payment_amount ?? 0), 0);
    const myCommission = networkComm.filter((c) => c.seller_affiliate_id === m.affiliate_id).reduce((a, c) => a + Number(c.referrer_amount), 0);
    const conv = leads.length > 0 ? (paidLeads.length / leads.length) * 100 : 0;
    return { ...m, leadsCount: leads.length, paidCount: paidLeads.length, sold, myCommission, conv };
  }).sort((a, b) => b.myCommission - a.myCommission);

  // Realtime: atualiza ao vivo quando alguém entra na minha rede ou gera comissão
  useEffect(() => {
    if (!affiliate?.id) return;
    const ch = supabase.channel(`my-net-rt-${affiliate.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "affiliate_network", filter: `referrer_id=eq.${affiliate.id}` },
        () => { qc.invalidateQueries({ queryKey: ["my-network-members", affiliate.id] }); })
      .on("postgres_changes", { event: "*", schema: "public", table: "affiliate_network", filter: `affiliate_id=eq.${affiliate.id}` },
        () => { qc.invalidateQueries({ queryKey: ["my-referrer", affiliate.id] }); })
      .on("postgres_changes", { event: "*", schema: "public", table: "network_commissions", filter: `referrer_affiliate_id=eq.${affiliate.id}` },
        () => { qc.invalidateQueries({ queryKey: ["my-network-comm", affiliate.id] }); })
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" },
        () => { qc.invalidateQueries({ queryKey: ["my-network-leads", affiliate.id] }); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [affiliate?.id, qc]);

  const refLink = origin && affiliate?.referral_code ? `${origin}/convite/${affiliate.referral_code}` : "";

  if (!affiliate) {
    return <DashboardLayout variant="affiliate"><div className="p-10 text-center text-muted-foreground">Carregando...</div></DashboardLayout>;
  }

  return (
    <DashboardLayout variant="affiliate" title="Minha Rede">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2"><Network className="h-7 w-7 text-primary" /> Minha Rede</h1>
        <p className="text-sm text-muted-foreground mt-1">Indique afiliados e ganhe comissão sobre as vendas deles.</p>
      </div>

      {/* Meu afiliador (se eu sou indicado) */}
      {myReferrer && (
        <div className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 to-transparent p-5 mb-6 shadow-card-premium">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
              <UserCheck className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Você foi indicado por</div>
              <div className="font-display font-semibold text-lg">{myReferrer.full_name}</div>
              <div className="text-xs text-muted-foreground">{myReferrer.email} · vinculado em {formatDate(myReferrer.linked_at)}</div>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-400/15 text-emerald-400 font-medium">{myReferrer.status}</span>
          </div>
        </div>
      )}

      {/* Link de indicação */}
      <div className="rounded-2xl border border-border bg-card p-6 mb-6 shadow-card-premium">
        <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><Share2 className="h-5 w-5 text-fire" /> Seu link de indicação</h3>
        <p className="text-sm text-muted-foreground mb-3">Compartilhe este link. Quem se cadastrar por ele vira seu indicado e você ganha sobre as vendas dele.</p>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background/50 p-3">
          <code className="flex-1 text-xs md:text-sm font-mono truncate">{refLink || "—"}</code>
          <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(refLink); toast.success("Link copiado!"); }}>
            <Copy className="h-3.5 w-3.5 mr-1" /> Copiar
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatCard label="Indicados ativos" value={formatNumber(members.filter((m) => m.status === "active").length)} icon={Users} accent="fire" />
        <StatCard label="Leads da rede" value={formatNumber(totalLeads)} icon={Target} accent="gold" />
        <StatCard label="Vendas pagas" value={formatNumber(totalPaidLeads)} icon={TrendingUp} accent="success" />
        <StatCard label="Vendido pela rede" value={formatBRL(totalSold)} icon={Banknote} accent="neon" />
        <StatCard label="Meus ganhos da rede" value={formatBRL(totalEarnings)} icon={Banknote} accent="success" />
      </div>

      {/* Renovações da rede */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Renovações da rede</div>
          <div className="font-display text-2xl font-bold text-emerald-400">{formatNumber(renewalsCount)}</div>
          <div className="text-[11px] text-muted-foreground">comissões de ciclo &gt; 1</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Receita de renovações (você)</div>
          <div className="font-display text-2xl font-bold text-primary">{formatBRL(renewalsRevenue)}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Conversão da rede</div>
          <div className="font-display text-2xl font-bold">{conversionRate.toFixed(1)}%</div>
          <div className="text-[11px] text-muted-foreground">{totalPaidLeads} pagos / {totalLeads} leads</div>
        </div>
      </div>

      {/* Pódio top 3 indicados */}
      {memberStats.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 mb-6 shadow-card-premium">
          <h3 className="font-display font-semibold mb-4 flex items-center gap-2"><Trophy className="h-5 w-5 text-fire" /> Top indicados (por comissão gerada para você)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {memberStats.slice(0, 3).map((m, i) => (
              <div key={m.id} className="rounded-xl border border-border bg-background/40 p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">#{i + 1}</div>
                  <div className="text-xs text-muted-foreground">{m.paidCount} pagos / {m.leadsCount} leads</div>
                </div>
                <div className="font-display font-semibold truncate">{m.aff?.full_name ?? "—"}</div>
                <div className="text-xs text-muted-foreground truncate mb-2">{m.aff?.email}</div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground">Vendido</div>
                    <div className="font-mono text-sm">{formatBRL(m.sold)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase text-muted-foreground">Sua comissão</div>
                    <div className="font-mono text-primary font-semibold">{formatBRL(m.myCommission)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground flex items-center justify-between">
            <span>Conversão da rede</span>
            <span className="font-mono text-foreground">{conversionRate.toFixed(1)}%</span>
          </div>
        </div>
      )}

      {/* Lista de indicados */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card-premium mb-6">
        <div className="px-5 py-3.5 border-b border-border font-display font-semibold">Meus indicados</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3">Afiliado</th>
                <th className="text-left px-5 py-3 hidden md:table-cell">Status</th>
                <th className="text-right px-5 py-3 hidden lg:table-cell">Vinculado</th>
                <th className="text-center px-5 py-3 hidden md:table-cell">Leads</th>
                <th className="text-center px-5 py-3 hidden md:table-cell">Pagos</th>
                <th className="text-right px-5 py-3 hidden lg:table-cell">Vendido</th>
                <th className="text-right px-5 py-3 hidden md:table-cell">Conv.</th>
                <th className="text-right px-5 py-3">Sua comissão</th>
              </tr>
            </thead>
            <tbody>
              {memberStats.length === 0 ? <tr><td colSpan={8} className="py-10 text-center text-muted-foreground">Você ainda não tem indicados. Compartilhe seu link!</td></tr>
              : memberStats.map((m) => (
                  <tr key={m.id} className="border-b border-border/50 hover:bg-background/40">
                    <td className="px-5 py-3">
                      <div className="font-medium">{m.aff?.full_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{m.aff?.email}</div>
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell text-xs">
                      <span className={m.status === "active" ? "text-emerald-400" : "text-muted-foreground"}>{m.status}</span>
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell text-right text-xs text-muted-foreground">{formatDate(m.linked_at)}</td>
                    <td className="px-5 py-3 hidden md:table-cell text-center font-mono text-xs">{m.leadsCount}</td>
                    <td className="px-5 py-3 hidden md:table-cell text-center font-mono text-xs text-emerald-400">{m.paidCount}</td>
                    <td className="px-5 py-3 hidden lg:table-cell text-right font-mono text-xs">{formatBRL(m.sold)}</td>
                    <td className="px-5 py-3 hidden md:table-cell text-right font-mono text-xs text-muted-foreground">{m.conv.toFixed(0)}%</td>
                    <td className="px-5 py-3 text-right font-mono text-primary">{formatBRL(m.myCommission)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Histórico de comissões da rede */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card-premium">
        <div className="px-5 py-3.5 border-b border-border font-display font-semibold">Histórico de comissões da rede</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3">Data</th>
                <th className="text-right px-5 py-3 hidden md:table-cell">Venda</th>
                <th className="text-center px-5 py-3 hidden md:table-cell">Ciclo</th>
                <th className="text-right px-5 py-3">Sua comissão</th>
              </tr>
            </thead>
            <tbody>
              {networkComm.length === 0 ? <tr><td colSpan={4} className="py-10 text-center text-muted-foreground">Sem comissões da rede ainda.</td></tr>
              : networkComm.map((c) => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-background/40">
                  <td className="px-5 py-3 text-xs text-muted-foreground">{formatDate(c.created_at)}</td>
                  <td className="px-5 py-3 hidden md:table-cell text-right font-mono">{formatBRL(Number(c.payment_amount))}</td>
                  <td className="px-5 py-3 hidden md:table-cell text-center text-xs">#{c.payment_cycle}</td>
                  <td className="px-5 py-3 text-right font-mono text-primary">{formatBRL(Number(c.referrer_amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}