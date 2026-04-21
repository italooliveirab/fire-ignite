CREATE TABLE IF NOT EXISTS public.link_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE SET NULL,
  product_slug text,
  affiliate_slug text,
  ip_hash text,
  user_agent text,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_link_clicks_created_at ON public.link_clicks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_link_clicks_affiliate ON public.link_clicks(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_link_clicks_product ON public.link_clicks(product_id);

ALTER TABLE public.link_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin reads link_clicks" ON public.link_clicks
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Affiliate reads own link_clicks" ON public.link_clicks
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = link_clicks.affiliate_id AND a.user_id = auth.uid())
  );