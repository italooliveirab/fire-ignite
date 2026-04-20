import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, Inbox, Edit } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/admin/requests")({ component: RequestsPage });

interface Request {
  id: string;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  decided_at: string | null;
  commission_type: "percentage" | "fixed";
  commission_value: number;
  affiliate: { id: string; full_name: string; email: string; slug: string } | null;
  product: { id: string; name: string; slug: string } | null;
}

function RequestsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [commissionType, setCommissionType] = useState<"percentage" | "fixed">("percentage");
  const [commissionValue, setCommissionValue] = useState<string>("30");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["affiliate-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_products")
        .select("id, status, requested_at, decided_at, commission_type, commission_value, affiliate:affiliates(id, full_name, email, slug), product:products(id, name, slug)")
        .order("requested_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Request[];
    },
  });

  const approve = useMutation({
    mutationFn: async ({ id, type, value }: { id: string; type: "percentage" | "fixed"; value: number }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("affiliate_products").update({
        status: "approved",
        commission_type: type,
        commission_value: value,
        decided_at: new Date().toISOString(),
        decided_by: u.user?.id ?? null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Afiliação aprovada com comissão definida");
      qc.invalidateQueries({ queryKey: ["affiliate-requests"] });
      setApprovingId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: async (id: string) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("affiliate_products").update({
        status: "rejected",
        decided_at: new Date().toISOString(),
        decided_by: u.user?.id ?? null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Afiliação recusada");
      qc.invalidateQueries({ queryKey: ["affiliate-requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateCommission = useMutation({
    mutationFn: async ({ id, type, value }: { id: string; type: "percentage" | "fixed"; value: number }) => {
      const { error } = await supabase.from("affiliate_products").update({
        commission_type: type,
        commission_value: value,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Comissão atualizada");
      qc.invalidateQueries({ queryKey: ["affiliate-requests"] });
      setEditingId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);
  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const openApprove = (r: Request) => {
    setApprovingId(r.id);
    setCommissionType("percentage");
    setCommissionValue("30");
  };
  const openEdit = (r: Request) => {
    setEditingId(r.id);
    setCommissionType(r.commission_type);
    setCommissionValue(String(r.commission_value));
  };

  const submitCommission = () => {
    const val = Number(commissionValue);
    if (!Number.isFinite(val) || val <= 0) {
      toast.error("Informe um valor de comissão maior que zero");
      return;
    }
    if (approvingId) {
      approve.mutate({ id: approvingId, type: commissionType, value: val });
    } else if (editingId) {
      updateCommission.mutate({ id: editingId, type: commissionType, value: val });
    }
  };

  const dialogOpen = approvingId !== null || editingId !== null;
  const dialogTitle = approvingId ? "Aprovar e definir comissão" : "Editar comissão";
  const dialogContext = approvingId
    ? requests.find((r) => r.id === approvingId)
    : requests.find((r) => r.id === editingId);

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
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium">{r.affiliate?.full_name ?? "—"}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium text-primary">{r.product?.name ?? "—"}</span>
                    {r.status === "approved" && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/30">
                        {r.commission_type === "percentage" ? `${r.commission_value}%` : formatBRL(r.commission_value)}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.affiliate?.email} · solicitado em {new Date(r.requested_at).toLocaleString("pt-BR")}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {r.status === "pending" ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => reject.mutate(r.id)} className="border-destructive/40 text-destructive hover:bg-destructive/10">
                        <X className="h-4 w-4 mr-1" /> Recusar
                      </Button>
                      <Button size="sm" onClick={() => openApprove(r)} className="bg-success text-success-foreground hover:bg-success/90">
                        <Check className="h-4 w-4 mr-1" /> Aprovar
                      </Button>
                    </>
                  ) : r.status === "approved" ? (
                    <Button size="sm" variant="outline" onClick={() => openEdit(r)} className="border-border">
                      <Edit className="h-3.5 w-3.5 mr-1" /> Editar comissão
                    </Button>
                  ) : (
                    <span className="text-xs px-3 py-1 rounded-full border bg-destructive/15 text-destructive border-destructive/30">
                      Recusada
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => { if (!o) { setApprovingId(null); setEditingId(null); } }}
      >
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{dialogTitle}</DialogTitle>
          </DialogHeader>
          {dialogContext && (
            <div className="text-sm text-muted-foreground mb-2">
              <span className="font-medium text-foreground">{dialogContext.affiliate?.full_name}</span> ×{" "}
              <span className="font-medium text-primary">{dialogContext.product?.name}</span>
            </div>
          )}
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de comissão</Label>
              <Select value={commissionType} onValueChange={(v: "percentage" | "fixed") => setCommissionType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                  <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{commissionType === "percentage" ? "Valor (%)" : "Valor (R$)"}</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                required
                autoFocus
                value={commissionValue}
                onChange={(e) => setCommissionValue(e.target.value)}
                placeholder={commissionType === "percentage" ? "30" : "50,00"}
              />
              <p className="text-xs text-muted-foreground">
                Esta é a comissão que <strong className="text-foreground">{dialogContext?.affiliate?.full_name ?? "este afiliado"}</strong> receberá em cada venda do produto <strong className="text-foreground">{dialogContext?.product?.name ?? ""}</strong>.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => { setApprovingId(null); setEditingId(null); }}>Cancelar</Button>
            <Button onClick={submitCommission} disabled={approve.isPending || updateCommission.isPending} className="bg-gradient-fire text-white shadow-fire">
              {approvingId ? "Aprovar afiliação" : "Salvar comissão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
