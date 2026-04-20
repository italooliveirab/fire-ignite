ALTER TABLE public.affiliate_products
ADD COLUMN IF NOT EXISTS custom_slug text;

CREATE UNIQUE INDEX IF NOT EXISTS affiliate_products_product_custom_slug_unique
ON public.affiliate_products (product_id, custom_slug)
WHERE custom_slug IS NOT NULL;