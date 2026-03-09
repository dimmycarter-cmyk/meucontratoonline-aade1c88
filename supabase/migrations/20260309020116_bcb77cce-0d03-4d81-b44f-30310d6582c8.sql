
-- Create plans table
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  max_users integer NOT NULL DEFAULT 3,
  max_contracts_per_month integer NOT NULL DEFAULT 50,
  price numeric NOT NULL DEFAULT 0,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Everyone can read plans
CREATE POLICY "Anyone can view plans" ON public.plans FOR SELECT TO authenticated USING (true);

-- Only super_admin can manage plans
CREATE POLICY "Super admin can insert plans" ON public.plans FOR INSERT WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin can update plans" ON public.plans FOR UPDATE USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin can delete plans" ON public.plans FOR DELETE USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  status text NOT NULL DEFAULT 'trial',
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz,
  trial_start timestamptz DEFAULT now(),
  trial_end timestamptz DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Super admin can do everything with subscriptions
CREATE POLICY "Super admin can view all subscriptions" ON public.subscriptions FOR SELECT USING (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin can insert subscriptions" ON public.subscriptions FOR INSERT WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin can update subscriptions" ON public.subscriptions FOR UPDATE USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin can delete subscriptions" ON public.subscriptions FOR DELETE USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Seed 3 plans
INSERT INTO public.plans (name, max_users, max_contracts_per_month, price, features) VALUES
  ('Starter', 3, 50, 0, '["Até 3 usuários","Até 50 contratos/mês","Acesso básico"]'::jsonb),
  ('Professional', 10, 999999, 149.90, '["Até 10 usuários","Contratos ilimitados","IA para geração de contratos"]'::jsonb),
  ('Enterprise', 999999, 999999, 399.90, '["Usuários ilimitados","Contratos ilimitados","IA avançada","Suporte prioritário"]'::jsonb);

-- Update handle_new_user to create subscription with trial
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
BEGIN
  user_nome := COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));

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

  RETURN NEW;
END;
$function$;

-- Create check_tenant_limits function
CREATE OR REPLACE FUNCTION public.check_tenant_limits(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'can_create_contract', (
      CASE
        WHEN s.status = 'suspended' THEN false
        WHEN s.status = 'expired' THEN false
        WHEN s.status = 'trial' AND s.trial_end < now() THEN false
        WHEN (SELECT count(*) FROM contracts WHERE tenant_id = p_tenant_id AND created_at >= date_trunc('month', now())) >= p.max_contracts_per_month THEN false
        ELSE true
      END
    ),
    'can_add_user', (
      CASE
        WHEN s.status IN ('suspended', 'expired') THEN false
        WHEN s.status = 'trial' AND s.trial_end < now() THEN false
        WHEN (SELECT count(*) FROM profiles WHERE tenant_id = p_tenant_id) >= p.max_users THEN false
        ELSE true
      END
    ),
    'current_contracts_this_month', (SELECT count(*) FROM contracts WHERE tenant_id = p_tenant_id AND created_at >= date_trunc('month', now())),
    'max_contracts_per_month', p.max_contracts_per_month,
    'current_users', (SELECT count(*) FROM profiles WHERE tenant_id = p_tenant_id),
    'max_users', p.max_users,
    'plan_name', p.name,
    'subscription_status', s.status,
    'trial_end', s.trial_end
  )
  FROM subscriptions s
  JOIN plans p ON p.id = s.plan_id
  WHERE s.tenant_id = p_tenant_id
  LIMIT 1
$$;

-- Update get_admin_metrics to include trial info
CREATE OR REPLACE FUNCTION public.get_admin_metrics()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'total_tenants', (SELECT count(*) FROM tenants),
    'active_tenants', (SELECT count(*) FROM tenants WHERE status = 'ativo'),
    'suspended_tenants', (SELECT count(*) FROM tenants WHERE status = 'suspenso'),
    'trial_tenants', (SELECT count(*) FROM subscriptions WHERE status = 'trial' AND trial_end >= now()),
    'total_users', (SELECT count(*) FROM profiles),
    'total_contracts', (SELECT count(*) FROM contracts),
    'contracts_this_month', (SELECT count(*) FROM contracts WHERE created_at >= date_trunc('month', now())),
    'tenants_by_month', (
      SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb) FROM (
        SELECT to_char(date_trunc('month', created_at), 'Mon') as month,
               count(*) as total
        FROM tenants
        WHERE created_at >= now() - interval '6 months'
        GROUP BY 1, date_trunc('month', created_at)
        ORDER BY date_trunc('month', created_at)
      ) r
    ),
    'contracts_by_month', (
      SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb) FROM (
        SELECT to_char(date_trunc('month', created_at), 'Mon') as month,
               count(*) as total
        FROM contracts
        WHERE created_at >= now() - interval '6 months'
        GROUP BY 1, date_trunc('month', created_at)
        ORDER BY date_trunc('month', created_at)
      ) r
    )
  )
$function$;

-- Create existing subscriptions for existing tenants (Starter plan, active status)
INSERT INTO public.subscriptions (tenant_id, plan_id, status, trial_start, trial_end)
SELECT t.id, (SELECT id FROM plans WHERE name = 'Starter' LIMIT 1), 'active', now() - interval '30 days', now() - interval '23 days'
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.tenant_id = t.id);
