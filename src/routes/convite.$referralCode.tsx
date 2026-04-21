import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Network, ArrowRight, UserCheck } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/convite/$referralCode")({ component: InvitePage });

function InvitePage() {
  const { referralCode } = Route.useParams();
  const nav = useNavigate();
  const [referrer, setReferrer] = useState<{ id: string; full_name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("affiliates")
        .select("id, full_name, status")
        .eq("referral_code", referralCode)
        .maybeSingle();
      if (!data || data.status !== "active") {
        setError("Convite inválido ou expirado.");
      } else {
        setReferrer({ id: data.id, full_name: data.full_name });
        try { sessionStorage.setItem("fire_ref", referralCode); } catch { /* noop */ }
        // Se já estiver logado, vincula direto e manda pra /app
        const { data: session } = await supabase.auth.getUser();
        if (session.user) {
          const { data: me } = await supabase
            .from("affiliates").select("id").eq("user_id", session.user.id).maybeSingle();
          if (me && me.id !== data.id) {
            // Bloqueia: usuário com afiliações FIRENET A aprovadas não pode entrar em rede
            const { data: normalAffiliations } = await supabase
              .from("affiliate_products")
              .select("id, products!inner(product_type)")
              .eq("affiliate_id", me.id)
              .eq("status", "approved")
              .eq("products.product_type", "normal");
            if (normalAffiliations && normalAffiliations.length > 0) {
              setError("Você já possui afiliações ativas no FIRENET A e não pode aceitar convites de rede. Cancele suas afiliações comuns primeiro ou crie uma nova conta.");
              setChecking(false);
              return;
            }
            await supabase.from("affiliate_network").insert({
              affiliate_id: me.id, referrer_id: data.id, status: "active",
            });
          }
          nav({ to: "/app" });
          return;
        }
      }
      setChecking(false);
    })();
  }, [referralCode, nav]);

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-10 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-primary/25 rounded-full blur-[160px]" />
      </div>

      <div className="w-full max-w-md">
        <Link to="/" className="flex justify-center mb-8">
          <BrandMark size="lg" subtitle="Convite" animated />
        </Link>

        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-xl p-8 shadow-card-premium text-center">
          {checking ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Verificando convite...
            </div>
          ) : error ? (
            <>
              <h1 className="font-display text-2xl font-bold mb-2">{error}</h1>
              <p className="text-sm text-muted-foreground mb-6">Peça um novo link à pessoa que te indicou.</p>
              <Link to="/"><Button variant="outline">Voltar ao início</Button></Link>
            </>
          ) : referrer && (
            <>
              <div className="mx-auto mb-5 h-14 w-14 rounded-xl bg-gradient-fire flex items-center justify-center shadow-fire">
                <Network className="h-7 w-7 text-white" />
              </div>
              <h1 className="font-display text-2xl font-bold mb-2">Você foi convidado!</h1>
              <div className="rounded-lg border border-primary/40 bg-primary/10 p-4 mb-6 text-sm flex items-center justify-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" />
                Indicado por <span className="font-semibold text-primary">{referrer.full_name}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Crie sua conta agora e entre direto para a rede de <strong className="text-foreground">{referrer.full_name}</strong>. Você ganha acesso ao produto <strong className="text-primary">FIRENET B</strong> e seu link de vendas é gerado automaticamente.
              </p>
              <Button
                onClick={() => { window.location.href = `/signup?ref=${encodeURIComponent(referralCode)}`; }}
                className="w-full h-11 bg-gradient-fire text-white shadow-fire font-semibold"
              >
                Criar minha conta <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <div className="mt-4 text-xs text-muted-foreground">
                Já tem conta?{" "}
                <Link to="/login" className="text-primary hover:underline">Entrar</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}