import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { Banknote, Wallet, Clock, CheckCircle2, XCircle, FileText, ArrowUpCircle } from "lucide-react";

export const Route = createFileRoute("/app/payouts")({ component: MyPayouts });

type PayoutStatus = "requested" | "approved" | "paid" | "rejected";

function MyPayouts() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: affiliate } = useQuery({
    queryKey: ["my-aff-pay", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("affiliates").select("id").eq("user_id", user!.id).maybeSingle()).data,
  });

  const { data: balance } = useQuery({
    queryKey: ["my-balance", affiliate?.id], enabled: !!affiliate?.id,
    refetchOnMount: "always",
    queryFn: async () => {
      const { data } = await supabase.rpc("get_affiliate_balance", { _affiliate_id: affiliate!.id });
      return data?.[0] ?? { available: 0, pending_request: 0, lifetime_earned: 0 };
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["settings-min"],
    queryFn: async () => (await supabase.from("settings").select("minimum_payout").maybeSingle()).data,
  });

  const { data: payouts = [] } = useQuery({
    queryKey: ["my-payouts", affiliate?.id], enabled: !!affiliate?.id,
    refetchOnMount: "always",
    queryFn: async () => (await supabase.from("payouts").select("*").eq("affiliate_id", affiliate!.id).order("requested_at", { ascending: false, nullsFirst: false })).data ?? [],
  });

  // realtime: invalida quando o admin atualiza meu payout
  useEffect(() => {
    if (!affiliate?.id) return;
    const ch = supabase.channel(`my-payouts-${affiliate.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "payouts", filter: `affiliate_id=eq.${affiliate.id}` },
        () => { qc.invalidateQueries({ queryKey: ["my-payouts", affiliate.id] }); qc.invalidateQueries({ queryKey: ["my-balance", affiliate.id] }); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [affiliate?.id, qc]);

  const request = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("request_payout", { _affiliate_id: affiliate!.id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Solicitação de saque enviada!"); qc.invalidateQueries({ queryKey: ["my-balance", affiliate?.id] }); qc.invalidateQueries({ queryKey: ["my-payouts", affiliate?.id] }); },
    onError: (e) => toast.error("Não foi possível solicitar", { description: (e as Error).message }),
  });

  const minPayout = Number(settings?.minimum_payout ?? 50);
  const available = Number(balance?.available ?? 0);
  const pending = Number(balance?.pending_request ?? 0);
  const lifetime = Number(balance?.lifetime_earned ?? 0);
  const canRequest = available > 0 && available >= minPayout && pending === 0;

  return (
    <DashboardLayout variant="affiliate" title="Pagamentos">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2"><Banknote className="h-7 w-7 text-primary" /> Meus pagamentos</h1>
        <p className="text-sm text-muted-foreground mt-1">Solicite seu saque quando atingir o saldo mínimo de {formatBRL(minPayout)}.</p>
      </div>

      {/* Saldo + ação */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Saldo disponível" value={formatBRL(available)} icon={Wallet} accent="success" />
        <StatCard label="Em solicitação" value={formatBRL(pending)} icon={Clock} accent="fire" />
        <StatCard label="Total já recebido" value={formatBRL(lifetime - available - pending)} icon={CheckCircle2} accent="neon" />
      </div>

      <div className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 to-transparent p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-display font-semibold text-lg flex items-center gap-2"><ArrowUpCircle className="h-5 w-5 text-primary" /> Solicitar saque</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Você só pode sacar o valor total disponível ({formatBRL(available)}). Saques parciais não são permitidos.
            </p>
            {pending > 0 && <p className="text-xs text-amber-400 mt-2">Você já tem uma solicitação de {formatBRL(pending)} em andamento.</p>}
            {available > 0 && available < minPayout && <p className="text-xs text-amber-400 mt-2">Saldo abaixo do mínimo de {formatBRL(minPayout)}.</p>}
          </div>
          <Button onClick={() => request.mutate()} disabled={!canRequest || request.isPending}
            className="bg-gradient-fire text-white shadow-fire h-11 px-6">
            {request.isPending ? "Solicitando..." : `Solicitar ${formatBRL(available)}`}
          </Button>
        </div>
      </div>

      {/* Histórico */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card-premium">
        <div className="px-5 py-3.5 border-b border-border font-display font-semibold">Histórico de saques</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3">Solicitado em</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-right px-5 py-3">Solicitado</th>
                <th className="text-right px-5 py-3">Pago</th>
                <th className="text-left px-5 py-3 hidden md:table-cell">Pago em</th>
                <th className="text-center px-5 py-3">Comprovante</th>
              </tr>
            </thead>
            <tbody>
              {payouts.length === 0 ? <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">Nenhum saque ainda.</td></tr>
              : payouts.map((p) => <PayoutRow key={p.id} p={p} />)}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}

function PayoutRow({ p }: { p: { id: string; status: PayoutStatus; requested_at: string | null; paid_at: string | null; payment_date: string; amount_requested: number | null; amount_paid: number | null; proof_file_url: string | null; rejected_reason: string | null } }) {
  const openProof = async () => {
    if (!p.proof_file_url) return;
    const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(p.proof_file_url, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };
  return (
    <tr className="border-b border-border/50 hover:bg-background/40">
      <td className="px-5 py-3 text-xs text-muted-foreground">{formatDate(p.requested_at ?? p.payment_date)}</td>
      <td className="px-5 py-3"><PayoutStatusBadge status={p.status} reason={p.rejected_reason} /></td>
      <td className="px-5 py-3 text-right font-mono">{p.amount_requested ? formatBRL(Number(p.amount_requested)) : "—"}</td>
      <td className="px-5 py-3 text-right font-mono text-emerald-400">{p.amount_paid ? formatBRL(Number(p.amount_paid)) : "—"}</td>
      <td className="px-5 py-3 hidden md:table-cell text-xs text-muted-foreground">{p.paid_at ? formatDate(p.paid_at) : "—"}</td>
      <td className="px-5 py-3 text-center">
        {p.proof_file_url ? <Button size="sm" variant="ghost" onClick={openProof} className="text-primary"><FileText className="h-4 w-4 mr-1" />Ver</Button> : <span className="text-xs text-muted-foreground">—</span>}
      </td>
    </tr>
  );
}

function PayoutStatusBadge({ status, reason }: { status: PayoutStatus; reason: string | null }) {
  const cfg = {
    requested: { label: "Solicitado", icon: Clock, cls: "bg-amber-400/15 text-amber-400" },
    approved: { label: "Aprovado", icon: CheckCircle2, cls: "bg-blue-400/15 text-blue-400" },
    paid: { label: "Pago", icon: CheckCircle2, cls: "bg-emerald-400/15 text-emerald-400" },
    rejected: { label: "Rejeitado", icon: XCircle, cls: "bg-red-400/15 text-red-400" },
  }[status];
  const Icon = cfg.icon;
  return (
    <div title={reason ?? undefined} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      <Icon className="h-3 w-3" /> {cfg.label}
    </div>
  );
}
