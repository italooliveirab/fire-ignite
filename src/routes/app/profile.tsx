import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { NotificationSettings } from "@/components/NotificationSettings";

export const Route = createFileRoute("/app/profile")({ component: ProfilePage });

function ProfilePage() {
  const { user } = useAuth();
  const [aff, setAff] = useState<Record<string, unknown> | null>(null);
  const [pwd, setPwd] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("affiliates").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => setAff(data));
  }, [user]);

  if (!aff) return <DashboardLayout variant="affiliate"><div className="h-40 rounded-2xl bg-card animate-pulse" /></DashboardLayout>;

  const set = (k: string, v: unknown) => setAff({ ...aff, [k]: v });

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("affiliates").update({
      phone: aff.phone as string | null, instagram: aff.instagram as string | null,
      pix_key: aff.pix_key as string | null,
      pix_type: aff.pix_type as "cpf" | "cnpj" | "email" | "phone" | "random",
    }).eq("id", aff.id as string);
    if (pwd) await supabase.auth.updateUser({ password: pwd });
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success("Perfil atualizado"); setPwd(""); }
  };

  return (
    <DashboardLayout variant="affiliate" title="Perfil">
      <h1 className="font-display text-3xl font-bold mb-6">Meu perfil</h1>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card-premium space-y-3">
          <h3 className="font-display font-semibold mb-2">Dados pessoais</h3>
          <Field label="Nome"><Input value={String(aff.full_name ?? "")} disabled /></Field>
          <Field label="Email"><Input value={String(aff.email ?? "")} disabled /></Field>
          <Field label="Telefone"><Input value={String(aff.phone ?? "")} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="Instagram"><Input value={String(aff.instagram ?? "")} onChange={(e) => set("instagram", e.target.value)} /></Field>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card-premium space-y-3">
          <h3 className="font-display font-semibold mb-2">Recebimento Pix</h3>
          <Field label="Tipo Pix">
            <Select value={String(aff.pix_type ?? "email")} onValueChange={(v) => set("pix_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cpf">CPF</SelectItem><SelectItem value="cnpj">CNPJ</SelectItem>
                <SelectItem value="email">Email</SelectItem><SelectItem value="phone">Telefone</SelectItem>
                <SelectItem value="random">Aleatória</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Chave Pix"><Input value={String(aff.pix_key ?? "")} onChange={(e) => set("pix_key", e.target.value)} /></Field>
          <h3 className="font-display font-semibold pt-3">Segurança</h3>
          <Field label="Nova senha (opcional)"><Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Deixe em branco para não alterar" /></Field>
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="mt-6 bg-gradient-fire text-white shadow-fire">
        {saving ? "Salvando..." : "Salvar alterações"}
      </Button>

      <div className="mt-10">
        <h2 className="font-display text-2xl font-bold mb-4">Notificações</h2>
        <NotificationSettings />
      </div>
    </DashboardLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
