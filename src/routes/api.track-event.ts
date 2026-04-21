// Public endpoint para o bot do WhatsApp atualizar leads automaticamente
// POST /api/track-event
// Headers: x-api-key: <chave>
// Body: { whatsapp_id, event, customer_name?, whatsapp_number?, payment_amount?, affiliate_slug?, product_slug? }
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import crypto from "crypto";
import { notifyAdminLeadPaid, notifyAffiliateLeadPaid } from "@/server/lead-notifications";
import { dispatchWebhook } from "@/server/webhooks";

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
  support_received: "support_received",
  renewed: "renewed",
  lost: "lost",
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

          const { data: updated, error: updErr } = await supabaseAdmin.from("leads").update(update as never).eq("id", lead.id).select().single();
          if (updErr) throw updErr;

          // Dispara email para admin quando lead vira "paid" (apenas na transição)
          if (newStatus === "paid" && lead.status !== "paid") {
            try {
              const [{ data: aff }, { data: prod }, { data: settings }] = await Promise.all([
                supabaseAdmin.from("affiliates").select("full_name,email").eq("id", updated.affiliate_id).maybeSingle(),
                updated.product_id
                  ? supabaseAdmin.from("products").select("name").eq("id", updated.product_id).maybeSingle()
                  : Promise.resolve({ data: null }),
                supabaseAdmin.from("settings").select("admin_notification_email").limit(1).maybeSingle(),
              ]);
              const productName = (prod as { name?: string } | null)?.name ?? null;
              await notifyAdminLeadPaid({
                customer_name: updated.customer_name,
                whatsapp_number: updated.whatsapp_number,
                affiliate_name: aff?.full_name ?? null,
                product_name: productName,
                amount: updated.payment_amount,
                admin_email: (settings as { admin_notification_email?: string | null } | null)?.admin_notification_email ?? null,
              });

              // Busca a comissão gerada para este lead (trigger cria automaticamente)
              if (aff?.email) {
                const { data: commission } = await supabaseAdmin
                  .from("commissions")
                  .select("commission_value")
                  .eq("lead_id", updated.id)
                  .eq("affiliate_id", updated.affiliate_id)
                  .maybeSingle();
                await notifyAffiliateLeadPaid({
                  affiliate_email: aff.email,
                  affiliate_name: aff.full_name,
                  customer_name: updated.customer_name,
                  product_name: productName,
                  payment_amount: updated.payment_amount,
                  commission_amount: commission?.commission_value ?? null,
                });
              }
            } catch (notifyErr) {
              console.error("notify admin paid failed:", notifyErr);
            }

            // Dispara webhooks de saída (HMAC-signed) para integrações externas
            try {
              const { data: aff2 } = await supabaseAdmin
                .from("affiliates")
                .select("full_name, slug, email")
                .eq("id", updated.affiliate_id)
                .maybeSingle();
              const { data: prod2 } = updated.product_id
                ? await supabaseAdmin.from("products").select("name, slug").eq("id", updated.product_id).maybeSingle()
                : { data: null };
              const { data: commission } = await supabaseAdmin
                .from("commissions")
                .select("commission_value, commission_type")
                .eq("lead_id", updated.id)
                .maybeSingle();
              await dispatchWebhook("lead.paid", {
                lead_id: updated.id,
                whatsapp_id: updated.whatsapp_id,
                whatsapp_number: updated.whatsapp_number,
                customer_name: updated.customer_name,
                payment_amount: Number(updated.payment_amount ?? 0),
                paid_at: updated.paid_at,
                affiliate: aff2
                  ? { id: updated.affiliate_id, slug: aff2.slug, full_name: aff2.full_name, email: aff2.email }
                  : null,
                product: prod2 ? { name: (prod2 as { name?: string }).name, slug: (prod2 as { slug?: string }).slug } : null,
                commission: commission
                  ? {
                      value: Number((commission as { commission_value: number }).commission_value),
                      type: (commission as { commission_type: string }).commission_type,
                    }
                  : null,
              });
            } catch (whErr) {
              console.error("webhook dispatch failed:", whErr);
            }
          }

          return new Response(JSON.stringify({ success: true, lead: updated }), { status: 200, headers: cors });
        } catch (e) {
          console.error("track-event error:", e);
          return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: cors });
        }
      },
    },
  },
});