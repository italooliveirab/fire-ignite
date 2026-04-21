
CREATE TABLE public.webhooks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  url text NOT NULL,
  secret text NOT NULL,
  events text[] NOT NULL DEFAULT ARRAY['lead.paid']::text[],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages webhooks" ON public.webhooks
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_webhooks_updated_at
  BEFORE UPDATE ON public.webhooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.webhook_deliveries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id uuid NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  event text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  http_status int,
  response_body text,
  error text,
  attempts int NOT NULL DEFAULT 0,
  next_retry_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_deliveries_webhook ON public.webhook_deliveries(webhook_id, created_at DESC);
CREATE INDEX idx_webhook_deliveries_status ON public.webhook_deliveries(status, next_retry_at);

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin reads webhook deliveries" ON public.webhook_deliveries
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admin manages webhook deliveries" ON public.webhook_deliveries
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
