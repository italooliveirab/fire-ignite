// Hook para registrar/desregistrar Web Push no navegador.
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getVapidPublicKey, subscribePushFn, unsubscribePushFn, sendTestPushFn } from "@/server/push";
import { toast } from "sonner";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = typeof window !== "undefined" ? window.atob(b64) : "";
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function useWebPush() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const getKey = useServerFn(getVapidPublicKey);
  const subscribe = useServerFn(subscribePushFn);
  const unsubscribe = useServerFn(unsubscribePushFn);
  const sendTest = useServerFn(sendTestPushFn);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(ok);
    if (!ok) return;
    setPermission(Notification.permission);
    navigator.serviceWorker.getRegistration("/sw.js").then(async (reg) => {
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    });
  }, []);

  const enable = useCallback(async () => {
    if (!supported) { toast.error("Seu navegador não suporta notificações push"); return; }
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        toast.error("Permissão de notificação negada", {
          description: "Clique no cadeado 🔒 ao lado da URL → Notificações → Permitir → recarregue.",
          duration: 8000,
        });
        return;
      }
      let publicKey = "";
      try {
        const r = await getKey();
        publicKey = r.publicKey;
      } catch (e) {
        console.error("[push] getVapidPublicKey falhou", e);
        toast.error("Servidor de notificações indisponível", {
          description: "O build publicado parece desatualizado. Republique o app para corrigir.",
          duration: 10000,
        });
        return;
      }
      if (!publicKey) {
        toast.error("Chaves VAPID não configuradas no servidor");
        return;
      }
      // Reaproveita subscription existente (evita InvalidStateError se já existir com outra key)
      let sub = await reg.pushManager.getSubscription();
      if (sub) {
        try { await sub.unsubscribe(); } catch { /* noop */ }
      }
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      console.log("[push] subscription criada", json.endpoint);
      await subscribe({ data: {
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        user_agent: navigator.userAgent.slice(0, 500),
      }});
      console.log("[push] subscription salva no servidor");
      setSubscribed(true);
      toast.success("Notificações ativadas neste dispositivo!");
    } catch (e) {
      console.error("[push] enable falhou", e);
      toast.error("Falha ao ativar notificações", { description: (e as Error).message });
    } finally { setBusy(false); }
  }, [supported, getKey, subscribe]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await unsubscribe({ data: { endpoint: sub.endpoint } });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      toast.success("Notificações desativadas neste dispositivo");
    } catch (e) {
      toast.error("Falha ao desativar", { description: (e as Error).message });
    } finally { setBusy(false); }
  }, [unsubscribe]);

  const test = useCallback(async () => {
    if (!subscribed) {
      toast.error("Ative as notificações neste dispositivo primeiro", {
        description: "Clique em 'Ativar neste dispositivo' antes de testar.",
      });
      return;
    }
    setBusy(true);
    try {
      const r = await sendTest({});
      if (r.sent > 0) toast.success(`Teste enviado para ${r.sent} dispositivo(s)`);
      else toast.error("Nenhum dispositivo recebeu", {
        description: "Tente desativar e ativar de novo neste celular. Em iPhone, é preciso 'Adicionar à Tela de Início' primeiro.",
      });
    } catch (e) {
      toast.error("Falha no teste", { description: (e as Error).message });
    } finally { setBusy(false); }
  }, [sendTest, subscribed]);

  return { supported, permission, subscribed, busy, enable, disable, test };
}
