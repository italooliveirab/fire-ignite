-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'affiliate');
CREATE TYPE public.affiliate_status AS ENUM ('active', 'paused', 'blocked');
CREATE TYPE public.commission_type AS ENUM ('percentage', 'fixed');
CREATE TYPE public.lead_status AS ENUM ('initiated_conversation', 'generated_trial', 'generated_payment', 'paid', 'not_paid');
CREATE TYPE public.commission_status AS ENUM ('pending', 'released', 'paid');
CREATE TYPE public.pix_type AS ENUM ('cpf', 'cnpj', 'email', 'phone', 'random');
CREATE TYPE public.payout_frequency AS ENUM ('weekly', 'biweekly', 'monthly');

-- ============ HELPER: timestamp trigger ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
$$;

-- ============ AFFILIATES ============
CREATE TABLE public.affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  instagram TEXT,
  pix_key TEXT,
  pix_type pix_type,
  commission_type commission_type NOT NULL DEFAULT 'percentage',
  commission_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  slug TEXT NOT NULL UNIQUE,
  status affiliate_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER affiliates_updated BEFORE UPDATE ON public.affiliates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_affiliates_slug ON public.affiliates(slug);
CREATE INDEX idx_affiliates_status ON public.affiliates(status);

-- ============ LEADS ============
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  customer_name TEXT,
  whatsapp_number TEXT,
  whatsapp_id TEXT,
  status lead_status NOT NULL DEFAULT 'initiated_conversation',
  payment_amount NUMERIC(12,2),
  conversation_started_at TIMESTAMPTZ,
  trial_generated_at TIMESTAMPTZ,
  payment_generated_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER leads_updated BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_leads_affiliate ON public.leads(affiliate_id);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_created ON public.leads(created_at DESC);

-- ============ COMMISSIONS ============
CREATE TABLE public.commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  commission_type commission_type NOT NULL,
  commission_value NUMERIC(12,2) NOT NULL,
  status commission_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER commissions_updated BEFORE UPDATE ON public.commissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_commissions_affiliate ON public.commissions(affiliate_id);
CREATE INDEX idx_commissions_status ON public.commissions(status);

-- ============ PAYOUTS ============
CREATE TABLE public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  amount_paid NUMERIC(12,2) NOT NULL,
  reference_period TEXT,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  pix_key_used TEXT,
  proof_file_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_payouts_affiliate ON public.payouts(affiliate_id);

-- ============ SETTINGS (singleton) ============
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL DEFAULT 'FIRE',
  logo_url TEXT,
  support_email TEXT,
  support_whatsapp TEXT,
  payout_frequency payout_frequency NOT NULL DEFAULT 'weekly',
  minimum_payout NUMERIC(12,2) NOT NULL DEFAULT 50,
  retention_days INTEGER NOT NULL DEFAULT 7,
  payment_policy_text TEXT,
  affiliate_link_domain TEXT NOT NULL DEFAULT 'fire.com',
  affiliate_link_prefix TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER settings_updated BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.settings (company_name) VALUES ('FIRE');

-- ============ API KEYS (integração externa) ============
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============

-- profiles
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin manages profiles" ON public.profiles FOR ALL USING (public.is_admin(auth.uid()));

-- user_roles
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Admin manages roles" ON public.user_roles FOR ALL USING (public.is_admin(auth.uid()));

-- affiliates
CREATE POLICY "Affiliate views self" ON public.affiliates FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Affiliate updates self limited" ON public.affiliates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admin manages affiliates" ON public.affiliates FOR ALL USING (public.is_admin(auth.uid()));

-- leads
CREATE POLICY "Affiliate views own leads" ON public.leads FOR SELECT USING (
  public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = leads.affiliate_id AND a.user_id = auth.uid())
);
CREATE POLICY "Admin manages leads" ON public.leads FOR ALL USING (public.is_admin(auth.uid()));

-- commissions
CREATE POLICY "Affiliate views own commissions" ON public.commissions FOR SELECT USING (
  public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = commissions.affiliate_id AND a.user_id = auth.uid())
);
CREATE POLICY "Admin manages commissions" ON public.commissions FOR ALL USING (public.is_admin(auth.uid()));

-- payouts
CREATE POLICY "Affiliate views own payouts" ON public.payouts FOR SELECT USING (
  public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = payouts.affiliate_id AND a.user_id = auth.uid())
);
CREATE POLICY "Admin manages payouts" ON public.payouts FOR ALL USING (public.is_admin(auth.uid()));

-- settings
CREATE POLICY "Authenticated read settings" ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin updates settings" ON public.settings FOR UPDATE USING (public.is_admin(auth.uid()));

-- api_keys
CREATE POLICY "Admin manages api keys" ON public.api_keys FOR ALL USING (public.is_admin(auth.uid()));

-- ============ TRIGGER: criar profile automático no signup ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();