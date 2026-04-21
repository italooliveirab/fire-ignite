import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowUpRight } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

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
  const nav = useNavigate();
  const { user, role } = useAuth();
  const search = Route.useSearch();

  useEffect(() => {
    if (user && role) {
      const target = search.redirect || (role === "admin" ? "/admin" : "/app");
      window.location.href = target;
    }
  }, [user, role, nav, search.redirect]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Credenciais inválidas", { description: error.message });
      return;
    }
    toast.success("Bem-vindo de volta!");
  };

  return (
    <AuthShell
      step="01 / Acesso"
      title={"ENTRE\nNO PAINEL"}
      tagline="O painel do afiliado FIRE em tempo real. Veja seus leads, vendas e comissões assim que acontecem."
    >
      <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground mb-3">
        Login do afiliado
      </div>
      <h2 className="font-display text-3xl uppercase mb-1">Acessar conta</h2>
      <p className="text-sm text-muted-foreground mb-8">Use seu email e senha cadastrados.</p>

      <form onSubmit={handleLogin} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-[10px] font-display uppercase tracking-wider text-muted-foreground">Email</Label>
          <Input id="email" type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-[10px] font-display uppercase tracking-wider text-muted-foreground">Senha</Label>
            <Link to="/forgot-password" className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-primary">
              Esqueci
            </Link>
          </div>
          <Input id="password" type="password" required value={password}
            onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>

        <Button type="submit" disabled={loading} size="lg" className="w-full">
          {loading ? "Entrando..." : <>Entrar <ArrowUpRight className="ml-1" strokeWidth={2.5} /></>}
        </Button>
      </form>

      <div className="mt-8 pt-6 border-t border-border flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Ainda não é afiliado?</span>
        <Link to="/signup" className="font-display uppercase tracking-wider text-primary hover:underline text-[11px]">
          Cadastre-se →
        </Link>
      </div>
    </AuthShell>
  );
}
