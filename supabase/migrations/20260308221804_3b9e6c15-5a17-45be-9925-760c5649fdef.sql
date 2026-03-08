
-- Create storage bucket for contract documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('contract-documents', 'contract-documents', false);

-- Create contract_documents table
CREATE TABLE public.contract_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES public.contracts(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  mime_type text NOT NULL DEFAULT 'application/octet-stream',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for contract_documents
CREATE POLICY "Users can view tenant documents"
  ON public.contract_documents FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert tenant documents"
  ON public.contract_documents FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can delete tenant documents"
  ON public.contract_documents FOR DELETE
  TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Storage policies
CREATE POLICY "Authenticated users can upload contract documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'contract-documents');

CREATE POLICY "Authenticated users can read contract documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'contract-documents');

CREATE POLICY "Authenticated users can delete contract documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'contract-documents');
