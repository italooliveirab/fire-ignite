import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Flame, ArrowUpRight, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/ranking")({
  head: () => ({
    meta: [
      { title: "Ranking do Mês — Top 10 Afiliados FIRE" },
      { name: "description", content: "Veja os 10 afiliados que mais geraram comissões este mês na FIRE." },
      { property: "og:title", content: "Ranking do Mês — Top 10 Afiliados FIRE" },
      { property: "og:description", content: "Os top performers da FIRE deste mês. Faça parte." },
    ],
  }),
  component: RankingPage,
});

type Row = { affiliate_id: string; full_name: string; total: number };

function RankingPage() {
  const monthLabel = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const { data, isLoading } = useQuery({
    queryKey: ["public-ranking-month"],
    queryFn: async (): Promise<Row[]> => {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const { data: comm } = await supabase
        .from("commissions")
        .select("affiliate_id, commission_value, status, created_at")
        .gte("created_at", start.toISOString())
        .in("status", ["released", "paid"]);
      const { data: affs } = await supabase.from("affiliates").select("id, full_name");
      const nameMap = new Map((affs ?? []).map((a) => [a.id, a.full_name]));
      const totals = new Map<string, number>();
      for (const c of comm ?? []) {
        totals.set(c.affiliate_id, (totals.get(c.affiliate_id) ?? 0) + Number(c.commission_value));
      }
      return Array.from(totals.entries())
        .map(([id, total]) => ({ affiliate_id: id, full_name: nameMap.get(id) ?? "—", total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
    },
  });

  const top = data?.[0];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border sticky top-0 z-30 bg-background/95 backdrop-blur">
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-7 w-7 bg-primary flex items-center justify-center">
              <Flame className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-display text-xl tracking-tight">FIRE</span>
            <span className="text-[10px] font-mono text-muted-foreground border-l border-border pl-2.5 ml-1">
              RANKING
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden sm:inline-flex h-9 items-center px-3 text-[11px] font-display uppercase tracking-wider text-muted-foreground hover:text-foreground">
              Entrar
            </Link>
            <Link to="/signup" className="inline-flex h-9 items-center gap-1.5 px-4 bg-primary text-primary-foreground text-[11px] font-display uppercase tracking-wider font-bold hover:bg-[#FF5A00]">
              Quero ser afiliado <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 py-16">
        {/* Hero do ranking */}
        <div className="grid lg:grid-cols-12 gap-8 mb-16 pb-16 border-b border-border">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3 mb-6 text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground">
              <span className="h-px w-8 bg-primary" />
              <span>Ranking público · {monthLabel}</span>
            </div>
            <h1 className="font-display text-7xl sm:text-8xl lg:text-[120px] leading-[0.85]">
              TOP 10<br />
              <span className="text-primary">DO MÊS.</span>
            </h1>
            <p className="mt-6 text-muted-foreground max-w-md text-sm">
              Os afiliados que mais geraram comissão liberada ou paga este mês.
            </p>
          </div>
          <div className="lg:col-span-5 lg:border-l border-border lg:pl-8 flex flex-col justify-end">
            {top ? (
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-3">
                  #1 do mês
                </div>
                <div className="flex items-baseline gap-3 mb-2">
                  <Trophy className="h-6 w-6 text-primary" strokeWidth={2} />
                  <div className="font-display text-3xl uppercase truncate">{top.full_name}</div>
                </div>
                <div className="font-display text-6xl text-primary leading-none">{formatBRL(top.total)}</div>
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">
                Sem dados ainda este mês — seja o primeiro 🔥
              </div>
            )}
          </div>
        </div>

        {/* Tabela */}
        <div className="border border-border">
          <div className="grid grid-cols-[60px_1fr_140px] sm:grid-cols-[80px_1fr_180px] border-b border-border px-4 py-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground bg-card">
            <div>POS</div>
            <div>AFILIADO</div>
            <div className="text-right">COMISSÃO</div>
          </div>
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-12 bg-card animate-pulse" />
              ))}
            </div>
          ) : (data?.length ?? 0) === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              Sem dados ainda este mês.
            </div>
          ) : (
            data!.map((row, i) => {
              const pos = i + 1;
              const isPodium = pos <= 3;
              return (
                <div
                  key={row.affiliate_id}
                  className={`grid grid-cols-[60px_1fr_140px] sm:grid-cols-[80px_1fr_180px] items-center px-4 py-4 border-b border-border last:border-b-0 transition-colors hover:bg-card ${
                    isPodium ? "bg-primary/[0.04]" : ""
                  }`}
                >
                  <div className={`font-display text-2xl ${isPodium ? "text-primary" : "text-muted-foreground"}`}>
                    {String(pos).padStart(2, "0")}
                  </div>
                  <div className="min-w-0">
                    <div className={`truncate ${isPodium ? "font-display uppercase text-lg" : "text-sm font-medium"}`}>
                      {row.full_name}
                    </div>
                  </div>
                  <div className={`text-right font-mono ${isPodium ? "text-primary text-lg font-bold" : "text-sm"}`}>
                    {formatBRL(row.total)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* CTA */}
        <div className="mt-16 border border-border bg-card p-10 text-center">
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground mb-4">
            Próximo mês
          </div>
          <h2 className="font-display text-4xl sm:text-5xl uppercase leading-[0.9]">
            Quer aparecer<br />aqui?
          </h2>
          <Link to="/signup" className="mt-8 inline-flex items-center gap-2 h-12 px-8 bg-primary text-primary-foreground font-display uppercase tracking-wider text-sm font-bold hover:bg-[#FF5A00]">
            Quero ser afiliado <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} />
          </Link>
          <p className="mt-4 text-xs text-muted-foreground">
            Já é afiliado? <Link to="/login" className="text-primary hover:underline">Entrar no painel</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
