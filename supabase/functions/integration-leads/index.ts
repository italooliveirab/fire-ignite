// FIRE Integration API — público com X-API-Key
// Endpoint: POST/GET /api/integration/leads
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-api-key, content-type, apikey",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function sha256(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function checkApiKey(req: Request): Promise<boolean> {
  const key = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!key) return false;
  const hash = await sha256(key);
  const { data } = await supabase.from("api_keys").select("id").eq("key_hash", hash).maybeSingle();
  if (!data) return false;
  await supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  return true;
}

async function findAffiliate(payload: Record<string, unknown>) {
  if (payload.affiliate_id) {
    const { data } = await supabase.from("affiliates").select("*").eq("id", payload.affiliate_id as string).maybeSingle();
    if (data) return data;
  }
  if (payload.affiliate_slug) {
    const { data } = await supabase.from("affiliates").select("*").eq("slug", payload.affiliate_slug as string).maybeSingle();
    if (data) return data;
  }
  return null;
}

function calcCommission(affiliate: { commission_type: string; commission_value: number }, amount: number) {
  if (affiliate.commission_type === "percentage") return Number(((amount * Number(affiliate.commission_value)) / 100).toFixed(2));
  return Number(affiliate.commission_value);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const url = new URL(req.url);

  try {
    const ok = await checkApiKey(req);
    if (!ok) return new Response(JSON.stringify({ error: "Unauthorized: invalid X-API-Key" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

    if (req.method === "GET") {
      const { data } = await supabase.from("leads").select("*, affiliates(full_name, slug)").order("created_at", { ascending: false }).limit(100);
      return new Response(JSON.stringify({ data }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const affiliate = await findAffiliate(body);
      if (!affiliate) return new Response(JSON.stringify({ error: "Affiliate not found" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });

      const status = body.status ?? "initiated_conversation";
      const validStatuses = ["initiated_conversation", "generated_trial", "generated_payment", "paid", "not_paid"];
      if (!validStatuses.includes(status)) return new Response(JSON.stringify({ error: "Invalid status" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

      // Upsert por whatsapp_id + affiliate
      let leadId: string | null = null;
      if (body.whatsapp_id) {
        const { data: existing } = await supabase.from("leads").select("id").eq("affiliate_id", affiliate.id).eq("whatsapp_id", body.whatsapp_id).maybeSingle();
        if (existing) leadId = existing.id;
      }

      const payload: Record<string, unknown> = {
        affiliate_id: affiliate.id,
        customer_name: body.customer_name ?? null,
        whatsapp_number: body.whatsapp_number ?? null,
        whatsapp_id: body.whatsapp_id ?? null,
        status,
        payment_amount: body.payment_amount ?? null,
        conversation_started_at: body.conversation_started_at ?? null,
        trial_generated_at: body.trial_generated_at ?? null,
        payment_generated_at: body.payment_generated_at ?? null,
        paid_at: body.paid_at ?? (status === "paid" ? new Date().toISOString() : null),
      };

      let lead;
      if (leadId) {
        const { data, error } = await supabase.from("leads").update(payload).eq("id", leadId).select().single();
        if (error) throw error;
        lead = data;
      } else {
        const { data, error } = await supabase.from("leads").insert(payload).select().single();
        if (error) throw error;
        lead = data;
      }

      // Cria comissão automaticamente quando virar PAID
      if (status === "paid" && lead.payment_amount) {
        const { data: existingComm } = await supabase.from("commissions").select("id").eq("lead_id", lead.id).maybeSingle();
        if (!existingComm) {
          const value = calcCommission(affiliate, Number(lead.payment_amount));
          await supabase.from("commissions").insert({
            affiliate_id: affiliate.id, lead_id: lead.id,
            commission_type: affiliate.commission_type, commission_value: value, status: "pending",
          });
        }
      }

      return new Response(JSON.stringify({ success: true, lead }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
    }

    return new Response("Method not allowed", { status: 405, headers: cors });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
