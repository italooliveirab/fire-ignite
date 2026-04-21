import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { slugify } from "@/lib/format";
import { useServerFn } from "@tanstack/react-start";
import { sendWelcomeEmailFn } from "@/server/notifications";

export const Route = createFileRoute("/signup")({ component: SignupPage });

function SignupPage() {
  const nav = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [referrerInfo, setReferrerInfo] = useState<{ id: string; full_name: string } | null>(null);
  const sendWelcome = useServerFn(sendWelcomeEmailFn);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (!ref) return;
    supabase.from("affiliates").select("id, full_name").eq("referral_code", ref).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setReferrerInfo(data);
          try { sessionStorage.setItem("fire_ref", ref); } catch (err) { void err; }
        }
      });
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error("Senha deve ter pelo menos 6 caracteres");
    setLoading(true);
    try {
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/app`,
          data: { full_name: form.full_name },
        },
      });
      if (authErr) throw authErr;
      if (!authData.user) throw new Error("Falha ao criar usuário");
      const uid = authData.user.id;

      const baseSlug = slugify(form.full_name);
      let slug = baseSlug;
      let username = baseSlug;
      const { data: existing } = await supabase.from("affiliates").select("slug").ilike("slug", `${baseSlug}%`);
      if (existing && existing.length > 0) {
        let n = 1;
        const taken = new Set(existing.map((e) => e.slug));
        while (taken.has(slug)) { n += 1; slug = `${baseSlug}${n}`; username = slug; }
      }

      const { error: affErr } = await supabase.from("affiliates").insert({
        user_id: uid, full_name: form.full_name, email: form.email,
        phone: form.phone || null, username, slug, status: "active",
      });
      if (affErr) throw affErr;

      const { error: roleErr } = await supabase.from("user_roles").insert({ user_id: uid, role: "affiliate" });
      if (roleErr) throw roleErr;

      const refCode = (() => {
        try { return sessionStorage.getItem("fire_ref"); } catch { return null; }
      })();
      if (refCode) {
        const { data: refAff } = await supabase.from("affiliates").select("id").eq("referral_code", refCode).maybeSingle();
        const { data: newAff } = await supabase.from("affiliates").select("id").eq("user_id", uid).maybeSingle();
        if (refAff && newAff && refAff.id !== newAff.id) {
          await supabase.from("affiliate_network").insert({
            affiliate_id: newAff.id, referrer_id: refAff.id, status: "active",
          });
        }
        try { sessionStorage.removeItem("fire_ref"); } catch (err) { void err; }
      }

      toast.success("Conta criada!", { description: "Você já pode escolher os produtos para revender." });
      sendWelcome({ data: { email: form.email, full_name: form.full_name } }).catch(() => {});
      nav({ to: "/app" });
    } catch (e) {
      toast.error("Erro ao criar conta", { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      step="02 / Cadastro"
      title={"CRIE\nSUA CONTA"}
      tagline="Cadastro grátis. Sem mensalidade. Comece a revender os produtos da FIRE em minutos."
    >
      <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground mb-3">
        Novo afiliado
      </div>
      <h2 className="font-display text-3xl uppercase mb-1">Cadastrar</h2>
      <p className="text-sm text-muted-foreground mb-8">Em 30 segundos você está dentro.</p>

      {referrerInfo && (
        <div className="mb-6 border border-primary bg-primary/10 px-4 py-3 text-sm">
          <span className="text-[10px] font-mono uppercase tracking-wider text-primary">Indicação</span>
          <div className="mt-1">
            Indicado por <span className="font-bold text-primary">{referrerInfo.full_name}</span>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-5">
        <FormField id="name" label="Nome completo">
          <Input id="name" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Seu nome" />
        </FormField>
        <FormField id="email" label="Email">
          <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="seu@email.com" />
        </FormField>
        <FormField id="phone" label="WhatsApp · opcional">
          <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" />
        </FormField>
        <FormField id="pwd" label="Senha · mínimo 6 caracteres">
          <Input id="pwd" type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
        </FormField>

        <Button type="submit" disabled={loading} size="lg" className="w-full">
          {loading ? "Criando..." : <>Criar conta <ArrowUpRight className="ml-1" strokeWidth={2.5} /></>}
        </Button>
      </form>

      <div className="mt-8 pt-6 border-t border-border flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Já tem conta?</span>
        <Link to="/login" className="font-display uppercase tracking-wider text-primary hover:underline text-[11px]">
          Entrar →
        </Link>
      </div>
    </AuthShell>
  );
}

function FormField({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-[10px] font-display uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
