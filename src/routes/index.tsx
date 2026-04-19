import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, Zap, ShieldCheck, TrendingUp, ArrowRight, Users, BarChart3, Banknote } from "lucide-react";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Glow background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/20 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-info/10 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-xl bg-background/30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-gradient-fire flex items-center justify-center shadow-fire">
              <Flame className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-display font-bold text-xl">FIRE</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">Afiliados</span>
          </Link>
          <Link to="/login" className="px-5 py-2 rounded-lg bg-gradient-fire text-white text-sm font-semibold shadow-fire hover:opacity-90 transition">
            Entrar
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-xs font-medium text-primary mb-6">
          <Zap className="h-3 w-3" /> A plataforma mais rápida do mercado
        </div>
        <h1 className="font-display text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl mx-auto leading-[1.05]">
          Sua máquina de <span className="text-gradient-fire">vendas</span> com afiliados.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Gerencie influenciadores, leads, comissões e pagamentos com a tecnologia de quem entende de performance.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/login" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-fire text-white font-semibold shadow-fire hover:shadow-glow transition">
            Acessar painel <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/docs" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-border bg-card/40 text-foreground font-semibold hover:border-primary/50 transition">
            Documentação API
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 pb-24 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users, title: "Afiliados ilimitados", desc: "Gestão completa, slugs únicos, links e QR Code." },
          { icon: BarChart3, title: "Analytics em tempo real", desc: "Veja leads, conversões e comissões ao vivo." },
          { icon: Banknote, title: "Pagamentos via Pix", desc: "Histórico, comprovantes e regras flexíveis." },
          { icon: ShieldCheck, title: "API & Integração", desc: "Endpoint pronto para receber leads externos." },
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

      <footer className="border-t border-border/50 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} FIRE Afiliados — feito com fogo.
      </footer>
    </div>
  );
}
