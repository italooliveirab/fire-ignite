import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { flushDebug, getRecentDebug } from "@/lib/debug-monitor";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, Trash2, Activity, AlertTriangle, Zap, Database, Globe, Shield } from "lucide-react";

export const Route = createFileRoute("/admin/_debug")({
  component: DebugPanel,
});

interface DebugRow {
  id: string;
  created_at: string;
  category: string;
  severity: string;
  message: string;
  duration_ms: number | null;
  route: string | null;
  user_email: string | null;
  context: Record<string, unknown> | null;
}

const CATS = ["all", "auth", "performance", "navigation", "network", "query", "error", "vital"] as const;

function DebugPanel() {
  const { role, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [rows, setRows] = useState<DebugRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState<(typeof CATS)[number]>("all");
  const [sev, setSev] = useState<"all" | "info" | "warn" | "error">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!authLoading && role !== "admin") nav({ to: "/login" });
  }, [authLoading, role, nav]);

  const load = async () => {
    setLoading(true);
    await flushDebug();
    let q = supabase.from("debug_events").select("*").order("created_at", { ascending: false }).limit(500);
    if (cat !== "all") q = q.eq("category", cat);
    if (sev !== "all") q = q.eq("severity", sev);
    const { data } = await q;
    setRows((data ?? []) as DebugRow[]);
    setLoading(false);
  };

  useEffect(() => {
    if (role === "admin") void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, cat, sev]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.message.toLowerCase().includes(s) ||
        (r.route ?? "").toLowerCase().includes(s) ||
        (r.user_email ?? "").toLowerCase().includes(s),
    );
  }, [rows, search]);

  const stats = useMemo(() => {
    const errors = rows.filter((r) => r.severity === "error").length;
    const warns = rows.filter((r) => r.severity === "warn").length;
    const slow = rows.filter((r) => (r.duration_ms ?? 0) > 1000).length;
    const queries = rows.filter((r) => r.category === "query");
    const avgQuery = queries.length
      ? Math.round(queries.reduce((a, b) => a + (b.duration_ms ?? 0), 0) / queries.length)
      : 0;
    return { errors, warns, slow, avgQuery, total: rows.length };
  }, [rows]);

  const clearAll = async () => {
    if (!confirm("Apagar TODOS os eventos de debug?")) return;
    await supabase.from("debug_events").delete().not("id", "is", null);
    void load();
  };

  if (authLoading || role !== "admin") {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" /> Painel de Diagnóstico Interno
            </h1>
            <p className="text-sm text-muted-foreground">Monitoramento de performance, erros e requisições. Retenção: 7 dias.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Eventos em buffer no cliente: {getRecentDebug().length}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4 mr-1" /> Recarregar
            </Button>
            <Button variant="destructive" size="sm" onClick={clearAll}>
              <Trash2 className="h-4 w-4 mr-1" /> Limpar tudo
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatBox icon={<Activity className="h-4 w-4" />} label="Total" value={stats.total} />
          <StatBox icon={<AlertTriangle className="h-4 w-4 text-destructive" />} label="Erros" value={stats.errors} variant="error" />
          <StatBox icon={<AlertTriangle className="h-4 w-4 text-yellow-500" />} label="Avisos" value={stats.warns} variant="warn" />
          <StatBox icon={<Zap className="h-4 w-4" />} label=">1s" value={stats.slow} />
          <StatBox icon={<Database className="h-4 w-4" />} label="Query média" value={`${stats.avgQuery}ms`} />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {CATS.map((c) => (
            <Button key={c} variant={cat === c ? "default" : "outline"} size="sm" onClick={() => setCat(c)}>
              {c}
            </Button>
          ))}
          <div className="ml-auto flex gap-2 items-center">
            {(["all", "info", "warn", "error"] as const).map((s) => (
              <Button key={s} variant={sev === s ? "default" : "outline"} size="sm" onClick={() => setSev(s)}>
                {s}
              </Button>
            ))}
          </div>
        </div>

        <Input placeholder="Buscar por mensagem, rota ou usuário..." value={search} onChange={(e) => setSearch(e.target.value)} />

        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto max-h-[60vh]">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-2">Quando</th>
                  <th className="text-left p-2">Cat</th>
                  <th className="text-left p-2">Sev</th>
                  <th className="text-left p-2">Mensagem</th>
                  <th className="text-right p-2">ms</th>
                  <th className="text-left p-2">Rota</th>
                  <th className="text-left p-2">Usuário</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="p-4 text-center"><Loader2 className="h-4 w-4 animate-spin inline" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">Nenhum evento</td></tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                      <td className="p-2 whitespace-nowrap text-muted-foreground">
                        {new Date(r.created_at).toLocaleTimeString()}
                      </td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-[10px]">{r.category}</Badge>
                      </td>
                      <td className="p-2">
                        <SevBadge s={r.severity} />
                      </td>
                      <td className="p-2 max-w-md truncate" title={r.message}>
                        {r.message}
                        {r.context && (
                          <details className="mt-0.5">
                            <summary className="cursor-pointer text-muted-foreground text-[10px]">ctx</summary>
                            <pre className="text-[10px] bg-muted/50 p-1 rounded overflow-auto max-h-32">{JSON.stringify(r.context, null, 2)}</pre>
                          </details>
                        )}
                      </td>
                      <td className="p-2 text-right tabular-nums">
                        {r.duration_ms != null ? <span className={r.duration_ms > 1000 ? "text-destructive" : r.duration_ms > 500 ? "text-yellow-500" : ""}>{r.duration_ms}</span> : "—"}
                      </td>
                      <td className="p-2 text-muted-foreground truncate max-w-[140px]" title={r.route ?? ""}>
                        <Globe className="h-3 w-3 inline mr-1" />{r.route ?? "—"}
                      </td>
                      <td className="p-2 text-muted-foreground truncate max-w-[140px]">{r.user_email ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ icon, label, value, variant }: { icon: React.ReactNode; label: string; value: string | number; variant?: "error" | "warn" }) {
  const tone = variant === "error" ? "border-destructive/40" : variant === "warn" ? "border-yellow-500/40" : "border-border";
  return (
    <div className={`rounded-lg border ${tone} bg-card p-3`}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </div>
  );
}

function SevBadge({ s }: { s: string }) {
  if (s === "error") return <Badge variant="destructive" className="text-[10px]">error</Badge>;
  if (s === "warn") return <Badge className="text-[10px] bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/20">warn</Badge>;
  return <Badge variant="secondary" className="text-[10px]">info</Badge>;
}