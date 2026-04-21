import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Smartphone, Download, Share, PlusSquare, CheckCircle2, Apple, Chrome } from "lucide-react";
import { toast } from "sonner";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function detectPlatform(): "ios" | "android" | "desktop" | "unknown" {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) return "ios";
  if (/Android/i.test(ua)) return "android";
  if (/Mac|Win|Linux/i.test(ua)) return "desktop";
  return "unknown";
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
  const [platform, setPlatform] = useState<ReturnType<typeof detectPlatform>>("unknown");

  useEffect(() => {
    setPlatform(detectPlatform());
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
  if (deferred && (platform === "android" || platform === "desktop") && variant === "button") {
    return (
      <Button onClick={handleAutoInstall} className={`gap-2 bg-gradient-fire text-white shadow-fire ${className}`}>
        <Download className="h-4 w-4" /> Instalar app automaticamente
      </Button>
    );
  }

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

        {deferred && (platform === "android" || platform === "desktop") && (
          <div className="rounded-xl border border-primary/40 bg-primary/10 p-4">
            <div className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Chrome className="h-4 w-4 text-primary" /> Instalação automática disponível
            </div>
            <Button onClick={handleAutoInstall} className="w-full gap-2 bg-gradient-fire text-white shadow-fire">
              <Download className="h-4 w-4" /> Instalar agora
            </Button>
          </div>
        )}

        {/* iOS */}
        <section className={platform === "ios" ? "" : "opacity-90"}>
          <h3 className="font-display font-bold text-sm flex items-center gap-2 mb-3">
            <Apple className="h-4 w-4" /> No iPhone / iPad (Safari)
          </h3>
          <ol className="space-y-3 text-sm">
            <Step n={1} icon={<Share className="h-4 w-4 text-primary" />}>
              Abra este site no <strong>Safari</strong> e toque no botão <strong>Compartilhar</strong> (ícone de quadrado com seta para cima) na barra inferior.
            </Step>
            <Step n={2} icon={<PlusSquare className="h-4 w-4 text-primary" />}>
              Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>.
            </Step>
            <Step n={3} icon={<CheckCircle2 className="h-4 w-4 text-success" />}>
              Confirme tocando em <strong>"Adicionar"</strong>. Pronto: o ícone do FIRE aparece na sua tela inicial.
            </Step>
          </ol>
        </section>

        <div className="border-t border-border" />

        {/* Android */}
        <section className={platform === "android" ? "" : "opacity-90"}>
          <h3 className="font-display font-bold text-sm flex items-center gap-2 mb-3">
            <Chrome className="h-4 w-4" /> No Android (Chrome)
          </h3>
          <ol className="space-y-3 text-sm">
            <Step n={1} icon={<Chrome className="h-4 w-4 text-primary" />}>
              Abra este site no <strong>Chrome</strong>. Toque no menu <strong>⋮</strong> no canto superior direito.
            </Step>
            <Step n={2} icon={<Download className="h-4 w-4 text-primary" />}>
              Toque em <strong>"Instalar app"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
            </Step>
            <Step n={3} icon={<CheckCircle2 className="h-4 w-4 text-success" />}>
              Confirme. O ícone do FIRE será adicionado à tela inicial e abrirá em tela cheia.
            </Step>
          </ol>
        </section>

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