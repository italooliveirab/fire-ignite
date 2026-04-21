import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Smartphone, Download, Share, PlusSquare, CheckCircle2, Apple, Chrome, AlertTriangle, MoreVertical } from "lucide-react";
import { toast } from "sonner";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Device = {
  os: "ios" | "android" | "desktop" | "unknown";
  browser: "safari" | "chrome" | "firefox" | "edge" | "samsung" | "opera" | "other";
  isInAppBrowser: boolean; // Instagram, Facebook, TikTok, etc.
  canAutoInstall: boolean; // supports beforeinstallprompt
  needsSafari: boolean;    // iOS but not Safari
};

function detectDevice(): Device {
  if (typeof navigator === "undefined") {
    return { os: "unknown", browser: "other", isInAppBrowser: false, canAutoInstall: false, needsSafari: false };
  }
  const ua = navigator.userAgent || "";

  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isAndroid = /Android/i.test(ua);
  const os: Device["os"] = isIOS ? "ios" : isAndroid ? "android" : /Mac|Win|Linux/i.test(ua) ? "desktop" : "unknown";

  const isInApp =
    /(FBAN|FBAV|Instagram|Line|TikTok|Twitter|Pinterest|MicroMessenger|WhatsApp|Snapchat)/i.test(ua);

  let browser: Device["browser"] = "other";
  if (/CriOS|Chrome\//.test(ua) && !/EdgiOS|EdgA|Edg\//.test(ua) && !/SamsungBrowser/.test(ua) && !/OPR\/|Opera/.test(ua)) {
    browser = "chrome";
  } else if (/EdgiOS|EdgA|Edg\//.test(ua)) {
    browser = "edge";
  } else if (/SamsungBrowser/.test(ua)) {
    browser = "samsung";
  } else if (/FxiOS|Firefox/.test(ua)) {
    browser = "firefox";
  } else if (/OPR\/|Opera/.test(ua)) {
    browser = "opera";
  } else if (isIOS && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)) {
    browser = "safari";
  } else if (!isIOS && /Safari/.test(ua) && !/Chrome|Chromium/.test(ua)) {
    browser = "safari";
  }

  const canAutoInstall = !isIOS && (browser === "chrome" || browser === "edge" || browser === "samsung" || browser === "opera");
  const needsSafari = isIOS && browser !== "safari";

  return { os, browser, isInAppBrowser: isInApp, canAutoInstall, needsSafari };
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as any).standalone === true
  );
}

interface Props {
  variant?: "button" | "card" | "inline";
  className?: string;
}

export function InstallAppGuide({ variant = "button", className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [device, setDevice] = useState<Device>({
    os: "unknown", browser: "other", isInAppBrowser: false, canAutoInstall: false, needsSafari: false,
  });

  useEffect(() => {
    setDevice(detectDevice());
    setInstalled(isStandalone());

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      toast.success("App instalado com sucesso! 🔥");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleAutoInstall = async () => {
    if (!deferred) {
      setOpen(true);
      return;
    }
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        toast.success("Instalando o app...");
      }
      setDeferred(null);
    } catch {
      setOpen(true);
    }
  };

  if (installed) {
    if (variant === "button") return null;
    return (
      <div className={`rounded-2xl border border-success/30 bg-success/10 p-4 flex items-center gap-3 ${className}`}>
        <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
        <div>
          <div className="text-sm font-semibold text-success">App já instalado</div>
          <div className="text-xs text-muted-foreground">Você está usando o FIRE direto da tela inicial.</div>
        </div>
      </div>
    );
  }

  const trigger =
    variant === "card" ? (
      <button
        type="button"
        className={`w-full text-left rounded-2xl border border-border bg-card p-5 hover:border-primary/40 transition flex items-start gap-4 ${className}`}
      >
        <div className="h-11 w-11 rounded-xl bg-gradient-fire flex items-center justify-center shadow-fire shrink-0">
          <Smartphone className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-base mb-0.5">Instalar app no celular</div>
          <div className="text-xs text-muted-foreground">Acesse mais rápido e receba notificações de venda na hora.</div>
        </div>
        <Download className="h-4 w-4 text-primary shrink-0 mt-1" />
      </button>
    ) : variant === "inline" ? (
      <button
        type="button"
        className={`inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline ${className}`}
      >
        <Download className="h-4 w-4" /> Instalar app no celular
      </button>
    ) : (
      <Button
        type="button"
        variant="outline"
        className={`gap-2 ${className}`}
      >
        <Download className="h-4 w-4" /> Instalar app
      </Button>
    );

  // If we have the auto-install event AND user is on android/desktop, prefer direct prompt
  if (deferred && device.canAutoInstall && variant === "button") {
    return (
      <Button onClick={handleAutoInstall} className={`gap-2 bg-gradient-fire text-white shadow-fire ${className}`}>
        <Download className="h-4 w-4" /> Instalar app automaticamente
      </Button>
    );
  }

  const showIOS = device.os === "ios" || device.os === "unknown";
  const showAndroid = device.os === "android" || device.os === "desktop" || device.os === "unknown";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <Smartphone className="h-5 w-5 text-primary" />
            Instalar o FIRE na tela inicial
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground -mt-2">
          Tenha o painel FIRE como um app no seu celular: abre mais rápido, em tela cheia e recebe notificações de venda na hora.
        </p>

        {/* In-app browser warning (Instagram/Facebook/etc) */}
        {device.isInAppBrowser && (
          <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold mb-1">Abra no navegador para instalar</div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Você está dentro de um app (Instagram, Facebook, TikTok…). Toque no menu <strong>⋯</strong> e escolha
                <strong> "Abrir no {device.os === "ios" ? "Safari" : "Chrome"}"</strong> para conseguir instalar.
              </p>
            </div>
          </div>
        )}

        {/* iOS but not Safari */}
        {device.needsSafari && !device.isInAppBrowser && (
          <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold mb-1">Use o Safari no iPhone</div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                No iPhone só dá pra instalar pelo <strong>Safari</strong>. Copie o link, abra no Safari e siga o passo a passo abaixo.
              </p>
            </div>
          </div>
        )}

        {deferred && device.canAutoInstall && (
          <div className="rounded-xl border border-primary/40 bg-primary/10 p-4">
            <div className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Chrome className="h-4 w-4 text-primary" /> Instalação automática disponível
            </div>
            <Button onClick={handleAutoInstall} className="w-full gap-2 bg-gradient-fire text-white shadow-fire">
              <Download className="h-4 w-4" /> Instalar agora
            </Button>
          </div>
        )}

        {/* iOS section */}
        {showIOS && (
          <section>
            <h3 className="font-display font-bold text-sm flex items-center gap-2 mb-3">
              <Apple className="h-4 w-4" /> No iPhone / iPad (Safari)
              {device.os === "ios" && !device.needsSafari && (
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">Seu dispositivo</span>
              )}
            </h3>
            <ol className="space-y-3 text-sm">
              <Step n={1} icon={<Share className="h-4 w-4 text-primary" />}>
                Toque no botão <strong>Compartilhar</strong> (quadrado com seta para cima) na barra inferior do Safari.
              </Step>
              <Step n={2} icon={<PlusSquare className="h-4 w-4 text-primary" />}>
                Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>.
              </Step>
              <Step n={3} icon={<CheckCircle2 className="h-4 w-4 text-success" />}>
                Confirme tocando em <strong>"Adicionar"</strong>. O ícone do FIRE aparece na sua tela inicial.
              </Step>
            </ol>
          </section>
        )}

        {showIOS && showAndroid && <div className="border-t border-border" />}

        {/* Android / Desktop section */}
        {showAndroid && (
          <section>
            <h3 className="font-display font-bold text-sm flex items-center gap-2 mb-3">
              <Chrome className="h-4 w-4" /> {device.os === "desktop" ? "No computador (Chrome / Edge)" : "No Android (Chrome)"}
              {(device.os === "android" || device.os === "desktop") && (
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">Seu dispositivo</span>
              )}
            </h3>
            <ol className="space-y-3 text-sm">
              <Step n={1} icon={<MoreVertical className="h-4 w-4 text-primary" />}>
                Toque no menu <strong>⋮</strong> no canto superior direito do navegador.
              </Step>
              <Step n={2} icon={<Download className="h-4 w-4 text-primary" />}>
                Escolha <strong>"Instalar app"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
              </Step>
              <Step n={3} icon={<CheckCircle2 className="h-4 w-4 text-success" />}>
                Confirme. O FIRE abrirá em tela cheia, igual a um app nativo.
              </Step>
            </ol>
          </section>
        )}

        <p className="text-xs text-muted-foreground text-center pt-2">
          Dúvidas? Fale com o suporte FIRE.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function Step({ n, icon, children }: { n: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <div className="h-7 w-7 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary shrink-0">
        {n}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-0.5">{icon}</div>
        <p className="text-muted-foreground leading-relaxed">{children}</p>
      </div>
    </li>
  );
}