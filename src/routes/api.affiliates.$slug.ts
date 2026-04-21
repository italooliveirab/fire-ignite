// GET /api/affiliates/:slug — detalhes + stats de um afiliado
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { apiCors, checkApiKey, jsonRes, unauthorized, optionsRes } from "@/lib/api-auth";

export const Route = createFileRoute("/api/affiliates/$slug")({
  server: {
    handlers: {
      OPTIONS: async () => optionsRes(),
      GET: async ({ request, params }) => {
        try {
          if (!(await checkApiKey(request))) return unauthorized();
          const { data: aff, error } = await supabaseAdmin.from("affiliates")
            .select("id, full_name, username, email, phone, slug, referral_code, status, created_at")
            .eq("slug", params.slug).maybeSingle();
          if (error) throw error;
          if (!aff) return jsonRes({ error: "Affiliate not found" }, 404);

          const [{ count: leadsCount }, { count: paidCount }, { data: balance }] = await Promise.all([
            supabaseAdmin.from("leads").select("id", { count: "exact", head: true }).eq("affiliate_id", aff.id),
            supabaseAdmin.from("leads").select("id", { count: "exact", head: true }).eq("affiliate_id", aff.id).eq("status", "paid"),
            supabaseAdmin.rpc("get_affiliate_balance", { _affiliate_id: aff.id }),
          ]);

          return jsonRes({
            success: true,
            data: {
              ...aff,
              stats: {
                total_leads: leadsCount ?? 0,
                paid_leads: paidCount ?? 0,
                conversion_rate: leadsCount ? Number(((paidCount ?? 0) / leadsCount * 100).toFixed(2)) : 0,
                balance: balance?.[0] ?? { available: 0, pending_request: 0, lifetime_earned: 0 },
              },
            },
          });
        } catch (e) {
          return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: apiCors });
        }
      },
    },
  },
});