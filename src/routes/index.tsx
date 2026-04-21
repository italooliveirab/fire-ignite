import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowUpRight, Flame, Zap, ShieldCheck, Wallet, BarChart3, Link2, Sparkles } from "lucide-react";

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
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* TOP BAR */}
      <header className="border-b border-border/60 sticky top-0 z-30 bg-background/70 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="h-8 w-8 rounded-lg bg-gradient-fire flex items-center justify-center shadow-glow-soft">
              <Flame className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-display text-xl font-semibold tracking-tight">FIRE</span>
            <span className="text-[10px] text-muted-foreground hidden sm:inline border-l border-border pl-2.5 ml-1 uppercase tracking-[0.18em]">
              Afiliados
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/ranking"
              className="hidden sm:inline-flex h-9 items-center px-3 text-sm text-muted-foreground hover:text-foreground"
            >
              Ranking
            </Link>
            <Link
              to="/login"
              className="inline-flex h-9 items-center px-3 text-sm text-muted-foreground hover:text-foreground"
            >
              Entrar
            </Link>
            <Link
              to="/signup"
              className="inline-flex h-9 items-center gap-1.5 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-[#FF5A00] shadow-glow-soft hover:shadow-glow transition-all"
            >
              Quero ser afiliado <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative">
        {/* glow background */}
        <div className="pointer-events-none absolute inset-0 -z-0">
          <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 h-[600px] w-[1200px] rounded-full bg-primary/15 blur-[140px]" />
          <div className="absolute top-[200px] right-[-200px] h-[400px] w-[400px] rounded-full bg-info/10 blur-[100px]" />
        </div>

        <div className="relative max-w-[1400px] mx-auto px-6 pt-20 md:pt-28 pb-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-8">
            <Sparkles className="h-3.5 w-3.5" /> Programa oficial FIRE · Inscrições abertas
          </div>

          <h1 className="font-display text-5xl sm:text-7xl lg:text-8xl leading-[1.02] tracking-tight font-semibold max-w-5xl mx-auto">
            Revenda <span className="text-gradient-fire">FIRE</span>.
            <br />Ganhe comissão a cada venda.
          </h1>

          <p className="mt-8 max-w-2xl mx-auto text-lg text-muted-foreground leading-relaxed">
            Cadastre-se grátis, escolha quais produtos da FIRE você quer divulgar e receba seu link
            exclusivo. A cada venda confirmada, comissão direto no seu Pix.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/signup"
              className="group inline-flex items-center justify-center gap-2 h-13 px-7 py-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-[#FF5A00] shadow-glow hover:shadow-glow transition-all"
            >
              Começar agora
              <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" strokeWidth={2} />
            </Link>
            <Link
              to="/ranking"
              className="inline-flex items-center justify-center gap-2 h-13 px-7 py-4 rounded-xl border border-border bg-card/40 text-foreground text-sm font-medium hover:border-primary/50 hover:text-primary transition-all"
            >
              Ver ranking de afiliados
            </Link>
          </div>

          {/* Stats row */}
          <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-px bg-border/40 rounded-2xl overflow-hidden border border-border/40 max-w-4xl mx-auto">
            {[
              { n: "100%", l: "Pagamento via Pix" },
              { n: "0", l: "Mensalidade" },
              { n: "24h", l: "Aprovação" },
              { n: "∞", l: "Comissão recorrente" },
            ].map((s) => (
              <div key={s.l} className="bg-card/50 backdrop-blur p-6">
                <div className="font-display text-3xl md:text-4xl font-semibold text-gradient-fire">{s.n}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>

          {/* live status */}
          <div className="mt-10 inline-flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            Sistema online · BR · <ClientDate />
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="border-y border-border/60 bg-card/40 overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap py-3 text-xs text-muted-foreground/80">
          {Array.from({ length: 2 }).map((_, k) => (
            <div key={k} className="flex items-center gap-10 px-6">
              {[
                "Programa oficial FIRE",
                "Pagamento via Pix",
                "Sem mensalidade",
                "Comissão recorrente",
                "Painel em tempo real",
                "Suporte humano",
                "Link exclusivo por produto",
                "Aprovação rápida",
              ].map((t, i) => (
                <span key={i} className="flex items-center gap-10">
                  <span className="text-primary">●</span>
                  <span>{t}</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* COMO FUNCIONA */}
      <section className="relative">
        <div className="max-w-[1400px] mx-auto px-6 py-24">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="text-xs uppercase tracking-[0.18em] text-primary font-medium mb-3">
              Como funciona
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight">
              Da inscrição à primeira comissão em 24 horas.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Um processo direto, sem burocracia, com tudo que você precisa para vender bem.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { n: "01", t: "Crie sua conta", d: "Cadastro grátis em 30 segundos. Sem cartão." },
              { n: "02", t: "Escolha produtos", d: "Selecione o que faz sentido pro seu público." },
              { n: "03", t: "Aprovação rápida", d: "Nossa equipe revisa em até 24h." },
              { n: "04", t: "Receba seu link", d: "Link exclusivo com seu nome por produto." },
              { n: "05", t: "Comissão no Pix", d: "Pagamento direto, com comprovante." },
            ].map((s) => (
              <div key={s.n} className="card-premium p-6 hover:-translate-y-0.5 hover:shadow-card-hover transition-all">
                <div className="font-display text-2xl font-semibold text-gradient-fire mb-4">
                  {s.n}
                </div>
                <div className="font-medium text-base mb-2">{s.t}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="relative border-t border-border/60">
        <div className="max-w-[1400px] mx-auto px-6 py-24">
          <div className="grid lg:grid-cols-12 gap-10">
            <div className="lg:col-span-5">
              <div className="text-xs uppercase tracking-[0.18em] text-primary font-medium mb-3">
                Por que FIRE
              </div>
              <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight leading-[1.05]">
                Construído pra quem <span className="text-gradient-fire">vende de verdade</span>.
              </h2>
              <p className="mt-5 text-muted-foreground">
                Painel em tempo real, links únicos, comissão recorrente e Pix instantâneo. Tudo numa
                interface premium que você vai gostar de abrir todo dia.
              </p>
            </div>
            <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4">
              {[
                { Icon: BarChart3, t: "Painel em tempo real", d: "Veja leads e vendas no segundo em que acontecem." },
                { Icon: Link2, t: "Link por produto", d: "Cada produto aprovado vira um link com seu slug." },
                { Icon: Wallet, t: "Pix instantâneo", d: "Pagamentos rápidos com comprovante e histórico." },
                { Icon: ShieldCheck, t: "Sem mensalidade", d: "Você só ganha. Nada de custo escondido." },
              ].map((f) => (
                <div key={f.t} className="card-premium p-6 hover:-translate-y-0.5 hover:shadow-card-hover transition-all">
                  <div className="h-10 w-10 rounded-lg border border-primary/30 bg-primary/10 flex items-center justify-center mb-4">
                    <f.Icon className="h-5 w-5 text-primary" strokeWidth={1.8} />
                  </div>
                  <div className="font-medium text-base mb-1.5">{f.t}</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative border-t border-border/60">
        <div className="max-w-[1400px] mx-auto px-6 py-24">
          <div className="relative card-premium p-10 md:p-16 text-center overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-info/10" />
            <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[300px] w-[700px] rounded-full bg-primary/20 blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-6">
                <Zap className="h-3.5 w-3.5" /> Próximo passo
              </div>
              <h2 className="font-display text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
                Sua primeira comissão<br />pode ser <span className="text-gradient-fire">hoje</span>.
              </h2>
              <p className="mt-6 text-muted-foreground max-w-md mx-auto">
                Cadastro grátis. Aprovação em 24 horas. Sem mensalidade.
              </p>
              <div className="mt-10 inline-flex flex-col sm:flex-row gap-3">
                <Link
                  to="/signup"
                  className="group inline-flex items-center justify-center gap-2 h-13 px-8 py-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-[#FF5A00] shadow-glow hover:shadow-glow transition-all"
                >
                  Quero ser afiliado
                  <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" strokeWidth={2} />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center h-13 px-8 py-4 rounded-xl border border-border bg-card/40 text-sm font-medium hover:border-primary/50 hover:text-primary transition-all"
                >
                  Já tenho conta
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-background border-t border-border/60">
        <div className="max-w-[1400px] mx-auto px-6 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 rounded-md bg-gradient-fire flex items-center justify-center">
              <Flame className="h-3 w-3 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span>© {new Date().getFullYear()} FIRE — Programa oficial de afiliados.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/ranking" className="hover:text-foreground">Ranking</Link>
            <Link to="/login" className="hover:text-foreground">Entrar</Link>
            <Link to="/signup" className="hover:text-foreground">Cadastrar</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ClientDate() {
  const [date, setDate] = useState<string>("");
  useEffect(() => {
    setDate(new Date().toLocaleDateString("pt-BR"));
  }, []);
  return <span className="text-foreground">{date || "—"}</span>;
}
