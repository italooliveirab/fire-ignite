import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowUpRight } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({ component: ResetPasswordPage });

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setHasSession(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A senha deve ter ao menos 6 caracteres");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não coincidem");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error("Erro ao redefinir senha", { description: error.message });
      return;
    }
    toast.success("Senha atualizada! Faça login novamente.");
    await supabase.auth.signOut();
    nav({ to: "/login" });
  };

  return (
    <AuthShell
      step="04 / Nova senha"
      title={"DEFINIR\nNOVA SENHA"}
      tagline="Escolha uma senha forte. Você só faz isso uma vez."
    >
      <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground mb-3">
        Redefinição
      </div>
      <h2 className="font-display text-3xl uppercase mb-1">Nova senha</h2>
      <p className="text-sm text-muted-foreground mb-8">
        {hasSession ? "Escolha uma senha forte." : "Validando link de recuperação..."}
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="password" className="text-[10px] font-display uppercase tracking-wider text-muted-foreground">Nova senha</Label>
          <Input id="password" type="password" required minLength={6} value={password}
            onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm" className="text-[10px] font-display uppercase tracking-wider text-muted-foreground">Confirmar senha</Label>
          <Input id="confirm" type="password" required minLength={6} value={confirm}
            onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" />
        </div>

        <Button type="submit" disabled={loading || !hasSession} size="lg" className="w-full">
          {loading ? "Salvando..." : <>Atualizar <ArrowUpRight className="ml-1" strokeWidth={2.5} /></>}
        </Button>
      </form>

      <div className="mt-8 pt-6 border-t border-border text-center">
        <Link to="/login" className="font-display uppercase tracking-wider text-muted-foreground hover:text-primary text-[11px]">
          ← Voltar ao login
        </Link>
      </div>
    </AuthShell>
  );
}
