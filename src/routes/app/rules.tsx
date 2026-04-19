import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Clock, XCircle, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/app/rules")({ component: RulesPage });

function RulesPage() {
  const [s, setS] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { supabase.from("settings").select("*").limit(1).single().then(({ data }) => setS(data)); }, []);

  return (
    <DashboardLayout variant="affiliate" title="Regras">
      <h1 className="font-display text-3xl font-bold mb-1">Regras & Política</h1>
      <p className="text-muted-foreground text-sm mb-8">Como funciona seu pagamento de comissões.</p>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <Card icon={CheckCircle2} title="Como funciona" accent="success">
          Você ganha comissão quando o cliente que <b>veio do seu link</b> efetua o pagamento confirmado dentro da nossa plataforma.
        </Card>
        <Card icon={Clock} title="Quando paga" accent="warning">
          Pagamentos são realizados <b>{s?.payout_frequency === "weekly" ? "semanalmente" : s?.payout_frequency === "biweekly" ? "quinzenalmente" : "mensalmente"}</b>, com valor mínimo de <b>R$ {String(s?.minimum_payout ?? 50)}</b>. Período de retenção de <b>{String(s?.retention_days ?? 7)} dias</b>.
        </Card>
        <Card icon={XCircle} title="Quando não paga" accent="fire">
          Se o cliente <b>não pagou</b>, cancelou ou houve estorno, a comissão correspondente é cancelada automaticamente.
        </Card>
        <Card icon={MessageCircle} title="Suporte" accent="neon">
          Dúvidas? Fale com a gente: <b>{String(s?.support_email ?? "—")}</b> · WhatsApp <b>{String(s?.support_whatsapp ?? "—")}</b>.
        </Card>
      </div>

      {s?.payment_policy_text ? (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card-premium whitespace-pre-line text-sm text-muted-foreground">
          {String(s.payment_policy_text)}
        </div>
      ) : null}
    </DashboardLayout>
  );
}

function Card({ icon: Icon, title, children, accent }: { icon: React.ElementType; title: string; children: React.ReactNode; accent: "success" | "warning" | "fire" | "neon" }) {
  const map = { success: "text-success border-success/30 bg-success/15", warning: "text-warning border-warning/30 bg-warning/15", fire: "text-primary border-primary/30 bg-primary/15", neon: "text-info border-info/30 bg-info/15" };
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card-premium">
      <div className={`h-10 w-10 rounded-lg border flex items-center justify-center mb-3 ${map[accent]}`}><Icon className="h-5 w-5" /></div>
      <h3 className="font-display font-bold text-lg mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}
