// Server-only push helpers. Blocked from client bundles by `.server.ts` suffix.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { buildPushPayload, type PushSubscription as WPSub, type PushMessage, type VapidKeys } from "@block65/webcrypto-web-push";

function getVapid(): VapidKeys | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@fire.com";
  if (!publicKey || !privateKey) return null;
  return { subject, publicKey, privateKey };
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  url?: string;
  requireInteraction?: boolean;
  vibrate?: number[];
  data?: Record<string, unknown>;
}

export async function savePushSubscription(input: {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string | null;
}) {
  const { error } = await supabaseAdmin.from("push_subscriptions").upsert({
    user_id: input.userId,
    endpoint: input.endpoint,
    p256dh: input.p256dh,
    auth: input.auth,
    user_agent: input.user_agent ?? null,
    last_used_at: new Date().toISOString(),
  }, { onConflict: "endpoint" });
  if (error) throw new Error(error.message);
}

export async function removePushSubscription(userId: string, endpoint: string) {
  await supabaseAdmin.from("push_subscriptions").delete()
    .eq("user_id", userId).eq("endpoint", endpoint);
}

export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
  options?: { event?: "lead_paid" | "lead_new" | "payment_generated" | "trial_generated" }
) {
  if (!userIds.length) return { sent: 0, failed: 0 };
  const vapid = getVapid();
  if (!vapid) { console.warn("[push] VAPID keys não configuradas"); return { sent: 0, failed: 0 }; }

  const { data: prefs } = await supabaseAdmin.from("notification_preferences").select("*").in("user_id", userIds);
  const allowedIds = userIds.filter((uid) => {
    const p = prefs?.find((x) => x.user_id === uid);
    if (!p) return options?.event === "lead_paid";
    if (!p.push_enabled) return false;
    if (!options?.event) return true;
    if (options.event === "lead_paid") return p.notify_lead_paid;
    if (options.event === "lead_new") return p.notify_lead_new;
    if (options.event === "payment_generated") return p.notify_payment_generated;
    if (options.event === "trial_generated") return p.notify_trial_generated;
    return true;
  });
  if (!allowedIds.length) return { sent: 0, failed: 0 };

  const { data: subs } = await supabaseAdmin.from("push_subscriptions").select("*").in("user_id", allowedIds);
  if (!subs?.length) return { sent: 0, failed: 0 };

  let sent = 0, failed = 0;
  const dead: string[] = [];
  await Promise.all(subs.map(async (s) => {
    try {
      const sub: WPSub = { endpoint: s.endpoint, expirationTime: null, keys: { p256dh: s.p256dh, auth: s.auth } };
      const message: PushMessage = { data: JSON.stringify(payload), options: { ttl: 60 * 60 * 24 } };
      const init = await buildPushPayload(message, sub, vapid);
      const res = await fetch(s.endpoint, init);
      if (res.status >= 200 && res.status < 300) {
        sent++;
      } else {
        failed++;
        if (res.status === 404 || res.status === 410) dead.push(s.endpoint);
        const txt = await res.text().catch(() => "");
        console.warn("[push] fail", res.status, txt.slice(0, 200));
      }
    } catch (e) {
      failed++;
      console.warn("[push] exception", (e as Error).message);
    }
  }));
  if (dead.length) await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", dead);
  return { sent, failed };
}