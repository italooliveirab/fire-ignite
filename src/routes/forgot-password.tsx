import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({ component: ForgotPasswordPage });

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error("Erro ao enviar email", { description: error.message });
      return;
    }
    setSent(true);
    toast.success("Email enviado! Verifique sua caixa de entrada.");
  };

  return (
    <AuthShell
      step="03 / Recuperar"
      title={"RECUPERAR\nSENHA"}
      tagline="Enviaremos um link para o email cadastrado."
    >
      {sent ? (
        <>
          <div className="border border-success bg-success/10 p-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-3" strokeWidth={2} />
            <h2 className="font-display text-2xl uppercase mb-2">Email enviado</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Link de recuperação enviado para <span className="text-foreground font-mono">{email}</span>.
            </p>
            <Link to="/login" className="font-display uppercase tracking-wider text-primary hover:underline text-[11px]">
              ← Voltar ao login
            </Link>
          </div>
        </>
      ) : (
        <>
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground mb-3">
            Recuperação de senha
          </div>
          <h2 className="font-display text-3xl uppercase mb-1">Esqueceu?</h2>
          <p className="text-sm text-muted-foreground mb-8">Enviaremos um link de redefinição.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[10px] font-display uppercase tracking-wider text-muted-foreground">Email</Label>
              <Input id="email" type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
            </div>
            <Button type="submit" disabled={loading} size="lg" className="w-full">
              {loading ? "Enviando..." : <>Enviar link <ArrowUpRight className="ml-1" strokeWidth={2.5} /></>}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-border text-center">
            <Link to="/login" className="font-display uppercase tracking-wider text-muted-foreground hover:text-primary text-[11px]">
              ← Voltar ao login
            </Link>
          </div>
        </>
      )}
    </AuthShell>
  );
}
