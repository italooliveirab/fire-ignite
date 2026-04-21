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
  const [swActive, setSwActive] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState(0);

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
    navigator.serviceWorker?.getRegistration("/sw.js").then((reg) => {
      if (alive) setSwActive(!!reg?.active);
    });
    if (user) {
      supabase.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", user.id)
        .then(({ count }) => { if (alive) setServerSubs(count ?? 0); });
    }
    return () => { alive = false; };
  }, [user, refreshKey, push.subscribed]);

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
      ok: swActive,
      label: "Service Worker ativo",
      detail: swActive ? "Registrado em /sw.js" : "Não registrado neste dispositivo",
      fix: !swActive ? "Clique em 'Ativar neste dispositivo' abaixo" : undefined,
    },
    {
      ok: push.subscribed,
      label: "Subscription criada no navegador",
      detail: push.subscribed ? "OK" : "Você ainda não ativou aqui",
    },
    {
      ok: serverSubs === null ? "warn" : serverSubs > 0,
      label: "Salvo no servidor",
      detail: serverSubs === null ? "Carregando..." : serverSubs > 0 ? `${serverSubs} dispositivo(s) registrado(s)` : "Nenhum registro encontrado",
      fix: serverSubs === 0 && push.subscribed ? "Desative e ative novamente — a inscrição no navegador não chegou ao servidor" : undefined,
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
  swActive,
  userAgent: ua.slice(0, 200),
}, null, 2)}
          </pre>
        </details>
      </div>
    </DashboardLayout>
  );
}
