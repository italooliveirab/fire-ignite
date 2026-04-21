// Botão + tutorial passo a passo para instalar o PWA na tela inicial (iOS, Android, Desktop).
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Smartphone, Download, Share, Plus, MoreVertical, Apple, Chrome, CheckCircle2, X } from "lucide-react";
import { useBrand } from "@/hooks/useBrand";
import { cn } from "@/lib/utils";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function detectPlatform() {
  if (typeof navigator === "undefined") return "other" as const;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios" as const;
  if (/Android/.test(ua)) return "android" as const;
  return "desktop" as const;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

export function InstallPWA({
  variant = "button",
  className,
}: {
  /** "button" = só o botão; "card" = card destacado com texto explicativo. */
  variant?: "button" | "card" | "compact";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop" | "other">("other");
  const { companyName } = useBrand();

  useEffect(() => {
    setPlatform(detectPlatform());
    setInstalled(isStandalone());

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      setOpen(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Já instalado — não mostra nada
  if (installed) return null;

  const oneClickInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
      setOpen(false);
    }
    setDeferred(null);
  };

  const handleClick = async () => {
    // Android/Desktop com prompt nativo disponível: instala direto
    if (deferred) {
      await oneClickInstall();
      return;
    }
    // Caso contrário, abre tutorial
    setOpen(true);
  };

  const trigger = (() => {
    if (variant === "compact") {
      return (
        <Button onClick={handleClick} size="sm" variant="outline" className={cn("gap-2", className)}>
          <Download className="h-3.5 w-3.5" /> Instalar app
        </Button>
      );
    }
    if (variant === "card") {
      return (
        <div className={cn("rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-card-premium", className)}>
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-fire flex items-center justify-center shadow-fire shrink-0">
              <Smartphone className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-lg leading-tight">Instale o app {companyName}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Acesso rápido pela tela inicial, notificações de venda em tempo real e experiência tela cheia — sem baixar nada da loja.
              </p>
              <Button onClick={handleClick} className="mt-3 bg-gradient-fire text-white shadow-fire" size="sm">
                <Download className="h-4 w-4 mr-1.5" />
                {deferred ? "Instalar agora" : "Ver como instalar"}
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <Button onClick={handleClick} className={cn("gap-2 bg-gradient-fire text-white shadow-fire", className)}>
        <Download className="h-4 w-4" /> Instalar app na tela inicial
      </Button>
    );
  })();

  return (
    <>
      {trigger}
      <InstallTutorialDialog
        open={open}
        onOpenChange={setOpen}
        platform={platform}
        companyName={companyName}
        canPrompt={!!deferred}
        onOneClick={oneClickInstall}
      />
    </>
  );
}

function InstallTutorialDialog({
  open,
  onOpenChange,
  platform,
  companyName,
  canPrompt,
  onOneClick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  platform: "ios" | "android" | "desktop" | "other";
  companyName: string;
  canPrompt: boolean;
  onOneClick: () => void;
}) {
  const [tab, setTab] = useState<"ios" | "android">(platform === "android" || platform === "desktop" ? "android" : "ios");

  useEffect(() => {
    if (open) setTab(platform === "android" || platform === "desktop" ? "android" : "ios");
  }, [open, platform]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <Smartphone className="h-5 w-5 text-primary" /> Instale o app {companyName}
          </DialogTitle>
          <DialogDescription>
            Adicione à tela inicial e abra como um aplicativo nativo. Notificações de venda chegam mesmo com o site fechado.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-muted/30 rounded-lg">
          <button
            onClick={() => setTab("ios")}
            className={cn(
              "flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition",
              tab === "ios" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Apple className="h-4 w-4" /> iPhone / iPad
          </button>
          <button
            onClick={() => setTab("android")}
            className={cn(
              "flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition",
              tab === "android" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Chrome className="h-4 w-4" /> Android
          </button>
        </div>

        {tab === "ios" ? (
          <ol className="space-y-3 text-sm">
            <Step n={1} icon={<Apple className="h-4 w-4" />}>
              Abra este site no <b>Safari</b> (não funciona em outros navegadores no iPhone).
            </Step>
            <Step n={2} icon={<Share className="h-4 w-4 text-blue-500" />}>
              Toque no botão <b>Compartilhar</b> <span className="inline-block px-1.5 py-0.5 rounded bg-muted text-xs">⬆︎</span> na barra inferior.
            </Step>
            <Step n={3} icon={<Plus className="h-4 w-4 text-primary" />}>
              Role para baixo e toque em <b>Adicionar à Tela de Início</b>.
            </Step>
            <Step n={4} icon={<CheckCircle2 className="h-4 w-4 text-success" />}>
              Confirme tocando em <b>Adicionar</b>. Pronto — o ícone do {companyName} aparece na sua tela inicial.
            </Step>
          </ol>
        ) : (
          <>
            {canPrompt && (
              <Button onClick={onOneClick} className="w-full bg-gradient-fire text-white shadow-fire">
                <Download className="h-4 w-4 mr-2" /> Instalar com 1 clique
              </Button>
            )}
            <ol className="space-y-3 text-sm">
              <Step n={1} icon={<Chrome className="h-4 w-4 text-blue-500" />}>
                Abra este site no <b>Chrome</b> (ou navegador padrão).
              </Step>
              <Step n={2} icon={<MoreVertical className="h-4 w-4" />}>
                Toque no menu <b>⋮</b> no canto superior direito.
              </Step>
              <Step n={3} icon={<Plus className="h-4 w-4 text-primary" />}>
                Toque em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.
              </Step>
              <Step n={4} icon={<CheckCircle2 className="h-4 w-4 text-success" />}>
                Confirme. O ícone do {companyName} aparece na tela inicial como um app de verdade.
              </Step>
            </ol>
          </>
        )}

        <p className="text-xs text-muted-foreground text-center pt-2 border-t border-border/40">
          💡 Depois de instalado, abra sempre pelo ícone para receber notificações push.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function Step({ n, icon, children }: { n: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <div className="h-7 w-7 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-bold flex items-center justify-center shrink-0">
        {n}
      </div>
      <div className="flex-1 pt-0.5">
        <div className="flex items-center gap-1.5 text-foreground">{icon}<span>{children}</span></div>
      </div>
    </li>
  );
}

/**
 * Banner discreto no topo do site (somente quando NÃO instalado).
 * Usuário pode dispensar e fica salvo no localStorage por 7 dias.
 */
export function InstallBanner() {
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop" | "other">("other");
  const { companyName } = useBrand();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;
    const dismissedAt = Number(localStorage.getItem("install-banner-dismissed") || 0);
    if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return;
    setPlatform(detectPlatform());
    setShow(true);
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as BeforeInstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem("install-banner-dismissed", String(Date.now()));
    setShow(false);
  };

  const install = async () => {
    if (deferred) {
      await deferred.prompt();
      const c = await deferred.userChoice;
      if (c.outcome === "accepted") setShow(false);
      setDeferred(null);
    } else {
      setOpen(true);
    }
  };

  return (
    <>
      <div className="sticky top-0 z-40 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 border-b border-primary/30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Smartphone className="h-4 w-4 text-primary shrink-0" />
            <p className="text-xs sm:text-sm truncate">
              <b>Instale o app {companyName}</b> <span className="text-muted-foreground">— acesso rápido + notificações</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button onClick={install} size="sm" className="h-8 bg-gradient-fire text-white text-xs">
              <Download className="h-3 w-3 mr-1" /> Instalar
            </Button>
            <button onClick={dismiss} className="h-8 w-8 rounded-md hover:bg-background/50 flex items-center justify-center text-muted-foreground" aria-label="Dispensar">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      <InstallTutorialDialog
        open={open}
        onOpenChange={setOpen}
        platform={platform}
        companyName={companyName}
        canPrompt={!!deferred}
        onOneClick={install}
      />
    </>
  );
}