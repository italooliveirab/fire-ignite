-- 1) Tipo de produto
DO $$ BEGIN
  CREATE TYPE public.product_kind AS ENUM ('normal', 'network');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_type public.product_kind NOT NULL DEFAULT 'normal';

-- Marcar produto existente FIRENET B como network
UPDATE public.products SET product_type = 'network' WHERE slug = 'firenet-b';
UPDATE public.products SET product_type = 'normal' WHERE slug <> 'firenet-b';

-- 2) Helper: o afiliado é membro ativo de uma rede?
CREATE OR REPLACE FUNCTION public.is_network_member(_affiliate_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.affiliate_network
    WHERE affiliate_id = _affiliate_id AND status = 'active'
  );
$$;

-- 3) Trigger: bloquear afiliação cruzada (indicado em normal, independente em network)
CREATE OR REPLACE FUNCTION public.enforce_product_visibility()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_kind public.product_kind;
  v_is_member boolean;
BEGIN
  SELECT product_type INTO v_kind FROM public.products WHERE id = NEW.product_id;
  v_is_member := public.is_network_member(NEW.affiliate_id);

  IF v_kind = 'normal' AND v_is_member THEN
    RAISE EXCEPTION 'Afiliados indicados (membros de rede) não podem se afiliar a produtos comuns. Use apenas produtos de rede.';
  END IF;

  IF v_kind = 'network' AND NOT v_is_member THEN
    RAISE EXCEPTION 'Apenas afiliados membros de uma rede podem se afiliar a produtos de rede.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_product_visibility ON public.affiliate_products;
CREATE TRIGGER trg_enforce_product_visibility
  BEFORE INSERT ON public.affiliate_products
  FOR EACH ROW EXECUTE FUNCTION public.enforce_product_visibility();

-- 4) Trigger: ao virar membro de rede, aprovar automaticamente em todos produtos network ativos
CREATE OR REPLACE FUNCTION public.auto_approve_network_products()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' THEN
    INSERT INTO public.affiliate_products (affiliate_id, product_id, status, decided_at)
    SELECT NEW.affiliate_id, p.id, 'approved', now()
    FROM public.products p
    WHERE p.product_type = 'network' AND p.is_active = true
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_approve_network_products ON public.affiliate_network;
CREATE TRIGGER trg_auto_approve_network_products
  AFTER INSERT ON public.affiliate_network
  FOR EACH ROW EXECUTE FUNCTION public.auto_approve_network_products();

-- Backfill: membros de rede já existentes recebem afiliação aprovada para network products
INSERT INTO public.affiliate_products (affiliate_id, product_id, status, decided_at)
SELECT an.affiliate_id, p.id, 'approved', now()
FROM public.affiliate_network an
CROSS JOIN public.products p
WHERE an.status = 'active'
  AND p.product_type = 'network' AND p.is_active = true
ON CONFLICT DO NOTHING;

-- 5) RLS pública: anon só lê produtos NORMAL ativos (página /p é só para FIRENET A)
DROP POLICY IF EXISTS "Anyone reads active products" ON public.products;
CREATE POLICY "Public reads active normal products"
  ON public.products FOR SELECT
  TO anon
  USING (is_active = true AND product_type = 'normal');

CREATE POLICY "Authenticated reads active products"
  ON public.products FOR SELECT
  TO authenticated
  USING (is_active = true OR is_admin(auth.uid()));