import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatBRL, formatDate } from "@/lib/format";
import { exportCSV } from "@/lib/csv";
import { DollarSign, Download, Search } from "lucide-react";

export const Route = createFileRoute("/admin/network-commissions")({ component: AdminNetworkCommissions });

function AdminNetworkCommissions() {
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data: affiliates = [] } = useQuery({
    queryKey: ["admin-affiliates-min"],
    queryFn: async () => (await supabase.from("affiliates").select("id, full_name, email")).data ?? [],
  });
  const { data: products = [] } = useQuery({
    queryKey: ["admin-products-min"],
    queryFn: async () => (await supabase.from("products").select("id, name")).data ?? [],
  });
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-network-commissions", productFilter, from, to],
    refetchOnMount: "always",
    queryFn: async () => {
      let q = supabase.from("network_commissions").select("*").order("created_at", { ascending: false });
      if (productFilter !== "all") q = q.eq("product_id", productFilter);
      if (from) q = q.gte("created_at", from);
      if (to) q = q.lte("created_at", `${to}T23:59:59`);
      const { data } = await q;
      return data ?? [];
    },
  });

  const affMap = useMemo(() => new Map(affiliates.map((a) => [a.id, a])), [affiliates]);
  const prodMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const seller = affMap.get(r.seller_affiliate_id);
    const referrer = r.referrer_affiliate_id ? affMap.get(r.referrer_affiliate_id) : null;
    const q = search.toLowerCase();
    return [seller?.full_name, seller?.email, referrer?.full_name, referrer?.email].some((v) => v?.toLowerCase().includes(q));
  });

  const totals = filtered.reduce((acc, r) => ({
    payment: acc.payment + Number(r.payment_amount),
    seller: acc.seller + Number(r.seller_amount),
    referrer: acc.referrer + Number(r.referrer_amount),
    platform: acc.platform + Number(r.platform_amount),
  }), { payment: 0, seller: 0, referrer: 0, platform: 0 });

  const handleExport = () => {
    const data = filtered.map((r) => {
      const seller = affMap.get(r.seller_affiliate_id);
      const referrer = r.referrer_affiliate_id ? affMap.get(r.referrer_affiliate_id) : null;
      const prod = r.product_id ? prodMap.get(r.product_id) : null;
      return {
        data: formatDate(r.created_at),
        produto: prod?.name ?? "—",
        vendedor: seller?.full_name ?? "—",
        vendedor_email: seller?.email ?? "—",
        afiliador: referrer?.full_name ?? "—",
        afiliador_email: referrer?.email ?? "—",
        ciclo: r.payment_cycle,
        venda: Number(r.payment_amount).toFixed(2),
        comissao_vendedor: Number(r.seller_amount).toFixed(2),
        comissao_afiliador: Number(r.referrer_amount).toFixed(2),
        plataforma: Number(r.platform_amount).toFixed(2),
      };
    });
    exportCSV(`comissoes-rede-${new Date().toISOString().slice(0,10)}.csv`, data);
  };

  return (
    <DashboardLayout variant="admin" title="Comissões da Rede">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2"><DollarSign className="h-7 w-7 text-primary" /> Comissões da Rede</h1>
          <p className="text-sm text-muted-foreground mt-1">Histórico de toda comissão gerada pela rede de afiliados.</p>
        </div>
        <Button onClick={handleExport} variant="outline" disabled={!filtered.length}><Download className="h-4 w-4 mr-2" /> Exportar CSV</Button>
      </div>

      {/* Filtros */}
      <div className="rounded-2xl border border-border bg-card p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar vendedor ou afiliador..." className="pl-10" />
        </div>
        <Select value={productFilter} onValueChange={setProductFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os produtos</SelectItem>
            {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="grid grid-cols-2 gap-2">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {/* Totais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="Total vendido" value={formatBRL(totals.payment)} />
        <Stat label="Pago a vendedores" value={formatBRL(totals.seller)} />
        <Stat label="Pago a afiliadores" value={formatBRL(totals.referrer)} />
        <Stat label="Plataforma" value={formatBRL(totals.platform)} />
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card-premium">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3.5">Data</th>
                <th className="text-left px-5 py-3.5">Vendedor</th>
                <th className="text-left px-5 py-3.5">Afiliador</th>
                <th className="text-left px-5 py-3.5 hidden md:table-cell">Produto</th>
                <th className="text-center px-5 py-3.5 hidden md:table-cell">Ciclo</th>
                <th className="text-right px-5 py-3.5">Venda</th>
                <th className="text-right px-5 py-3.5">Vendedor</th>
                <th className="text-right px-5 py-3.5">Afiliador</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={8} className="py-12 text-center text-muted-foreground">Carregando...</td></tr>
              : filtered.length === 0 ? <tr><td colSpan={8} className="py-12 text-center text-muted-foreground">Nenhuma comissão da rede.</td></tr>
              : filtered.map((r) => {
                const seller = affMap.get(r.seller_affiliate_id);
                const referrer = r.referrer_affiliate_id ? affMap.get(r.referrer_affiliate_id) : null;
                const prod = r.product_id ? prodMap.get(r.product_id) : null;
                return (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-background/40">
                    <td className="px-5 py-3 text-xs text-muted-foreground">{formatDate(r.created_at)}</td>
                    <td className="px-5 py-3"><div className="font-medium">{seller?.full_name ?? "—"}</div><div className="text-xs text-muted-foreground">{seller?.email}</div></td>
                    <td className="px-5 py-3"><div className="font-medium">{referrer?.full_name ?? "—"}</div><div className="text-xs text-muted-foreground">{referrer?.email}</div></td>
                    <td className="px-5 py-3 hidden md:table-cell text-xs">{prod?.name ?? "—"}</td>
                    <td className="px-5 py-3 hidden md:table-cell text-center text-xs">#{r.payment_cycle}</td>
                    <td className="px-5 py-3 text-right font-mono">{formatBRL(Number(r.payment_amount))}</td>
                    <td className="px-5 py-3 text-right font-mono text-emerald-400">{formatBRL(Number(r.seller_amount))}</td>
                    <td className="px-5 py-3 text-right font-mono text-primary">{formatBRL(Number(r.referrer_amount))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="font-display text-xl font-bold mt-1">{value}</div>
    </div>
  );
}
