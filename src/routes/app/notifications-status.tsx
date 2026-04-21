import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useWebPush } from "@/hooks/useWebPush";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertCircle, Bell, Smartphone, Globe, Send, RefreshCw, Volume2, ArrowLeft } from "lucide-react";
import { playCoinSound, unlockAudio } from "@/lib/coin-sound";
import { toast } from "sonner";

export const Route = createFileRoute("/app/notifications-status")({ component: StatusPage });

type Check = { ok: boolean | "warn"; label: string; detail?: string; fix?: string };

function StatusPage() {
  const { user } = useAuth();
  const push = useWebPush();
  const [serverSubs, setServerSubs] = useState<number | null>(null);
  const [swInfo, setSwInfo] = useState<{
    registered: boolean;
    ready: boolean;
    scope?: string;
    scriptURL?: string;
    state?: string; // installing | waiting | active
    hasController: boolean;
    updateChecked: boolean;
    error?: string;
  }>({ registered: false, ready: false, hasController: false, updateChecked: false });
  const [serverSubError, setServerSubError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [resyncing, setResyncing] = useState(false);
  const [resyncMsg, setResyncMsg] = useState<string | null>(null);
  const [vapid, setVapid] = useState<{
    status: "loading" | "ok" | "fail";
    httpStatus?: number;
    key?: string;
    length?: number;
    formatOk?: boolean;
    error?: string;
  }>({ status: "loading" });
  const [lastApiResponse, setLastApiResponse] = useState<{
    status: number;
    ok: boolean;
    error?: string;
    detail?: string;
    raw?: string;
    at: string;
  } | null>(null);

  // Detecções
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isStandalone = typeof window !== "undefined" && (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
  const isInIframe = typeof window !== "undefined" && (() => {
    try { return window.self !== window.top; } catch { return true; }
  })();
  const isSecure = typeof window !== "undefined" && (window.isSecureContext || window.location.protocol === "https:");
  const browser = /Chrome/.test(ua) && !/Edg/.test(ua) ? "Chrome" : /Edg/.test(ua) ? "Edge" : /Firefox/.test(ua) ? "Firefox" : /Safari/.test(ua) ? "Safari" : "Outro";

  useEffect(() => {
    let alive = true;
    if (typeof navigator === "undefined") return;
    (async () => {
      try {
        const reg = await navigator.serviceWorker?.getRegistration("/sw.js");
        if (!alive) return;
        if (!reg) {
          setSwInfo({ registered: false, ready: false, hasController: false, updateChecked: false });
          return;
        }
        const sw = reg.active || reg.waiting || reg.installing;
        // Tenta forçar checagem de update (não bloqueia se falhar)
        let updateChecked = false;
        try { await reg.update(); updateChecked = true; } catch { /* noop */ }
        // Aguarda ready (com timeout) para confirmar que o SW está controlando
        let ready = false;
        try {
          await Promise.race([
            navigator.serviceWorker.ready.then(() => { ready = true; }),
            new Promise((res) => setTimeout(res, 1500)),
          ]);
        } catch { /* noop */ }
        if (!alive) return;
        setSwInfo({
          registered: true,
          ready,
          scope: reg.scope,
          scriptURL: sw?.scriptURL,
          state: sw?.state,
          hasController: !!navigator.serviceWorker.controller,
          updateChecked,
        });
      } catch (e) {
        if (!alive) return;
        setSwInfo({ registered: false, ready: false, hasController: false, updateChecked: false, error: (e as Error).message });
      }
    })();
    if (user) {
      supabase.from("push_subscriptions").select("id, endpoint, created_at", { count: "exact" }).eq("user_id", user.id)
        .then(({ data, count, error }) => {
          if (!alive) return;
          if (error) {
            setServerSubError(error.message);
            setServerSubs(0);
          } else {
            setServerSubError(null);
            setServerSubs(count ?? data?.length ?? 0);
          }
        });
    }
    return () => { alive = false; };
  }, [user, refreshKey, push.subscribed]);

  const swActive = swInfo.registered && swInfo.state === "activated";

  // Validar /api/push/vapid-key (status, presença e formato base64url)
  useEffect(() => {
    let alive = true;
    setVapid({ status: "loading" });
    fetch("/api/push/vapid-key", { headers: { Accept: "application/json" } })
      .then(async (res) => {
        const raw = await res.text();
        let j: { publicKey?: string; error?: string } = {};
        try { j = JSON.parse(raw); } catch { /* não-JSON */ }
        if (!alive) return;
        const key = j.publicKey || "";
        // VAPID public key: base64url, ~87 chars, decodifica para 65 bytes (P-256 uncompressed, prefix 0x04)
        const base64urlOk = /^[A-Za-z0-9_-]+$/.test(key);
        const lengthOk = key.length >= 80 && key.length <= 100;
        const formatOk = base64urlOk && lengthOk;
        if (!res.ok || !key) {
          setVapid({
            status: "fail",
            httpStatus: res.status,
            key,
            length: key.length,
            formatOk: false,
            error: j.error || (!key ? "publicKey ausente" : `HTTP ${res.status}`),
          });
        } else {
          setVapid({
            status: formatOk ? "ok" : "fail",
            httpStatus: res.status,
            key,
            length: key.length,
            formatOk,
            error: formatOk ? undefined : "Formato inválido (esperado base64url com ~87 chars)",
          });
        }
      })
      .catch((e) => {
        if (!alive) return;
        setVapid({ status: "fail", error: (e as Error).message });
      });
    return () => { alive = false; };
  }, [refreshKey]);

  // Re-sincronizar: pega a subscription do navegador e força reenvio para o servidor.
  const resync = async () => {
    setResyncing(true); setResyncMsg(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (!sub) { setResyncMsg("Sem subscription no navegador. Toque em 'Ativar' primeiro."); return; }
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({
          endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth,
          user_agent: navigator.userAgent.slice(0, 500),
        }),
      });
      const raw = await res.text();
      let j: { error?: string; detail?: string } = {};
      try { j = JSON.parse(raw); } catch { /* corpo não-JSON */ }
      setLastApiResponse({
        status: res.status,
        ok: res.ok,
        error: j.error,
        detail: j.detail,
        raw: raw.slice(0, 1000),
        at: new Date().toLocaleTimeString(),
      });
      if (res.ok) { toast.success("Sincronizado com o servidor!"); setRefreshKey((k) => k + 1); }
      else {
        const msg = `HTTP ${res.status} — ${j.error || "erro"}${j.detail ? `: ${j.detail}` : ""}`;
        setResyncMsg(msg); toast.error("Falha ao sincronizar", { description: msg });
      }
    } catch (e) {
      const msg = (e as Error).message;
      setResyncMsg(msg);
      setLastApiResponse({ status: 0, ok: false, error: "network_error", detail: msg, at: new Date().toLocaleTimeString() });
      toast.error("Erro", { description: msg });
    } finally { setResyncing(false); }
  };

  const checks: Check[] = [
    {
      ok: isSecure,
      label: "Conexão segura (HTTPS)",
      detail: isSecure ? "OK" : "Push só funciona em HTTPS",
    },
    {
      ok: !isInIframe,
      label: "Aberto fora do editor",
      detail: isInIframe ? "Você está no preview do Lovable — abra o site publicado em uma aba normal" : "OK",
      fix: isInIframe ? "Abra https://firefly-affiliates.lovable.app diretamente no navegador" : undefined,
    },
    {
      ok: push.supported,
      label: "Navegador suporta push",
      detail: push.supported ? `OK (${browser})` : "Service Worker / PushManager indisponível",
    },
    isIOS ? {
      ok: isStandalone ? true : "warn",
      label: "Instalado na tela de início (obrigatório no iPhone)",
      detail: isStandalone ? "OK — rodando como app" : "iOS exige adicionar à Tela de Início",
      fix: !isStandalone ? "Safari → Compartilhar → Adicionar à Tela de Início → abra pelo ícone" : undefined,
    } : {
      ok: true,
      label: "Sistema operacional",
      detail: isAndroid ? "Android" : "Desktop",
    },
    {
      ok: push.permission === "granted" ? true : push.permission === "denied" ? false : "warn",
      label: "Permissão de notificação",
      detail: push.permission === "granted" ? "Concedida" : push.permission === "denied" ? "BLOQUEADA pelo navegador" : "Ainda não solicitada",
      fix: push.permission === "denied"
        ? (isAndroid || browser === "Chrome" || browser === "Edge"
            ? "Toque no cadeado 🔒 ao lado da URL → Notificações → Permitir → recarregue"
            : isIOS
              ? "Ajustes do iPhone → Notificações → encontre o app FIRE → ative 'Permitir Notificações'"
              : "Configurações do navegador → Notificações → permitir para este site → recarregue")
        : undefined,
    },
    {
      ok: swActive ? true : swInfo.registered ? "warn" : false,
      label: "Service Worker ativo",
      detail: !swInfo.registered
        ? (swInfo.error ? `Erro: ${swInfo.error}` : "Não registrado neste dispositivo")
        : `state=${swInfo.state ?? "?"} · ready=${swInfo.ready ? "sim" : "não"} · controller=${swInfo.hasController ? "sim" : "não"} · scope=${swInfo.scope ?? "?"} · script=${swInfo.scriptURL?.split("/").pop() ?? "?"}${swInfo.updateChecked ? " · update OK" : " · update falhou"}`,
      fix: !swInfo.registered
        ? "Clique em 'Ativar neste dispositivo' abaixo para registrar /sw.js"
        : !swActive
          ? `Service Worker registrado mas não ativo (state=${swInfo.state ?? "?"}). Recarregue a página; se persistir, desative e ative novamente, ou limpe os dados do site no navegador. Push NÃO funcionará enquanto o SW não estiver 'activated'.`
          : !swInfo.hasController
            ? "SW ativo mas ainda não controla a página — recarregue uma vez para que o controller assuma."
            : undefined,
    },
    {
      ok: vapid.status === "loading" ? "warn" : vapid.status === "ok",
      label: "Chave VAPID do servidor",
      detail: vapid.status === "loading"
        ? "Consultando /api/push/vapid-key..."
        : vapid.status === "ok"
          ? `OK · HTTP ${vapid.httpStatus} · ${vapid.length} chars · base64url válido · prefixo ${vapid.key?.slice(0, 8)}…`
          : `FALHOU · HTTP ${vapid.httpStatus ?? "?"}${vapid.length != null ? ` · ${vapid.length} chars` : ""} · ${vapid.error || "erro"}`,
      fix: vapid.status === "fail"
        ? (vapid.httpStatus === 200 && vapid.key
            ? "A chave foi retornada mas não tem o formato esperado (base64url ~87 chars). Verifique o secret VAPID_PUBLIC_KEY no servidor."
            : !vapid.key
              ? "O servidor não retornou publicKey. Configure os secrets VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY e republique."
              : "A API /api/push/vapid-key falhou. Republique o app para aplicar as últimas correções de runtime.")
        : undefined,
    },
    {
      ok: push.subscribed,
      label: "Subscription criada no navegador",
      detail: push.subscribed ? "OK" : "Você ainda não ativou aqui",
    },
    {
      ok: serverSubs === null ? "warn" : serverSubs > 0,
      label: "Salvo no servidor",
      detail: serverSubs === null
        ? "Carregando..."
        : serverSubs > 0
          ? `${serverSubs} dispositivo(s) registrado(s)`
          : serverSubError
            ? `Erro ao consultar: ${serverSubError}`
            : lastApiResponse
              ? `API /api/push/subscribe → HTTP ${lastApiResponse.status}${lastApiResponse.error ? ` · ${lastApiResponse.error}` : ""}${lastApiResponse.detail ? ` · ${lastApiResponse.detail}` : ""}`
              : "Nenhum registro encontrado",
      fix: serverSubs === 0 && push.subscribed
        ? (lastApiResponse && !lastApiResponse.ok
            ? `A API respondeu HTTP ${lastApiResponse.status}. Detalhe: ${lastApiResponse.detail || lastApiResponse.error || "(sem detalhe)"}`
            : "Toque em 'Re-sincronizar com servidor' abaixo para ver o erro exato da API")
        : undefined,
    },
  ];

  const allGood = checks.every((c) => c.ok === true);

  return (
    <DashboardLayout variant="affiliate" title="Status das notificações">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/app/profile"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Button></Link>
          <h1 className="font-display text-3xl font-bold flex-1">Status das notificações</h1>
          <Button variant="outline" size="sm" onClick={() => setRefreshKey((k) => k + 1)}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />Recarregar
          </Button>
        </div>

        {/* Resumo */}
        <div className={`rounded-2xl border p-5 shadow-card-premium ${allGood ? "border-green-500/40 bg-green-500/5" : "border-amber-500/40 bg-amber-500/5"}`}>
          <div className="flex items-center gap-3">
            {allGood
              ? <CheckCircle2 className="h-8 w-8 text-green-500" />
              : <AlertCircle className="h-8 w-8 text-amber-500" />}
            <div>
              <p className="font-display font-bold text-lg">
                {allGood ? "Tudo certo!" : "Precisa de atenção"}
              </p>
              <p className="text-sm text-muted-foreground">
                {allGood
                  ? "Suas notificações estão prontas. Toque em 'Enviar teste' abaixo."
                  : "Veja os itens marcados em vermelho/amarelo e siga as instruções."}
              </p>
            </div>
          </div>
        </div>

        {/* Aviso destacado quando SW não está ativo */}
        {!swActive && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/5 p-4 shadow-card-premium flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-display font-semibold">Service Worker não está ativo</p>
              <p className="text-muted-foreground mt-1">
                Push notifications NÃO funcionam sem um Service Worker em estado <code className="px-1 rounded bg-background/60">activated</code>.
                {swInfo.registered
                  ? ` Estado atual: ${swInfo.state ?? "desconhecido"} (ready=${swInfo.ready ? "sim" : "não"}). Recarregue a página ou desative e ative novamente.`
                  : " Toque em 'Ativar neste dispositivo' para registrar /sw.js."}
              </p>
            </div>
          </div>
        )}

        {/* Checklist */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card-premium space-y-3">
          <h2 className="font-display font-semibold text-lg flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />Checklist de diagnóstico
          </h2>
          <ul className="space-y-2.5">
            {checks.map((c, i) => (
              <li key={i} className="flex items-start gap-3 text-sm border-b border-border/30 last:border-0 pb-2.5 last:pb-0">
                <div className="mt-0.5 shrink-0">
                  {c.ok === true ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                    : c.ok === "warn" ? <AlertCircle className="h-4 w-4 text-amber-500" />
                    : <XCircle className="h-4 w-4 text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{c.label}</p>
                  {c.detail && <p className="text-xs text-muted-foreground mt-0.5">{c.detail}</p>}
                  {c.fix && (
                    <div className="mt-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2">
                      <p className="text-xs text-amber-700 dark:text-amber-300"><b>Como resolver:</b> {c.fix}</p>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Ações */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card-premium space-y-4">
          <h2 className="font-display font-semibold text-lg">Ações neste dispositivo</h2>

          {!push.subscribed ? (
            <Button onClick={push.enable} disabled={push.busy || !push.supported || (isIOS && !isStandalone)} className="w-full bg-gradient-fire text-white">
              <Bell className="h-4 w-4 mr-2" />
              {push.busy ? "Ativando..." : "Ativar neste dispositivo"}
            </Button>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              <Button onClick={push.test} disabled={push.busy} className="bg-gradient-fire text-white">
                <Send className="h-4 w-4 mr-2" />Enviar teste
              </Button>
              <Button variant="outline" onClick={push.disable} disabled={push.busy}>
                Desativar aqui
              </Button>
            </div>
          )}

          {push.subscribed && serverSubs === 0 && (
            <Button onClick={resync} disabled={resyncing} variant="secondary" className="w-full">
              <RefreshCw className={`h-4 w-4 mr-2 ${resyncing ? "animate-spin" : ""}`} />
              {resyncing ? "Sincronizando..." : "Re-sincronizar com servidor"}
            </Button>
          )}
          {resyncMsg && (
            <p className="text-xs text-muted-foreground">{resyncMsg}</p>
          )}

          {lastApiResponse && (
            <div className={`rounded-lg border p-3 text-xs space-y-1 ${lastApiResponse.ok ? "border-green-500/40 bg-green-500/5" : "border-red-500/40 bg-red-500/5"}`}>
              <p className="font-semibold">
                Última resposta de POST /api/push/subscribe
                <span className="ml-2 text-muted-foreground font-normal">{lastApiResponse.at}</span>
              </p>
              <p><b>Status HTTP:</b> {lastApiResponse.status || "(sem resposta)"}</p>
              {lastApiResponse.error && <p><b>error:</b> {lastApiResponse.error}</p>}
              {lastApiResponse.detail && <p><b>detail:</b> {lastApiResponse.detail}</p>}
              {lastApiResponse.raw && (
                <details>
                  <summary className="cursor-pointer text-muted-foreground">Corpo bruto</summary>
                  <pre className="mt-1 overflow-auto bg-background/60 p-2 rounded">{lastApiResponse.raw}</pre>
                </details>
              )}
            </div>
          )}

          <Button variant="outline" className="w-full" onClick={() => { unlockAudio(); playCoinSound(); toast.success("💰 Som de venda"); }}>
            <Volume2 className="h-4 w-4 mr-2" />Ouvir som de venda
          </Button>
        </div>

        {/* Instruções iPhone */}
        {isIOS && !isStandalone && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5 shadow-card-premium">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2 mb-3">
              <Smartphone className="h-4 w-4 text-amber-500" />iPhone — Adicione à Tela de Início
            </h2>
            <p className="text-sm text-muted-foreground mb-3">
              No iOS, push notifications só funcionam se o site estiver instalado como app na sua tela de início.
            </p>
            <ol className="space-y-2.5 text-sm">
              {[
                "Abra este site no Safari (não no Chrome ou Instagram in-app)",
                "Toque no botão Compartilhar (quadrado com seta para cima) na barra inferior",
                "Role para baixo e toque em 'Adicionar à Tela de Início'",
                "Confirme em 'Adicionar' no canto superior direito",
                "Feche o Safari e abra o app pelo NOVO ÍCONE na tela inicial",
                "Volte aqui e toque em 'Ativar neste dispositivo'",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <span className="flex-1">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Instruções Android / Desktop com permissão negada */}
        {push.permission === "denied" && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/5 p-5 shadow-card-premium">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2 mb-3">
              <XCircle className="h-4 w-4 text-red-500" />Permissão bloqueada — como liberar
            </h2>
            {isAndroid ? (
              <ol className="space-y-2.5 text-sm">
                {[
                  "Toque no ícone de cadeado 🔒 na barra de endereço (ao lado da URL)",
                  "Toque em 'Permissões' ou 'Configurações do site'",
                  "Encontre 'Notificações' e mude para 'Permitir'",
                  "Recarregue esta página e toque em 'Ativar neste dispositivo'",
                ].map((s, i) => <li key={i} className="flex gap-3"><span className="shrink-0 w-6 h-6 rounded-full bg-red-500/20 text-red-700 dark:text-red-300 text-xs font-bold flex items-center justify-center">{i + 1}</span><span>{s}</span></li>)}
              </ol>
            ) : isIOS ? (
              <ol className="space-y-2.5 text-sm">
                {[
                  "Abra o app Ajustes do iPhone",
                  "Role até 'Notificações'",
                  "Encontre o app FIRE na lista",
                  "Ative 'Permitir Notificações' e os tipos (banner, sons, distintivos)",
                ].map((s, i) => <li key={i} className="flex gap-3"><span className="shrink-0 w-6 h-6 rounded-full bg-red-500/20 text-red-700 dark:text-red-300 text-xs font-bold flex items-center justify-center">{i + 1}</span><span>{s}</span></li>)}
              </ol>
            ) : (
              <ol className="space-y-2.5 text-sm">
                {[
                  "Clique no ícone de cadeado 🔒 à esquerda da URL no topo do navegador",
                  "Encontre 'Notificações' nas permissões do site",
                  "Mude de 'Bloquear' para 'Permitir'",
                  "Recarregue a página (F5 ou Ctrl+R)",
                  "Volte aqui e tente ativar novamente",
                ].map((s, i) => <li key={i} className="flex gap-3"><span className="shrink-0 w-6 h-6 rounded-full bg-red-500/20 text-red-700 dark:text-red-300 text-xs font-bold flex items-center justify-center">{i + 1}</span><span>{s}</span></li>)}
              </ol>
            )}
          </div>
        )}

        {/* Info técnica */}
        <details className="rounded-2xl border border-border bg-card/50 p-4">
          <summary className="cursor-pointer font-medium text-sm flex items-center gap-2"><Globe className="h-4 w-4" />Detalhes técnicos</summary>
          <pre className="text-xs mt-3 overflow-auto bg-background/60 p-3 rounded-lg">
{JSON.stringify({
  url: typeof window !== "undefined" ? window.location.href : "",
  browser, isIOS, isAndroid, isStandalone, isInIframe, isSecure,
  permission: push.permission,
  supported: push.supported,
  subscribed: push.subscribed,
  serverSubs,
  serviceWorker: swInfo,
  vapid: { status: vapid.status, httpStatus: vapid.httpStatus, length: vapid.length, formatOk: vapid.formatOk },
  userAgent: ua.slice(0, 200),
}, null, 2)}
          </pre>
        </details>
      </div>
    </DashboardLayout>
  );
}
