import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, formatDate } from "@/lib/format";

export const Route = createFileRoute("/app/payouts")({ component: MyPayouts });

function MyPayouts() {
  const { user } = useAuth();
  const { data = [], isLoading } = useQuery({
    queryKey: ["my-payouts", user?.id], enabled: !!user,
    queryFn: async () => {
      const aff = (await supabase.from("affiliates").select("id").eq("user_id", user!.id).maybeSingle()).data;
      if (!aff) return [];
      return (await supabase.from("payouts").select("*").eq("affiliate_id", aff.id).order("payment_date", { ascending: false })).data ?? [];
    },
  });

  const total = data.reduce((a, p) => a + Number(p.amount_paid), 0);

  return (
    <DashboardLayout variant="affiliate" title="Pagamentos">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Meus pagamentos</h1>
        <p className="text-muted-foreground text-sm mt-1">Total recebido: <span className="text-success font-semibold">{formatBRL(total)}</span></p>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card-premium">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3.5">Data</th>
                <th className="text-right px-5 py-3.5">Valor</th>
                <th className="text-left px-5 py-3.5 hidden md:table-cell">Pix</th>
                <th className="text-left px-5 py-3.5 hidden lg:table-cell">Referência</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={4} className="py-12 text-center text-muted-foreground">Carregando...</td></tr>
              : data.length === 0 ? <tr><td colSpan={4} className="py-12 text-center text-muted-foreground">Nenhum pagamento ainda.</td></tr>
              : data.map((p) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-background/40">
                  <td className="px-5 py-3.5 font-medium">{formatDate(p.payment_date)}</td>
                  <td className="px-5 py-3.5 text-right font-mono text-success">{formatBRL(Number(p.amount_paid))}</td>
                  <td className="px-5 py-3.5 hidden md:table-cell font-mono text-xs text-muted-foreground">{p.pix_key_used ?? "—"}</td>
                  <td className="px-5 py-3.5 hidden lg:table-cell text-muted-foreground">{p.reference_period ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
