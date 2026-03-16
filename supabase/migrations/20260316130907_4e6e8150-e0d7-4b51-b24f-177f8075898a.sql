CREATE POLICY "Admin can delete tenant invitations"
ON public.invitations
FOR DELETE
TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
);