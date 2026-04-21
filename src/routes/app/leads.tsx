import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { MousePointerClick, MessageCircle, Gift, Receipt, CheckCircle2, XCircle, DollarSign, ChevronRight } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/app/leads")({ component: MyLeads });

interface LeadRow {
  id: string;
  customer_name: string | null;
  whatsapp_number: string | null;
  whatsapp_id: string | null;
  status: string;
  payment_amount: number | null;
  created_at: string;
  conversation_started_at: string | null;
  trial_generated_at: string | null;
  payment_generated_at: string | null;
  paid_at: string | null;
  product_id: string | null;
}

interface CommissionRow { id: string; lead_id: string; commission_value: number; status: string }

function maskPhone(phone: string | null) {
  if (!phone) return "—";
  const d = phone.replace(/\D/g, "");
  if (d.length < 4) return "••••";
  return `••••••${d.slice(-4)}`;
}

function MyLeads() {
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["my-leads", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<LeadRow[]> => {
      const aff = (await supabase.from("affiliates").select("id").eq("user_id", user!.id).maybeSingle()).data;
      if (!aff) return [];
      const { data } = await supabase.from("leads").select("*").eq("affiliate_id", aff.id).order("created_at", { ascending: false }).limit(200);
      return (data ?? []) as LeadRow[];
    },
  });

  const { data: commissions = [] } = useQuery({
    queryKey: ["my-leads-commissions", user?.id],
    enabled: !!user && leads.length > 0,
    queryFn: async (): Promise<CommissionRow[]> => {
      const ids = leads.map((l) => l.id);
      const { data } = await supabase.from("commissions").select("id, lead_id, commission_value, status").in("lead_id", ids);
      return (data ?? []) as CommissionRow[];
    },
  });

  const commByLead = new Map(commissions.map((c) => [c.lead_id, c]));
  const selected = leads.find((l) => l.id === selectedId) ?? leads[0] ?? null;
  const selectedComm = selected ? commByLead.get(selected.id) : undefined;

  const stats = {
    total: leads.length,
    conversa: leads.filter((l) => l.conversation_started_at).length,
    teste: leads.filter((l) => l.trial_generated_at).length,
    pagos: leads.filter((l) => l.status === "paid").length,
    receita: leads.filter((l) => l.status === "paid").reduce((s, l) => s + Number(l.payment_amount ?? 0), 0),
  };

  return (
    <DashboardLayout variant="affiliate" title="Insights / Conversões">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Insights / Conversões</h1>
        <p className="text-sm text-muted-foreground mt-1">Acompanhe a jornada completa de cada lead — do clique ao pagamento.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Cliques/Leads", value: stats.total, icon: MousePointerClick, color: "text-info" },
          { label: "Conversas", value: stats.conversa, icon: MessageCircle, color: "text-primary" },
          { label: "Testes", value: stats.teste, icon: Gift, color: "text-warning" },
          { label: "Pagamentos", value: stats.pagos, icon: CheckCircle2, color: "text-success" },
          { label: "Receita", value: formatBRL(stats.receita), icon: DollarSign, color: "text-fire" },
        ].map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Icon className={`h-4 w-4 ${k.color}`} />
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{k.label}</div>
              </div>
              <div className="font-display text-xl font-bold">{k.value}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Lead list */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card overflow-hidden shadow-card-premium">
          <div className="px-4 py-3 border-b border-border bg-background/40 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Leads ({leads.length})
          </div>
          <div className="max-h-[640px] overflow-y-auto divide-y divide-border/50">
            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground text-sm">Carregando...</div>
            ) : leads.length === 0 ? (
              <div className="py-12 px-4 text-center text-muted-foreground text-sm">
                Nenhum lead ainda. Compartilhe seu link de divulgação para começar a receber clientes!
              </div>
            ) : leads.map((l) => {
              const isActive = selected?.id === l.id;
              return (
                <button
                  key={l.id}
                  onClick={() => setSelectedId(l.id)}
                  className={`w-full text-left px-4 py-3 transition flex items-center gap-3 ${
                    isActive ? "bg-primary/10 border-l-2 border-primary" : "hover:bg-background/40 border-l-2 border-transparent"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{l.customer_name ?? "Lead anônimo"}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">{maskPhone(l.whatsapp_number)}</div>
                    <div className="mt-1.5"><StatusBadge status={l.status} /></div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Timeline */}
        <div className="lg:col-span-3 rounded-2xl border border-border bg-card p-6 shadow-card-premium">
          {!selected ? (
            <div className="py-20 text-center text-sm text-muted-foreground">Selecione um lead para ver a jornada.</div>
          ) : (
            <>
              <div className="flex items-start justify-between mb-6 pb-4 border-b border-border">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Cliente</div>
                  <div className="font-display text-xl font-bold">{selected.customer_name ?? "Lead anônimo"}</div>
                  <div className="text-xs text-muted-foreground font-mono mt-1">{maskPhone(selected.whatsapp_number)}</div>
                </div>
                <StatusBadge status={selected.status} />
              </div>

              <Timeline lead={selected} commission={selectedComm} />

              {selected.payment_amount ? (
                <div className="mt-6 pt-4 border-t border-border grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Valor da venda</div>
                    <div className="font-mono text-lg font-bold mt-0.5">{formatBRL(Number(selected.payment_amount))}</div>
                  </div>
                  {selectedComm && (
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Sua comissão</div>
                      <div className="font-mono text-lg font-bold text-success mt-0.5">{formatBRL(Number(selectedComm.commission_value))}</div>
                      <div className="text-[10px] uppercase text-muted-foreground mt-0.5">{selectedComm.status}</div>
                    </div>
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function Timeline({ lead, commission }: { lead: LeadRow; commission?: CommissionRow }) {
  const events = [
    { key: "click", label: "Clicou no link / iniciou conversa", icon: MousePointerClick, at: lead.created_at, done: true },
    { key: "conv", label: "Conversa iniciada no WhatsApp", icon: MessageCircle, at: lead.conversation_started_at, done: !!lead.conversation_started_at || lead.status !== "initiated_conversation" },
    { key: "trial", label: "Teste grátis solicitado", icon: Gift, at: lead.trial_generated_at, done: !!lead.trial_generated_at },
    { key: "pay_gen", label: "Cobrança/Pagamento gerado", icon: Receipt, at: lead.payment_generated_at, done: !!lead.payment_generated_at },
    lead.status === "not_paid"
      ? { key: "lost", label: "Não pagou / Perdido", icon: XCircle, at: null, done: true, error: true }
      : { key: "paid", label: "Pagamento concluído", icon: CheckCircle2, at: lead.paid_at, done: lead.status === "paid" },
    { key: "comm", label: commission ? `Comissão aplicada (${commission.status})` : "Comissão pendente", icon: DollarSign, at: null, done: !!commission },
  ];

  return (
    <div className="space-y-0">
      {events.map((ev, idx) => {
        const Icon = ev.icon;
        const isLast = idx === events.length - 1;
        const isError = "error" in ev && ev.error;
        return (
          <div key={ev.key} className="flex gap-3 relative">
            <div className="flex flex-col items-center">
              <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 border-2 ${
                isError ? "bg-destructive/15 border-destructive text-destructive"
                : ev.done ? "bg-primary/15 border-primary text-primary" : "bg-muted/30 border-border text-muted-foreground"
              }`}>
                <Icon className="h-4 w-4" />
              </div>
              {!isLast && <div className={`w-0.5 flex-1 my-1 ${ev.done ? "bg-primary/40" : "bg-border"}`} />}
            </div>
            <div className={`flex-1 pb-6 ${ev.done ? "" : "opacity-60"}`}>
              <div className="text-sm font-medium">{ev.label}</div>
              {ev.at && <div className="text-xs text-muted-foreground mt-0.5">{formatDateTime(ev.at)}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
