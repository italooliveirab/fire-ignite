import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, formatDate } from "@/lib/format";
import { exportCSV } from "@/lib/csv";
import { toast } from "sonner";
import { Plus, Download, Paperclip, FileText, Upload } from "lucide-react";

export const Route = createFileRoute("/admin/payouts")({ component: PayoutsPage });

interface Affiliate { id: string; full_name: string; pix_key: string | null }
interface Payout {
  id: string; affiliate_id: string; amount_paid: number; payment_date: string;
  reference_period: string | null; pix_key_used: string | null; notes: string | null;
  proof_file_url: string | null;
  affiliates?: { full_name: string };
}

function PayoutsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: affiliates = [] } = useQuery({
    queryKey: ["aff-pay"],
    queryFn: async () => (await supabase.from("affiliates").select("id, full_name, pix_key").order("full_name")).data ?? [],
  });

  const { data: payouts = [], isLoading } = useQuery({
    queryKey: ["payouts"],
    queryFn: async () => {
      const { data } = await supabase.from("payouts").select("*, affiliates(full_name)").order("payment_date", { ascending: false });
      return (data ?? []) as Payout[];
    },
  });

  const handleExport = () => {
    if (!payouts.length) { toast.error("Nada para exportar"); return; }
    exportCSV(`pagamentos-${new Date().toISOString().slice(0, 10)}`, payouts.map((p) => ({
      data: formatDate(p.payment_date),
      afiliado: p.affiliates?.full_name ?? "",
      valor: Number(p.amount_paid).toFixed(2).replace(".", ","),
      referencia: p.reference_period ?? "",
      pix: p.pix_key_used ?? "",
      comprovante: p.proof_file_url ? "Sim" : "Não",
      observacao: p.notes ?? "",
    })), [
      { key: "data", label: "Data" },
      { key: "afiliado", label: "Afiliado" },
      { key: "valor", label: "Valor (R$)" },
      { key: "referencia", label: "Referência" },
      { key: "pix", label: "Chave Pix" },
      { key: "comprovante", label: "Comprovante" },
      { key: "observacao", label: "Observação" },
    ]);
    toast.success(`${payouts.length} pagamentos exportados`);
  };

  const openProof = async (path: string) => {
    const { data, error } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 60);
    if (error || !data) { toast.error("Não foi possível abrir o comprovante"); return; }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <DashboardLayout variant="admin" title="Pagamentos">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Pagamentos manuais</h1>
          <p className="text-muted-foreground text-sm mt-1">Histórico de Pix enviados aos afiliados</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} className="border-border">
            <Download className="h-4 w-4 mr-1" /> Exportar CSV
          </Button>
          <Button onClick={() => setOpen(true)} className="bg-gradient-fire text-white shadow-fire">
            <Plus className="h-4 w-4 mr-1" /> Registrar pagamento
          </Button>
        </div>
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
                <th className="text-center px-5 py-3.5">Comprovante</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">Carregando...</td></tr>
              : payouts.length === 0 ? <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">Nenhum pagamento registrado.</td></tr>
              : payouts.map((p) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-background/40">
                  <td className="px-5 py-3.5 font-medium">{p.affiliates?.full_name ?? "—"}</td>
                  <td className="px-5 py-3.5 text-right font-mono text-success">{formatBRL(Number(p.amount_paid))}</td>
                  <td className="px-5 py-3.5 hidden md:table-cell text-muted-foreground">{p.reference_period ?? "—"}</td>
                  <td className="px-5 py-3.5 hidden md:table-cell text-xs">{formatDate(p.payment_date)}</td>
                  <td className="px-5 py-3.5 hidden lg:table-cell font-mono text-xs text-muted-foreground">{p.pix_key_used ?? "—"}</td>
                  <td className="px-5 py-3.5 text-center">
                    {p.proof_file_url ? (
                      <Button size="sm" variant="ghost" onClick={() => openProof(p.proof_file_url!)} className="text-primary hover:text-primary">
                        <FileText className="h-4 w-4 mr-1" /> Ver
                      </Button>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
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

function PayoutForm({ affiliates, onClose }: { affiliates: Affiliate[]; onClose: () => void }) {
  const [form, setForm] = useState({
    affiliate_id: "", amount_paid: "", reference_period: "",
    payment_date: new Date().toISOString().slice(0, 10), pix_key_used: "", notes: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.affiliate_id) { toast.error("Selecione um afiliado"); return; }
    setSaving(true);
    try {
      let proofPath: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `${form.affiliate_id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, file, {
          contentType: file.type, upsert: false,
        });
        if (upErr) throw upErr;
        proofPath = path;
      }
      const { error } = await supabase.from("payouts").insert({
        ...form, amount_paid: Number(form.amount_paid),
        proof_file_url: proofPath,
      });
      if (error) throw error;
      toast.success("Pagamento registrado");
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
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
      <div className="space-y-1.5">
        <Label className="text-xs flex items-center gap-1"><Paperclip className="h-3.5 w-3.5" /> Comprovante (PDF ou imagem)</Label>
        <label className="flex items-center justify-center gap-2 border border-dashed border-border rounded-lg px-3 py-4 cursor-pointer hover:bg-background/40 transition">
          <Upload className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{file ? file.name : "Clique para anexar"}</span>
          <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
      </div>
      <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={saving} className="bg-gradient-fire text-white shadow-fire">{saving ? "Salvando..." : "Registrar"}</Button></div>
    </form>
  );
}
