-- Allow authenticated users to see basic affiliate info for public ranking
CREATE POLICY "Authenticated read affiliates for ranking"
ON public.affiliates
FOR SELECT
TO authenticated
USING (true);