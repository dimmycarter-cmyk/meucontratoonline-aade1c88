-- Add super_admin RLS policies for contracts table
CREATE POLICY "Super admin can view all contracts"
  ON public.contracts FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin can insert all contracts"
  ON public.contracts FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin can update all contracts"
  ON public.contracts FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin can delete all contracts"
  ON public.contracts FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add super_admin RLS policies for contacts table
CREATE POLICY "Super admin can view all contacts"
  ON public.contacts FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin can insert all contacts"
  ON public.contacts FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin can update all contacts"
  ON public.contacts FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin can delete all contacts"
  ON public.contacts FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add super_admin RLS policies for clauses table
CREATE POLICY "Super admin can view all clauses"
  ON public.clauses FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin can insert all clauses"
  ON public.clauses FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin can update all clauses"
  ON public.clauses FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin can delete all clauses"
  ON public.clauses FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add super_admin RLS policies for contract_documents table
CREATE POLICY "Super admin can view all contract documents"
  ON public.contract_documents FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin can insert all contract documents"
  ON public.contract_documents FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin can update all contract documents"
  ON public.contract_documents FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin can delete all contract documents"
  ON public.contract_documents FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));