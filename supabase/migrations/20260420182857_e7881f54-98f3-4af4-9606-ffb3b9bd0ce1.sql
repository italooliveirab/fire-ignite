CREATE TABLE IF NOT EXISTS public.affiliate_credential_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL,
  changed_by uuid NOT NULL,
  changed_by_email text,
  email_changed boolean NOT NULL DEFAULT false,
  password_changed boolean NOT NULL DEFAULT false,
  old_email text,
  new_email text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credential_audit_affiliate ON public.affiliate_credential_audit(affiliate_id, created_at DESC);

ALTER TABLE public.affiliate_credential_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin reads credential audit"
ON public.affiliate_credential_audit
FOR SELECT
USING (public.is_admin(auth.uid()));