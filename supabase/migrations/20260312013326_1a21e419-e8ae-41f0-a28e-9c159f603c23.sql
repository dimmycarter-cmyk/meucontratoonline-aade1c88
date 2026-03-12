
-- Create participant roles type
CREATE TYPE public.participant_role AS ENUM (
  'comprador', 'vendedor', 'conjuge', 'fiador', 'testemunha', 'procurador', 'interveniente', 'outro'
);

-- Create document type enum
CREATE TYPE public.document_type AS ENUM (
  'cnh', 'rg', 'cpf', 'comprovante_endereco', 'certidao_casamento', 'procuracao', 'contrato_social', 'cnpj', 'outro'
);

-- Create processing status enum
CREATE TYPE public.processing_status AS ENUM (
  'pending', 'processing', 'completed', 'failed', 'low_confidence'
);

-- Table: contract_participants
CREATE TABLE public.contract_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES public.contracts(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  role participant_role NOT NULL DEFAULT 'comprador',
  full_name text NOT NULL DEFAULT '',
  cpf text,
  rg text,
  issuing_agency text,
  birth_date date,
  marital_status text,
  profession text,
  nationality text DEFAULT 'Brasileiro(a)',
  gender text,
  email text,
  whatsapp text,
  address_zipcode text,
  address_street text,
  address_number text,
  address_complement text,
  address_neighborhood text,
  address_city text,
  address_state text,
  company_name text,
  trade_name text,
  cnpj text,
  legal_representative_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for contract_participants
CREATE POLICY "Users can view tenant participants" ON public.contract_participants
  FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant participants" ON public.contract_participants
  FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update tenant participants" ON public.contract_participants
  FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete tenant participants" ON public.contract_participants
  FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Super admin can manage all participants" ON public.contract_participants
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Table: participant_documents
CREATE TABLE public.participant_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES public.contract_participants(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  mime_type text NOT NULL DEFAULT 'application/octet-stream',
  document_type document_type NOT NULL DEFAULT 'outro',
  processing_status processing_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for participant_documents
CREATE POLICY "Users can view tenant participant docs" ON public.participant_documents
  FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant participant docs" ON public.participant_documents
  FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update tenant participant docs" ON public.participant_documents
  FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete tenant participant docs" ON public.participant_documents
  FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Super admin can manage all participant docs" ON public.participant_documents
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Table: extracted_document_data
CREATE TABLE public.extracted_document_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.participant_documents(id) ON DELETE CASCADE,
  extracted_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_score numeric NOT NULL DEFAULT 0,
  reviewed boolean NOT NULL DEFAULT false,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for extracted_document_data (join through participant_documents -> tenant_id)
CREATE POLICY "Users can view tenant extracted data" ON public.extracted_document_data
  FOR SELECT TO authenticated USING (
    document_id IN (SELECT id FROM participant_documents WHERE tenant_id = get_user_tenant_id(auth.uid()))
  );
CREATE POLICY "Users can insert tenant extracted data" ON public.extracted_document_data
  FOR INSERT TO authenticated WITH CHECK (
    document_id IN (SELECT id FROM participant_documents WHERE tenant_id = get_user_tenant_id(auth.uid()))
  );
CREATE POLICY "Users can update tenant extracted data" ON public.extracted_document_data
  FOR UPDATE TO authenticated USING (
    document_id IN (SELECT id FROM participant_documents WHERE tenant_id = get_user_tenant_id(auth.uid()))
  ) WITH CHECK (
    document_id IN (SELECT id FROM participant_documents WHERE tenant_id = get_user_tenant_id(auth.uid()))
  );
CREATE POLICY "Super admin can manage all extracted data" ON public.extracted_document_data
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
