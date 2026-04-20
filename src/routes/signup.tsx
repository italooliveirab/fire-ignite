import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandMark } from "@/components/BrandMark";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/signup")({ component: SignupClosedPage });

function SignupClosedPage() {
  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-primary/25 rounded-full blur-[160px]" />
      </div>

      <div className="w-full max-w-md">
        <Link to="/" className="flex justify-center mb-8">
          <BrandMark size="lg" />
        </Link>

        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-xl p-8 shadow-card-premium text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mb-4">
            <ShieldAlert className="h-6 w-6 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold mb-2">Cadastro fechado</h1>
          <p className="text-sm text-muted-foreground mb-6">
            O acesso à FIRE Afiliados é apenas por convite. Se você já é afiliado, faça login no seu painel.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-fire text-white font-semibold shadow-fire hover:opacity-90 transition"
          >
            Entrar no painel
          </Link>
          <p className="text-xs text-muted-foreground mt-6">
            Quer se tornar afiliado? Entre em contato pelo WhatsApp.
          </p>
        </div>
      </div>
    </div>
  );
}
