
-- Add is_global column to contract_templates
ALTER TABLE public.contract_templates ADD COLUMN is_global boolean NOT NULL DEFAULT false;

-- Super admin can view all templates
CREATE POLICY "Super admin can view all templates"
  ON public.contract_templates FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admin can insert templates
CREATE POLICY "Super admin can insert all templates"
  ON public.contract_templates FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admin can update all templates
CREATE POLICY "Super admin can update all templates"
  ON public.contract_templates FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admin can delete all templates
CREATE POLICY "Super admin can delete all templates"
  ON public.contract_templates FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- All authenticated users can view global templates
CREATE POLICY "Users can view global templates"
  ON public.contract_templates FOR SELECT TO authenticated
  USING (is_global = true);

-- Super admin RLS for template_clauses (needed for global templates)
CREATE POLICY "Super admin can view all template clauses"
  ON public.template_clauses FOR SELECT TO authenticated
  USING (template_id IN (SELECT id FROM contract_templates WHERE has_role(auth.uid(), 'super_admin'::app_role)));

CREATE POLICY "Super admin can insert all template clauses"
  ON public.template_clauses FOR INSERT TO authenticated
  WITH CHECK (template_id IN (SELECT id FROM contract_templates WHERE has_role(auth.uid(), 'super_admin'::app_role)));

CREATE POLICY "Super admin can delete all template clauses"
  ON public.template_clauses FOR DELETE TO authenticated
  USING (template_id IN (SELECT id FROM contract_templates WHERE has_role(auth.uid(), 'super_admin'::app_role)));
