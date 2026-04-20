import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, Inbox } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/admin/requests")({ component: RequestsPage });

interface Request {
  id: string;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  decided_at: string | null;
  affiliate: { id: string; full_name: string; email: string; slug: string } | null;
  product: { id: string; name: string; slug: string } | null;
}

function RequestsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["affiliate-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_products")
        .select("id, status, requested_at, decided_at, affiliate:affiliates(id, full_name, email, slug), product:products(id, name, slug)")
        .order("requested_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Request[];
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("affiliate_products").update({
        status,
        decided_at: new Date().toISOString(),
        decided_by: u.user?.id ?? null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.status === "approved" ? "Afiliação aprovada" : "Afiliação recusada");
      qc.invalidateQueries({ queryKey: ["affiliate-requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);
  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <DashboardLayout variant="admin" title="Solicitações">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Solicitações de afiliação</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {pendingCount > 0 ? `${pendingCount} aguardando aprovação` : "Nenhuma solicitação pendente"}
        </p>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium border transition whitespace-nowrap ${
              filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {f === "pending" ? "Pendentes" : f === "approved" ? "Aprovadas" : f === "rejected" ? "Recusadas" : "Todas"}
            {f === "pending" && pendingCount > 0 && ` (${pendingCount})`}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card-premium">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma solicitação {filter === "pending" ? "pendente" : ""}.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((r) => (
              <div key={r.id} className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{r.affiliate?.full_name ?? "—"}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium text-primary">{r.product?.name ?? "—"}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.affiliate?.email} · solicitado em {new Date(r.requested_at).toLocaleString("pt-BR")}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {r.status === "pending" ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => decide.mutate({ id: r.id, status: "rejected" })} className="border-destructive/40 text-destructive hover:bg-destructive/10">
                        <X className="h-4 w-4 mr-1" /> Recusar
                      </Button>
                      <Button size="sm" onClick={() => decide.mutate({ id: r.id, status: "approved" })} className="bg-success text-success-foreground hover:bg-success/90">
                        <Check className="h-4 w-4 mr-1" /> Aprovar
                      </Button>
                    </>
                  ) : (
                    <span className={`text-xs px-3 py-1 rounded-full border ${
                      r.status === "approved" ? "bg-success/15 text-success border-success/30" : "bg-destructive/15 text-destructive border-destructive/30"
                    }`}>
                      {r.status === "approved" ? "Aprovada" : "Recusada"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
