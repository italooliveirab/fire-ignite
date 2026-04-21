import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, Zap, ShieldCheck, ArrowRight, Wallet, Rocket, PackageCheck, BarChart3 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { InstallPWA, InstallBanner } from "@/components/InstallPWA";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FIRE Afiliados — Revenda os produtos da FIRE e ganhe comissão" },
      { name: "description", content: "Programa oficial de afiliados da FIRE. Revenda nossos produtos e serviços, divulgue com seu link exclusivo e receba comissão a cada venda." },
      { property: "og:title", content: "FIRE Afiliados — Programa oficial de revenda" },
      { property: "og:description", content: "Ganhe comissão revendendo os produtos e serviços da FIRE. Cadastro grátis, link próprio e pagamento via Pix." },
    ],
  }),
  component: Landing,
});

function Landing() {
  // Don't block the landing on auth — render immediately for fast LCP
  useAuth();
  return (
    <div className="min-h-screen relative overflow-hidden">
      <InstallBanner />
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/20 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-info/10 rounded-full blur-[120px]" />
      </div>

      <header className="border-b border-border/50 backdrop-blur-xl bg-background/30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-gradient-fire flex items-center justify-center shadow-fire">
              <Flame className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-display font-bold text-xl">FIRE</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">Afiliados</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/login" className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition">
              Entrar
            </Link>
            <Link to="/signup" className="px-5 py-2 rounded-lg bg-gradient-fire text-white text-sm font-semibold shadow-fire hover:opacity-90 transition">
              Quero ser afiliado
            </Link>
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-xs font-medium text-primary mb-6">
          <Zap className="h-3 w-3" /> Programa oficial de afiliados FIRE
        </div>
        <h1 className="font-display text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl mx-auto leading-[1.05]">
          Revenda os produtos da <span className="text-gradient-fire">FIRE</span> e ganhe comissão.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Cadastre-se grátis, escolha quais produtos da FIRE você quer divulgar e receba seu link exclusivo. A cada venda confirmada, você ganha sua comissão via Pix.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/signup" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-fire text-white font-semibold shadow-fire hover:shadow-glow transition">
            Quero ser afiliado <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/ranking" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-border bg-card/40 text-foreground font-semibold hover:border-primary/50 transition">
            Ver Ranking do Mês
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Já é afiliado? <Link to="/login" className="text-primary hover:underline">Entrar no painel</Link></p>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-24 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: PackageCheck, title: "Produtos da FIRE", desc: "Escolha quais produtos e serviços da FIRE você quer revender." },
          { icon: Rocket, title: "Link exclusivo por produto", desc: "Cada produto aprovado gera um link próprio com seu nome." },
          { icon: BarChart3, title: "Acompanhe em tempo real", desc: "Veja seus leads, vendas e comissões direto no painel." },
          { icon: Wallet, title: "Receba via Pix", desc: "Pagamentos rápidos e transparentes, com comprovante." },
        ].map((f) => (
          <div key={f.title} className="rounded-2xl border border-border bg-card p-6 hover:border-primary/40 transition">
            <div className="h-10 w-10 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-primary mb-4">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="font-display font-bold text-lg mb-1">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>

      <section className="max-w-4xl mx-auto px-6 pb-24">
        <div className="rounded-3xl border border-border bg-card p-8 md:p-12 shadow-card-premium text-center">
          <ShieldCheck className="h-10 w-10 text-primary mx-auto mb-4" />
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">Como funciona</h2>
          <ol className="text-left max-w-xl mx-auto space-y-3 text-sm text-muted-foreground mt-6">
            <li><span className="text-primary font-bold">1.</span> Crie sua conta grátis em 30 segundos.</li>
            <li><span className="text-primary font-bold">2.</span> Escolha os produtos da FIRE que você quer revender.</li>
            <li><span className="text-primary font-bold">3.</span> Aguarde a aprovação da nossa equipe (rápida).</li>
            <li><span className="text-primary font-bold">4.</span> Receba seu link exclusivo e comece a divulgar.</li>
            <li><span className="text-primary font-bold">5.</span> A cada venda confirmada, comissão na sua conta via Pix.</li>
          </ol>
          <Link to="/signup" className="inline-flex items-center justify-center gap-2 mt-8 px-6 py-3.5 rounded-xl bg-gradient-fire text-white font-semibold shadow-fire">
            Começar agora <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/50 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} FIRE — Programa oficial de afiliados.
      </footer>
    </div>
  );
}
