

## Problema: Empresa "Enovar" não aparece na página Empresas

### Causa raiz

As políticas RLS da tabela `companies` filtram por `tenant_id = get_user_tenant_id(auth.uid())`. Isso significa que mesmo o **super_admin** só vê empresas do **próprio tenant**. A empresa "Enovar" foi cadastrada em outro tenant (do usuário dimmycarter@gmail.com), então não aparece.

### Solução

1. **Adicionar política RLS para super_admin ver todas as empresas** — criar policies de SELECT, UPDATE e DELETE para super_admin na tabela `companies`, seguindo o mesmo padrão já usado em `tenants`, `profiles` e `subscriptions`.

2. **Atualizar `useCompanies` para suportar impersonation** — quando o super_admin estiver impersonando um tenant, filtrar por `effectiveTenantId`. Quando não estiver, mostrar todas as empresas.

### Alterações

**Migration SQL:**
```sql
CREATE POLICY "Super admin can view all companies"
  ON public.companies FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin can update all companies"
  ON public.companies FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin can delete all companies"
  ON public.companies FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'));
```

**`src/hooks/useCompanies.ts`:**
- Importar `effectiveTenantId` e `isSuperAdmin` do `useAuth`
- Se `isSuperAdmin` e sem impersonation: buscar todas as empresas (sem filtro de tenant)
- Se `isSuperAdmin` com impersonation: filtrar por `effectiveTenantId`
- Usuário normal: comportamento atual (RLS já filtra)

