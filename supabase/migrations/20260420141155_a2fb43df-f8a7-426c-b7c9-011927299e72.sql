DROP POLICY IF EXISTS "Authenticated read settings" ON public.settings;
CREATE POLICY "Anyone reads settings"
ON public.settings
FOR SELECT
TO anon, authenticated
USING (true);