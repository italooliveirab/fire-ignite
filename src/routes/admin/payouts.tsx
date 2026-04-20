import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, formatDate } from "@/lib/format";
import { exportCSV } from "@/lib/csv";
import { toast } from "sonner";
import { Download, Paperclip, FileText, Upload, Check, X, Banknote, Clock, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/admin/payouts")({ component: PayoutsPage });

type PayoutStatus = "requested" | "approved" | "paid" | "rejected";
interface Payout {
  id: string; affiliate_id: string; status: PayoutStatus;
  amount_paid: number | null; amount_requested: number | null;
  payment_date: string; requested_at: string | null; approved_at: string | null; paid_at: string | null;
  reference_period: string | null; pix_key_used: string | null; notes: string | null;
  proof_file_url: string | null; rejected_reason: string | null;
  affiliates?: { full_name: string; email: string; pix_key: string | null };
}

function PayoutsPage() {
  const qc = useQueryClient();
  const [payDialog, setPayDialog] = useState<Payout | null>(null);
  const [rejectDialog, setRejectDialog] = useState<Payout | null>(null);
  const [statusFilter, setStatusFilter] = useState<PayoutStatus | "all">("all");

  const { data: payouts = [], isLoading } = useQuery({
    queryKey: ["payouts", statusFilter],
    refetchOnMount: "always",
    queryFn: async () => {
      let q = supabase.from("payouts").select("*, affiliates(full_name, email, pix_key)").order("requested_at", { ascending: false, nullsFirst: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data } = await q;
      return (data ?? []) as Payout[];
    },
  });

  // realtime
  useEffect(() => {
    const ch = supabase.channel("admin-payouts-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "payouts" },
        () => qc.invalidateQueries({ queryKey: ["payouts"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const counts = payouts.reduce((acc, p) => { acc[p.status] = (acc[p.status] ?? 0) + 1; return acc; }, {} as Record<PayoutStatus, number>);

  const approve = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.rpc("approve_payout", { _payout_id: id }); if (error) throw error; },
    onSuccess: () => { toast.success("Aprovado"); qc.invalidateQueries({ queryKey: ["payouts"] }); },
    onError: (e) => toast.error("Erro", { description: (e as Error).message }),
  });

  const handleExport = () => {
    if (!payouts.length) { toast.error("Nada para exportar"); return; }
    exportCSV(`pagamentos-${new Date().toISOString().slice(0, 10)}`, payouts.map((p) => ({
      status: p.status, afiliado: p.affiliates?.full_name ?? "", email: p.affiliates?.email ?? "",
      solicitado: p.amount_requested ? Number(p.amount_requested).toFixed(2) : "",
      pago: p.amount_paid ? Number(p.amount_paid).toFixed(2) : "",
      solicitado_em: p.requested_at ? formatDate(p.requested_at) : "",
      pago_em: p.paid_at ? formatDate(p.paid_at) : "",
      pix: p.pix_key_used ?? "", comprovante: p.proof_file_url ? "Sim" : "Não",
    })));
  };

  const openProof = async (path: string) => {
    const { data, error } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 60);
    if (error || !data) { toast.error("Não foi possível abrir"); return; }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <DashboardLayout variant="admin" title="Pagamentos">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2"><Banknote className="h-7 w-7 text-primary" /> Pagamentos</h1>
          <p className="text-muted-foreground text-sm mt-1">Solicitações de saque dos afiliados.</p>
        </div>
        <Button variant="outline" onClick={handleExport}><Download className="h-4 w-4 mr-1" /> Exportar CSV</Button>
      </div>

      {/* Filtros por status */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(["all","requested","approved","paid","rejected"] as const).map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>
            {s === "all" ? "Todos" : s === "requested" ? `Solicitados (${counts.requested ?? 0})` : s === "approved" ? `Aprovados (${counts.approved ?? 0})` : s === "paid" ? `Pagos (${counts.paid ?? 0})` : `Rejeitados (${counts.rejected ?? 0})`}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card-premium">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3.5">Afiliado</th>
                <th className="text-left px-5 py-3.5">Status</th>
                <th className="text-right px-5 py-3.5">Solicitado</th>
                <th className="text-right px-5 py-3.5">Pago</th>
                <th className="text-left px-5 py-3.5 hidden lg:table-cell">Solicitado em</th>
                <th className="text-center px-5 py-3.5">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">Carregando...</td></tr>
              : payouts.length === 0 ? <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">Nenhum pagamento.</td></tr>
              : payouts.map((p) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-background/40">
                  <td className="px-5 py-3.5">
                    <div className="font-medium">{p.affiliates?.full_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{p.affiliates?.email}</div>
                  </td>
                  <td className="px-5 py-3.5"><StatusBadge status={p.status} reason={p.rejected_reason} /></td>
                  <td className="px-5 py-3.5 text-right font-mono">{p.amount_requested ? formatBRL(Number(p.amount_requested)) : "—"}</td>
                  <td className="px-5 py-3.5 text-right font-mono text-emerald-400">{p.amount_paid ? formatBRL(Number(p.amount_paid)) : "—"}</td>
                  <td className="px-5 py-3.5 hidden lg:table-cell text-xs">{p.requested_at ? formatDate(p.requested_at) : "—"}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-center gap-1">
                      {p.status === "requested" && <>
                        <Button size="sm" variant="outline" onClick={() => approve.mutate(p.id)} disabled={approve.isPending}><Check className="h-3.5 w-3.5 mr-1 text-emerald-400" /> Aprovar</Button>
                        <Button size="sm" variant="ghost" onClick={() => setRejectDialog(p)}><X className="h-3.5 w-3.5 text-red-400" /></Button>
                      </>}
                      {p.status === "approved" && <Button size="sm" className="bg-gradient-fire text-white shadow-fire" onClick={() => setPayDialog(p)}><Banknote className="h-3.5 w-3.5 mr-1" />Pagar</Button>}
                      {p.proof_file_url && <Button size="sm" variant="ghost" onClick={() => openProof(p.proof_file_url!)}><FileText className="h-4 w-4" /></Button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!payDialog} onOpenChange={(o) => !o && setPayDialog(null)}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle className="font-display text-2xl">Confirmar pagamento</DialogTitle></DialogHeader>
          {payDialog && <PayForm payout={payDialog} onClose={() => { setPayDialog(null); qc.invalidateQueries({ queryKey: ["payouts"] }); }} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectDialog} onOpenChange={(o) => !o && setRejectDialog(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader><DialogTitle className="font-display text-xl">Rejeitar solicitação</DialogTitle></DialogHeader>
          {rejectDialog && <RejectForm payout={rejectDialog} onClose={() => { setRejectDialog(null); qc.invalidateQueries({ queryKey: ["payouts"] }); }} />}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function StatusBadge({ status, reason }: { status: PayoutStatus; reason: string | null }) {
  const cfg = {
    requested: { label: "Solicitado", icon: Clock, cls: "bg-amber-400/15 text-amber-400" },
    approved: { label: "Aprovado", icon: CheckCircle2, cls: "bg-blue-400/15 text-blue-400" },
    paid: { label: "Pago", icon: CheckCircle2, cls: "bg-emerald-400/15 text-emerald-400" },
    rejected: { label: "Rejeitado", icon: XCircle, cls: "bg-red-400/15 text-red-400" },
  }[status];
  const Icon = cfg.icon;
  return <div title={reason ?? undefined} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}><Icon className="h-3 w-3" />{cfg.label}</div>;
}

function PayForm({ payout, onClose }: { payout: Payout; onClose: () => void }) {
  const [amount, setAmount] = useState(String(payout.amount_requested ?? 0));
  const [pix, setPix] = useState(payout.pix_key_used ?? payout.affiliates?.pix_key ?? "");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let proofPath: string | null = payout.proof_file_url;
      if (file) {
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `${payout.affiliate_id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
        proofPath = path;
      }
      // atualiza pix antes (RPC não cobre)
      if (pix !== payout.pix_key_used) {
        await supabase.from("payouts").update({ pix_key_used: pix }).eq("id", payout.id);
      }
      const { error } = await supabase.rpc("mark_payout_paid", { _payout_id: payout.id, _amount_paid: Number(amount), _proof_url: proofPath ?? undefined, _notes: notes || undefined });
      if (error) throw error;
      toast.success("Pagamento registrado!");
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="text-sm text-muted-foreground">Para <span className="text-foreground font-medium">{payout.affiliates?.full_name}</span></div>
      <div className="space-y-1.5"><Label className="text-xs">Valor pago</Label><Input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
      <div className="space-y-1.5"><Label className="text-xs">Chave Pix</Label><Input value={pix} onChange={(e) => setPix(e.target.value)} /></div>
      <div className="space-y-1.5"><Label className="text-xs">Observação</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      <div className="space-y-1.5">
        <Label className="text-xs flex items-center gap-1"><Paperclip className="h-3.5 w-3.5" /> Comprovante</Label>
        <label className="flex items-center justify-center gap-2 border border-dashed border-border rounded-lg px-3 py-4 cursor-pointer hover:bg-background/40 transition">
          <Upload className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{file ? file.name : "Clique para anexar"}</span>
          <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
      </div>
      <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={saving} className="bg-gradient-fire text-white shadow-fire">{saving ? "Salvando..." : "Confirmar pagamento"}</Button></div>
    </form>
  );
}

function RejectForm({ payout, onClose }: { payout: Payout; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.rpc("reject_payout", { _payout_id: payout.id, _reason: reason });
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success("Rejeitado"); onClose(); }
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="text-sm text-muted-foreground">Motivo da rejeição (visível ao afiliado):</div>
      <Textarea required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: dados de Pix incorretos" />
      <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={saving} variant="destructive">{saving ? "..." : "Rejeitar"}</Button></div>
    </form>
  );
}
