import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Flame } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({ component: SignupPage });

function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { full_name: name },
        emailRedirectTo: window.location.origin + "/admin",
      },
    });
    if (error || !data.user) {
      setLoading(false);
      toast.error("Erro ao criar conta", { description: error?.message });
      return;
    }
    // Atribui papel admin (primeira conta = admin do FIRE)
    await supabase.from("user_roles").insert({ user_id: data.user.id, role: "admin" });
    setLoading(false);
    toast.success("Conta admin criada com sucesso!");
    nav({ to: "/admin" });
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-primary/25 rounded-full blur-[160px]" />
      </div>

      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2.5 mb-8">
          <div className="h-12 w-12 rounded-xl bg-gradient-fire flex items-center justify-center shadow-fire">
            <Flame className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display font-bold text-2xl leading-none">FIRE</div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Admin</div>
          </div>
        </Link>

        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-xl p-8 shadow-card-premium">
          <h1 className="font-display text-2xl font-bold mb-1">Criar conta admin</h1>
          <p className="text-sm text-muted-foreground mb-6">Configure o primeiro acesso administrativo.</p>

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input required value={name} onChange={(e) => setName(e.target.value)} className="h-11 bg-background/50" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 bg-background/50" />
            </div>
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 bg-background/50" />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 bg-gradient-fire shadow-fire text-white font-semibold">
              {loading ? "Criando..." : "Criar conta admin"}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border text-center text-xs text-muted-foreground">
            Já tem conta? <Link to="/login" className="text-primary font-medium hover:underline">Entrar</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
