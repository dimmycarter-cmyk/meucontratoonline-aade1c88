

## Plano: Corrigir isolamento de tenant nos contratos

### Problemas encontrados

1. **Criacao com tenant errado** (linha 55 de `useContracts.ts`): O `createMutation` usa `profile!.tenant_id` (tenant do super admin) em vez de `effectiveTenantId`. Quando o super admin esta impersonando "Imobi Teste", o contrato e criado no tenant do super admin.

2. **Query sem filtro de tenant** (linhas 34-38): A query nao filtra por `tenant_id`. Para usuarios normais o RLS resolve, mas o super admin tem politica que ve TODOS os contratos de TODOS os tenants. Resultado: ao impersonar "Imobi Teste", o super admin ve contratos de todas as empresas misturados.

### Correcoes

No arquivo `src/hooks/useContracts.ts`:

**Query** — adicionar filtro por `effectiveTenantId`:
```ts
const { data, error } = await supabase
  .from("contracts")
  .select("*")
  .eq("tenant_id", effectiveTenantId)
  .order("created_at", { ascending: false });
```

**Create mutation** — usar `effectiveTenantId` em vez de `profile!.tenant_id`:
```ts
.insert({ ...contract, tenant_id: effectiveTenantId } as any)
```

**Update mutation** — mesma logica, garantir que nao mude o tenant_id acidentalmente.

### Arquivo alterado

| Arquivo | Mudanca |
|---------|---------|
| `src/hooks/useContracts.ts` | Filtrar query por `effectiveTenantId`, usar `effectiveTenantId` no insert |

Nenhuma mudanca de banco necessaria.

