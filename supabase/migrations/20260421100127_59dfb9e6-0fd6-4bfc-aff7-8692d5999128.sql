CREATE TABLE public.debug_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  category text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  duration_ms numeric,
  route text,
  user_id uuid,
  user_email text,
  context jsonb
);

CREATE INDEX idx_debug_events_created_at ON public.debug_events(created_at DESC);
CREATE INDEX idx_debug_events_category ON public.debug_events(category);
CREATE INDEX idx_debug_events_severity ON public.debug_events(severity);

ALTER TABLE public.debug_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages debug_events"
  ON public.debug_events FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated inserts own debug events"
  ON public.debug_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.cleanup_debug_events()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.debug_events WHERE created_at < now() - interval '7 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;