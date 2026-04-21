// POST /api/push/subscribe — salva subscription do usuário autenticado.
// Usa Bearer token do Supabase para validar o user, depois insere via admin client.
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
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      console.warn("[push.subscribe] token inválido", error?.message);
      return null;
    }
    return data.user.id;
  } catch (e) {
    console.warn("[push.subscribe] getUser exception", (e as Error).message);
    return null;
  }
}

export const Route = createFileRoute("/api/push/subscribe")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        try {
          const userId = await getUserIdFromToken(request);
          if (!userId) {
            return new Response(JSON.stringify({ error: "unauthorized", detail: "missing or invalid Bearer token" }), { status: 401, headers: cors });
          }
          const body = await request.json().catch(() => null) as null | {
            endpoint?: string; p256dh?: string; auth?: string; user_agent?: string;
          };
          if (!body?.endpoint || !body?.p256dh || !body?.auth) {
            return new Response(JSON.stringify({ error: "invalid_payload", detail: "endpoint, p256dh, auth are required" }), { status: 400, headers: cors });
          }
          const row = {
            user_id: userId,
            endpoint: body.endpoint,
            p256dh: body.p256dh,
            auth: body.auth,
            user_agent: body.user_agent ?? null,
            last_used_at: new Date().toISOString(),
          };
          const { error } = await supabaseAdmin
            .from("push_subscriptions")
            .upsert(row, { onConflict: "endpoint" });
          if (error) {
            console.error("[push.subscribe] upsert error", error);
            return new Response(JSON.stringify({ error: "db_error", detail: error.message }), { status: 500, headers: cors });
          }
          console.log("[push.subscribe] saved", { userId, endpoint: body.endpoint.slice(0, 80) });
          return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors });
        } catch (e) {
          console.error("[push.subscribe] exception", e);
          return new Response(JSON.stringify({ error: "server_error", detail: (e as Error).message }), { status: 500, headers: cors });
        }
      },
    },
  },
});
