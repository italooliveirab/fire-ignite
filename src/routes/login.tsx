import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Mail, Lock, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { resolveRoleForUser } from "@/lib/auth";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { InstallAppGuide } from "@/components/InstallAppGuide";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof s.redirect === "string" && s.redirect ? s.redirect : undefined,
  }),
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const nav = useNavigate();
  const { user, role } = useAuth();
  const search = Route.useSearch();

  useEffect(() => {
    if (user && role) {
      const target = search.redirect || (role === "admin" ? "/admin" : "/app");
      nav({ to: target });
    }
  }, [user, role, nav, search.redirect]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStep(1);
    const t0 = performance.now();
    console.log("[login] start");

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    const t1 = performance.now();
    console.log(`[login] auth done in ${(t1 - t0).toFixed(0)}ms`);
    if (error) {
      setLoading(false);
      setStep(0);
      toast.error("Credenciais inválidas", { description: error.message });
      return;
    }

    setStep(2);
    const signedInUser = data.user ?? data.session?.user;
    const resolvedRole = signedInUser ? await resolveRoleForUser(signedInUser.id) : null;
    const t2 = performance.now();
    console.log(`[login] role resolved in ${(t2 - t1).toFixed(0)}ms (role=${resolvedRole})`);

    setStep(3);
    toast.success("Bem-vindo de volta!");
    const target = search.redirect || (resolvedRole === "admin" ? "/admin" : "/app");
    console.log(`[login] redirecting to ${target} (total ${(performance.now() - t0).toFixed(0)}ms)`);
    nav({ to: target });
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-primary/25 rounded-full blur-[160px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-info/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md">
        <Link to="/" className="flex justify-center mb-8">
          <BrandMark size="lg" subtitle="Afiliados" animated />
        </Link>

        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-xl p-8 shadow-card-premium">
          <h1 className="font-display text-2xl font-bold mb-1">Painel do Afiliado</h1>
          <p className="text-sm text-muted-foreground mb-6">Entre com seu email e senha.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email" type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com" className="pl-10 h-11 bg-background/50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password" type="password" required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" className="pl-10 h-11 bg-background/50"
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full h-11 bg-gradient-fire shadow-fire hover:opacity-90 text-white font-semibold">
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {step === 1 && "Autenticando..."}
                  {step === 2 && "Verificando permissão..."}
                  {step === 3 && "Redirecionando..."}
                </span>
              ) : (
                <>Entrar <ArrowRight className="ml-2 h-4 w-4" /></>
              )}
            </Button>
          </form>

          {loading && (
            <ul className="mt-4 space-y-2 text-xs">
              <StepLine active={step >= 1} done={step > 1} label="Autenticando credenciais" />
              <StepLine active={step >= 2} done={step > 2} label="Verificando permissão de acesso" />
              <StepLine active={step >= 3} done={false} label="Redirecionando ao painel" />
            </ul>
          )}

          <div className="mt-4 text-right">
            <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-primary transition">
              Esqueceu a senha?
            </Link>
          </div>

          <div className="mt-6 pt-6 border-t border-border text-center">
            <p className="text-xs text-muted-foreground mb-3">Ainda não é afiliado?</p>
            <Link
              to="/signup"
              className="inline-flex items-center justify-center w-full h-11 rounded-md border border-primary/40 text-primary font-semibold hover:bg-primary/10 transition-all active:scale-[0.96] hover:-translate-y-[1px]"
            >
              Criar conta de afiliado
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          🔒 Conexão segura · Plataforma FIRE
        </p>

        <div className="mt-4">
          <InstallAppGuide variant="card" />
        </div>
      </div>
    </div>
  );
}

function StepLine({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-2 transition-opacity ${active ? "opacity-100" : "opacity-40"}`}>
      {done ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
      ) : active ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
      ) : (
        <span className="h-3.5 w-3.5 rounded-full border border-border" />
      )}
      <span className={done ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </li>
  );
}
