
## Analysis of Current State vs. Requested Architecture

**What already works correctly:**
- `handle_new_user` assigns `admin_empresa` to new users — NOT `super_admin`. The super_admin concern is about *flow*, not the DB trigger.
- `tenant_id` already serves as `company_id` in all tables — no new field needed.
- The `tenants` table = imobiliárias (SaaS tenants). The `companies` table = company details used in contracts.
- RLS is already structured correctly for multi-tenancy.

**What is missing:**
1. No mandatory onboarding after registration (company details not collected)
2. Super Admin dashboard has no real global metrics — just user/tenant management
3. Company dashboard (`Dashboard.tsx`) uses hardcoded mock data
4. No impersonation feature
5. No clear signal to ProtectedRoute about onboarding completion

---

## Implementation Plan

### 1. Database Migration

**a) Add `onboarding_completed` column to `tenants`:**
```sql
ALTER TABLE public.tenants 
  ADD COLUMN onboarding_completed boolean NOT NULL DEFAULT false;

-- Mark ALL existing tenants as already completed (backward compatibility)
UPDATE public.tenants SET onboarding_completed = true;
```

**b) Create `complete_onboarding` RPC (SECURITY DEFINER):**
A safe server-side function that (1) updates tenant `nome` + sets `onboarding_completed = true` and (2) creates the first `companies` record. Runs as SECURITY DEFINER so no extra RLS UPDATE policy is needed on `tenants`.
```sql
CREATE OR REPLACE FUNCTION public.complete_onboarding(
  p_nome text, p_cnpj text, p_whatsapp text, p_email text,
  p_cidade text, p_estado text, p_cep text
) RETURNS void AS $$
DECLARE v_tenant_id uuid;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = auth.uid();
  UPDATE tenants SET nome = p_nome, onboarding_completed = true WHERE id = v_tenant_id;
  INSERT INTO companies (tenant_id, nome_fantasia, cnpj, whatsapp, email, cidade, estado, cep)
    VALUES (v_tenant_id, p_nome, p_cnpj, p_whatsapp, p_email, p_cidade, p_estado, p_cep);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

**c) Create `get_admin_metrics` RPC for super admin global metrics:**
```sql
CREATE OR REPLACE FUNCTION public.get_admin_metrics()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'total_tenants', (SELECT count(*) FROM tenants),
    'active_tenants', (SELECT count(*) FROM tenants WHERE status = 'ativo'),
    'total_users', (SELECT count(*) FROM profiles),
    'total_contracts', (SELECT count(*) FROM contracts),
    'contracts_this_month', (SELECT count(*) FROM contracts WHERE created_at >= date_trunc('month', now())),
    'tenants_by_month', (
      SELECT jsonb_agg(row_to_json(r)) FROM (
        SELECT to_char(date_trunc('month', created_at), 'Mon') as month,
               count(*) as total
        FROM tenants
        WHERE created_at >= now() - interval '6 months'
        GROUP BY 1, date_trunc('month', created_at)
        ORDER BY date_trunc('month', created_at)
      ) r
    )
  )
$$;
```

---

### 2. `AuthContext.tsx` — Extended

Add to context:
- Fetch tenant data alongside profile: `.select("*, tenant:tenants(onboarding_completed, status)")`
- `onboardingCompleted: boolean` — derived from tenant data
- `impersonatedTenantId: string | null` + `setImpersonatedTenantId`
- `effectiveTenantId: string` — `impersonatedTenantId ?? profile.tenant_id`

---

### 3. `ProtectedRoute.tsx` — Add Onboarding Redirect

```text
Session? No → /login
Loading? → spinner
Super Admin? → allow (skip onboarding check)
onboardingCompleted? No → /onboarding
Otherwise → render children
```

---

### 4. New Page: `src/pages/Onboarding.tsx`

A clean 2-step wizard at `/onboarding`:
- **Step 1:** Nome da empresa, CNPJ, WhatsApp, Email
- **Step 2:** CEP, Estado, Cidade (logo optional later)
- On submit: calls `supabase.rpc('complete_onboarding', {...})` → on success, refreshes auth context → redirects to `/app`

---

### 5. `src/App.tsx` — Add `/onboarding` route

```text
/onboarding  →  <ProtectedRoute (auth only, skip onboarding check)><Onboarding /></ProtectedRoute>
```
The onboarding route needs session but shouldn't redirect to itself.

---

### 6. `src/pages/app/Admin.tsx` — Add "Dashboard" Tab + Impersonation

New **Dashboard** tab (first tab) using `useAdminDashboard` hook:
- Metric cards: Total Empresas, Empresas Ativas, Total Usuários, Contratos no Mês
- Bar chart: Crescimento de empresas por mês (last 6 months)
- Tenant table row: new "Entrar como empresa" button → sets `impersonatedTenantId` in context

---

### 7. `src/hooks/useAdminDashboard.ts` — New Hook

Calls `supabase.rpc('get_admin_metrics')` and returns typed metrics.

---

### 8. `src/pages/Dashboard.tsx` — Replace Mocks with Real Data

Query from DB using existing hooks:
- `useContracts()` → count by status, last 12 months grouped
- `useContacts()` → total count
- Recent contracts sorted by `created_at`

---

### 9. `src/components/AppSidebar.tsx` — Impersonation Banner

When `impersonatedTenantId` is set, show a top warning banner:
```
"Visualizando como: [Tenant Name]" [Sair da Empresa →]
```
The sidebar and all data queries use `effectiveTenantId` so everything scopes to the impersonated tenant.

---

### 10. Data Hooks — Use `effectiveTenantId`

Update `useContracts`, `useContacts`, `useCompanies`, etc. to read `effectiveTenantId` from context instead of `profile.tenant_id` directly. This makes impersonation work transparently.

---

## File Summary

```text
DB Migration
├── ADD onboarding_completed to tenants
├── UPDATE existing tenants (onboarding_completed = true)
├── CREATE FUNCTION complete_onboarding()
└── CREATE FUNCTION get_admin_metrics()

New Files
├── src/pages/Onboarding.tsx           (2-step wizard)
└── src/hooks/useAdminDashboard.ts     (global metrics)

Modified Files
├── src/contexts/AuthContext.tsx       (+tenant data, +impersonation)
├── src/components/ProtectedRoute.tsx  (+onboarding redirect)
├── src/App.tsx                        (+/onboarding route)
├── src/pages/Dashboard.tsx            (real data from DB)
├── src/pages/app/Admin.tsx            (+Dashboard tab, +impersonate button)
├── src/components/AppSidebar.tsx      (+impersonation banner)
├── src/hooks/useContracts.ts          (use effectiveTenantId)
├── src/hooks/useContacts.ts           (use effectiveTenantId)
├── src/hooks/useCompanies.ts          (use effectiveTenantId)
├── src/hooks/useTemplates.ts          (use effectiveTenantId)
└── src/hooks/useClauses.ts            (use effectiveTenantId)
```

---

## What This Does NOT Change (by design)

- `app_role` enum stays the same: `super_admin`, `admin_empresa`, `corretor`, `assistente`, `operacional`
- `tenant_id` continues to serve as the multi-tenant key — no `company_id` added (it's the same concept)
- Existing users are not disrupted (`onboarding_completed = true` backfilled)
- The "Empresas" page within each tenant keeps working as-is (stores their company records for use in contracts)
