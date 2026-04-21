// GET /api/leads — listar/filtrar leads
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { apiCors, checkApiKey, jsonRes, unauthorized, optionsRes } from "@/lib/api-auth";

export const Route = createFileRoute("/api/leads")({
  server: {
    handlers: {
      OPTIONS: async () => optionsRes(),
      GET: async ({ request }) => {
        try {
          if (!(await checkApiKey(request))) return unauthorized();
          const url = new URL(request.url);
          const status = url.searchParams.get("status");
          const affiliateSlug = url.searchParams.get("affiliate_slug");
          const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500);
          const since = url.searchParams.get("since"); // ISO date

          let q = supabaseAdmin.from("leads")
            .select("id, customer_name, whatsapp_number, whatsapp_id, status, payment_amount, conversation_started_at, trial_generated_at, payment_generated_at, paid_at, created_at, updated_at, affiliate_id, product_id, affiliates(full_name, slug), products(name, slug)")
            .order("created_at", { ascending: false }).limit(limit);
          if (status) q = q.eq("status", status as never);
          if (since) q = q.gte("created_at", since);
          if (affiliateSlug) {
            const { data: aff } = await supabaseAdmin.from("affiliates").select("id").eq("slug", affiliateSlug).maybeSingle();
            if (!aff) return jsonRes({ success: true, count: 0, data: [] });
            q = q.eq("affiliate_id", aff.id);
          }
          const { data, error } = await q;
          if (error) throw error;
          return jsonRes({ success: true, count: data?.length ?? 0, data });
        } catch (e) {
          return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: apiCors });
        }
      },
    },
  },
});