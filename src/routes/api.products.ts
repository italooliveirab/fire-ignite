// GET /api/products — produtos ativos
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { apiCors, checkApiKey, jsonRes, unauthorized, optionsRes } from "@/lib/api-auth";

export const Route = createFileRoute("/api/products")({
  server: {
    handlers: {
      OPTIONS: async () => optionsRes(),
      GET: async ({ request }) => {
        try {
          if (!(await checkApiKey(request))) return unauthorized();
          const url = new URL(request.url);
          const includeInactive = url.searchParams.get("all") === "true";
          let q = supabaseAdmin.from("products").select("id, name, slug, description, product_type, is_active, media_kit_url, created_at").order("created_at", { ascending: false });
          if (!includeInactive) q = q.eq("is_active", true);
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