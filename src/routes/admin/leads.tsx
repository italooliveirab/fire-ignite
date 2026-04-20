import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
import { Search, Download } from "lucide-react";

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

  const { data: affiliates = [] } = useQuery({
    queryKey: ["aff-list"],
    queryFn: async () => (await supabase.from("affiliates").select("id, full_name").order("full_name")).data ?? [],
  });

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data } = await supabase.from("leads").select("*, affiliates(full_name, slug)").order("created_at", { ascending: false }).limit(500);
      return data ?? [];
    },
  });

  const filtered = leads.filter((l) => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (affiliateFilter !== "all" && l.affiliate_id !== affiliateFilter) return false;
    if (search && ![l.customer_name, l.whatsapp_number].some((f) => f?.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  return (
    <DashboardLayout variant="admin" title="Leads">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Leads</h1>
          <p className="text-muted-foreground text-sm mt-1">{filtered.length} leads exibidos</p>
        </div>
        <Button variant="outline" onClick={() => {
          if (!filtered.length) { toast.error("Nada para exportar"); return; }
          exportCSV(`leads-${new Date().toISOString().slice(0, 10)}`, filtered.map((l) => ({
            data: formatDateTime(l.created_at),
            cliente: l.customer_name ?? "",
            whatsapp: l.whatsapp_number ?? "",
            afiliado: (l as { affiliates?: { full_name: string } }).affiliates?.full_name ?? "",
            status: STATUS_LABEL[l.status] ?? l.status,
            valor: l.payment_amount ? Number(l.payment_amount).toFixed(2).replace(".", ",") : "",
          })), [
            { key: "data", label: "Data" },
            { key: "cliente", label: "Cliente" },
            { key: "whatsapp", label: "WhatsApp" },
            { key: "afiliado", label: "Afiliado" },
            { key: "status", label: "Status" },
            { key: "valor", label: "Valor (R$)" },
          ]);
          toast.success(`${filtered.length} leads exportados`);
        }} className="border-border">
          <Download className="h-4 w-4 mr-1" /> Exportar CSV
        </Button>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-4">
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
                  <td className="px-5 py-3.5 hidden md:table-cell text-muted-foreground">{l.whatsapp_number ?? "—"}</td>
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
