// Painel de preferências de notificação reutilizável (admin + afiliado).
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useWebPush } from "@/hooks/useWebPush";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Bell, BellOff, Smartphone, Volume2, Mail, Loader2, Send, AlertCircle, Activity } from "lucide-react";
import { toast } from "sonner";
import { playCoinSound } from "@/lib/coin-sound";
import { Link } from "@tanstack/react-router";

type Prefs = {
  push_enabled: boolean; sound_enabled: boolean; email_enabled: boolean;
  notify_lead_paid: boolean; notify_lead_new: boolean;
  notify_payment_generated: boolean; notify_trial_generated: boolean;
};

const DEFAULT: Prefs = {
  push_enabled: true, sound_enabled: true, email_enabled: true,
  notify_lead_paid: true, notify_lead_new: false,
  notify_payment_generated: false, notify_trial_generated: false,
};

export function NotificationSettings() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const push = useWebPush();
  const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = typeof window !== "undefined" && (window.matchMedia?.("(display-mode: standalone)").matches || (window.navigator as { standalone?: boolean }).standalone === true);

  useEffect(() => {
    if (!user) return;
    supabase.from("notification_preferences").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) setPrefs({
        push_enabled: data.push_enabled, sound_enabled: data.sound_enabled, email_enabled: data.email_enabled,
        notify_lead_paid: data.notify_lead_paid, notify_lead_new: data.notify_lead_new,
        notify_payment_generated: data.notify_payment_generated, notify_trial_generated: data.notify_trial_generated,
      });
      setLoading(false);
    });
  }, [user]);

  const save = async (next: Prefs) => {
    if (!user) return;
    setPrefs(next);
    setSaving(true);
    const { error } = await supabase.from("notification_preferences")
      .upsert({ user_id: user.id, ...next }, { onConflict: "user_id" });
    setSaving(false);
    if (error) toast.error("Falha ao salvar", { description: error.message });
  };

  const set = <K extends keyof Prefs>(k: K, v: Prefs[K]) => save({ ...prefs, [k]: v });

  if (loading) return <div className="h-32 rounded-2xl bg-card animate-pulse" />;

  return (
    <div className="space-y-4">
      {/* Canais */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card-premium space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-lg flex items-center gap-2"><Bell className="h-4 w-4 text-primary" />Canais</h3>
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>

        <Row icon={<Smartphone className="h-4 w-4" />} label="Notificações no celular" desc="Recebe push mesmo com o site fechado">
          <Switch checked={prefs.push_enabled} onCheckedChange={(v) => set("push_enabled", v)} />
        </Row>

        <Row icon={<Volume2 className="h-4 w-4" />} label="Som de moedas" desc="Toca som de venda quando o painel está aberto">
          <Switch checked={prefs.sound_enabled} onCheckedChange={(v) => set("sound_enabled", v)} />
        </Row>

        <Row icon={<Mail className="h-4 w-4" />} label="Email" desc="Recebe email a cada venda confirmada">
          <Switch checked={prefs.email_enabled} onCheckedChange={(v) => set("email_enabled", v)} />
        </Row>

        {/* Push setup neste dispositivo */}
        {prefs.push_enabled && (
          <div className="rounded-xl bg-background/60 border border-border p-4 mt-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Este dispositivo</p>
              <Link to="/app/notifications-status" className="text-xs text-primary hover:underline flex items-center gap-1">
                <Activity className="h-3 w-3" />Diagnóstico
              </Link>
            </div>
            {!push.supported ? (
              <p className="text-sm text-muted-foreground flex items-center gap-2"><AlertCircle className="h-4 w-4" />Seu navegador não suporta push.</p>
            ) : isIOS && !isStandalone ? (
              <div className="text-sm text-muted-foreground space-y-1.5">
                <p className="flex items-center gap-2 text-foreground"><AlertCircle className="h-4 w-4 text-amber-500" />Para receber no iPhone:</p>
                <ol className="list-decimal pl-5 text-xs space-y-0.5">
                  <li>Abra este site no <b>Safari</b></li>
                  <li>Toque em <b>Compartilhar</b> → <b>Adicionar à Tela de Início</b></li>
                  <li>Abra o app pelo ícone instalado e ative aqui</li>
                </ol>
              </div>
            ) : push.subscribed ? (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={push.test} disabled={push.busy}>
                  {push.busy ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />}Testar
                </Button>
                <Button size="sm" variant="outline" onClick={push.disable} disabled={push.busy}>
                  <BellOff className="h-3.5 w-3.5 mr-1" />Desativar aqui
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={push.enable} disabled={push.busy} className="bg-gradient-fire text-white">
                {push.busy ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Bell className="h-3.5 w-3.5 mr-1" />}Ativar neste dispositivo
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Eventos */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card-premium space-y-3">
        <h3 className="font-display font-semibold text-lg">Eventos</h3>
        <p className="text-xs text-muted-foreground -mt-2">Escolha quais eventos disparam notificação</p>

        <Row label="💰 Venda paga" desc="Cliente confirmou o pagamento (com som de moedas)">
          <Switch checked={prefs.notify_lead_paid} onCheckedChange={(v) => set("notify_lead_paid", v)} />
        </Row>
        <Row label="🔥 Cliente iniciou conversa" desc="Novo lead chegou pelo seu link">
          <Switch checked={prefs.notify_lead_new} onCheckedChange={(v) => set("notify_lead_new", v)} />
        </Row>
        <Row label="📋 Pagamento gerado" desc="Cliente recebeu boleto/pix mas ainda não pagou">
          <Switch checked={prefs.notify_payment_generated} onCheckedChange={(v) => set("notify_payment_generated", v)} />
        </Row>
        <Row label="🎁 Trial iniciado" desc="Cliente começou um período de teste">
          <Switch checked={prefs.notify_trial_generated} onCheckedChange={(v) => set("notify_trial_generated", v)} />
        </Row>

        <div className="pt-3 border-t border-border/40">
          <Button size="sm" variant="outline" onClick={() => { playCoinSound(); toast.success("💰 Som de moedas — preview"); }}>
            <Volume2 className="h-3.5 w-3.5 mr-1" />Ouvir som de venda
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label, desc, children }: { icon?: React.ReactNode; label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <Label className="flex items-center gap-2 text-sm font-medium">{icon}{label}</Label>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <div className="shrink-0 pt-1">{children}</div>
    </div>
  );
}
