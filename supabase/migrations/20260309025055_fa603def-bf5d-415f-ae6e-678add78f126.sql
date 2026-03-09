
CREATE OR REPLACE FUNCTION public.complete_onboarding(
  p_nome text,
  p_cnpj text,
  p_whatsapp text,
  p_email text,
  p_cidade text,
  p_estado text,
  p_cep text,
  p_rua text DEFAULT '',
  p_numero text DEFAULT '',
  p_complemento text DEFAULT '',
  p_bairro text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE 
  v_tenant_id uuid;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = auth.uid();
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  
  UPDATE tenants SET nome = p_nome, onboarding_completed = true WHERE id = v_tenant_id;
  
  INSERT INTO companies (tenant_id, nome_fantasia, cnpj, whatsapp, email, cidade, estado, cep, rua, numero, complemento, bairro)
    VALUES (v_tenant_id, p_nome, p_cnpj, p_whatsapp, p_email, p_cidade, p_estado, p_cep, p_rua, p_numero, p_complemento, p_bairro);
END;
$$;
