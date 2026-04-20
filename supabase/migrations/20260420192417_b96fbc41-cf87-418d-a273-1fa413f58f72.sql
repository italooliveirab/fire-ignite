
-- ============================================================
-- 1. Coluna referral_code em affiliates
-- ============================================================
ALTER TABLE public.affiliates
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;

-- Função para gerar código curto e único
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_code text;
  exists_count int;
BEGIN
  LOOP
    new_code := 'ref_' || lower(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    SELECT count(*) INTO exists_count FROM public.affiliates WHERE referral_code = new_code;
    EXIT WHEN exists_count = 0;
  END LOOP;
  RETURN new_code;
END;
$$;

-- Backfill para afiliados existentes
UPDATE public.affiliates
SET referral_code = public.generate_referral_code()
WHERE referral_code IS NULL;

-- Trigger para gerar automaticamente em novos afiliados
CREATE OR REPLACE FUNCTION public.set_affiliate_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_affiliate_referral_code ON public.affiliates;
CREATE TRIGGER trg_set_affiliate_referral_code
BEFORE INSERT ON public.affiliates
FOR EACH ROW EXECUTE FUNCTION public.set_affiliate_referral_code();

-- ============================================================
-- 2. ENUMs
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.network_link_status AS ENUM ('active', 'paused', 'removed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.commission_recurrence AS ENUM ('one_time', 'recurring');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 3. affiliate_network
-- ============================================================
CREATE TABLE IF NOT EXISTS public.affiliate_network (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referrer_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  status public.network_link_status NOT NULL DEFAULT 'active',
  notes text,
  linked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT affiliate_network_no_self CHECK (affiliate_id <> referrer_id),
  CONSTRAINT affiliate_network_unique_affiliate UNIQUE (affiliate_id)
);

CREATE INDEX IF NOT EXISTS idx_affiliate_network_referrer ON public.affiliate_network(referrer_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_network_status ON public.affiliate_network(status);

CREATE TRIGGER trg_affiliate_network_updated_at
BEFORE UPDATE ON public.affiliate_network
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.affiliate_network ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages affiliate_network"
ON public.affiliate_network FOR ALL
USING (public.is_admin(auth.uid()));

CREATE POLICY "Affiliate views own network links"
ON public.affiliate_network FOR SELECT
USING (
  public.is_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_network.affiliate_id AND a.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_network.referrer_id  AND a.user_id = auth.uid())
);

-- ============================================================
-- 4. network_commission_rules
-- ============================================================
CREATE TABLE IF NOT EXISTS public.network_commission_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE, -- NULL = regra global default
  priority int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,

  seller_commission_type public.commission_type NOT NULL DEFAULT 'percentage',
  seller_commission_value numeric NOT NULL DEFAULT 0 CHECK (seller_commission_value >= 0),
  seller_recurrence public.commission_recurrence NOT NULL DEFAULT 'one_time',

  referrer_commission_type public.commission_type NOT NULL DEFAULT 'percentage',
  referrer_commission_value numeric NOT NULL DEFAULT 0 CHECK (referrer_commission_value >= 0),
  referrer_recurrence public.commission_recurrence NOT NULL DEFAULT 'one_time',

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT pct_total_within_100 CHECK (
    NOT (seller_commission_type = 'percentage' AND referrer_commission_type = 'percentage'
         AND (seller_commission_value + referrer_commission_value) > 100)
  )
);

CREATE INDEX IF NOT EXISTS idx_network_rules_product ON public.network_commission_rules(product_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_network_rules_active ON public.network_commission_rules(is_active);

CREATE TRIGGER trg_network_rules_updated_at
BEFORE UPDATE ON public.network_commission_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.network_commission_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages commission rules"
ON public.network_commission_rules FOR ALL
USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated reads commission rules"
ON public.network_commission_rules FOR SELECT
TO authenticated
USING (true);

-- ============================================================
-- 5. network_commissions (histórico)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.network_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  customer_whatsapp_id text,

  seller_affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referrer_affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE SET NULL,
  rule_id uuid REFERENCES public.network_commission_rules(id) ON DELETE SET NULL,

  payment_amount numeric NOT NULL,
  seller_amount numeric NOT NULL DEFAULT 0,
  referrer_amount numeric NOT NULL DEFAULT 0,
  platform_amount numeric NOT NULL DEFAULT 0,

  seller_commission_type public.commission_type,
  referrer_commission_type public.commission_type,
  seller_recurrence public.commission_recurrence,
  referrer_recurrence public.commission_recurrence,

  payment_cycle int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT network_commissions_unique_lead UNIQUE (lead_id)
);

CREATE INDEX IF NOT EXISTS idx_netcomm_seller ON public.network_commissions(seller_affiliate_id);
CREATE INDEX IF NOT EXISTS idx_netcomm_referrer ON public.network_commissions(referrer_affiliate_id);
CREATE INDEX IF NOT EXISTS idx_netcomm_created ON public.network_commissions(created_at DESC);

ALTER TABLE public.network_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages network_commissions"
ON public.network_commissions FOR ALL
USING (public.is_admin(auth.uid()));

CREATE POLICY "Affiliate views own network commissions"
ON public.network_commissions FOR SELECT
USING (
  public.is_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = network_commissions.seller_affiliate_id   AND a.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = network_commissions.referrer_affiliate_id AND a.user_id = auth.uid())
);

-- ============================================================
-- 6. Função de cálculo + trigger em leads
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_network_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule public.network_commission_rules%ROWTYPE;
  v_referrer_id uuid;
  v_cycle int;
  v_seller_amount numeric := 0;
  v_referrer_amount numeric := 0;
  v_platform_amount numeric := 0;
  v_amount numeric;
BEGIN
  -- só dispara quando vira paid e tem valor
  IF NEW.status <> 'paid' OR COALESCE(NEW.payment_amount, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  -- evita duplicidade (UNIQUE também protege, mas saímos cedo)
  IF EXISTS (SELECT 1 FROM public.network_commissions WHERE lead_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  v_amount := NEW.payment_amount;

  -- ciclo: nº de leads pagos anteriores do mesmo cliente (whatsapp_id) com o mesmo afiliado
  IF NEW.whatsapp_id IS NOT NULL THEN
    SELECT count(*) + 1 INTO v_cycle
    FROM public.leads
    WHERE affiliate_id = NEW.affiliate_id
      AND whatsapp_id = NEW.whatsapp_id
      AND status = 'paid'
      AND id <> NEW.id
      AND paid_at < COALESCE(NEW.paid_at, now());
  ELSE
    v_cycle := 1;
  END IF;

  -- regra: produto específico ativo > regra global ativa, maior prioridade
  SELECT * INTO v_rule
  FROM public.network_commission_rules
  WHERE is_active
    AND (product_id = NEW.product_id OR product_id IS NULL)
  ORDER BY (product_id = NEW.product_id) DESC NULLS LAST, priority DESC, created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NEW; -- sem regra, não calcula nada de rede
  END IF;

  -- afiliador
  SELECT referrer_id INTO v_referrer_id
  FROM public.affiliate_network
  WHERE affiliate_id = NEW.affiliate_id AND status = 'active';

  -- vendedor
  IF v_rule.seller_recurrence = 'recurring' OR v_cycle = 1 THEN
    IF v_rule.seller_commission_type = 'percentage' THEN
      v_seller_amount := round((v_amount * v_rule.seller_commission_value / 100)::numeric, 2);
    ELSE
      v_seller_amount := v_rule.seller_commission_value;
    END IF;
  END IF;

  -- afiliador
  IF v_referrer_id IS NOT NULL AND (v_rule.referrer_recurrence = 'recurring' OR v_cycle = 1) THEN
    IF v_rule.referrer_commission_type = 'percentage' THEN
      v_referrer_amount := round((v_amount * v_rule.referrer_commission_value / 100)::numeric, 2);
    ELSE
      v_referrer_amount := v_rule.referrer_commission_value;
    END IF;
  END IF;

  -- garante que não passa do total
  IF v_seller_amount + v_referrer_amount > v_amount THEN
    v_referrer_amount := GREATEST(0, v_amount - v_seller_amount);
  END IF;

  v_platform_amount := v_amount - v_seller_amount - v_referrer_amount;

  INSERT INTO public.network_commissions (
    lead_id, product_id, customer_whatsapp_id,
    seller_affiliate_id, referrer_affiliate_id, rule_id,
    payment_amount, seller_amount, referrer_amount, platform_amount,
    seller_commission_type, referrer_commission_type,
    seller_recurrence, referrer_recurrence, payment_cycle
  ) VALUES (
    NEW.id, NEW.product_id, NEW.whatsapp_id,
    NEW.affiliate_id, v_referrer_id, v_rule.id,
    v_amount, v_seller_amount, v_referrer_amount, v_platform_amount,
    v_rule.seller_commission_type, v_rule.referrer_commission_type,
    v_rule.seller_recurrence, v_rule.referrer_recurrence, v_cycle
  )
  ON CONFLICT (lead_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_process_network_commission ON public.leads;
CREATE TRIGGER trg_process_network_commission
AFTER INSERT OR UPDATE OF status, payment_amount ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.process_network_commission();
