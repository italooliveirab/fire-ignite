import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
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
    <div className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-primary/25 rounded-full blur-[160px]" />
      </div>

      <div className="w-full max-w-md">
        <Link to="/" className="flex justify-center mb-8">
          <BrandMark size="lg" subtitle="Recuperar senha" animated />
        </Link>

        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-xl p-8 shadow-card-premium">
          {sent ? (
            <div className="text-center py-4">
              <div className="h-14 w-14 rounded-full bg-success/15 border border-success/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-7 w-7 text-success" />
              </div>
              <h1 className="font-display text-2xl font-bold mb-2">Email enviado</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Enviamos um link de recuperação para <span className="text-foreground font-medium">{email}</span>. Verifique sua caixa de entrada (e spam).
              </p>
              <Link to="/login" className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium">
                <ArrowLeft className="h-4 w-4" /> Voltar ao login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold mb-1">Esqueceu a senha?</h1>
              <p className="text-sm text-muted-foreground mb-6">Enviaremos um link para você redefinir.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
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

                <Button type="submit" disabled={loading} className="w-full h-11 bg-gradient-fire shadow-fire hover:opacity-90 text-white font-semibold">
                  {loading ? "Enviando..." : <>Enviar link <ArrowRight className="ml-2 h-4 w-4" /></>}
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t border-border text-center text-xs text-muted-foreground">
                Lembrou a senha?{" "}
                <Link to="/login" className="text-primary hover:underline font-medium">Voltar ao login</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
