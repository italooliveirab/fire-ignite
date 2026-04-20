import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatBRL, formatNumber } from "@/lib/format";
import { Target, MessageCircle, Beaker, FileText, CheckCircle, XCircle, Clock, Banknote, Copy, Share2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { TopAffiliatesRanking } from "@/components/TopAffiliatesRanking";

export const Route = createFileRoute("/app/")({ component: AffiliateDashboard });

function AffiliateDashboard() {
  const { user } = useAuth();
  const [domain, setDomain] = useState("fire.com");
  const [prefix, setPrefix] = useState("");

  useEffect(() => {
    supabase.from("settings").select("affiliate_link_domain, affiliate_link_prefix").limit(1).single()
      .then(({ data }) => { if (data) { setDomain(data.affiliate_link_domain); setPrefix(data.affiliate_link_prefix ?? ""); } });
  }, []);

  const { data: affiliate } = useQuery({
    queryKey: ["my-aff", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("affiliates").select("*").eq("user_id", user!.id).maybeSingle()).data,
  });

  const { data: stats } = useQuery({
    queryKey: ["my-stats", affiliate?.id],
    enabled: !!affiliate?.id,
    queryFn: async () => {
      const [leads, comm] = await Promise.all([
        supabase.from("leads").select("status, created_at, payment_amount").eq("affiliate_id", affiliate!.id),
        supabase.from("commissions").select("status, commission_value").eq("affiliate_id", affiliate!.id),
      ]);
      const L = leads.data ?? [];
      const C = comm.data ?? [];
      const by = (s: string) => L.filter((l) => l.status === s).length;
      const sumC = (s: string) => C.filter((c) => c.status === s).reduce((a, c) => a + Number(c.commission_value), 0);

      const days = Array.from({ length: 30 }).map((_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (29 - i));
        const k = d.toISOString().slice(0, 10);
        return { date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), leads: L.filter((l) => l.created_at.slice(0, 10) === k).length };
      });

      return {
        total: L.length, initiated: by("initiated_conversation"), trial: by("generated_trial"),
        gpay: by("generated_payment"), paid: by("paid"), notpaid: by("not_paid"),
        commPending: sumC("pending") + sumC("released"), commPaid: sumC("paid"), days,
      };
    },
  });

  if (!affiliate) {
    return (
      <DashboardLayout variant="affiliate">
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <h2 className="font-display text-xl font-bold mb-2">Conta não vinculada</h2>
          <p className="text-muted-foreground text-sm">Sua conta ainda não está vinculada a um perfil de afiliado. Contate o admin FIRE.</p>
        </div>
      </DashboardLayout>
    );
  }

  const link = `${domain}/${prefix}${affiliate.slug}`;
  const fullLink = `https://${link}`;
  const copy = () => { navigator.clipboard.writeText(fullLink); toast.success("Link copiado!"); };
  const share = async () => {
    if (navigator.share) await navigator.share({ title: "Meu link FIRE", url: fullLink });
    else copy();
  };

  return (
    <DashboardLayout variant="affiliate">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Olá, <span className="text-gradient-fire">{affiliate.full_name.split(" ")[0]}</span> 🔥</h1>
        <p className="text-muted-foreground text-sm mt-1">Sua máquina de vendas, em tempo real.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-card-premium">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Seu link exclusivo</div>
          <div className="font-mono text-base md:text-lg text-primary break-all mb-4">{fullLink}</div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={copy} className="bg-gradient-fire shadow-fire text-white"><Copy className="h-4 w-4 mr-1" /> Copiar link</Button>
            <Button onClick={share} variant="outline" className="border-primary/40 text-primary hover:bg-primary/10"><Share2 className="h-4 w-4 mr-1" /> Compartilhar</Button>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card-premium flex flex-col items-center">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">QR Code</div>
          <div className="bg-white p-3 rounded-xl">
            <QRCodeSVG value={fullLink} size={120} fgColor="#050505" />
          </div>
        </div>
      </div>

      {stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <StatCard label="Comissão pendente" value={formatBRL(stats.commPending)} icon={Clock} accent="warning" />
            <StatCard label="Comissão paga" value={formatBRL(stats.commPaid)} icon={Banknote} accent="success" />
            <StatCard label="Total leads" value={formatNumber(stats.total)} icon={Target} accent="fire" />
            <StatCard label="Pagaram" value={formatNumber(stats.paid)} icon={CheckCircle} accent="success" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Iniciaram" value={formatNumber(stats.initiated)} icon={MessageCircle} accent="neon" />
            <StatCard label="Geraram teste" value={formatNumber(stats.trial)} icon={Beaker} accent="gold" />
            <StatCard label="Geraram pgto" value={formatNumber(stats.gpay)} icon={FileText} accent="warning" />
            <StatCard label="Não pagaram" value={formatNumber(stats.notpaid)} icon={XCircle} accent="fire" />
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-card-premium">
              <h3 className="font-display font-semibold mb-4">Desempenho — últimos 30 dias</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={stats.days}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0 0)" />
                  <XAxis dataKey="date" stroke="oklch(0.6 0 0)" fontSize={11} />
                  <YAxis stroke="oklch(0.6 0 0)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "oklch(0.16 0 0)", border: "1px solid oklch(0.25 0 0)", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="leads" stroke="#FF5A00" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <TopAffiliatesRanking currentAffiliateId={affiliate.id} />
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
