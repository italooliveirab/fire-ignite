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

export const Route = createFileRoute("/admin/settings")({ component: SettingsPage });

function SettingsPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);

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

  return (
    <DashboardLayout variant="admin" title="Configurações">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground text-sm mt-1">Empresa, comissão e links</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Section title="Empresa">
          <Field label="Nome"><Input value={String(data.company_name ?? "")} onChange={(e) => set("company_name", e.target.value)} /></Field>
          <Field label="Logo URL"><Input value={String(data.logo_url ?? "")} onChange={(e) => set("logo_url", e.target.value)} /></Field>
          <Field label="Email suporte"><Input type="email" value={String(data.support_email ?? "")} onChange={(e) => set("support_email", e.target.value)} /></Field>
          <Field label="WhatsApp suporte"><Input value={String(data.support_whatsapp ?? "")} onChange={(e) => set("support_whatsapp", e.target.value)} /></Field>
        </Section>

        <Section title="Comissão">
          <Field label="Frequência">
            <Select value={String(data.payout_frequency)} onValueChange={(v) => set("payout_frequency", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="biweekly">Quinzenal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Valor mínimo (R$)"><Input type="number" step="0.01" value={String(data.minimum_payout ?? 0)} onChange={(e) => set("minimum_payout", Number(e.target.value))} /></Field>
          <Field label="Dias de retenção"><Input type="number" value={String(data.retention_days ?? 0)} onChange={(e) => set("retention_days", Number(e.target.value))} /></Field>
          <Field label="Política de pagamento"><Textarea rows={4} value={String(data.payment_policy_text ?? "")} onChange={(e) => set("payment_policy_text", e.target.value)} /></Field>
        </Section>

        <Section title="Links">
          <Field label="Domínio principal"><Input value={String(data.affiliate_link_domain ?? "")} onChange={(e) => set("affiliate_link_domain", e.target.value)} /></Field>
          <Field label="Prefixo"><Input placeholder="ex: r/ ou vazio" value={String(data.affiliate_link_prefix ?? "")} onChange={(e) => set("affiliate_link_prefix", e.target.value)} /></Field>
          <p className="text-xs text-muted-foreground">Exemplo: <span className="font-mono text-primary">{`${String(data.affiliate_link_domain)}/${String(data.affiliate_link_prefix ?? "")}joao`}</span></p>
        </Section>
      </div>

      <div className="mt-6">
        <Button onClick={save} disabled={saving} className="bg-gradient-fire text-white shadow-fire">
          {saving ? "Salvando..." : "Salvar configurações"}
        </Button>
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
