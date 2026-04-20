import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, formatDate } from "@/lib/format";
import { exportCSV } from "@/lib/csv";
import { toast } from "sonner";
import { Download, CheckCheck, Loader2 } from "lucide-react";

const STATUS_LABEL: Record<string, string> = { pending: "Pendente", released: "Liberada", paid: "Paga" };

export const Route = createFileRoute("/admin/commissions")({ component: CommissionsPage });

function CommissionsPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data = [], isLoading } = useQuery({
    queryKey: ["commissions"],
    queryFn: async () => {
      const { data } = await supabase.from("commissions").select("*, affiliates(full_name), leads(customer_name, payment_amount)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("commissions").update({ status: status as "pending" | "released" | "paid" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Status atualizado"); qc.invalidateQueries({ queryKey: ["commissions"] }); },
  });

  const markPaid = useMutation({
    mutationFn: async (ids: string[]) => {
      // Buscar comissões selecionadas com dados do afiliado (pix)
      const { data: rows, error: fetchErr } = await supabase
        .from("commissions")
        .select("id, affiliate_id, commission_value, affiliates(pix_key)")
        .in("id", ids);
      if (fetchErr) throw fetchErr;
      if (!rows?.length) throw new Error("Nenhuma comissão encontrada");

      // Atualizar status para paga
      const { error: updErr } = await supabase
        .from("commissions")
        .update({ status: "paid" as const })
        .in("id", ids);
      if (updErr) throw updErr;

      // Agrupar por afiliado e criar payouts
      const byAffiliate = new Map<string, { total: number; pix: string | null }>();
      for (const r of rows) {
        const cur = byAffiliate.get(r.affiliate_id) ?? { total: 0, pix: null };
        cur.total += Number(r.commission_value);
        const aff = (r as { affiliates?: { pix_key: string | null } }).affiliates;
        cur.pix = aff?.pix_key ?? cur.pix;
        byAffiliate.set(r.affiliate_id, cur);
      }
      const today = new Date().toISOString().slice(0, 10);
      const period = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      const payoutsToInsert = Array.from(byAffiliate.entries()).map(([affiliate_id, v]) => ({
        affiliate_id,
        amount_paid: v.total,
        payment_date: today,
        reference_period: period,
        pix_key_used: v.pix,
        notes: `Pagamento automático de ${ids.length} comissão(ões) em lote`,
      }));
      const { error: payErr } = await supabase.from("payouts").insert(payoutsToInsert);
      if (payErr) throw payErr;

      return { count: ids.length, payouts: payoutsToInsert.length };
    },
    onSuccess: ({ count, payouts }) => {
      toast.success(`${count} comissão(ões) paga(s) · ${payouts} pagamento(s) gerado(s)`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["commissions"] });
      qc.invalidateQueries({ queryKey: ["payouts"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectableIds = useMemo(() => data.filter((c) => c.status !== "paid").map((c) => c.id), [data]);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(selectableIds));
  };

  const selectedCount = selected.size;
  const selectedTotal = useMemo(
    () => data.filter((c) => selected.has(c.id)).reduce((s, c) => s + Number(c.commission_value), 0),
    [data, selected],
  );

  return (
    <DashboardLayout variant="admin" title="Comissões">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Comissões</h1>
          <p className="text-muted-foreground text-sm mt-1">{data.length} comissões geradas</p>
        </div>
        <Button variant="outline" onClick={() => {
          if (!data.length) { toast.error("Nada para exportar"); return; }
          exportCSV(`comissoes-${new Date().toISOString().slice(0, 10)}`, data.map((c) => {
            const a = (c as { affiliates?: { full_name: string } }).affiliates;
            const l = (c as { leads?: { customer_name: string; payment_amount: number } }).leads;
            return {
              data: formatDate(c.created_at),
              afiliado: a?.full_name ?? "",
              cliente: l?.customer_name ?? "",
              venda: l?.payment_amount ? Number(l.payment_amount).toFixed(2).replace(".", ",") : "",
              comissao: Number(c.commission_value).toFixed(2).replace(".", ","),
              status: STATUS_LABEL[c.status] ?? c.status,
            };
          }), [
            { key: "data", label: "Data" },
            { key: "afiliado", label: "Afiliado" },
            { key: "cliente", label: "Cliente" },
            { key: "venda", label: "Venda (R$)" },
            { key: "comissao", label: "Comissão (R$)" },
            { key: "status", label: "Status" },
          ]);
          toast.success(`${data.length} comissões exportadas`);
        }} className="border-border">
          <Download className="h-4 w-4 mr-1" /> Exportar CSV
        </Button>
      </div>

      {selectedCount > 0 && (
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-primary/5 px-4 py-3 shadow-card-premium">
          <div className="text-sm">
            <span className="font-semibold text-foreground">{selectedCount}</span>{" "}
            <span className="text-muted-foreground">selecionada(s) · total</span>{" "}
            <span className="font-mono text-primary font-semibold">{formatBRL(selectedTotal)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Limpar</Button>
            <Button
              size="sm"
              disabled={markPaid.isPending}
              onClick={() => {
                if (confirm(`Marcar ${selectedCount} comissão(ões) como paga(s)?`)) {
                  markPaid.mutate(Array.from(selected));
                }
              }}
              className="bg-gradient-fire text-white shadow-fire"
            >
              {markPaid.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCheck className="h-4 w-4 mr-1" />}
              Marcar selecionadas como pagas
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card-premium">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="w-10 px-5 py-3.5">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    disabled={selectableIds.length === 0}
                    aria-label="Selecionar todas"
                  />
                </th>
                <th className="text-left px-5 py-3.5">Afiliado</th>
                <th className="text-left px-5 py-3.5 hidden md:table-cell">Cliente</th>
                <th className="text-right px-5 py-3.5 hidden md:table-cell">Venda</th>
                <th className="text-right px-5 py-3.5">Comissão</th>
                <th className="text-left px-5 py-3.5">Status</th>
                <th className="text-right px-5 py-3.5 hidden lg:table-cell">Data</th>
                <th className="text-right px-5 py-3.5">Ação</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={8} className="py-12 text-center text-muted-foreground">Carregando...</td></tr>
              : data.length === 0 ? <tr><td colSpan={8} className="py-12 text-center text-muted-foreground">Nenhuma comissão.</td></tr>
              : data.map((c) => {
                const a = (c as { affiliates?: { full_name: string } }).affiliates;
                const l = (c as { leads?: { customer_name: string; payment_amount: number } }).leads;
                const isPaid = c.status === "paid";
                const isChecked = selected.has(c.id);
                return (
                  <tr key={c.id} className={`border-b border-border/50 hover:bg-background/40 ${isChecked ? "bg-primary/5" : ""}`}>
                    <td className="px-5 py-3.5">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggle(c.id)}
                        disabled={isPaid}
                        aria-label={`Selecionar comissão ${c.id}`}
                      />
                    </td>
                    <td className="px-5 py-3.5 font-medium">{a?.full_name ?? "—"}</td>
                    <td className="px-5 py-3.5 hidden md:table-cell text-muted-foreground">{l?.customer_name ?? "—"}</td>
                    <td className="px-5 py-3.5 hidden md:table-cell text-right font-mono">{l?.payment_amount ? formatBRL(l.payment_amount) : "—"}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-primary">{formatBRL(Number(c.commission_value))}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={c.status} /></td>
                    <td className="px-5 py-3.5 hidden lg:table-cell text-right text-xs text-muted-foreground">{formatDate(c.created_at)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <Select value={c.status} onValueChange={(v) => update.mutate({ id: c.id, status: v })}>
                        <SelectTrigger className="h-8 w-32 ml-auto"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="released">Liberada</SelectItem>
                          <SelectItem value="paid">Paga</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
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
