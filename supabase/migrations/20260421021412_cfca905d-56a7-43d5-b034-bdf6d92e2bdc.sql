CREATE OR REPLACE FUNCTION public.recalculate_network_commissions()
RETURNS TABLE(processed integer, skipped integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead RECORD;
  v_processed int := 0;
  v_skipped int := 0;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem recalcular comissões';
  END IF;

  FOR v_lead IN
    SELECT l.* FROM public.leads l
    WHERE l.status = 'paid'
      AND COALESCE(l.payment_amount, 0) > 0
      AND NOT EXISTS (SELECT 1 FROM public.network_commissions nc WHERE nc.lead_id = l.id)
  LOOP
    -- força o trigger reexecutando o UPDATE para 'paid'
    BEGIN
      UPDATE public.leads SET status = 'paid', updated_at = now() WHERE id = v_lead.id;
      IF EXISTS (SELECT 1 FROM public.network_commissions WHERE lead_id = v_lead.id) THEN
        v_processed := v_processed + 1;
      ELSE
        v_skipped := v_skipped + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_skipped := v_skipped + 1;
    END;
  END LOOP;

  RETURN QUERY SELECT v_processed, v_skipped;
END;
$$;