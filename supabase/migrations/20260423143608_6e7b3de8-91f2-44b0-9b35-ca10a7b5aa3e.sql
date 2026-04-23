ALTER TABLE public.contract_templates ALTER COLUMN tenant_id DROP NOT NULL;

ALTER TABLE public.contract_templates
  ADD CONSTRAINT contract_templates_tenant_or_global
  CHECK (
    (is_global = true AND tenant_id IS NULL)
    OR (is_global = false AND tenant_id IS NOT NULL)
  );