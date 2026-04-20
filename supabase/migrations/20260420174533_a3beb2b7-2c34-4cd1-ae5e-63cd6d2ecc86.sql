-- Add commission fields to affiliate_products
ALTER TABLE public.affiliate_products
  ADD COLUMN commission_type public.commission_type NOT NULL DEFAULT 'percentage',
  ADD COLUMN commission_value numeric NOT NULL DEFAULT 0;

-- Backfill existing approved rows: set explicit zero (already default) — no further action needed.
-- Drop legacy commission columns from affiliates
ALTER TABLE public.affiliates
  DROP COLUMN commission_type,
  DROP COLUMN commission_value;

-- Drop legacy commission columns from products
ALTER TABLE public.products
  DROP COLUMN commission_type,
  DROP COLUMN commission_value;