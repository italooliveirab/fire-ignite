import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/format";

interface EmailLogRow {
  id: string;
  created_at: string;
  recipient: string;
  subject: string;
  template: string | null;
  status: "sent" | "failed";
  error: string | null;
}

export function EmailLogsTable() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "sent" | "failed">("all");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["email-logs", statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("email_log")
        .select("id, created_at, recipient, subject, template, status, error")
        .order("created_at", { ascending: false })
        .limit(200);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as EmailLogRow[];
    },
    refetchInterval: 15000,
  });

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const ql = search.toLowerCase();
    return [r.recipient, r.subject, r.template, r.error].filter(Boolean).join(" ").toLowerCase().includes(ql);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar destinatário, assunto, erro..." className="pl-10 bg-card" />
        </div>
        <Select value={statusFilter} onValueChange={(v: "all" | "sent" | "failed") => setStatusFilter(v)}>
          <SelectTrigger className="w-full md:w-[180px] bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="sent">Enviados</SelectItem>
            <SelectItem value="failed">Falhas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card-premium">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3.5">Data</th>
                <th className="text-left px-5 py-3.5">Destinatário</th>
                <th className="text-left px-5 py-3.5">Assunto</th>
                <th className="text-left px-5 py-3.5">Template</th>
                <th className="text-left px-5 py-3.5">Status</th>
                <th className="text-left px-5 py-3.5">Erro</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">Nenhum email registrado.</td></tr>
              ) : filtered.map((r) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-background/40 transition">
                  <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(r.created_at)}</td>
                  <td className="px-5 py-3.5 text-xs font-mono">{r.recipient}</td>
                  <td className="px-5 py-3.5">{r.subject}</td>
                  <td className="px-5 py-3.5 text-xs text-muted-foreground">{r.template ?? "—"}</td>
                  <td className="px-5 py-3.5">
                    {r.status === "sent" ? (
                      <span className="text-xs px-2 py-0.5 rounded bg-primary/15 text-primary font-medium">Enviado</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded bg-destructive/15 text-destructive font-medium">Falha</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-muted-foreground max-w-[280px] truncate" title={r.error ?? ""}>{r.error ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
