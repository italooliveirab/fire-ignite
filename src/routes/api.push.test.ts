// POST /api/push/test — envia notificação de teste para o usuário autenticado.
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

export const Route = createFileRoute("/api/push/test")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        try {
          const userId = await getUserIdFromToken(request);
          if (!userId) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: cors });

          const { sendPushToUsers } = await import("@/server/push.server");
          const result = await sendPushToUsers([userId], {
            title: "🔥 FIRE — Teste",
            body: "Notificações funcionando no seu dispositivo!",
            tag: "test",
            url: "/app",
          });
          return new Response(JSON.stringify(result), { status: 200, headers: cors });
        } catch (e) {
          console.error("[push.test] exception", e);
          return new Response(JSON.stringify({ error: "server_error", detail: (e as Error).message, sent: 0, failed: 0 }), { status: 500, headers: cors });
        }
      },
    },
  },
});
