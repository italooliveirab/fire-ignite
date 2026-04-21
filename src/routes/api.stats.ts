// GET /api/stats — estatísticas gerais (afiliado opcional)
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { apiCors, checkApiKey, jsonRes, unauthorized, optionsRes } from "@/lib/api-auth";

export const Route = createFileRoute("/api/stats")({
  server: {
    handlers: {
      OPTIONS: async () => optionsRes(),
      GET: async ({ request }) => {
        try {
          if (!(await checkApiKey(request))) return unauthorized();
          const url = new URL(request.url);
          const affiliateSlug = url.searchParams.get("affiliate_slug");
          const since = url.searchParams.get("since");

          let affiliateId: string | null = null;
          if (affiliateSlug) {
            const { data: aff } = await supabaseAdmin.from("affiliates").select("id").eq("slug", affiliateSlug).maybeSingle();
            if (!aff) return jsonRes({ error: "Affiliate not found" }, 404);
            affiliateId = aff.id;
          }

          const baseLeads = () => {
            let q = supabaseAdmin.from("leads").select("id, status, payment_amount", { count: "exact" });
            if (affiliateId) q = q.eq("affiliate_id", affiliateId);
            if (since) q = q.gte("created_at", since);
            return q;
          };

          const { data: leads, count: totalLeads } = await baseLeads();
          const paidLeads = leads?.filter((l) => l.status === "paid") ?? [];
          const revenue = paidLeads.reduce((s, l) => s + Number(l.payment_amount ?? 0), 0);

          const byStatus: Record<string, number> = {};
          (leads ?? []).forEach((l) => { byStatus[l.status] = (byStatus[l.status] ?? 0) + 1; });

          let commissionsTotal = 0;
          let commissionsPaid = 0;
          {
            let q = supabaseAdmin.from("commissions").select("commission_value, status");
            if (affiliateId) q = q.eq("affiliate_id", affiliateId);
            const { data: comms } = await q;
            (comms ?? []).forEach((c) => {
              commissionsTotal += Number(c.commission_value);
              if (c.status === "paid") commissionsPaid += Number(c.commission_value);
            });
          }

          return jsonRes({
            success: true,
            data: {
              affiliate_slug: affiliateSlug ?? null,
              since: since ?? null,
              total_leads: totalLeads ?? 0,
              paid_leads: paidLeads.length,
              conversion_rate: totalLeads ? Number((paidLeads.length / totalLeads * 100).toFixed(2)) : 0,
              revenue: Number(revenue.toFixed(2)),
              by_status: byStatus,
              commissions: { total: Number(commissionsTotal.toFixed(2)), paid: Number(commissionsPaid.toFixed(2)) },
            },
          });
        } catch (e) {
          return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: apiCors });
        }
      },
    },
  },
});