// Public endpoint para o bot do WhatsApp atualizar leads automaticamente
// POST /api/track-event
// Headers: x-api-key: <chave>
// Body: { whatsapp_id, event, customer_name?, whatsapp_number?, payment_amount?, affiliate_slug?, product_slug? }
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import crypto from "crypto";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key, authorization",
  "Content-Type": "application/json",
};

const EVENT_TO_STATUS: Record<string, string> = {
  conversation_started: "initiated_conversation",
  trial_requested: "generated_trial",
  payment_generated: "generated_payment",
  paid: "paid",
  not_paid: "not_paid",
  abandoned: "not_paid",
};

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

async function checkApiKey(req: Request): Promise<boolean> {
  const key = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!key) return false;
  const { data } = await supabaseAdmin.from("api_keys").select("id").eq("key_hash", sha256(key)).maybeSingle();
  if (!data) return false;
  await supabaseAdmin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  return true;
}

export const Route = createFileRoute("/api/track-event")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        try {
          if (!(await checkApiKey(request))) {
            return new Response(JSON.stringify({ error: "Unauthorized: invalid x-api-key" }), { status: 401, headers: cors });
          }
          const body = await request.json();
          const { whatsapp_id, event, affiliate_slug, product_slug } = body ?? {};
          if (!whatsapp_id || !event) {
            return new Response(JSON.stringify({ error: "whatsapp_id and event are required" }), { status: 400, headers: cors });
          }
          const newStatus = EVENT_TO_STATUS[event];
          if (!newStatus) {
            return new Response(JSON.stringify({ error: `Unknown event: ${event}. Use: ${Object.keys(EVENT_TO_STATUS).join(", ")}` }), { status: 400, headers: cors });
          }

          // Localiza o lead pelo whatsapp_id
          let { data: lead } = await supabaseAdmin.from("leads").select("*").eq("whatsapp_id", whatsapp_id).order("created_at", { ascending: false }).limit(1).maybeSingle();

          // Se não existe e veio o slug do afiliado, cria o lead
          if (!lead) {
            if (!affiliate_slug) {
              return new Response(JSON.stringify({ error: "Lead not found and affiliate_slug not provided to create one" }), { status: 404, headers: cors });
            }
            const { data: aff } = await supabaseAdmin.from("affiliates").select("id").eq("slug", affiliate_slug).maybeSingle();
            if (!aff) return new Response(JSON.stringify({ error: "Affiliate not found" }), { status: 404, headers: cors });
            let product_id: string | null = null;
            if (product_slug) {
              const { data: prod } = await supabaseAdmin.from("products").select("id").eq("slug", product_slug).maybeSingle();
              product_id = prod?.id ?? null;
            }
            const { data: created, error: insErr } = await supabaseAdmin.from("leads").insert({
              affiliate_id: aff.id,
              product_id,
              whatsapp_id,
              whatsapp_number: body.whatsapp_number ?? null,
              customer_name: body.customer_name ?? null,
              status: "initiated_conversation",
              conversation_started_at: new Date().toISOString(),
            }).select().single();
            if (insErr) throw insErr;
            lead = created;
          }

          // Atualiza o lead
          const now = new Date().toISOString();
          const update: Record<string, unknown> = { status: newStatus, updated_at: now };
          if (body.customer_name) update.customer_name = body.customer_name;
          if (body.whatsapp_number) update.whatsapp_number = body.whatsapp_number;
          if (body.payment_amount != null) update.payment_amount = body.payment_amount;
          if (event === "conversation_started" && !lead.conversation_started_at) update.conversation_started_at = now;
          if (event === "trial_requested") update.trial_generated_at = now;
          if (event === "payment_generated") update.payment_generated_at = now;
          if (event === "paid") update.paid_at = now;

          const { data: updated, error: updErr } = await supabaseAdmin.from("leads").update(update).eq("id", lead.id).select().single();
          if (updErr) throw updErr;

          return new Response(JSON.stringify({ success: true, lead: updated }), { status: 200, headers: cors });
        } catch (e) {
          console.error("track-event error:", e);
          return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: cors });
        }
      },
    },
  },
});