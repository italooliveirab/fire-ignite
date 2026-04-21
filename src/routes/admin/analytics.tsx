import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, formatNumber } from "@/lib/format";
import { MousePointerClick, MessageCircle, Beaker, CreditCard, CheckCircle2, TrendingUp, Trophy, Network as NetIcon, BarChart3 } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";

export const Route = createFileRoute("/admin/analytics")({ component: AnalyticsPage });

function AnalyticsPage() {
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() - 29); return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const fromIso = `${dateFrom}T00:00:00`;
  const toIso = `${dateTo}T23:59:59`;

  const { data: clicks = [] } = useQuery({
    queryKey: ["analytics-clicks", dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await supabase
        .from("link_clicks")
        .select("id, affiliate_id, product_id, created_at")
        .gte("created_at", fromIso).lte("created_at", toIso)
        .limit(10000);
      return data ?? [];
    },
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["analytics-leads", dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select("id, affiliate_id, status, payment_amount, conversation_started_at, trial_generated_at, payment_generated_at, paid_at, created_at")
        .gte("created_at", fromIso).lte("created_at", toIso)
        .limit(10000);
      return data ?? [];
    },
  });

  const { data: networkComms = [] } = useQuery({
    queryKey: ["analytics-net-comms", dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await supabase
        .from("network_commissions")
        .select("id, payment_cycle, payment_amount, created_at")
        .gte("created_at", fromIso).lte("created_at", toIso)
        .limit(10000);
      return data ?? [];
    },
  });

  const { data: affiliates = [] } = useQuery({
    queryKey: ["analytics-affiliates"],
    queryFn: async () => (await supabase.from("affiliates").select("id, full_name, slug")).data ?? [],
  });

  const { data: networkLinks = [] } = useQuery({
    queryKey: ["analytics-network"],
    queryFn: async () => (await supabase.from("affiliate_network").select("affiliate_id, referrer_id").eq("status", "active")).data ?? [],
  });

  const affMap = useMemo(() => new Map(affiliates.map((a) => [a.id, a])), [affiliates]);
  const referrerOf = useMemo(() => {
    const m = new Map<string, string>();
    for (const n of networkLinks) m.set(n.affiliate_id, n.referrer_id);
    return m;
  }, [networkLinks]);

  // Funil
  const totalClicks = clicks.length;
  const totalConv = leads.filter((l) => l.conversation_started_at).length;
  const totalTrials = leads.filter((l) => l.trial_generated_at).length;
  const totalCharges = leads.filter((l) => l.payment_generated_at).length;
  const totalPaid = leads.filter((l) => l.status === "paid").length;
  const totalRevenue = leads.filter((l) => l.status === "paid").reduce((s, l) => s + Number(l.payment_amount ?? 0), 0);
  const convRate = totalClicks > 0 ? (totalPaid / totalClicks) * 100 : 0;
  const totalRenewals = networkComms.filter((c) => (c.payment_cycle ?? 1) > 1).length;
  const renewalRevenue = networkComms.filter((c) => (c.payment_cycle ?? 1) > 1).reduce((s, c) => s + Number(c.payment_amount ?? 0), 0);
  const renewalRate = totalPaid > 0 ? (totalRenewals / totalPaid) * 100 : 0;
  const totalLost = leads.filter((l) => l.status === "lost" || l.status === "not_paid").length;
  const totalSupport = leads.filter((l) => l.status === "support_received").length;

  // Série diária
  const dailySeries = useMemo(() => {
    const days: { date: string; label: string; clicks: number; leads: number; paid: number }[] = [];
    const start = new Date(dateFrom); start.setHours(0, 0, 0, 0);
    const end = new Date(dateTo); end.setHours(0, 0, 0, 0);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), clicks: 0, leads: 0, paid: 0 });
    }
    const idx = new Map(days.map((d, i) => [d.date, i]));
    for (const c of clicks) { const i = idx.get(new Date(c.created_at).toISOString().slice(0, 10)); if (i != null) days[i].clicks++; }
    for (const l of leads) {
      const i = idx.get(new Date(l.created_at).toISOString().slice(0, 10));
      if (i != null) { days[i].leads++; if (l.status === "paid") days[i].paid++; }
    }
    return days;
  }, [clicks, leads, dateFrom, dateTo]);

  // Top afiliados
  const topAffiliates = useMemo(() => {
    const map = new Map<string, { id: string; name: string; clicks: number; leads: number; paid: number; revenue: number }>();
    for (const c of clicks) {
      if (!c.affiliate_id) continue;
      const cur = map.get(c.affiliate_id) ?? { id: c.affiliate_id, name: affMap.get(c.affiliate_id)?.full_name ?? "—", clicks: 0, leads: 0, paid: 0, revenue: 0 };
      cur.clicks++; map.set(c.affiliate_id, cur);
    }
    for (const l of leads) {
      const cur = map.get(l.affiliate_id) ?? { id: l.affiliate_id, name: affMap.get(l.affiliate_id)?.full_name ?? "—", clicks: 0, leads: 0, paid: 0, revenue: 0 };
      cur.leads++;
      if (l.status === "paid") { cur.paid++; cur.revenue += Number(l.payment_amount ?? 0); }
      map.set(l.affiliate_id, cur);
    }
    return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [clicks, leads, affMap]);

  // Top redes (afiliadores)
  const topNetworks = useMemo(() => {
    const map = new Map<string, { id: string; name: string; sellers: Set<string>; leads: number; paid: number; revenue: number }>();
    for (const l of leads) {
      const refId = referrerOf.get(l.affiliate_id);
      if (!refId) continue;
      const cur = map.get(refId) ?? { id: refId, name: affMap.get(refId)?.full_name ?? "—", sellers: new Set(), leads: 0, paid: 0, revenue: 0 };
      cur.sellers.add(l.affiliate_id);
      cur.leads++;
      if (l.status === "paid") { cur.paid++; cur.revenue += Number(l.payment_amount ?? 0); }
      map.set(refId, cur);
    }
    return [...map.values()].map((n) => ({ ...n, sellersCount: n.sellers.size })).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [leads, referrerOf, affMap]);

  return (
    <DashboardLayout variant="admin" title="Analytics">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2"><BarChart3 className="h-7 w-7 text-primary" /> Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Funil completo da plataforma · {formatNumber(totalClicks)} cliques · conversão {convRate.toFixed(2)}%</p>
        </div>
        <div className="flex gap-2">
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-card" />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-card" />
        </div>
      </div>

      {/* Funil completo */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        {[
          { label: "Cliques", value: formatNumber(totalClicks), icon: MousePointerClick, color: "text-blue-400" },
          { label: "Conversas", value: formatNumber(totalConv), icon: MessageCircle, color: "text-cyan-400" },
          { label: "Testes", value: formatNumber(totalTrials), icon: Beaker, color: "text-purple-400" },
          { label: "Cobranças", value: formatNumber(totalCharges), icon: CreditCard, color: "text-amber-400" },
          { label: "Pagos", value: formatNumber(totalPaid), icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Conv. Total", value: `${convRate.toFixed(2)}%`, icon: TrendingUp, color: "text-pink-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 shadow-card-premium">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</span>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <div className="font-display text-xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card px-5 py-3 mb-6 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Receita total no período</span>
        <span className="font-mono font-bold text-emerald-400 text-lg">{formatBRL(totalRevenue)}</span>
      </div>

      {/* Funil em barras */}
      <div className="rounded-2xl border border-border bg-card p-5 mb-6 shadow-card-premium">
        <h2 className="font-display text-lg font-semibold mb-4">Funil de conversão</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[
              { stage: "Cliques", v: totalClicks },
              { stage: "Conversas", v: totalConv },
              { stage: "Testes", v: totalTrials },
              { stage: "Cobranças", v: totalCharges },
              { stage: "Pagos", v: totalPaid },
            ]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="stage" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="v" name="Quantidade" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Evolução diária */}
      <div className="rounded-2xl border border-border bg-card p-5 mb-6 shadow-card-premium">
        <h2 className="font-display text-lg font-semibold mb-4">Evolução diária</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailySeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="anClicks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="anLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="anPaid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} interval={Math.max(0, Math.floor(dailySeries.length / 10))} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="clicks" name="Cliques" stroke="#60a5fa" fill="url(#anClicks)" strokeWidth={2} />
              <Area type="monotone" dataKey="leads" name="Leads" stroke="hsl(var(--primary))" fill="url(#anLeads)" strokeWidth={2} />
              <Area type="monotone" dataKey="paid" name="Pagos" stroke="#10b981" fill="url(#anPaid)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top afiliados */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card-premium">
          <div className="px-5 py-3.5 border-b border-border font-display font-semibold flex items-center gap-2">
            <Trophy className="h-4 w-4 text-fire" /> Top afiliados (por receita)
          </div>
          <table className="w-full text-sm">
            <thead className="bg-background/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2.5">#</th>
                <th className="text-left px-4 py-2.5">Afiliado</th>
                <th className="text-right px-4 py-2.5">Cliques</th>
                <th className="text-right px-4 py-2.5">Pagos</th>
                <th className="text-right px-4 py-2.5">Receita</th>
              </tr>
            </thead>
            <tbody>
              {topAffiliates.length === 0 ? <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Sem dados.</td></tr>
                : topAffiliates.map((a, i) => (
                  <tr key={a.id} className="border-b border-border/50 hover:bg-background/40">
                    <td className="px-4 py-2.5 text-muted-foreground">#{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium truncate max-w-[180px]">{a.name}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs">{a.clicks}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-emerald-400">{a.paid}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-primary">{formatBRL(a.revenue)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Top redes */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card-premium">
          <div className="px-5 py-3.5 border-b border-border font-display font-semibold flex items-center gap-2">
            <NetIcon className="h-4 w-4 text-fire" /> Top redes (afiliadores)
          </div>
          <table className="w-full text-sm">
            <thead className="bg-background/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2.5">#</th>
                <th className="text-left px-4 py-2.5">Afiliador</th>
                <th className="text-right px-4 py-2.5">Indicados</th>
                <th className="text-right px-4 py-2.5">Pagos</th>
                <th className="text-right px-4 py-2.5">Receita</th>
              </tr>
            </thead>
            <tbody>
              {topNetworks.length === 0 ? <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Sem dados.</td></tr>
                : topNetworks.map((n, i) => (
                  <tr key={n.id} className="border-b border-border/50 hover:bg-background/40">
                    <td className="px-4 py-2.5 text-muted-foreground">#{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium truncate max-w-[180px]">{n.name}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs">{n.sellersCount}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-emerald-400">{n.paid}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-primary">{formatBRL(n.revenue)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
