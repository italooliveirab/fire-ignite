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
      <aside className="hidden lg:flex relative bg-background border-r border-border flex-col justify-between p-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="h-7 w-7 bg-primary flex items-center justify-center">
              <Flame className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-display text-xl tracking-tight">FIRE</span>
            <span className="text-[10px] font-mono text-muted-foreground border-l border-border pl-2.5 ml-1">
              AFILIADOS
            </span>
          </Link>
          <Link to="/" className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </Link>
        </div>

        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground mb-6 flex items-center gap-3">
            <span className="h-px w-8 bg-primary" />
            {step}
          </div>
          <h1 className="font-display text-7xl xl:text-8xl leading-[0.88] tracking-tight">
            {title.split("\n").map((line, i) => (
              <span key={i} className={i === 0 ? "block" : "block text-primary"}>
                {line}
              </span>
            ))}
          </h1>
          {tagline && (
            <p className="mt-8 max-w-md text-sm text-muted-foreground leading-relaxed">{tagline}</p>
          )}
        </div>

        <div className="border-t border-border pt-6 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 bg-success animate-pulse" /> Sistema ativo
          </span>
          <span>BR · {new Date().getFullYear()}</span>
        </div>
      </aside>

      {/* RIGHT — form */}
      <main className="flex flex-col justify-center px-6 py-10 lg:px-16 bg-card">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between mb-10">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-7 w-7 bg-primary flex items-center justify-center">
              <Flame className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-display text-lg">FIRE</span>
          </Link>
          <Link to="/" className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
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
