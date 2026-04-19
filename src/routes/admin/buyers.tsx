import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, formatDateTime } from "@/lib/format";
import { ShoppingCart } from "lucide-react";

export const Route = createFileRoute("/admin/buyers")({ component: BuyersPage });

function BuyersPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["buyers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select("*, affiliates(full_name, commission_type, commission_value), commissions(commission_value)")
        .eq("status", "paid")
        .order("paid_at", { ascending: false });
      return data ?? [];
    },
  });

  const total = data.reduce((acc, l) => acc + Number(l.payment_amount ?? 0), 0);

  return (
    <DashboardLayout variant="admin" title="Compradores">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Leads compradores</h1>
          <p className="text-muted-foreground text-sm mt-1">Faturamento total: <span className="text-success font-semibold">{formatBRL(total)}</span></p>
        </div>
        <div className="h-12 w-12 rounded-xl bg-success/15 border border-success/30 flex items-center justify-center text-success">
          <ShoppingCart className="h-5 w-5" />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card-premium">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3.5">Cliente</th>
                <th className="text-left px-5 py-3.5 hidden md:table-cell">WhatsApp</th>
                <th className="text-left px-5 py-3.5 hidden lg:table-cell">Afiliado</th>
                <th className="text-right px-5 py-3.5">Valor pago</th>
                <th className="text-right px-5 py-3.5 hidden md:table-cell">Comissão</th>
                <th className="text-right px-5 py-3.5 hidden lg:table-cell">Data pagamento</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">Carregando...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">Nenhum comprador ainda.</td></tr>
              ) : data.map((l) => {
                const a = (l as { affiliates?: { full_name: string; commission_type: string; commission_value: number } }).affiliates;
                const c = (l as { commissions?: { commission_value: number }[] }).commissions?.[0];
                return (
                  <tr key={l.id} className="border-b border-border/50 hover:bg-background/40">
                    <td className="px-5 py-3.5 font-medium">{l.customer_name ?? "—"}</td>
                    <td className="px-5 py-3.5 hidden md:table-cell text-muted-foreground">{l.whatsapp_number ?? "—"}</td>
                    <td className="px-5 py-3.5 hidden lg:table-cell text-muted-foreground">{a?.full_name ?? "—"}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-success">{formatBRL(Number(l.payment_amount ?? 0))}</td>
                    <td className="px-5 py-3.5 hidden md:table-cell text-right font-mono">{c ? formatBRL(c.commission_value) : "—"}</td>
                    <td className="px-5 py-3.5 hidden lg:table-cell text-right text-xs text-muted-foreground">{formatDateTime(l.paid_at)}</td>
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
