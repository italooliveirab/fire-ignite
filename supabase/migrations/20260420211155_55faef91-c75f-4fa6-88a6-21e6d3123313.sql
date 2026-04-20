-- 1. Status de payout
DO $$ BEGIN
  CREATE TYPE public.payout_status AS ENUM ('requested', 'approved', 'paid', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Estender tabela payouts
ALTER TABLE public.payouts
  ADD COLUMN IF NOT EXISTS status public.payout_status NOT NULL DEFAULT 'paid',
  ADD COLUMN IF NOT EXISTS requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_reason text,
  ADD COLUMN IF NOT EXISTS amount_requested numeric;

-- payouts antigos: marcar como 'paid'
UPDATE public.payouts SET status = 'paid', paid_at = COALESCE(paid_at, payment_date::timestamptz)
WHERE status IS NULL OR (paid_at IS NULL AND status = 'paid');

-- amount_paid agora pode ser null até efetivamente pago
ALTER TABLE public.payouts ALTER COLUMN amount_paid DROP NOT NULL;

-- 3. RLS extra para payouts (afiliado pode INSERT solicitação)
DROP POLICY IF EXISTS "Affiliate creates own payout request" ON public.payouts;
CREATE POLICY "Affiliate creates own payout request"
ON public.payouts FOR INSERT
TO authenticated
WITH CHECK (
  status = 'requested'
  AND EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.user_id = auth.uid())
);

-- 4. Tabela payout_items (liga payout às comissões pagas)
CREATE TABLE IF NOT EXISTS public.payout_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id uuid NOT NULL REFERENCES public.payouts(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('commission', 'network_referrer')),
  commission_id uuid,
  network_commission_id uuid,
  amount numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (commission_id),
  UNIQUE (network_commission_id)
);

CREATE INDEX IF NOT EXISTS idx_payout_items_payout ON public.payout_items(payout_id);

ALTER TABLE public.payout_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages payout_items" ON public.payout_items
FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Affiliate views own payout_items" ON public.payout_items
FOR SELECT TO authenticated USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.payouts p JOIN public.affiliates a ON a.id = p.affiliate_id
    WHERE p.id = payout_items.payout_id AND a.user_id = auth.uid()
  )
);

-- 5. Função: saldo do afiliado (released/paid sem payout vinculado)
CREATE OR REPLACE FUNCTION public.get_affiliate_balance(_affiliate_id uuid)
RETURNS TABLE (
  available numeric,
  pending_request numeric,
  lifetime_earned numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH normal AS (
    SELECT
      COALESCE(SUM(c.commission_value) FILTER (
        WHERE c.status IN ('released','paid')
        AND NOT EXISTS (SELECT 1 FROM payout_items pi WHERE pi.commission_id = c.id)
      ), 0) AS available,
      COALESCE(SUM(c.commission_value) FILTER (WHERE c.status IN ('released','paid')), 0) AS earned
    FROM commissions c
    WHERE c.affiliate_id = _affiliate_id
  ),
  net AS (
    SELECT
      COALESCE(SUM(nc.referrer_amount) FILTER (
        WHERE NOT EXISTS (SELECT 1 FROM payout_items pi WHERE pi.network_commission_id = nc.id)
      ), 0) AS available,
      COALESCE(SUM(nc.referrer_amount), 0) AS earned
    FROM network_commissions nc
    WHERE nc.referrer_affiliate_id = _affiliate_id
  ),
  pending AS (
    SELECT COALESCE(SUM(amount_requested), 0) AS pending_request
    FROM payouts
    WHERE affiliate_id = _affiliate_id AND status IN ('requested','approved')
  )
  SELECT
    (normal.available + net.available - pending.pending_request)::numeric AS available,
    pending.pending_request,
    (normal.earned + net.earned)::numeric AS lifetime_earned
  FROM normal, net, pending;
$$;

GRANT EXECUTE ON FUNCTION public.get_affiliate_balance(uuid) TO authenticated, anon;

-- 6. Função: solicitar saque (afiliado)
CREATE OR REPLACE FUNCTION public.request_payout(_affiliate_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_balance numeric;
  v_min numeric;
  v_payout_id uuid;
  v_user_owns boolean;
BEGIN
  -- valida ownership
  SELECT EXISTS (SELECT 1 FROM affiliates WHERE id = _affiliate_id AND user_id = auth.uid()) INTO v_user_owns;
  IF NOT v_user_owns AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  -- já existe pendente?
  IF EXISTS (SELECT 1 FROM payouts WHERE affiliate_id = _affiliate_id AND status IN ('requested','approved')) THEN
    RAISE EXCEPTION 'Já existe uma solicitação de saque em andamento';
  END IF;

  -- saldo
  SELECT available INTO v_balance FROM public.get_affiliate_balance(_affiliate_id);
  SELECT minimum_payout INTO v_min FROM public.settings LIMIT 1;
  v_min := COALESCE(v_min, 50);

  IF v_balance <= 0 THEN RAISE EXCEPTION 'Sem saldo disponível'; END IF;
  IF v_balance < v_min THEN
    RAISE EXCEPTION 'Saldo (R$ %) abaixo do mínimo de saque (R$ %)', v_balance, v_min;
  END IF;

  INSERT INTO payouts (affiliate_id, status, amount_requested, requested_at, payment_date)
  VALUES (_affiliate_id, 'requested', v_balance, now(), CURRENT_DATE)
  RETURNING id INTO v_payout_id;

  RETURN v_payout_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_payout(uuid) TO authenticated;

-- 7. Função: aprovar payout (admin) - trava as comissões
CREATE OR REPLACE FUNCTION public.approve_payout(_payout_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_aff uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Apenas admin'; END IF;

  SELECT affiliate_id INTO v_aff FROM payouts WHERE id = _payout_id AND status = 'requested';
  IF v_aff IS NULL THEN RAISE EXCEPTION 'Payout inválido ou não está em solicitação'; END IF;

  -- vincula todas comissões liberadas/pagas ainda não vinculadas
  INSERT INTO payout_items (payout_id, source_type, commission_id, amount)
  SELECT _payout_id, 'commission', c.id, c.commission_value
  FROM commissions c
  WHERE c.affiliate_id = v_aff
    AND c.status IN ('released','paid')
    AND NOT EXISTS (SELECT 1 FROM payout_items pi WHERE pi.commission_id = c.id)
  ON CONFLICT DO NOTHING;

  INSERT INTO payout_items (payout_id, source_type, network_commission_id, amount)
  SELECT _payout_id, 'network_referrer', nc.id, nc.referrer_amount
  FROM network_commissions nc
  WHERE nc.referrer_affiliate_id = v_aff
    AND nc.referrer_amount > 0
    AND NOT EXISTS (SELECT 1 FROM payout_items pi WHERE pi.network_commission_id = nc.id)
  ON CONFLICT DO NOTHING;

  UPDATE payouts SET status = 'approved', approved_at = now(), approved_by = auth.uid() WHERE id = _payout_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_payout(uuid) TO authenticated;

-- 8. Função: marcar como pago (admin)
CREATE OR REPLACE FUNCTION public.mark_payout_paid(_payout_id uuid, _amount_paid numeric, _proof_url text DEFAULT NULL, _notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Apenas admin'; END IF;

  UPDATE payouts SET
    status = 'paid', paid_at = now(),
    amount_paid = _amount_paid,
    proof_file_url = COALESCE(_proof_url, proof_file_url),
    notes = COALESCE(_notes, notes),
    payment_date = CURRENT_DATE
  WHERE id = _payout_id AND status IN ('requested','approved');

  -- marca commissions como paid
  UPDATE commissions SET status = 'paid'
  WHERE id IN (SELECT commission_id FROM payout_items WHERE payout_id = _payout_id AND commission_id IS NOT NULL);
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_payout_paid(uuid, numeric, text, text) TO authenticated;

-- 9. Função: rejeitar payout (admin)
CREATE OR REPLACE FUNCTION public.reject_payout(_payout_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Apenas admin'; END IF;
  -- libera os items se tinha
  DELETE FROM payout_items WHERE payout_id = _payout_id;
  UPDATE payouts SET status = 'rejected', rejected_reason = _reason WHERE id = _payout_id AND status IN ('requested','approved');
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_payout(uuid, text) TO authenticated;

-- 10. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.affiliate_network;
ALTER PUBLICATION supabase_realtime ADD TABLE public.network_commissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payouts;

ALTER TABLE public.affiliate_network REPLICA IDENTITY FULL;
ALTER TABLE public.network_commissions REPLICA IDENTITY FULL;
ALTER TABLE public.payouts REPLICA IDENTITY FULL;