// POST /api/webhooks/test — admin-only: dispatches a sample lead.paid event to a webhook
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { dispatchWebhook } from "@/server/webhooks";
import { apiCors, optionsRes, jsonRes } from "@/lib/api-auth";

export const Route = createFileRoute("/api/webhooks/test")({
  server: {
    handlers: {
      OPTIONS: async () => optionsRes(),
      POST: async ({ request }) => {
        try {
          const auth = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
          if (!auth) return jsonRes({ error: "Missing authorization" }, 401);
          const { data: u } = await supabaseAdmin.auth.getUser(auth);
          if (!u?.user) return jsonRes({ error: "Unauthorized" }, 401);
          const { data: isAdmin } = await supabaseAdmin.rpc("is_admin", { _user_id: u.user.id });
          if (!isAdmin) return jsonRes({ error: "Forbidden" }, 403);

          const { webhook_id } = (await request.json()) as { webhook_id?: string };
          if (!webhook_id) return jsonRes({ error: "webhook_id required" }, 400);

          // Temporarily filter dispatch by sending only to this webhook
          const { data: wh } = await supabaseAdmin
            .from("webhooks")
            .select("id, url, secret, events, is_active")
            .eq("id", webhook_id)
            .maybeSingle();
          if (!wh) return jsonRes({ error: "Webhook not found" }, 404);

          // Force dispatch even if event not subscribed (for testing)
          await supabaseAdmin
            .from("webhooks")
            .update({ events: Array.from(new Set([...(wh.events as string[]), "lead.paid"])) } as never)
            .eq("id", wh.id);

          await dispatchWebhook("lead.paid", {
            lead_id: "00000000-test-0000-0000-000000000000",
            whatsapp_id: "5511999999999@c.us",
            whatsapp_number: "+5511999999999",
            customer_name: "Cliente Teste",
            payment_amount: 197,
            paid_at: new Date().toISOString(),
            affiliate: { id: "test", slug: "test-affiliate", full_name: "Afiliado Teste", email: "test@test.com" },
            product: { name: "Produto Teste", slug: "produto-teste" },
            commission: { value: 49.25, type: "percentage" },
            _test: true,
          });

          return new Response(JSON.stringify({ success: true }), { status: 200, headers: apiCors });
        } catch (e) {
          return jsonRes({ error: (e as Error).message }, 500);
        }
      },
    },
  },
});