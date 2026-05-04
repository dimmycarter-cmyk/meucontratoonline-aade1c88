CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created ON public.audit_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity         ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user           ON public.audit_logs(user_id, created_at DESC);

DROP POLICY IF EXISTS "Members can insert audit logs" ON public.audit_logs;
CREATE POLICY "Members can insert audit logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Admins can view tenant audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view tenant audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin_empresa'::app_role)
  );

DROP POLICY IF EXISTS "Super admin can view all audit logs" ON public.audit_logs;
CREATE POLICY "Super admin can view all audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

REVOKE UPDATE, DELETE ON public.audit_logs FROM authenticated, anon;