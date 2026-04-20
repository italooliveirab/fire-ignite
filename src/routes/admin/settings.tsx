import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Image as ImageIcon, Save, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/settings")({ component: SettingsPage });

function SettingsPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase.from("settings").select("*").limit(1).single().then(({ data }) => setData(data));
  }, []);

  if (!data) return <DashboardLayout variant="admin"><div className="h-40 rounded-2xl bg-card animate-pulse" /></DashboardLayout>;

  const set = (k: string, v: unknown) => setData({ ...data, [k]: v });

  const save = async () => {
    setSaving(true);
    const { id, created_at, updated_at, ...payload } = data as Record<string, unknown>;
    void created_at; void updated_at;
    const { error } = await supabase.from("settings").update(payload as never).eq("id", id as string);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Configurações salvas");
  };

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Envie uma imagem"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Máximo 2MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `company/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("logos").upload(path, file, {
        contentType: file.type, upsert: true,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("logos").getPublicUrl(path);
      set("logo_url", pub.publicUrl);
      toast.success("Logo enviado — clique em Salvar para confirmar");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const logoUrl = String(data.logo_url ?? "");
  const domain = String(data.affiliate_link_domain ?? "");
  const prefix = String(data.affiliate_link_prefix ?? "");

  return (
    <DashboardLayout variant="admin" title="Configurações">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground text-sm mt-1">Empresa, comissão e links</p>
        </div>
        <Button onClick={save} disabled={saving} className="bg-gradient-fire text-white shadow-fire">
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          {saving ? "Salvando..." : "Salvar configurações"}
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Section title="Empresa">
          <Field label="Nome"><Input value={String(data.company_name ?? "")} onChange={(e) => set("company_name", e.target.value)} /></Field>

          <div className="space-y-2">
            <Label className="text-xs">Logotipo</Label>
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 rounded-lg bg-background border border-border flex items-center justify-center overflow-hidden shrink-0">
                {logoUrl ? <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" /> : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
              </div>
              <label className="flex-1 flex items-center justify-center gap-2 border border-dashed border-border rounded-lg px-3 py-3 cursor-pointer hover:bg-background/40 transition">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 text-muted-foreground" />}
                <span className="text-xs text-muted-foreground">{uploading ? "Enviando..." : "Enviar novo logo (PNG/JPG, máx 2MB)"}</span>
                <input type="file" accept="image/*" className="hidden" disabled={uploading}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); }} />
              </label>
            </div>
            <Input placeholder="ou cole uma URL" value={logoUrl} onChange={(e) => set("logo_url", e.target.value)} />
          </div>

          <Field label="Email suporte"><Input type="email" value={String(data.support_email ?? "")} onChange={(e) => set("support_email", e.target.value)} /></Field>
          <Field label="WhatsApp suporte"><Input value={String(data.support_whatsapp ?? "")} onChange={(e) => set("support_whatsapp", e.target.value)} /></Field>
        </Section>

        <Section title="Comissão & Pagamentos">
          <Field label="Frequência de pagamento">
            <Select value={String(data.payout_frequency)} onValueChange={(v) => set("payout_frequency", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="biweekly">Quinzenal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mínimo (R$)"><Input type="number" step="0.01" value={String(data.minimum_payout ?? 0)} onChange={(e) => set("minimum_payout", Number(e.target.value))} /></Field>
            <Field label="Retenção (dias)"><Input type="number" value={String(data.retention_days ?? 0)} onChange={(e) => set("retention_days", Number(e.target.value))} /></Field>
          </div>
          <Field label="Política de pagamento">
            <Textarea rows={5} placeholder="Texto exibido aos afiliados sobre regras de pagamento, prazos, retenção..."
              value={String(data.payment_policy_text ?? "")} onChange={(e) => set("payment_policy_text", e.target.value)} />
          </Field>
        </Section>

        <Section title="Links de Afiliado">
          <Field label="Domínio principal"><Input placeholder="fire.com" value={domain} onChange={(e) => set("affiliate_link_domain", e.target.value)} /></Field>
          <Field label="Prefixo"><Input placeholder="ex: r/ ou vazio" value={prefix} onChange={(e) => set("affiliate_link_prefix", e.target.value)} /></Field>
          <div className="rounded-lg bg-background/60 border border-border px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Pré-visualização</p>
            <p className="font-mono text-sm text-primary truncate">{`${domain}/${prefix}joao`}</p>
          </div>
        </Section>

        <Section title="Identidade & Resumo">
          <div className="space-y-3">
            <SummaryItem label="Frequência" value={
              ({ weekly: "Semanal", biweekly: "Quinzenal", monthly: "Mensal" } as Record<string, string>)[String(data.payout_frequency)] ?? "—"
            } />
            <SummaryItem label="Mínimo" value={`R$ ${Number(data.minimum_payout ?? 0).toFixed(2).replace(".", ",")}`} />
            <SummaryItem label="Retenção" value={`${String(data.retention_days ?? 0)} dias`} />
            <SummaryItem label="Suporte" value={String(data.support_email ?? "—")} />
          </div>
        </Section>
      </div>
    </DashboardLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card-premium space-y-3">
      <h3 className="font-display font-semibold text-lg">{title}</h3>
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center border-b border-border/40 pb-2 last:border-0">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="font-mono text-sm">{value}</span>
    </div>
  );
}
