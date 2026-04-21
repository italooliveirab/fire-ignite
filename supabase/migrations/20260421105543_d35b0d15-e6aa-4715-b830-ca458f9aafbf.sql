
-- Preferências de notificação por usuário (admin e afiliados)
CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  -- canais
  push_enabled boolean NOT NULL DEFAULT true,
  sound_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT true,
  -- eventos (somente venda paga vem ligado por padrão)
  notify_lead_paid boolean NOT NULL DEFAULT true,
  notify_lead_new boolean NOT NULL DEFAULT false,
  notify_payment_generated boolean NOT NULL DEFAULT false,
  notify_trial_generated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User reads own notification prefs"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "User upserts own notification prefs (insert)"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User upserts own notification prefs (update)"
  ON public.notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admin manages all notification prefs"
  ON public.notification_preferences FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Subscriptions push do navegador (uma por dispositivo)
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User reads own push subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "User inserts own push subscriptions"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User deletes own push subscriptions"
  ON public.push_subscriptions FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

-- Habilita realtime nos leads para o site detectar venda paga em tempo real
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
