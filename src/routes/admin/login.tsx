import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Mail, Lock, ArrowRight, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { resolveRoleForUser } from "@/lib/auth";
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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      toast.error("Credenciais inválidas", { description: error.message });
      return;
    }

    const signedInUser = data.user ?? data.session?.user;
    const resolvedRole = signedInUser ? await resolveRoleForUser(signedInUser.id) : null;

    if (resolvedRole !== "admin") {
      setLoading(false);
      toast.error("Esta área é restrita a administradores.");
      nav({ to: resolvedRole === "affiliate" ? "/app" : "/login" });
      return;
    }

    toast.success("Bem-vindo, admin!");
    nav({ to: "/admin" });
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-primary/25 rounded-full blur-[160px]" />
      </div>

      <div className="w-full max-w-md">
        <Link to="/" className="flex justify-center mb-8">
          <BrandMark size="lg" subtitle="Admin" animated />
        </Link>

        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-xl p-8 shadow-card-premium">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h1 className="font-display text-2xl font-bold">Acesso Administrativo</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-6">Área restrita. Acesse com sua conta de administrador.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@empresa.com" className="pl-10 h-11 bg-background/50" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-10 h-11 bg-background/50" />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full h-11 bg-gradient-fire shadow-fire hover:opacity-90 text-white font-semibold">
              {loading ? "Entrando..." : <>Entrar como admin <ArrowRight className="ml-2 h-4 w-4" /></>}
            </Button>
          </form>

          <div className="mt-4 text-right">
            <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-primary transition">
              Esqueceu a senha?
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          🔒 Área restrita · Apenas administradores autorizados
        </p>
      </div>
    </div>
  );
}
