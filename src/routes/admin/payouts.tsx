import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/admin/payouts")({ component: PayoutsPage });

function PayoutsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: affiliates = [] } = useQuery({
    queryKey: ["aff-pay"],
    queryFn: async () => (await supabase.from("affiliates").select("id, full_name, pix_key").order("full_name")).data ?? [],
  });

  const { data: payouts = [], isLoading } = useQuery({
    queryKey: ["payouts"],
    queryFn: async () => (await supabase.from("payouts").select("*, affiliates(full_name)").order("payment_date", { ascending: false })).data ?? [],
  });

  return (
    <DashboardLayout variant="admin" title="Pagamentos">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Pagamentos manuais</h1>
          <p className="text-muted-foreground text-sm mt-1">Histórico de Pix enviados aos afiliados</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-gradient-fire text-white shadow-fire">
          <Plus className="h-4 w-4 mr-1" /> Registrar pagamento
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card-premium">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3.5">Afiliado</th>
                <th className="text-right px-5 py-3.5">Valor</th>
                <th className="text-left px-5 py-3.5 hidden md:table-cell">Referência</th>
                <th className="text-left px-5 py-3.5 hidden md:table-cell">Data</th>
                <th className="text-left px-5 py-3.5 hidden lg:table-cell">Pix</th>
                <th className="text-left px-5 py-3.5 hidden lg:table-cell">Obs.</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">Carregando...</td></tr>
              : payouts.length === 0 ? <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">Nenhum pagamento registrado.</td></tr>
              : payouts.map((p) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-background/40">
                  <td className="px-5 py-3.5 font-medium">{(p as { affiliates?: { full_name: string } }).affiliates?.full_name ?? "—"}</td>
                  <td className="px-5 py-3.5 text-right font-mono text-success">{formatBRL(Number(p.amount_paid))}</td>
                  <td className="px-5 py-3.5 hidden md:table-cell text-muted-foreground">{p.reference_period ?? "—"}</td>
                  <td className="px-5 py-3.5 hidden md:table-cell text-xs">{formatDate(p.payment_date)}</td>
                  <td className="px-5 py-3.5 hidden lg:table-cell font-mono text-xs text-muted-foreground">{p.pix_key_used ?? "—"}</td>
                  <td className="px-5 py-3.5 hidden lg:table-cell text-xs text-muted-foreground truncate max-w-[200px]">{p.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle className="font-display text-2xl">Novo pagamento</DialogTitle></DialogHeader>
          <PayoutForm affiliates={affiliates} onClose={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["payouts"] }); }} />
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function PayoutForm({ affiliates, onClose }: { affiliates: { id: string; full_name: string; pix_key: string | null }[]; onClose: () => void }) {
  const [form, setForm] = useState({
    affiliate_id: "", amount_paid: "", reference_period: "",
    payment_date: new Date().toISOString().slice(0, 10), pix_key_used: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("payouts").insert({ ...form, amount_paid: Number(form.amount_paid) });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Pagamento registrado");
    onClose();
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Afiliado</Label>
        <Select value={form.affiliate_id} onValueChange={(v) => {
          const a = affiliates.find((x) => x.id === v);
          setForm({ ...form, affiliate_id: v, pix_key_used: a?.pix_key ?? form.pix_key_used });
        }}>
          <SelectTrigger><SelectValue placeholder="Escolha o afiliado" /></SelectTrigger>
          <SelectContent>{affiliates.map((a) => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label className="text-xs">Valor pago</Label><Input type="number" step="0.01" required value={form.amount_paid} onChange={(e) => setForm({ ...form, amount_paid: e.target.value })} /></div>
        <div className="space-y-1.5"><Label className="text-xs">Data</Label><Input type="date" required value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} /></div>
      </div>
      <div className="space-y-1.5"><Label className="text-xs">Referência (período)</Label><Input placeholder="Ex: 01/04 a 15/04" value={form.reference_period} onChange={(e) => setForm({ ...form, reference_period: e.target.value })} /></div>
      <div className="space-y-1.5"><Label className="text-xs">Chave Pix usada</Label><Input value={form.pix_key_used} onChange={(e) => setForm({ ...form, pix_key_used: e.target.value })} /></div>
      <div className="space-y-1.5"><Label className="text-xs">Observação</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
      <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={saving} className="bg-gradient-fire text-white shadow-fire">{saving ? "Salvando..." : "Registrar"}</Button></div>
    </form>
  );
}
