-- Add onboarding_completed column to tenants
ALTER TABLE public.tenants 
  ADD COLUMN onboarding_completed boolean NOT NULL DEFAULT false;

-- Mark ALL existing tenants as already completed (backward compatibility)
UPDATE public.tenants SET onboarding_completed = true;

-- Create complete_onboarding RPC (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.complete_onboarding(
  p_nome text, 
  p_cnpj text, 
  p_whatsapp text, 
  p_email text,
  p_cidade text, 
  p_estado text, 
  p_cep text
) RETURNS void AS $$
DECLARE 
  v_tenant_id uuid;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = auth.uid();
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  
  UPDATE tenants SET nome = p_nome, onboarding_completed = true WHERE id = v_tenant_id;
  
  INSERT INTO companies (tenant_id, nome_fantasia, cnpj, whatsapp, email, cidade, estado, cep)
    VALUES (v_tenant_id, p_nome, p_cnpj, p_whatsapp, p_email, p_cidade, p_estado, p_cep);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create get_admin_metrics RPC for super admin global metrics
CREATE OR REPLACE FUNCTION public.get_admin_metrics()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'total_tenants', (SELECT count(*) FROM tenants),
    'active_tenants', (SELECT count(*) FROM tenants WHERE status = 'ativo'),
    'suspended_tenants', (SELECT count(*) FROM tenants WHERE status = 'suspenso'),
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
$$;