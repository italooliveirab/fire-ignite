// POST /api/push/unsubscribe — remove subscription do usuário autenticado.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, authorization, apikey",
  "Content-Type": "application/json",
};

async function getUserIdFromToken(req: Request): Promise<string | null> {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

export const Route = createFileRoute("/api/push/unsubscribe")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        try {
          const userId = await getUserIdFromToken(request);
          if (!userId) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: cors });
          const body = await request.json().catch(() => null) as null | { endpoint?: string };
          if (!body?.endpoint) return new Response(JSON.stringify({ error: "invalid_payload" }), { status: 400, headers: cors });
          await supabaseAdmin.from("push_subscriptions").delete().eq("user_id", userId).eq("endpoint", body.endpoint);
          return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors });
        } catch (e) {
          return new Response(JSON.stringify({ error: "server_error", detail: (e as Error).message }), { status: 500, headers: cors });
        }
      },
    },
  },
});
