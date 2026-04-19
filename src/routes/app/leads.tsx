import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/app/leads")({ component: MyLeads });

function MyLeads() {
  const { user } = useAuth();
  const { data = [], isLoading } = useQuery({
    queryKey: ["my-leads", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const aff = (await supabase.from("affiliates").select("id").eq("user_id", user!.id).maybeSingle()).data;
      if (!aff) return [];
      return (await supabase.from("leads").select("*").eq("affiliate_id", aff.id).order("created_at", { ascending: false })).data ?? [];
    },
  });

  return (
    <DashboardLayout variant="affiliate" title="Meus Leads">
      <h1 className="font-display text-3xl font-bold mb-6">Meus leads</h1>
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card-premium">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3.5">Cliente</th>
                <th className="text-left px-5 py-3.5 hidden md:table-cell">Número</th>
                <th className="text-left px-5 py-3.5">Status</th>
                <th className="text-right px-5 py-3.5 hidden md:table-cell">Valor</th>
                <th className="text-right px-5 py-3.5 hidden lg:table-cell">Data</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">Carregando...</td></tr>
              : data.length === 0 ? <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">Nenhum lead ainda.</td></tr>
              : data.map((l) => (
                <tr key={l.id} className="border-b border-border/50 hover:bg-background/40">
                  <td className="px-5 py-3.5 font-medium">{l.customer_name ?? "—"}</td>
                  <td className="px-5 py-3.5 hidden md:table-cell text-muted-foreground">{l.whatsapp_number ?? "—"}</td>
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
