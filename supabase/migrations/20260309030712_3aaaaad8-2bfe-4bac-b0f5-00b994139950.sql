-- Clean up orphaned tenants (no profiles referencing them)
DELETE FROM companies WHERE tenant_id IN (
  SELECT t.id FROM tenants t
  LEFT JOIN profiles p ON p.tenant_id = t.id
  WHERE p.id IS NULL
);

DELETE FROM subscriptions WHERE tenant_id IN (
  SELECT t.id FROM tenants t
  LEFT JOIN profiles p ON p.tenant_id = t.id
  WHERE p.id IS NULL
);

DELETE FROM tenants WHERE id IN (
  SELECT t.id FROM tenants t
  LEFT JOIN profiles p ON p.tenant_id = t.id
  WHERE p.id IS NULL
);