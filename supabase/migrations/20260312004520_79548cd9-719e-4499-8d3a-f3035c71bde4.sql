CREATE POLICY "Super admin can view all companies"
  ON public.companies FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin can update all companies"
  ON public.companies FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin can delete all companies"
  ON public.companies FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));