import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Medal, Award, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBrand } from "@/hooks/useBrand";
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
  const brand = useBrand();
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display font-bold">
            {brand.logoUrl ? (
              <img src={brand.logoUrl} alt={brand.companyName} className="h-7 w-7 rounded object-cover" />
            ) : (
              <Flame className="h-6 w-6 text-primary" />
            )}
            <span>{brand.companyName}</span>
          </Link>
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition">
            Entrar
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-10 md:py-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-fire/10 border border-primary/30 mb-4">
            <Trophy className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs uppercase tracking-wider font-semibold text-primary">Ranking público</span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-3">Top 10 do mês</h1>
          <p className="text-muted-foreground capitalize">{monthLabel}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 md:p-7 shadow-card-premium">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-14 rounded-lg bg-background/40 animate-pulse" />
              ))}
            </div>
          ) : (data?.length ?? 0) === 0 ? (
            <p className="text-center text-muted-foreground py-12">Sem dados ainda este mês — seja o primeiro 🔥</p>
          ) : (
            <div className="space-y-2">
              {data!.map((row, i) => {
                const pos = i + 1;
                const Icon = pos === 1 ? Trophy : pos === 2 ? Medal : pos === 3 ? Award : null;
                const podiumColor =
                  pos === 1 ? "text-primary" : pos === 2 ? "text-muted-foreground" : pos === 3 ? "text-amber-600" : "text-muted-foreground";
                const isPodium = pos <= 3;
                return (
                  <div
                    key={row.affiliate_id}
                    className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition ${
                      isPodium ? "bg-gradient-fire/5 border border-primary/20" : "hover:bg-background/40"
                    }`}
                  >
                    <div className={`w-10 text-center font-mono font-bold ${podiumColor}`}>
                      {Icon ? <Icon className="h-5 w-5 mx-auto" /> : `#${pos}`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`truncate ${isPodium ? "font-bold text-base" : "font-medium text-sm"}`}>{row.full_name}</p>
                    </div>
                    <div className={`font-mono font-semibold ${isPodium ? "text-base text-primary" : "text-sm"}`}>
                      {formatBRL(row.total)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="text-center mt-10">
          <p className="text-sm text-muted-foreground mb-4">Quer aparecer aqui no próximo mês?</p>
          <a
            href="https://wa.me/?text=Quero%20me%20tornar%20afiliado%20FIRE"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-fire text-white font-semibold shadow-fire hover:opacity-90 transition"
          >
            <Flame className="h-4 w-4" /> Quero ser afiliado
          </a>
          <p className="text-xs text-muted-foreground mt-3">
            Já é afiliado? <Link to="/login" className="text-primary hover:underline">Entrar no painel</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
