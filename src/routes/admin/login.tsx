import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/admin/login")({
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const { user, role } = useAuth();

  useEffect(() => {
    if (user && role === "admin") nav({ to: "/admin" });
    else if (user && role === "affiliate") {
      toast.error("Esta área é restrita a administradores.");
      nav({ to: "/app" });
    }
  }, [user, role, nav]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Credenciais inválidas", { description: error.message });
      return;
    }
    toast.success("Bem-vindo, admin!");
  };

  return (
    <AuthShell
      step="00 / Restrito"
      title={"PAINEL\nADMIN."}
      tagline="Área de controle da operação FIRE. Acesso somente para administradores autorizados."
    >
      <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground mb-3 flex items-center gap-2">
        <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Acesso administrativo
      </div>
      <h2 className="font-display text-3xl uppercase mb-1">Login admin</h2>
      <p className="text-sm text-muted-foreground mb-8">Use sua conta de administrador FIRE.</p>

      <form onSubmit={handleLogin} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-[10px] font-display uppercase tracking-wider text-muted-foreground">Email</Label>
          <Input id="email" type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="admin@fire.com" />
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
          {loading ? "Entrando..." : <>Entrar como admin <ArrowUpRight className="ml-1" strokeWidth={2.5} /></>}
        </Button>
      </form>

      <div className="mt-8 pt-6 border-t border-border flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        <span>Área restrita</span>
        <Link to="/login" className="hover:text-primary">Login afiliado →</Link>
      </div>
    </AuthShell>
  );
}
