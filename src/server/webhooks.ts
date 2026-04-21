// Server-only webhook dispatcher with HMAC-SHA256 signing.
// Sends signed POST requests to all active webhooks subscribed to a given event.
// Logs every attempt to webhook_deliveries; retries up to 3x with exponential backoff
// inline (best-effort, fire-and-forget from the caller's perspective).
import crypto from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type WebhookEvent =
  | "lead.paid"
  | "lead.created"
  | "lead.status_changed"
  | "commission.created";

const MAX_ATTEMPTS = 3;
const TIMEOUT_MS = 10_000;

function sign(secret: string, body: string, timestamp: string) {
  return crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
}

async function deliverOne(opts: {
  webhook: { id: string; url: string; secret: string };
  event: WebhookEvent;
  payload: Record<string, unknown>;
}) {
  const { webhook, event, payload } = opts;
  const body = JSON.stringify({ event, sent_at: new Date().toISOString(), data: payload });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = sign(webhook.secret, body, timestamp);

  const { data: delivery } = await supabaseAdmin
    .from("webhook_deliveries")
    .insert({ webhook_id: webhook.id, event, payload: { event, data: payload } as never, status: "pending" })
    .select("id")
    .single();

  let lastErr: string | null = null;
  let lastStatus: number | null = null;
  let lastResp: string | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      const res = await fetch(webhook.url, {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "FIRE-Webhooks/1.0",
          "X-Fire-Event": event,
          "X-Fire-Timestamp": timestamp,
          "X-Fire-Signature": `sha256=${signature}`,
          "X-Fire-Delivery-Id": delivery?.id ?? "",
        },
        body,
      });
      clearTimeout(t);
      lastStatus = res.status;
      lastResp = (await res.text().catch(() => "")).slice(0, 2000);
      if (res.ok) {
        if (delivery?.id) {
          await supabaseAdmin
            .from("webhook_deliveries")
            .update({
              status: "delivered",
              http_status: lastStatus,
              response_body: lastResp,
              attempts: attempt,
              delivered_at: new Date().toISOString(),
            } as never)
            .eq("id", delivery.id);
        }
        return { ok: true };
      }
      lastErr = `HTTP ${res.status}`;
    } catch (e) {
      lastErr = (e as Error).message ?? "fetch failed";
    }
    // backoff: 500ms, 2s
    if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, attempt === 1 ? 500 : 2000));
  }

  if (delivery?.id) {
    await supabaseAdmin
      .from("webhook_deliveries")
      .update({
        status: "failed",
        http_status: lastStatus,
        response_body: lastResp,
        error: lastErr,
        attempts: MAX_ATTEMPTS,
      } as never)
      .eq("id", delivery.id);
  }
  return { ok: false, error: lastErr };
}

export async function dispatchWebhook(event: WebhookEvent, payload: Record<string, unknown>) {
  try {
    const { data: webhooks } = await supabaseAdmin
      .from("webhooks")
      .select("id, url, secret, events")
      .eq("is_active", true);
    if (!webhooks?.length) return;
    const targets = webhooks.filter((w) => (w.events as string[] | null)?.includes(event));
    await Promise.all(
      targets.map((w) =>
        deliverOne({ webhook: { id: w.id, url: w.url, secret: w.secret }, event, payload }).catch(
          (e) => console.error("[webhook] delivery error", e),
        ),
      ),
    );
  } catch (e) {
    console.error("[webhook] dispatch failed:", e);
  }
}

export function generateWebhookSecret() {
  return "whsec_" + crypto.randomBytes(24).toString("hex");
}