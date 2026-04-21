-- Add new lead_status values: support_received, renewed, lost
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'support_received';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'renewed';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'lost';