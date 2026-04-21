// Server functions for Web Push: subscribe, unsubscribe, send.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import webpush from "web-push";
import { z } from "zod";

function configureVapid() {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@fire.com";
  if (!pub || !priv) throw new Error("VAPID keys não configuradas");
  webpush.setVapidDetails(subject, pub, priv);
}

export const getVapidPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  return { publicKey: process.env.VAPID_PUBLIC_KEY || "" };
});

export const subscribePushFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    endpoint: z.string().url().max(2000),
    p256dh: z.string().min(10).max(500),
    auth: z.string().min(10).max(500),
    user_agent: z.string().max(500).optional(),
  }))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { error } = await supabaseAdmin.from("push_subscriptions").upsert({
      user_id: userId,
      endpoint: data.endpoint,
      p256dh: data.p256dh,
      auth: data.auth,
      user_agent: data.user_agent ?? null,
      last_used_at: new Date().toISOString(),
    }, { onConflict: "endpoint" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const unsubscribePushFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ endpoint: z.string().url() }))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    await supabaseAdmin.from("push_subscriptions").delete()
      .eq("user_id", userId).eq("endpoint", data.endpoint);
    return { ok: true };
  });

export const sendTestPushFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const result = await sendPushToUsers([userId], {
      title: "🔥 FIRE — Teste",
      body: "Notificações funcionando no seu dispositivo!",
      tag: "test",
      url: "/app",
    });
    return result;
  });

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

/** Server-only: send to a list of user IDs respecting their preferences and event filter. */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
  options?: { event?: "lead_paid" | "lead_new" | "payment_generated" | "trial_generated" }
) {
  if (!userIds.length) return { sent: 0, failed: 0 };
  try { configureVapid(); } catch (e) { console.warn("[push]", (e as Error).message); return { sent: 0, failed: 0 }; }

  // Filtra usuários por preferências
  const { data: prefs } = await supabaseAdmin.from("notification_preferences").select("*").in("user_id", userIds);
  const allowedIds = userIds.filter((uid) => {
    const p = prefs?.find((x) => x.user_id === uid);
    if (!p) return options?.event === "lead_paid"; // default: só venda paga
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
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
        { TTL: 60 * 60 * 24 }
      );
      sent++;
    } catch (e) {
      const err = e as { statusCode?: number; message?: string };
      if (err.statusCode === 404 || err.statusCode === 410) dead.push(s.endpoint);
      failed++;
      console.warn("[push] fail", err.statusCode, err.message);
    }
  }));
  if (dead.length) await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", dead);
  return { sent, failed };
}
