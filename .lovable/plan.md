

## Plano: Modelos Globais + Navegacao por Empresas

### 1. Modelos globais criados pelo super_admin

**Problema atual**: Templates sao vinculados a um `tenant_id` e so aparecem para aquele tenant. O super_admin quer criar modelos que aparecem para todas as empresas automaticamente.

**Solucao**: Adicionar coluna `is_global` (boolean, default false) na tabela `contract_templates`.

**Migration SQL**:
- Adicionar coluna `is_global boolean NOT NULL DEFAULT false` em `contract_templates`
- Adicionar politica RLS para todos os usuarios autenticados verem templates globais: `USING (is_global = true)`
- Adicionar politicas RLS para super_admin gerenciar todos os templates (SELECT, INSERT, UPDATE, DELETE)

**Alteracoes no codigo**:

- **`useTemplates.ts`**: 
  - Importar `isSuperAdmin` do `useAuth`
  - Na query, buscar templates do proprio tenant + templates globais (`is_global = true`) usando `.or('tenant_id.eq.X,is_global.eq.true')`
  - No create, se `isSuperAdmin`, marcar `is_global: true` e usar o tenant do super_admin como `tenant_id`

- **`Modelos.tsx`**: 
  - Mostrar badge "Global" nos modelos globais
  - Impedir que usuarios comuns editem/excluam modelos globais (apenas super_admin pode)
  - Prefixar nome automaticamente com "Modelo - " ao criar (se nao comecar com "Modelo -")

### 2. Navegacao simples pelas empresas cadastradas

**Problema atual**: A pagina Empresas lista as empresas mas nao permite "entrar" no contexto de cada uma.

**Solucao**: Adicionar botao "Acessar" em cada card de empresa na pagina Empresas que ativa a impersonation (ja implementada no AuthContext).

**Alteracoes em `Empresas.tsx`**:
- Importar `useAuth` para acessar `isSuperAdmin` e `setImpersonatedTenant`
- Adicionar item "Acessar como" no DropdownMenu de cada empresa (apenas para super_admin)
- Ao clicar, chamar `setImpersonatedTenant(empresa.tenant_id, empresa.nome_fantasia)` e navegar para `/app` (Dashboard)
- O banner de impersonation ja existe no sidebar

### Resumo das alteracoes

| Arquivo | Mudanca |
|---------|---------|
| Migration SQL | Coluna `is_global`, RLS para templates globais e super_admin |
| `src/hooks/useTemplates.ts` | Query com `.or()` para incluir globais, flag `is_global` no create |
| `src/pages/app/Modelos.tsx` | Badge "Global", protecao de edicao, prefixo "Modelo -" |
| `src/pages/app/Empresas.tsx` | Botao "Acessar como" para impersonation |

