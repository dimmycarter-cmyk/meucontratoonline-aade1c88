/**
 * Lógica pura de OWNERSHIP de modelo de contrato — sem React, sem Supabase, sem `any`.
 *
 * Motivação (bug do CHECK): `useTemplates.createMutation` montava, para super admin
 * SEM impersonação, `is_global=true` JUNTO com `tenant_id=profile.tenant_id`
 * (preenchido) → violava o CHECK `contract_templates_tenant_or_global`:
 *   (is_global=true AND tenant_id IS NULL) OR (is_global=false AND tenant_id IS NOT NULL)
 * → INSERT rejeitado pelo Postgres.
 *
 * Esta função concentra a decisão pura de (tenant_id, is_global) para SEMPRE
 * satisfazer esse CHECK. Segue o padrão dos predicados de `contract-save.ts`.
 */

export interface TemplateOwnershipInput {
  isSuperAdmin: boolean;
  impersonatedTenantId: string | null;
  profileTenantId: string | null;
}

export interface TemplateOwnership {
  tenant_id: string | null;
  is_global: boolean;
}

/**
 * Resolve (tenant_id, is_global) respeitando o CHECK do banco.
 *
 *  - super admin SEM impersonação → modelo GLOBAL: `{ tenant_id: null, is_global: true }`.
 *  - super admin COM impersonação → modelo do tenant impersonado, não-global.
 *  - usuário comum                → modelo do próprio tenant, não-global.
 *
 * Precondição: usuário comum SEMPRE tem tenant (onboarding + query `enabled:!!tenantId`),
 * portanto o ramo comum nunca produz `{ tenant_id: null, is_global: false }` na prática.
 */
export function resolveTemplateOwnership(i: TemplateOwnershipInput): TemplateOwnership {
  if (i.isSuperAdmin && !i.impersonatedTenantId) {
    return { tenant_id: null, is_global: true };
  }
  if (i.isSuperAdmin && i.impersonatedTenantId) {
    return { tenant_id: i.impersonatedTenantId, is_global: false };
  }
  return { tenant_id: i.profileTenantId ?? null, is_global: false };
}
