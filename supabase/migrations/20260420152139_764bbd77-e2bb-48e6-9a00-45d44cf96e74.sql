CREATE POLICY "Public read affiliates for ranking"
ON public.affiliates FOR SELECT TO anon USING (true);

CREATE POLICY "Public read commissions for ranking"
ON public.commissions FOR SELECT TO anon
USING (status IN ('released'::commission_status, 'paid'::commission_status));