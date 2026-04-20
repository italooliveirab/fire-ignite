
CREATE TABLE IF NOT EXISTS public.email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  recipient text NOT NULL,
  subject text NOT NULL,
  template text,
  status text NOT NULL CHECK (status IN ('sent','failed')),
  error text,
  context jsonb
);

CREATE INDEX IF NOT EXISTS idx_email_log_created_at ON public.email_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_log_status ON public.email_log (status);

ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin reads email_log"
  ON public.email_log FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admin inserts email_log"
  ON public.email_log FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));
