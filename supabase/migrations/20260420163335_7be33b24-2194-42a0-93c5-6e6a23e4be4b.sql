
-- Enum para status de solicitação de afiliação
CREATE TYPE public.affiliation_status AS ENUM ('pending', 'approved', 'rejected');

-- Tabela de produtos/serviços da FIRE
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  media_kit_url text,
  commission_type public.commission_type NOT NULL DEFAULT 'percentage',
  commission_value numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads active products"
  ON public.products FOR SELECT
  USING (is_active = true OR public.is_admin(auth.uid()));

CREATE POLICY "Admin manages products"
  ON public.products FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de solicitações de afiliação por produto
CREATE TABLE public.affiliate_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  status public.affiliation_status NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by uuid,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (affiliate_id, product_id)
);

ALTER TABLE public.affiliate_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages affiliate_products"
  ON public.affiliate_products FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Affiliate views own affiliations"
  ON public.affiliate_products FOR SELECT
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.affiliates a
      WHERE a.id = affiliate_products.affiliate_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Affiliate requests own affiliation"
  ON public.affiliate_products FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.affiliates a
      WHERE a.id = affiliate_products.affiliate_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Public reads approved affiliations"
  ON public.affiliate_products FOR SELECT
  TO anon
  USING (status = 'approved');

CREATE TRIGGER affiliate_products_updated_at
  BEFORE UPDATE ON public.affiliate_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Vincular leads e commissions a um produto (opcional para compatibilidade)
ALTER TABLE public.leads ADD COLUMN product_id uuid REFERENCES public.products(id) ON DELETE SET NULL;
ALTER TABLE public.commissions ADD COLUMN product_id uuid REFERENCES public.products(id) ON DELETE SET NULL;

-- Permitir cadastro público de afiliado (cria seu próprio registro vinculado ao user_id)
CREATE POLICY "User creates own affiliate record"
  ON public.affiliates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Permitir auto-atribuição da role 'affiliate' no signup público
CREATE POLICY "User assigns own affiliate role"
  ON public.user_roles FOR INSERT
  WITH CHECK (auth.uid() = user_id AND role = 'affiliate');
