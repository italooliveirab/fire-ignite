ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS notes text;

CREATE POLICY "Affiliate updates own lead notes"
ON public.leads
FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = leads.affiliate_id AND a.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = leads.affiliate_id AND a.user_id = auth.uid()));