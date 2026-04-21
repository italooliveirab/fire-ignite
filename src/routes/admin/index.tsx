import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, UserCheck, Target, MessageCircle, Beaker, FileText, CheckCircle, XCircle, Clock, Banknote, TrendingUp, Percent } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, formatNumber } from "@/lib/format";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { useSpotlight } from "@/hooks/useSpotlight";

export const Route = createFileRoute("/admin/")({ component: AdminDashboard });

function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [aff, leads, comm, pay] = await Promise.all([
        supabase.from("affiliates").select("id, status"),
        supabase.from("leads").select("id, status, payment_amount, created_at"),
        supabase.from("commissions").select("id, status, commission_value"),
        supabase.from("payouts").select("amount_paid"),
      ]);
      const affiliates = aff.data ?? [];
      const leadsArr = leads.data ?? [];
      const commissions = comm.data ?? [];
      const payouts = pay.data ?? [];

      const byStatus = (s: string) => leadsArr.filter((l) => l.status === s).length;
      const sumComm = (s: string) => commissions.filter((c) => c.status === s).reduce((a, c) => a + Number(c.commission_value), 0);
      const totalRevenue = leadsArr.filter((l) => l.status === "paid").reduce((a, l) => a + Number(l.payment_amount ?? 0), 0);
      const conversionRate = leadsArr.length ? (byStatus("paid") / leadsArr.length) * 100 : 0;

      // Series últimos 14 dias
      const days = Array.from({ length: 14 }).map((_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (13 - i));
        const key = d.toISOString().slice(0, 10);
        return {
          date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          leads: leadsArr.filter((l) => l.created_at?.slice(0, 10) === key).length,
          paid: leadsArr.filter((l) => l.created_at?.slice(0, 10) === key && l.status === "paid").length,
        };
      });

      return {
        totalAffiliates: affiliates.length,
        activeAffiliates: affiliates.filter((a) => a.status === "active").length,
        totalLeads: leadsArr.length,
        initiated: byStatus("initiated_conversation"),
        trial: byStatus("generated_trial"),
        generatedPay: byStatus("generated_payment"),
        paid: byStatus("paid"),
        notPaid: byStatus("not_paid"),
        commPending: sumComm("pending"),
        commPaid: sumComm("paid") + payouts.reduce((a, p) => a + Number(p.amount_paid), 0),
        revenue: totalRevenue,
        conversion: conversionRate,
        days,
      };
    },
  });

  return (
    <DashboardLayout variant="admin" title="Dashboard">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Visão geral</h1>
        <p className="text-muted-foreground text-sm mt-1">Acompanhe a performance da sua operação em tempo real.</p>
      </div>

      {isLoading || !stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-32 rounded-2xl bg-card border border-border animate-pulse" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <StatCard variant="premium" label="Faturamento total" value={formatBRL(stats.revenue)} icon={TrendingUp} accent="fire" />
            <StatCard variant="premium" label="Taxa de conversão" value={`${stats.conversion.toFixed(1)}%`} icon={Percent} accent="gold" />
            <StatCard variant="premium" label="Comissão paga" value={formatBRL(stats.commPaid)} icon={Banknote} accent="success" />
            <StatCard variant="premium" label="Comissão pendente" value={formatBRL(stats.commPending)} icon={Clock} accent="warning" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <StatCard label="Total afiliados" value={formatNumber(stats.totalAffiliates)} icon={Users} accent="neon" />
            <StatCard label="Afiliados ativos" value={formatNumber(stats.activeAffiliates)} icon={UserCheck} accent="success" />
            <StatCard label="Total leads" value={formatNumber(stats.totalLeads)} icon={Target} accent="fire" />
            <StatCard label="Pagaram" value={formatNumber(stats.paid)} icon={CheckCircle} accent="success" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Iniciaram conversa" value={formatNumber(stats.initiated)} icon={MessageCircle} accent="neon" />
            <StatCard label="Geraram teste" value={formatNumber(stats.trial)} icon={Beaker} accent="gold" />
            <StatCard label="Geraram pagamento" value={formatNumber(stats.generatedPay)} icon={FileText} accent="warning" />
            <StatCard label="Não pagaram" value={formatNumber(stats.notPaid)} icon={XCircle} accent="fire" />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <ChartCard title="Leads nos últimos 14 dias">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={stats.days}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0 0)" />
                  <XAxis dataKey="date" stroke="oklch(0.6 0 0)" fontSize={11} />
                  <YAxis stroke="oklch(0.6 0 0)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "oklch(0.16 0 0)", border: "1px solid oklch(0.25 0 0)", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="leads" stroke="#FF5A00" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Pagamentos confirmados">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.days}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0 0)" />
                  <XAxis dataKey="date" stroke="oklch(0.6 0 0)" fontSize={11} />
                  <YAxis stroke="oklch(0.6 0 0)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "oklch(0.16 0 0)", border: "1px solid oklch(0.25 0 0)", borderRadius: 8 }} />
                  <Bar dataKey="paid" fill="#FF2A00" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  const { ref, onMouseMove, onMouseLeave } = useSpotlight();
  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="spotlight-card rounded-2xl border border-border bg-card p-5 shadow-card-premium"
    >
      <span className="spotlight-shine" aria-hidden />
      <h3 className="font-display font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}
