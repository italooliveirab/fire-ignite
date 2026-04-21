import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, formatDateTime } from "@/lib/format";
import { exportCSV } from "@/lib/csv";
import { toast } from "sonner";
import { Search, Download, MousePointerClick, MessageCircle, Beaker, CreditCard, CheckCircle2, TrendingUp, Copy, ExternalLink } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const STATUS_LABEL: Record<string, string> = {
  initiated_conversation: "Iniciou conversa",
  generated_trial: "Gerou teste",
  generated_payment: "Gerou pagamento",
  paid: "Pagou",
  not_paid: "Não pagou",
};

export const Route = createFileRoute("/admin/leads")({ component: LeadsPage });

function LeadsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [affiliateFilter, setAffiliateFilter] = useState<string>("all");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [referrerFilter, setReferrerFilter] = useState<string>("all");
  const [trialFilter, setTrialFilter] = useState<string>("all");
  const [linkSlug, setLinkSlug] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const { data: affiliates = [] } = useQuery({
    queryKey: ["aff-list"],
    queryFn: async () => (await supabase.from("affiliates").select("id, full_name, slug").order("full_name")).data ?? [],
  });

  const { data: products = [] } = useQuery({
    queryKey: ["prod-list"],
    queryFn: async () => (await supabase.from("products").select("id, name").order("name")).data ?? [],
  });

  // Mapa afiliado -> referrer (afiliador) ativo
  const { data: networkLinks = [] } = useQuery({
    queryKey: ["network-links"],
    queryFn: async () =>
      (await supabase.from("affiliate_network").select("affiliate_id, referrer_id").eq("status", "active")).data ?? [],
  });
  const referrerByAffiliate = useMemo(() => {
    const m = new Map<string, string>();
    for (const n of networkLinks) m.set(n.affiliate_id, n.referrer_id);
    return m;
  }, [networkLinks]);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data } = await supabase.from("leads").select("*, affiliates(full_name, slug), products(name)").order("created_at", { ascending: false }).limit(1000);
      return data ?? [];
    },
  });

  const filtered = leads.filter((l) => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (affiliateFilter !== "all" && l.affiliate_id !== affiliateFilter) return false;
    if (productFilter !== "all" && l.product_id !== productFilter) return false;
    if (referrerFilter !== "all" && referrerByAffiliate.get(l.affiliate_id) !== referrerFilter) return false;
    if (trialFilter === "yes" && !l.trial_generated_at) return false;
    if (trialFilter === "no" && l.trial_generated_at) return false;
    if (linkSlug) {
      const slug = (l as { affiliates?: { slug: string } }).affiliates?.slug?.toLowerCase() ?? "";
      if (!slug.includes(linkSlug.toLowerCase())) return false;
    }
    if (dateFrom && new Date(l.created_at) < new Date(dateFrom)) return false;
    if (dateTo && new Date(l.created_at) > new Date(dateTo + "T23:59:59")) return false;
    if (search && ![l.customer_name, l.whatsapp_number].some((f) => f?.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const funnel = useMemo(() => {
    const total = filtered.length;
    const conv = filtered.filter((l) => ["initiated_conversation", "generated_trial", "generated_payment", "paid", "not_paid"].includes(l.status)).length;
    const trials = filtered.filter((l) => ["generated_trial", "generated_payment", "paid"].includes(l.status)).length;
    const payments = filtered.filter((l) => ["generated_payment", "paid"].includes(l.status)).length;
    const paid = filtered.filter((l) => l.status === "paid").length;
    const revenue = filtered.filter((l) => l.status === "paid").reduce((s, l) => s + Number(l.payment_amount ?? 0), 0);
    const rate = total > 0 ? ((paid / total) * 100).toFixed(1) : "0.0";
    return { total, conv, trials, payments, paid, revenue, rate };
  }, [filtered]);

  // Série diária dos últimos 30 dias (baseada nos filtros aplicados)
  const dailySeries = useMemo(() => {
    const days: { date: string; label: string; leads: number; paid: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), leads: 0, paid: 0 });
    }
    const idx = new Map(days.map((d, i) => [d.date, i]));
    for (const l of filtered) {
      const k = new Date(l.created_at).toISOString().slice(0, 10);
      const i = idx.get(k);
      if (i == null) continue;
      days[i].leads += 1;
      if (l.status === "paid") days[i].paid += 1;
    }
    return days;
  }, [filtered]);

  return (
    <DashboardLayout variant="admin" title="Leads">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Leads & Funil</h1>
          <p className="text-muted-foreground text-sm mt-1">{filtered.length} leads · Conversão {funnel.rate}%</p>
        </div>
        <Button variant="outline" onClick={() => {
          if (!filtered.length) { toast.error("Nada para exportar"); return; }
          exportCSV(`leads-${new Date().toISOString().slice(0, 10)}`, filtered.map((l) => ({
            data: formatDateTime(l.created_at),
            cliente: l.customer_name ?? "",
            whatsapp: l.whatsapp_number ?? "",
            afiliado: (l as { affiliates?: { full_name: string } }).affiliates?.full_name ?? "",
            link_slug: (l as { affiliates?: { slug: string } }).affiliates?.slug ?? "",
            afiliador: (() => {
              const refId = referrerByAffiliate.get(l.affiliate_id);
              return refId ? (affiliates.find((a) => a.id === refId)?.full_name ?? "") : "";
            })(),
            produto: (l as { products?: { name: string } }).products?.name ?? "",
            status: STATUS_LABEL[l.status] ?? l.status,
            teste_solicitado: l.trial_generated_at ? "sim" : "não",
            cobranca_gerada: l.payment_generated_at ? "sim" : "não",
            valor: l.payment_amount ? Number(l.payment_amount).toFixed(2).replace(".", ",") : "",
            criado_em: formatDateTime(l.created_at),
            pago_em: l.paid_at ? formatDateTime(l.paid_at) : "",
          })), [
            { key: "data", label: "Data" },
            { key: "cliente", label: "Cliente" },
            { key: "whatsapp", label: "WhatsApp" },
            { key: "afiliado", label: "Afiliado" },
            { key: "link_slug", label: "Link/Slug" },
            { key: "afiliador", label: "Afiliador (rede)" },
            { key: "produto", label: "Produto" },
            { key: "status", label: "Status" },
            { key: "teste_solicitado", label: "Teste solicitado" },
            { key: "cobranca_gerada", label: "Cobrança gerada" },
            { key: "valor", label: "Valor (R$)" },
            { key: "pago_em", label: "Pago em" },
          ]);
          toast.success(`${filtered.length} leads exportados`);
        }} className="border-border">
          <Download className="h-4 w-4 mr-1" /> Exportar CSV
        </Button>
      </div>

      {/* Funil */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        {[
          { label: "Leads", value: funnel.total, icon: MousePointerClick, color: "text-blue-400" },
          { label: "Conversas", value: funnel.conv, icon: MessageCircle, color: "text-cyan-400" },
          { label: "Testes", value: funnel.trials, icon: Beaker, color: "text-purple-400" },
          { label: "Cobranças", value: funnel.payments, icon: CreditCard, color: "text-amber-400" },
          { label: "Pagos", value: funnel.paid, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Conversão", value: `${funnel.rate}%`, icon: TrendingUp, color: "text-pink-400" },
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
      <div className="rounded-xl border border-border bg-card px-5 py-3 mb-4 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Receita gerada (filtros aplicados)</span>
        <span className="font-mono font-bold text-emerald-400">{formatBRL(funnel.revenue)}</span>
      </div>

      {/* Gráfico de evolução diária */}
      <div className="rounded-2xl border border-border bg-card p-5 mb-6 shadow-card-premium">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Evolução diária</h2>
            <p className="text-xs text-muted-foreground">Últimos 30 dias · leads criados vs pagos</p>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailySeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gPaid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} interval={3} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="leads" name="Leads" stroke="hsl(var(--primary))" fill="url(#gLeads)" strokeWidth={2} />
              <Area type="monotone" dataKey="paid" name="Pagos" stroke="#10b981" fill="url(#gPaid)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="pl-10 bg-card" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="bg-card"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="initiated_conversation">Iniciou conversa</SelectItem>
            <SelectItem value="generated_trial">Gerou teste</SelectItem>
            <SelectItem value="generated_payment">Gerou pagamento</SelectItem>
            <SelectItem value="paid">Pagou</SelectItem>
            <SelectItem value="not_paid">Não pagou</SelectItem>
          </SelectContent>
        </Select>
        <Select value={affiliateFilter} onValueChange={setAffiliateFilter}>
          <SelectTrigger className="bg-card"><SelectValue placeholder="Afiliado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos afiliados</SelectItem>
            {affiliates.map((a) => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={productFilter} onValueChange={setProductFilter}>
          <SelectTrigger className="bg-card"><SelectValue placeholder="Produto" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos produtos</SelectItem>
            {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={referrerFilter} onValueChange={setReferrerFilter}>
          <SelectTrigger className="bg-card"><SelectValue placeholder="Afiliador (rede)" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos afiliadores</SelectItem>
            {affiliates
              .filter((a) => Array.from(referrerByAffiliate.values()).includes(a.id))
              .map((a) => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={trialFilter} onValueChange={setTrialFilter}>
          <SelectTrigger className="bg-card"><SelectValue placeholder="Teste solicitado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Teste: todos</SelectItem>
            <SelectItem value="yes">Teste solicitado</SelectItem>
            <SelectItem value="no">Sem teste</SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={linkSlug}
          onChange={(e) => setLinkSlug(e.target.value)}
          placeholder="Origem do link (slug)..."
          className="bg-card"
        />
        <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-card" />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-card" />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card-premium">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background/50 border-b border-border text-xs uppercase text-muted-foreground tracking-wider">
              <tr>
                <th className="text-left px-5 py-3.5">Cliente</th>
                <th className="text-left px-5 py-3.5 hidden md:table-cell">WhatsApp</th>
                <th className="text-left px-5 py-3.5 hidden lg:table-cell">Afiliado</th>
                <th className="text-left px-5 py-3.5">Status</th>
                <th className="text-right px-5 py-3.5 hidden md:table-cell">Valor</th>
                <th className="text-right px-5 py-3.5 hidden lg:table-cell">Data</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">Nenhum lead.</td></tr>
              ) : filtered.map((l) => (
                <tr key={l.id} className="border-b border-border/50 hover:bg-background/40">
                  <td className="px-5 py-3.5 font-medium">{l.customer_name ?? "—"}</td>
                  <td className="px-5 py-3.5 hidden md:table-cell text-muted-foreground">
                    {l.whatsapp_number ? (
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{l.whatsapp_number}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 shrink-0"
                          title="Copiar WhatsApp"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(l.whatsapp_number ?? "");
                            toast.success("WhatsApp copiado!");
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 shrink-0 text-emerald-400 hover:text-emerald-300"
                          title="Abrir WhatsApp"
                          onClick={(e) => {
                            e.stopPropagation();
                            const digits = (l.whatsapp_number ?? "").replace(/\D/g, "");
                            if (!digits) { toast.error("Número inválido"); return; }
                            window.open(`https://wa.me/${digits}`, "_blank", "noopener,noreferrer");
                          }}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : "—"}
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell text-muted-foreground">{(l as { affiliates?: { full_name: string } }).affiliates?.full_name ?? "—"}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={l.status} /></td>
                  <td className="px-5 py-3.5 hidden md:table-cell text-right font-mono">{l.payment_amount ? formatBRL(Number(l.payment_amount)) : "—"}</td>
                  <td className="px-5 py-3.5 hidden lg:table-cell text-right text-xs text-muted-foreground">{formatDateTime(l.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
