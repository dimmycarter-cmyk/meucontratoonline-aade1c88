DROP FUNCTION IF EXISTS public.check_tenant_limits(uuid);

CREATE FUNCTION public.check_tenant_limits(p_tenant_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id uuid;
  v_plan_name text;
  v_max_contracts int;
  v_max_users int;
  v_current_contracts int;
  v_current_users int;
  v_sub_status text;
  v_trial_end timestamptz;
BEGIN
  SELECT s.plan_id, s.status, s.trial_end, p.name, p.max_contracts_per_month, p.max_users
  INTO v_plan_id, v_sub_status, v_trial_end, v_plan_name, v_max_contracts, v_max_users
  FROM subscriptions s
  JOIN plans p ON p.id = s.plan_id
  WHERE s.tenant_id = p_tenant_id
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    RETURN json_build_object(
      'can_create_contract', true,
      'can_add_user', true,
      'current_contracts_this_month', 0,
      'max_contracts_per_month', 999999,
      'current_users', 0,
      'max_users', 999999,
      'plan_name', 'Sem plano',
      'subscription_status', 'none',
      'trial_end', null
    );
  END IF;

  SELECT count(*) INTO v_current_contracts
  FROM contracts
  WHERE tenant_id = p_tenant_id
    AND created_at >= date_trunc('month', now())
    AND created_at < date_trunc('month', now()) + interval '1 month';

  SELECT count(*) INTO v_current_users
  FROM profiles
  WHERE tenant_id = p_tenant_id;

  -- TODO: Re-enable limit enforcement after launch
  RETURN json_build_object(
    'can_create_contract', true,
    'can_add_user', true,
    'current_contracts_this_month', v_current_contracts,
    'max_contracts_per_month', v_max_contracts,
    'current_users', v_current_users,
    'max_users', v_max_users,
    'plan_name', v_plan_name,
    'subscription_status', v_sub_status,
    'trial_end', v_trial_end
  );
END;
$$;