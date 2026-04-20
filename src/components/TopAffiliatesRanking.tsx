import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";
import { Trophy, Medal, Award } from "lucide-react";

type Row = { affiliate_id: string; full_name: string; total: number; isMe: boolean };

export function TopAffiliatesRanking({ currentAffiliateId }: { currentAffiliateId?: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["top-affiliates-month"],
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
        .map(([id, total]) => ({
          affiliate_id: id,
          full_name: nameMap.get(id) ?? "—",
          total,
          isMe: id === currentAffiliateId,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
    },
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card-premium">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-5 w-5 text-primary" />
        <h3 className="font-display font-semibold">Top 10 do mês</h3>
        <span className="text-xs text-muted-foreground ml-auto">Ranking público</span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-background/40 animate-pulse" />
          ))}
        </div>
      ) : (data?.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Sem dados ainda este mês — seja o primeiro 🔥</p>
      ) : (
        <div className="space-y-1.5">
          {data!.map((row, i) => {
            const pos = i + 1;
            const Icon = pos === 1 ? Trophy : pos === 2 ? Medal : pos === 3 ? Award : null;
            const podiumColor =
              pos === 1 ? "text-primary" : pos === 2 ? "text-muted-foreground" : pos === 3 ? "text-amber-600" : "text-muted-foreground";
            return (
              <div
                key={row.affiliate_id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
                  row.isMe ? "bg-gradient-fire/10 border border-primary/40" : "hover:bg-background/40"
                }`}
              >
                <div className={`w-7 text-center font-mono font-bold text-sm ${podiumColor}`}>
                  {Icon ? <Icon className="h-4 w-4 mx-auto" /> : `#${pos}`}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${row.isMe ? "font-bold text-primary" : "font-medium"}`}>
                    {row.full_name} {row.isMe && <span className="text-[10px] uppercase tracking-wider">(você)</span>}
                  </p>
                </div>
                <div className="font-mono text-sm font-semibold">{formatBRL(row.total)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
