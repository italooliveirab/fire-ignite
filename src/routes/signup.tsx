import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, Lock, User, ArrowRight, Phone } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { slugify } from "@/lib/format";

export const Route = createFileRoute("/signup")({ component: SignupPage });

function SignupPage() {
  const nav = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [referrerInfo, setReferrerInfo] = useState<{ id: string; full_name: string } | null>(null);

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
      // 1. Create auth user
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

      // 2. Build unique slug/username
      const baseSlug = slugify(form.full_name);
      let slug = baseSlug;
      let username = baseSlug;
      const { data: existing } = await supabase.from("affiliates").select("slug").ilike("slug", `${baseSlug}%`);
      if (existing && existing.length > 0) {
        let n = 1;
        const taken = new Set(existing.map((e) => e.slug));
        while (taken.has(slug)) { n += 1; slug = `${baseSlug}${n}`; username = slug; }
      }

      // 3. Create affiliate record
      const { error: affErr } = await supabase.from("affiliates").insert({
        user_id: uid,
        full_name: form.full_name,
        email: form.email,
        phone: form.phone || null,
        username,
        slug,
        status: "active",
      });
      if (affErr) throw affErr;

      // 4. Assign role
      const { error: roleErr } = await supabase.from("user_roles").insert({ user_id: uid, role: "affiliate" });
      if (roleErr) throw roleErr;

      // 5. Vincular ao afiliador (se veio via link de indicação)
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
      nav({ to: "/app" });
    } catch (e) {
      toast.error("Erro ao criar conta", { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-10 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-primary/25 rounded-full blur-[160px]" />
      </div>

      <div className="w-full max-w-md">
        <Link to="/" className="flex justify-center mb-8">
          <BrandMark size="lg" subtitle="Afiliados" />
        </Link>

        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-xl p-8 shadow-card-premium">
          <h1 className="font-display text-2xl font-bold mb-1">Crie sua conta de afiliado</h1>
          <p className="text-sm text-muted-foreground mb-6">Cadastro grátis. Comece a revender os produtos da FIRE em minutos.</p>

          {referrerInfo && (
            <div className="mb-5 rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm">
              Indicado por <span className="font-semibold text-primary">{referrerInfo.full_name}</span>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <Field icon={User} label="Nome completo" id="name">
              <Input id="name" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Seu nome" className="pl-10 h-11 bg-background/50" />
            </Field>
            <Field icon={Mail} label="Email" id="email">
              <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="seu@email.com" className="pl-10 h-11 bg-background/50" />
            </Field>
            <Field icon={Phone} label="WhatsApp (opcional)" id="phone">
              <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" className="pl-10 h-11 bg-background/50" />
            </Field>
            <Field icon={Lock} label="Senha" id="pwd">
              <Input id="pwd" type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" className="pl-10 h-11 bg-background/50" />
            </Field>

            <Button type="submit" disabled={loading} className="w-full h-11 bg-gradient-fire shadow-fire hover:opacity-90 text-white font-semibold">
              {loading ? "Criando conta..." : <>Criar conta de afiliado <ArrowRight className="ml-2 h-4 w-4" /></>}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border text-center text-xs text-muted-foreground">
            Já tem conta? <Link to="/login" className="text-primary hover:underline">Entrar</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, id, children }: { icon: React.ComponentType<{ className?: string }>; label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        {children}
      </div>
    </div>
  );
}
