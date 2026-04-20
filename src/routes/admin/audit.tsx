import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Download, ShieldCheck, Mail } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/format";
import { exportCSV } from "@/lib/csv";

export const Route = createFileRoute("/admin/audit")({ component: AuditPage });

interface AuditRow {
  id: string;
  affiliate_id: string;
  created_at: string;
  changed_by_email: string | null;
  email_changed: boolean;
  password_changed: boolean;
  old_email: string | null;
  new_email: string | null;
}

interface AffiliateLite { id: string; full_name: string; email: string }

function AuditPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "email" | "password">("all");
  const [affiliateFilter, setAffiliateFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [page, setPage] = useState(0);
  const pageSize = 50;
  useEffect(() => { setPage(0); }, [search, typeFilter, affiliateFilter, dateFrom, dateTo]);

  const fromIso = dateFrom ? new Date(dateFrom + "T00:00:00").toISOString() : null;
  const toIso = dateTo ? new Date(dateTo + "T23:59:59.999").toISOString() : null;

  const { data: affiliates = [] } = useQuery({
    queryKey: ["audit-affiliates-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("affiliates").select("id, full_name, email").order("full_name");
      if (error) throw error;
      return (data ?? []) as AffiliateLite[];
    },
  });
  const affMap = new Map(affiliates.map((a) => [a.id, a]));

  const { data: total = 0 } = useQuery({
    queryKey: ["audit-count", typeFilter, affiliateFilter, fromIso, toIso],
    queryFn: async () => {
      let q = supabase.from("affiliate_credential_audit").select("id", { count: "exact", head: true });
      if (typeFilter === "email") q = q.eq("email_changed", true);
      if (typeFilter === "password") q = q.eq("password_changed", true);
      if (affiliateFilter !== "all") q = q.eq("affiliate_id", affiliateFilter);
      if (fromIso) q = q.gte("created_at", fromIso);
      if (toIso) q = q.lte("created_at", toIso);
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["audit-rows", typeFilter, affiliateFilter, fromIso, toIso, page],
    queryFn: async () => {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      let q = supabase
        .from("affiliate_credential_audit")
        .select("id, affiliate_id, created_at, changed_by_email, email_changed, password_changed, old_email, new_email")
        .order("created_at", { ascending: false })
        .range(from, to);
      if (typeFilter === "email") q = q.eq("email_changed", true);
      if (typeFilter === "password") q = q.eq("password_changed", true);
      if (affiliateFilter !== "all") q = q.eq("affiliate_id", affiliateFilter);
      if (fromIso) q = q.gte("created_at", fromIso);
      if (toIso) q = q.lte("created_at", toIso);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AuditRow[];
    },
  });

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const aff = affMap.get(r.affiliate_id);
    const q = search.toLowerCase();
    const hay = [r.changed_by_email, r.old_email, r.new_email, aff?.full_name, aff?.email].filter(Boolean).join(" ").toLowerCase();
    return hay.includes(q);
  });

  const exportRows = async () => {
    // export current filtered query (across all pages, capped at 1000)
    let q = supabase
      .from("affiliate_credential_audit")
      .select("id, affiliate_id, created_at, changed_by_email, email_changed, password_changed, old_email, new_email")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (typeFilter === "email") q = q.eq("email_changed", true);
    if (typeFilter === "password") q = q.eq("password_changed", true);
    if (affiliateFilter !== "all") q = q.eq("affiliate_id", affiliateFilter);
    if (fromIso) q = q.gte("created_at", fromIso);
    if (toIso) q = q.lte("created_at", toIso);
    const { data, error } = await q;
    if (error || !data) return;
    const all = (data as AuditRow[]).filter((r) => {
      if (!search) return true;
      const aff = affMap.get(r.affiliate_id);
      const ql = search.toLowerCase();
      const hay = [r.changed_by_email, r.old_email, r.new_email, aff?.full_name, aff?.email].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(ql);
    });
    exportCSV(
      `auditoria-credenciais-${new Date().toISOString().slice(0, 10)}`,
      all.map((r) => {
        const aff = affMap.get(r.affiliate_id);
        return {
          data: formatDateTime(r.created_at),
          afiliado: aff?.full_name ?? r.affiliate_id,
          afiliado_email: aff?.email ?? "",
          admin: r.changed_by_email ?? "",
          email_alterado: r.email_changed ? "sim" : "nao",
          senha_alterada: r.password_changed ? "sim" : "nao",
          email_anterior: r.old_email ?? "",
          email_novo: r.new_email ?? "",
        };
      }),
      [
        { key: "data", label: "Data" },
        { key: "afiliado", label: "Afiliado" },
        { key: "afiliado_email", label: "Email do afiliado" },
        { key: "admin", label: "Admin" },
        { key: "email_alterado", label: "Email alterado" },
        { key: "senha_alterada", label: "Senha alterada" },
        { key: "email_anterior", label: "Email anterior" },
        { key: "email_novo", label: "Email novo" },
      ],
    );
  };

  return (
    <DashboardLayout variant="admin" title="Auditoria">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-primary" /> Auditoria
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Rastreabilidade de credenciais e emails enviados</p>
      </div>

      <Tabs defaultValue="credentials" className="space-y-4">
        <TabsList>
          <TabsTrigger value="credentials"><ShieldCheck className="h-4 w-4 mr-1.5" /> Credenciais</TabsTrigger>
          <TabsTrigger value="emails"><Mail className="h-4 w-4 mr-1.5" /> Emails enviados</TabsTrigger>
        </TabsList>

        <TabsContent value="credentials" className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{total} alteração(ões) registradas no total</p>
        </div>
        <Button onClick={exportRows} variant="outline" disabled={filtered.length === 0}>
          <Download className="h-4 w-4 mr-1" /> Exportar CSV
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar afiliado, admin ou email..." className="pl-10 bg-card" />
        </div>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full md:w-[160px] bg-card" aria-label="De" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full md:w-[160px] bg-card" aria-label="Até" />
        <Select value={affiliateFilter} onValueChange={setAffiliateFilter}>
          <SelectTrigger className="w-full md:w-[240px] bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os afiliados</SelectItem>
            {affiliates.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v: "all" | "email" | "password") => setTypeFilter(v)}>
          <SelectTrigger className="w-full md:w-[180px] bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="email">Apenas email</SelectItem>
            <SelectItem value="password">Apenas senha</SelectItem>
          </SelectContent>
        </Select>
        {(dateFrom || dateTo || affiliateFilter !== "all" || typeFilter !== "all" || search) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); setAffiliateFilter("all"); setTypeFilter("all"); }}>Limpar</Button>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card-premium">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3.5">Data</th>
                <th className="text-left px-5 py-3.5">Afiliado</th>
                <th className="text-left px-5 py-3.5">Admin</th>
                <th className="text-left px-5 py-3.5">Tipo</th>
                <th className="text-left px-5 py-3.5">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">Nenhum registro encontrado.</td></tr>
              ) : filtered.map((r) => {
                const aff = affMap.get(r.affiliate_id);
                return (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-background/40 transition">
                    <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(r.created_at)}</td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium">{aff?.full_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{aff?.email}</div>
                    </td>
                    <td className="px-5 py-3.5 text-xs">{r.changed_by_email ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-1.5 flex-wrap">
                        {r.email_changed && <span className="text-xs px-2 py-0.5 rounded bg-primary/15 text-primary font-medium">Email</span>}
                        {r.password_changed && <span className="text-xs px-2 py-0.5 rounded bg-primary/15 text-primary font-medium">Senha</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground font-mono">
                      {r.email_changed && r.old_email && r.new_email ? `${r.old_email} → ${r.new_email}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {total > pageSize && (
        <div className="flex items-center justify-between pt-4">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Anterior</Button>
          <span className="text-xs text-muted-foreground">Página {page + 1} de {Math.max(1, Math.ceil(total / pageSize))}</span>
          <Button variant="outline" size="sm" disabled={(page + 1) * pageSize >= total} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
        </div>
      )}
        </TabsContent>

        <TabsContent value="emails">
          <EmailLogsTable />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}

interface EmailLogRow {
  id: string;
  created_at: string;
  recipient: string;
  subject: string;
  template: string | null;
  status: "sent" | "failed";
  error: string | null;
}

function EmailLogsTable() {
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
                      <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 font-medium">Enviado</span>
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
