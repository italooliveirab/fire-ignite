
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins manage payment proofs"
ON storage.objects FOR ALL
USING (bucket_id = 'payment-proofs' AND public.is_admin(auth.uid()))
WITH CHECK (bucket_id = 'payment-proofs' AND public.is_admin(auth.uid()));

CREATE POLICY "Affiliates view own payment proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-proofs'
  AND EXISTS (
    SELECT 1 FROM public.payouts p
    JOIN public.affiliates a ON a.id = p.affiliate_id
    WHERE a.user_id = auth.uid()
      AND p.proof_file_url LIKE '%' || storage.objects.name
  )
);
