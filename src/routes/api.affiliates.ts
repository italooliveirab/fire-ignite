// GET /api/affiliates — lista afiliados ativos (para o bot saber quais slugs existem)
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { apiCors, checkApiKey, jsonRes, unauthorized, optionsRes } from "@/lib/api-auth";

export const Route = createFileRoute("/api/affiliates")({
  server: {
    handlers: {
      OPTIONS: async () => optionsRes(),
      GET: async ({ request }) => {
        try {
          if (!(await checkApiKey(request))) return unauthorized();
          const url = new URL(request.url);
          const status = url.searchParams.get("status") ?? "active";
          const limit = Math.min(Number(url.searchParams.get("limit") ?? 200), 500);
          let q = supabaseAdmin.from("affiliates")
            .select("id, full_name, username, email, phone, slug, referral_code, status, created_at")
            .order("created_at", { ascending: false })
            .limit(limit);
          if (status !== "all") q = q.eq("status", status as "active" | "paused" | "blocked");
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