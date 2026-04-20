
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

CREATE POLICY "Admins manage logos"
ON storage.objects FOR ALL
USING (bucket_id = 'logos' AND public.is_admin(auth.uid()))
WITH CHECK (bucket_id = 'logos' AND public.is_admin(auth.uid()));
