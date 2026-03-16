
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_tenant_id UUID;
  user_nome TEXT;
  starter_plan_id UUID;
  v_invitation_token UUID;
  v_accept_result JSONB;
BEGIN
  user_nome := COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));

  -- Always create tenant and profile first (needed for accept_invitation to work)
  INSERT INTO public.tenants (nome, slug)
  VALUES (user_nome, NEW.id::text)
  RETURNING id INTO new_tenant_id;

  INSERT INTO public.profiles (id, tenant_id, nome, email)
  VALUES (NEW.id, new_tenant_id, user_nome, COALESCE(NEW.email, ''));

  INSERT INTO public.user_roles (user_id, role, tenant_id)
  VALUES (NEW.id, 'admin_empresa', new_tenant_id);

  -- Auto-create trial subscription with Starter plan
  SELECT id INTO starter_plan_id FROM public.plans WHERE name = 'Starter' LIMIT 1;
  IF starter_plan_id IS NOT NULL THEN
    INSERT INTO public.subscriptions (tenant_id, plan_id, status, trial_start, trial_end)
    VALUES (new_tenant_id, starter_plan_id, 'trial', now(), now() + interval '7 days');
  END IF;

  -- Check for invitation token
  v_invitation_token := (NEW.raw_user_meta_data->>'invitation_token')::uuid;
  IF v_invitation_token IS NOT NULL THEN
    v_accept_result := accept_invitation(v_invitation_token, NEW.id);
    -- If accepted, the old tenant/subscription gets cleaned up by accept_invitation
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN invalid_text_representation THEN
    -- invitation_token was not a valid UUID, ignore
    RETURN NEW;
END;
$function$;
