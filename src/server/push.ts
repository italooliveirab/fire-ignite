// Web Push server functions. Server-only modules (web-push, supabaseAdmin) are
// loaded dynamically inside handlers so they never enter the client bundle.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getVapidPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  const publicKey = process.env.VAPID_PUBLIC_KEY || "";
  if (!publicKey) console.warn("[push] VAPID_PUBLIC_KEY ausente no ambiente do servidor");
  return { publicKey };
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
    const { savePushSubscription } = await import("./push.server");
    await savePushSubscription({ userId: context.userId, ...data });
    return { ok: true };
  });

export const unsubscribePushFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ endpoint: z.string().url() }))
  .handler(async ({ data, context }) => {
    const { removePushSubscription } = await import("./push.server");
    await removePushSubscription(context.userId, data.endpoint);
    return { ok: true };
  });

export const sendTestPushFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { sendPushToUsers } = await import("./push.server");
    return sendPushToUsers([context.userId], {
      title: "🔥 FIRE — Teste",
      body: "Notificações funcionando no seu dispositivo!",
      tag: "test",
      url: "/app",
    });
  });
