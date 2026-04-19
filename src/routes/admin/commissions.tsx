import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, formatDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/commissions")({ component: CommissionsPage });

function CommissionsPage() {
  const qc = useQueryClient();
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

  return (
    <DashboardLayout variant="admin" title="Comissões">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Comissões</h1>
        <p className="text-muted-foreground text-sm mt-1">{data.length} comissões geradas</p>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card-premium">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
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
              {isLoading ? <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">Carregando...</td></tr>
              : data.length === 0 ? <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">Nenhuma comissão.</td></tr>
              : data.map((c) => {
                const a = (c as { affiliates?: { full_name: string } }).affiliates;
                const l = (c as { leads?: { customer_name: string; payment_amount: number } }).leads;
                return (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-background/40">
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
