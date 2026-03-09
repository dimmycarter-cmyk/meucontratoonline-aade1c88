
DO $$
DECLARE
  v_tenant_id uuid;
BEGIN
  -- Get tenant_id from profile
  SELECT tenant_id INTO v_tenant_id FROM public.profiles WHERE id = '87723dcd-65cf-4f15-89c5-72c90de6ce9d';
  
  IF v_tenant_id IS NOT NULL THEN
    -- Delete tenant data in order
    DELETE FROM public.contract_documents WHERE tenant_id = v_tenant_id;
    DELETE FROM public.template_clauses WHERE template_id IN (SELECT id FROM public.contract_templates WHERE tenant_id = v_tenant_id);
    DELETE FROM public.contracts WHERE tenant_id = v_tenant_id;
    DELETE FROM public.contacts WHERE tenant_id = v_tenant_id;
    DELETE FROM public.companies WHERE tenant_id = v_tenant_id;
    DELETE FROM public.clauses WHERE tenant_id = v_tenant_id;
    DELETE FROM public.contract_templates WHERE tenant_id = v_tenant_id;
    DELETE FROM public.subscriptions WHERE tenant_id = v_tenant_id;
    DELETE FROM public.admin_audit_logs WHERE user_id = '87723dcd-65cf-4f15-89c5-72c90de6ce9d';
    DELETE FROM public.user_roles WHERE user_id = '87723dcd-65cf-4f15-89c5-72c90de6ce9d';
    DELETE FROM public.profiles WHERE id = '87723dcd-65cf-4f15-89c5-72c90de6ce9d';
    DELETE FROM public.tenants WHERE id = v_tenant_id;
  END IF;
  
  -- Delete from auth.users
  DELETE FROM auth.users WHERE id = '87723dcd-65cf-4f15-89c5-72c90de6ce9d';
END;
$$;
