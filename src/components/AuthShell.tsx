import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Flame, ArrowLeft } from "lucide-react";

interface Props {
  step: string;            // "01 / Acesso"
  title: string;           // "Entre no painel"
  tagline?: string;        // texto do lado esquerdo
  children: ReactNode;
}

export function AuthShell({ step, title, tagline, children }: Props) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* LEFT — bloco preto tipográfico */}
      <aside className="hidden lg:flex relative bg-background border-r border-border/60 flex-col justify-between p-10 overflow-hidden">
        {/* glow background */}
        <div className="pointer-events-none absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-[420px] w-[420px] rounded-full bg-info/10 blur-3xl" />

        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="h-8 w-8 rounded-lg bg-gradient-fire flex items-center justify-center shadow-glow-soft">
              <Flame className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-display text-xl font-semibold tracking-tight">FIRE</span>
            <span className="text-[10px] text-muted-foreground border-l border-border pl-2.5 ml-1 uppercase tracking-[0.18em]">
              AFILIADOS
            </span>
          </Link>
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </Link>
        </div>

        <div className="relative">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-6 flex items-center gap-3 font-medium">
            <span className="h-px w-8 bg-gradient-fire" />
            {step}
          </div>
          <h1 className="font-display text-5xl xl:text-6xl leading-[1.05] tracking-tight font-semibold">
            {title.split("\n").map((line, i) => (
              <span key={i} className={i === 0 ? "block" : "block text-gradient-fire"}>
                {line}
              </span>
            ))}
          </h1>
          {tagline && (
            <p className="mt-6 max-w-md text-sm text-muted-foreground leading-relaxed">{tagline}</p>
          )}
        </div>

        <div className="relative border-t border-border/60 pt-6 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Sistema ativo
          </span>
          <span>BR · {new Date().getFullYear()}</span>
        </div>
      </aside>

      {/* RIGHT — form */}
      <main className="flex flex-col justify-center px-6 py-10 lg:px-16 bg-background lg:bg-card/30">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between mb-10">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-fire flex items-center justify-center shadow-glow-soft">
              <Flame className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-display text-lg font-semibold">FIRE</span>
          </Link>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
            Voltar
          </Link>
        </div>

        <div className="w-full max-w-md mx-auto lg:mx-0">
          {children}
        </div>
      </main>
    </div>
  );
}
