
-- Create contracts table
CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.contract_templates(id) ON DELETE SET NULL,
  nome text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'rascunho',
  comprador_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  vendedor_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  empresa_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  conteudo_final text NOT NULL DEFAULT '',
  clausulas_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  valor_total numeric,
  valor_sinal numeric,
  valor_financiamento numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS policies
CREATE POLICY "Users can view tenant contracts"
  ON public.contracts FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert tenant contracts"
  ON public.contracts FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update tenant contracts"
  ON public.contracts FOR UPDATE
  TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can delete tenant contracts"
  ON public.contracts FOR DELETE
  TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));
