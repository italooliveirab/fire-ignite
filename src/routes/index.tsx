import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowUpRight, Flame } from "lucide-react";

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
    <div className="min-h-screen bg-background text-foreground">
      {/* TOP BAR */}
      <header className="border-b border-border sticky top-0 z-30 bg-background/95 backdrop-blur">
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="h-7 w-7 bg-primary flex items-center justify-center">
              <Flame className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-display text-xl tracking-tight">FIRE</span>
            <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline border-l border-border pl-2.5 ml-1">
              AFILIADOS · v1.0
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <Link
              to="/ranking"
              className="hidden sm:inline-flex h-9 items-center px-3 text-[11px] font-display uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              Ranking
            </Link>
            <Link
              to="/login"
              className="inline-flex h-9 items-center px-3 text-[11px] font-display uppercase tracking-wider text-muted-foreground hover:text-foreground border border-transparent hover:border-border"
            >
              Entrar
            </Link>
            <Link
              to="/signup"
              className="inline-flex h-9 items-center gap-1.5 px-4 bg-primary text-primary-foreground text-[11px] font-display uppercase tracking-wider font-bold hover:bg-[#FF5A00]"
            >
              Quero ser afiliado <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </header>

      {/* MARQUEE */}
      <div className="border-b border-border bg-card overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap py-2.5 text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground">
          {Array.from({ length: 2 }).map((_, k) => (
            <div key={k} className="flex items-center gap-8 px-4">
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
                <span key={i} className="flex items-center gap-8">
                  <span className="text-primary">●</span>
                  <span>{t}</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* HERO */}
      <section className="border-b border-border relative">
        <div className="max-w-[1400px] mx-auto px-6 py-16 md:py-24 grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8">
            <div className="flex items-center gap-3 mb-8 text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground">
              <span className="h-px w-8 bg-primary" />
              <span>01 / Programa de afiliados</span>
            </div>

            <h1 className="font-display text-[64px] sm:text-[96px] lg:text-[140px] leading-[0.85] tracking-tight">
              REVENDA<br />
              <span className="text-primary">FIRE.</span><br />
              GANHE<br />
              <span className="relative inline-block">
                COMISSÃO
                <span className="absolute -right-3 top-1 h-3 w-3 bg-primary animate-pulse-glow" />
              </span>
            </h1>

            <p className="mt-10 max-w-xl text-base text-muted-foreground leading-relaxed">
              Cadastre-se grátis, escolha quais produtos da FIRE você quer divulgar e receba seu link exclusivo. A cada venda confirmada, comissão na sua conta via Pix.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Link
                to="/signup"
                className="group inline-flex items-center justify-center gap-2 h-14 px-8 bg-primary text-primary-foreground font-display text-sm uppercase tracking-wider font-bold border border-primary hover:bg-[#FF5A00] hover:border-[#FF5A00]"
              >
                Começar agora
                <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" strokeWidth={2.5} />
              </Link>
              <Link
                to="/ranking"
                className="inline-flex items-center justify-center gap-2 h-14 px-8 border border-border text-foreground font-display text-sm uppercase tracking-wider font-bold hover:border-primary hover:text-primary"
              >
                Ver Ranking
              </Link>
            </div>
          </div>

          <div className="lg:col-span-4 lg:border-l border-border lg:pl-8">
            <div className="space-y-8 lg:sticky lg:top-24">
              <Stat number="100%" label="Pagamento via Pix" />
              <Stat number="0" label="Mensalidade · Sem custo" />
              <Stat number="24h" label="Aprovação rápida" />
              <Stat number="∞" label="Comissão recorrente" />
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div className="border-t border-border bg-card">
          <div className="max-w-[1400px] mx-auto px-6 h-9 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 bg-success animate-pulse" />
              <span>SISTEMA ATIVO</span>
            </div>
            <div className="hidden sm:flex items-center gap-6">
              <span>BR-001</span>
              <span>LAT -23.5°</span>
              <ClientDate />
            </div>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA — passos numerados grandes */}
      <section className="border-b border-border">
        <div className="max-w-[1400px] mx-auto px-6 py-20">
          <div className="grid lg:grid-cols-12 gap-8 mb-16">
            <div className="lg:col-span-4">
              <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground mb-4">
                02 / Protocolo
              </div>
              <h2 className="font-display text-5xl lg:text-6xl leading-[0.9]">
                Como<br />funciona
              </h2>
            </div>
            <div className="lg:col-span-8 lg:pl-8 lg:border-l border-border">
              <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl">
                Um processo direto, sem burocracia. Da inscrição à primeira comissão em menos de 24 horas.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 border-t border-l border-border">
            {[
              { n: "01", t: "Crie sua conta", d: "Cadastro grátis em 30 segundos. Sem cartão." },
              { n: "02", t: "Escolha produtos", d: "Selecione o que faz sentido pro seu público." },
              { n: "03", t: "Aprovação rápida", d: "Nossa equipe revisa em até 24h." },
              { n: "04", t: "Receba seu link", d: "Link exclusivo com seu nome por produto." },
              { n: "05", t: "Comissão no Pix", d: "Pagamento direto, com comprovante." },
            ].map((s) => (
              <div
                key={s.n}
                className="border-r border-b border-border p-6 hover:bg-card transition-colors group"
              >
                <div className="font-display text-5xl text-primary mb-6 group-hover:scale-105 origin-left transition-transform">
                  {s.n}
                </div>
                <div className="font-display uppercase text-base mb-2">{s.t}</div>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES — bloco vermelho */}
      <section className="border-b border-border bg-primary text-primary-foreground">
        <div className="max-w-[1400px] mx-auto px-6 py-20 grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5">
            <div className="text-[10px] font-mono uppercase tracking-[0.3em] mb-4 opacity-70">
              03 / Vantagens
            </div>
            <h2 className="font-display text-5xl lg:text-7xl leading-[0.88]">
              Construído<br />pra quem<br />vende.
            </h2>
          </div>
          <div className="lg:col-span-7 grid sm:grid-cols-2 gap-px bg-primary-foreground/20 border border-primary-foreground/20">
            {[
              { t: "Painel real-time", d: "Veja leads e vendas no segundo em que acontecem." },
              { t: "Link por produto", d: "Cada produto aprovado vira um link com seu slug." },
              { t: "Sem mensalidade", d: "Você só paga quando vende. E nem isso — comissão é sua." },
              { t: "Pix instantâneo", d: "Pagamentos rápidos com comprovante e histórico." },
            ].map((f) => (
              <div key={f.t} className="bg-primary p-6">
                <div className="font-display uppercase text-lg mb-2">{f.t}</div>
                <p className="text-sm opacity-80 leading-relaxed">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="border-b border-border">
        <div className="max-w-[1400px] mx-auto px-6 py-24 text-center">
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground mb-6">
            04 / Próximo passo
          </div>
          <h2 className="font-display text-6xl sm:text-8xl lg:text-[160px] leading-[0.85] tracking-tight">
            COMECE<br />
            <span className="text-primary">AGORA.</span>
          </h2>
          <p className="mt-8 text-muted-foreground max-w-md mx-auto">
            Cadastro grátis. Aprovação em 24 horas. Sua primeira comissão pode ser hoje.
          </p>
          <div className="mt-10 inline-flex flex-col sm:flex-row gap-3">
            <Link
              to="/signup"
              className="group inline-flex items-center justify-center gap-2 h-14 px-10 bg-primary text-primary-foreground font-display text-sm uppercase tracking-wider font-bold hover:bg-[#FF5A00]"
            >
              Quero ser afiliado
              <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" strokeWidth={2.5} />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center h-14 px-10 border border-border font-display text-sm uppercase tracking-wider font-bold hover:border-primary hover:text-primary"
            >
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-background">
        <div className="max-w-[1400px] mx-auto px-6 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 bg-primary flex items-center justify-center">
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

function Stat({ number, label }: { number: string; label: string }) {
  return (
    <div>
      <div className="font-display text-6xl leading-none mb-2">{number}</div>
      <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
