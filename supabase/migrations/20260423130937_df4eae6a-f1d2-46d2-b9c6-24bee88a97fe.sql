CREATE TABLE public.contract_test_fixtures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  conteudo_original text NOT NULL,
  template_id uuid,
  pii_detected jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_test_fixtures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin can view fixtures"
  ON public.contract_test_fixtures FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin can insert fixtures"
  ON public.contract_test_fixtures FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin can update fixtures"
  ON public.contract_test_fixtures FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin can delete fixtures"
  ON public.contract_test_fixtures FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));