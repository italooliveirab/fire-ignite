CREATE OR REPLACE FUNCTION public.link_current_user_to_affiliate()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_aff_id uuid;
BEGIN
  IF v_uid IS NULL THEN RETURN NULL; END IF;

  -- Já vinculado? retorna o id
  SELECT id INTO v_aff_id FROM public.affiliates WHERE user_id = v_uid LIMIT 1;
  IF v_aff_id IS NOT NULL THEN RETURN v_aff_id; END IF;

  -- Pega email do auth user
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  IF v_email IS NULL THEN RETURN NULL; END IF;

  -- Procura affiliate sem vínculo com mesmo email
  SELECT id INTO v_aff_id
  FROM public.affiliates
  WHERE user_id IS NULL AND lower(email) = lower(v_email)
  LIMIT 1;

  IF v_aff_id IS NULL THEN RETURN NULL; END IF;

  UPDATE public.affiliates SET user_id = v_uid WHERE id = v_aff_id AND user_id IS NULL;

  -- Garante role de afiliado
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'affiliate')
  ON CONFLICT DO NOTHING;

  RETURN v_aff_id;
END;
$$;

REVOKE ALL ON FUNCTION public.link_current_user_to_affiliate() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_current_user_to_affiliate() TO authenticated;