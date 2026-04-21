// Hook unificado: realtime de leads + som + toast + preferências do usuário.
// Nota: o push real (celular com site fechado) é enviado pelo servidor via web-push.
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { playCoinSound, playPingSound, unlockAudio } from "@/lib/coin-sound";
import type { Database } from "@/integrations/supabase/types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];
type Prefs = Database["public"]["Tables"]["notification_preferences"]["Row"];

const DEFAULT_PREFS: Omit<Prefs, "id" | "user_id" | "created_at" | "updated_at"> = {
  push_enabled: true, sound_enabled: true, email_enabled: true,
  notify_lead_paid: true, notify_lead_new: false,
  notify_payment_generated: false, notify_trial_generated: false,
};

export function useNotifications() {
  const { user } = useAuth();
  const prefsRef = useRef<typeof DEFAULT_PREFS>(DEFAULT_PREFS);
  const myAffiliateIdRef = useRef<string | null>(null);
  const isAdminRef = useRef<boolean>(false);

  // Destrava áudio na primeira interação
  useEffect(() => {
    // Só registra o destravador de áudio quando há usuário autenticado.
    // Evita carregar/preparar o som em telas públicas como /login e /admin/login.
    if (!user) return;
    const fn = () => { unlockAudio(); window.removeEventListener("pointerdown", fn); };
    window.addEventListener("pointerdown", fn, { once: true });
    return () => window.removeEventListener("pointerdown", fn);
  }, [user]);

  // Carrega prefs + identidade do usuário
  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const [{ data: prefs }, { data: aff }, { data: roles }] = await Promise.all([
        supabase.from("notification_preferences").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("affiliates").select("id").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      if (!alive) return;
      prefsRef.current = prefs ? {
        push_enabled: prefs.push_enabled, sound_enabled: prefs.sound_enabled, email_enabled: prefs.email_enabled,
        notify_lead_paid: prefs.notify_lead_paid, notify_lead_new: prefs.notify_lead_new,
        notify_payment_generated: prefs.notify_payment_generated, notify_trial_generated: prefs.notify_trial_generated,
      } : DEFAULT_PREFS;
      myAffiliateIdRef.current = aff?.id ?? null;
      isAdminRef.current = (roles ?? []).some((r) => r.role === "admin");
    })();
    return () => { alive = false; };
  }, [user]);

  // Escuta realtime nos leads
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`leads-notifications-${user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "leads" }, (payload) => {
        const newLead = payload.new as Lead;
        const oldLead = payload.old as Lead;
        if (!isRelevant(newLead)) return;
        // Venda paga: status mudou para 'paid'
        if (newLead.status === "paid" && oldLead.status !== "paid") {
          handleEvent("lead_paid", newLead);
        } else if (newLead.status === "generated_payment" && oldLead.status !== "generated_payment") {
          handleEvent("payment_generated", newLead);
        } else if (newLead.status === "generated_trial" && oldLead.status !== "generated_trial") {
          handleEvent("trial_generated", newLead);
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "leads" }, (payload) => {
        const newLead = payload.new as Lead;
        if (!isRelevant(newLead)) return;
        handleEvent("lead_new", newLead);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function isRelevant(lead: Lead) {
    if (isAdminRef.current) return true;
    return myAffiliateIdRef.current === lead.affiliate_id;
  }

  function handleEvent(event: "lead_paid" | "lead_new" | "payment_generated" | "trial_generated", lead: Lead) {
    const p = prefsRef.current;
    const enabled =
      event === "lead_paid" ? p.notify_lead_paid :
      event === "lead_new" ? p.notify_lead_new :
      event === "payment_generated" ? p.notify_payment_generated :
      p.notify_trial_generated;
    if (!enabled) return;

    const valor = lead.payment_amount != null ? `R$ ${Number(lead.payment_amount).toFixed(2).replace(".", ",")}` : "";
    const customer = lead.customer_name || lead.whatsapp_number || "Novo cliente";

    if (event === "lead_paid") {
      if (p.sound_enabled) playCoinSound();
      toast.success(`💰 Venda paga! ${valor}`, {
        description: `Cliente: ${customer}`, duration: 8000,
      });
    } else {
      if (p.sound_enabled) playPingSound();
      const titles = {
        lead_new: `🔥 Novo cliente — ${customer}`,
        payment_generated: `📋 Pagamento gerado ${valor}`,
        trial_generated: `🎁 Trial iniciado — ${customer}`,
      } as const;
      toast(titles[event], { duration: 5000 });
    }
  }
}
