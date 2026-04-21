// Hook para registrar/desregistrar Web Push no navegador.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = typeof window !== "undefined" ? window.atob(b64) : "";
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function authedFetch(path: string, init?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = new Headers(init?.headers);
  if (session?.access_token) headers.set("Authorization", `Bearer ${session.access_token}`);
  if (init?.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(path, { ...init, headers });
}

export function useWebPush() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

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
        const res = await fetch("/api/push/vapid-key", { headers: { Accept: "application/json" } });
        const json = await res.json().catch(() => ({}));
        publicKey = json.publicKey || "";
        if (!res.ok || !publicKey) throw new Error(json.error || `HTTP ${res.status}`);
      } catch (e) {
        console.error("[push] getVapidPublicKey falhou", e);
        toast.error("Servidor de notificações indisponível", {
          description: "Não foi possível obter a chave VAPID. Verifique se o app foi republicado.",
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
      const saveRes = await authedFetch("/api/push/subscribe", {
        method: "POST",
        body: JSON.stringify({
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
          user_agent: navigator.userAgent.slice(0, 500),
        }),
      });
      const saveJson = await saveRes.json().catch(() => ({}));
      if (!saveRes.ok) {
        console.error("[push] save failed", saveRes.status, saveJson);
        throw new Error(saveJson.detail || saveJson.error || `HTTP ${saveRes.status}`);
      }
      console.log("[push] subscription salva no servidor", saveJson);
      setSubscribed(true);
      toast.success("Notificações ativadas neste dispositivo!");
    } catch (e) {
      console.error("[push] enable falhou", e);
      toast.error("Falha ao ativar notificações", { description: (e as Error).message });
    } finally { setBusy(false); }
  }, [supported]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await authedFetch("/api/push/unsubscribe", {
          method: "POST",
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      toast.success("Notificações desativadas neste dispositivo");
    } catch (e) {
      toast.error("Falha ao desativar", { description: (e as Error).message });
    } finally { setBusy(false); }
  }, []);

  const test = useCallback(async () => {
    if (!subscribed) {
      toast.error("Ative as notificações neste dispositivo primeiro", {
        description: "Clique em 'Ativar neste dispositivo' antes de testar.",
      });
      return;
    }
    setBusy(true);
    try {
      const res = await authedFetch("/api/push/test", { method: "POST", body: "{}" });
      const r = await res.json().catch(() => ({ sent: 0, failed: 0 }));
      if (r.sent > 0) toast.success(`Teste enviado para ${r.sent} dispositivo(s)`);
      else toast.error("Nenhum dispositivo recebeu", {
        description: r.detail || "Tente desativar e ativar de novo neste celular. Em iPhone, é preciso 'Adicionar à Tela de Início' primeiro.",
      });
    } catch (e) {
      toast.error("Falha no teste", { description: (e as Error).message });
    } finally { setBusy(false); }
  }, [subscribed]);

  return { supported, permission, subscribed, busy, enable, disable, test };
}
