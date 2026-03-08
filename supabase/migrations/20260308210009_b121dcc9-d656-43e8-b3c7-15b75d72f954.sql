
-- Contract Templates (Modelos)
CREATE TABLE public.contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL DEFAULT 'Compra e Venda',
  conteudo TEXT NOT NULL DEFAULT '',
  variaveis JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'rascunho',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

-- Clauses (Cláusulas)
CREATE TABLE public.clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  titulo TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Geral',
  conteudo TEXT NOT NULL DEFAULT '',
  ativa BOOLEAN NOT NULL DEFAULT true,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clauses ENABLE ROW LEVEL SECURITY;

-- Template-Clause junction
CREATE TABLE public.template_clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.contract_templates(id) ON DELETE CASCADE NOT NULL,
  clause_id UUID REFERENCES public.clauses(id) ON DELETE CASCADE NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  UNIQUE(template_id, clause_id)
);

ALTER TABLE public.template_clauses ENABLE ROW LEVEL SECURITY;

-- RLS: contract_templates
CREATE POLICY "Users can view tenant templates" ON public.contract_templates
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert tenant templates" ON public.contract_templates
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update tenant templates" ON public.contract_templates
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can delete tenant templates" ON public.contract_templates
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- RLS: clauses
CREATE POLICY "Users can view tenant clauses" ON public.clauses
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert tenant clauses" ON public.clauses
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update tenant clauses" ON public.clauses
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can delete tenant clauses" ON public.clauses
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- RLS: template_clauses (through template ownership)
CREATE POLICY "Users can view template clauses" ON public.template_clauses
  FOR SELECT TO authenticated
  USING (
    template_id IN (
      SELECT id FROM public.contract_templates 
      WHERE tenant_id = public.get_user_tenant_id(auth.uid())
    )
  );

CREATE POLICY "Users can insert template clauses" ON public.template_clauses
  FOR INSERT TO authenticated
  WITH CHECK (
    template_id IN (
      SELECT id FROM public.contract_templates 
      WHERE tenant_id = public.get_user_tenant_id(auth.uid())
    )
  );

CREATE POLICY "Users can delete template clauses" ON public.template_clauses
  FOR DELETE TO authenticated
  USING (
    template_id IN (
      SELECT id FROM public.contract_templates 
      WHERE tenant_id = public.get_user_tenant_id(auth.uid())
    )
  );
