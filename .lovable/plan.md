# Plano — Prompt C: `audit_logs` genérica para LGPD

## 1. Migration (via supabase--migration)

Tabela append-only separada da `admin_audit_logs` existente:

```sql
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
```

### RLS — append-only por design

- **INSERT** `Members can insert audit logs`: `tenant_id = get_user_tenant_id(auth.uid()) AND user_id = auth.uid()` (forço também `user_id = auth.uid()` no WITH CHECK pra evitar spoof de autoria entre colegas do mesmo tenant).
- **SELECT** `Admins can view tenant audit logs`: tenant do usuário + `has_role('admin_empresa')`.
- **SELECT** `Super admin can view all audit logs`: `has_role('super_admin')`.
- **Sem policies de UPDATE / DELETE** — registros imutáveis.

> Reforço de segurança: também `REVOKE UPDATE, DELETE ON public.audit_logs FROM authenticated, anon;` para garantir que nem por engano alguém edite (RLS sem policy já bloqueia, mas o REVOKE é cinto-e-suspensório).

## 2. Helper `src/lib/audit.ts`

Novo arquivo. Exporta:

```ts
export type AuditAction =
  | 'contract.created' | 'contract.updated' | 'contract.status_changed'
  | 'contract.deleted' | 'contract.viewed'
  | 'participant.created' | 'participant.updated' | 'participant.deleted'
  | 'document.uploaded' | 'document.viewed' | 'document.deleted'
  | 'template.created' | 'template.updated';

export type AuditEntityType = 'contract' | 'participant' | 'document' | 'template';

export async function logAction({ tenantId, action, entityType, entityId, metadata }): Promise<void>
```

Detalhes:
- Usa `import { supabase } from "@/integrations/supabase/client"` (caminho real do projeto).
- Lê `auth.uid()` via `supabase.auth.getUser()` e popula `user_id` no insert (preenche o WITH CHECK).
- `try/catch` silencioso com `console.error("[audit] ...")` — nunca lança, nunca bloqueia UI.
- Sem `ip_address` por enquanto (front não tem acesso confiável; coluna fica null e pode ser preenchida depois por edge function se quiser).

## 3. Instrumentação dos pontos críticos

Mudanças mínimas, sem refatorar fluxos:

### `src/hooks/useContracts.ts`
- `createMutation.onSuccess(data)` → `logAction('contract.created', 'contract', data.id, { nome: data.nome, internal_code: data.internal_code })`.
- `updateMutation.mutationFn` → comparar `updates.status` com valor atual: se mudou, logar `contract.status_changed` com `metadata: { from, to }`. Caso contrário, `contract.updated` com a lista de campos alterados (chaves do `updates`, sem valores PII).
- `deleteMutation.onSuccess` → `contract.deleted` com `entity_id` deletado.

### `src/pages/app/ContratoDetalhe.tsx`
- `useEffect` ao carregar `contract` (uma vez por id) → `contract.viewed`.

### `src/hooks/useDocumentExtraction.ts`
- Após upload bem-sucedido em `uploadDocument` → `document.uploaded` com `metadata: { participant_id, document_type, file_size }`.

### Visualização de documento (signed URL)
- Buscar onde existe `createSignedUrl` (não apareceu na grep — provavelmente em `ContratoDetalhe` ao baixar/abrir doc, ou inexistente). Se existir, instrumentar com `document.viewed`. Se ainda não existir um helper único, registro só nos pontos onde signed URL já é gerada hoje. (Vou inspecionar antes de tocar — mudança pequena.)

### Participantes
- Hook/componente que faz `from("contract_participants").insert/update/delete` (provavelmente em `ManualParticipantManager` / `ParticipantManager`). Adicionar `participant.created/updated/deleted` no `onSuccess`. Não adicionar PII no metadata — só `{ role, contract_id }`.

### Templates
- `useTemplates` → instrumentar `created` e `updated` no sucesso das mutations.

> Princípio: **nunca colocar dado pessoal em `metadata`** — apenas IDs, tipo de campo alterado, status from/to, internal_code, contagens. Conformidade LGPD.

## 4. Hook + Página `/app/configuracoes/auditoria`

### Hook `src/hooks/useAuditLogs.ts` (novo, separado do `useAuditLog` existente que é do super_admin)
```ts
useAuditLogs({ page, pageSize=20, action?, dateFrom?, dateTo? })
```
- Query no `audit_logs` filtrada por `tenant_id` (RLS já filtra; explicitar pra index hit).
- Join leve com `profiles` por `user_id` para mostrar nome/email do autor.
- `range((page-1)*pageSize, page*pageSize - 1)` + `count: 'exact'` para total.

### Página `src/pages/app/Auditoria.tsx`
- Header: "Auditoria — registros imutáveis (LGPD)".
- Filtros (toolbar):
  - Select de ação (todas as `AuditAction` + "Todas").
  - Date range picker (shadcn Calendar com `mode="range"`, `pointer-events-auto`).
- Tabela: Data/hora · Usuário (nome/email) · Ação (badge) · Entidade (`entity_type` + `entity_id` curto/mono) · Detalhes (resumo do `metadata` em `<code>` truncado, com tooltip do JSON completo).
- Paginação: 20/página, controles Prev/Next + indicador "X–Y de Z".
- **Sem ações destrutivas, sem export por enquanto, sem drawer de edição.**

### Roteamento
- `src/App.tsx`: nova rota `configuracoes/auditoria` dentro do shell `/app`, protegida por `RoleRoute` aceitando `admin_empresa` e `super_admin` (já existe esse componente — confirmar API antes de usar).

### Acesso na UI
- `Configuracoes.tsx`: adicionar um Card "Auditoria" com link para `/app/configuracoes/auditoria` — visível só se `has_role('admin_empresa') || super_admin`.
- **Não** vou poluir a sidebar principal com novo item — fica como sub-página de Configurações, alinhado com a arquitetura atual (Configurações já é a entrada única no bottom da sidebar).

> Se você preferir um item separado "Auditoria" na sidebar mesmo, me avisa que troco — o brief diz "link Auditoria na sidebar em Configurações", interpretei como dentro de Configurações.

## 5. Regras duras respeitadas

- ✅ Nenhuma tabela existente é alterada.
- ✅ Sem policy de UPDATE/DELETE em `audit_logs` + REVOKE explícito.
- ✅ `logAction()` com try/catch silencioso, jamais quebra UI.
- ✅ Inserção via cliente anon respeitando RLS — sem service_role no front.
- ✅ Tela de auditoria 100% read-only.
- ✅ `audit_logs` é tabela nova, separada de `admin_audit_logs`.
- ✅ Nenhum PII no metadata (CPF/RG/email não vão pro log).

## 6. Arquivos tocados

- Migration SQL (supabase--migration)
- `src/lib/audit.ts` (novo)
- `src/hooks/useContracts.ts` — log nos 3 mutations
- `src/hooks/useDocumentExtraction.ts` — log no upload
- `src/hooks/useTemplates.ts` — log create/update
- `src/pages/app/ContratoDetalhe.tsx` — log view + log de status na troca
- `src/pages/app/Contratos.tsx` — (delete já é via hook, sem mudança extra)
- Componente(s) de participante (a confirmar) — log create/update/delete
- `src/hooks/useAuditLogs.ts` (novo, plural, evita choque com `useAuditLog`)
- `src/pages/app/Auditoria.tsx` (novo)
- `src/App.tsx` — rota nova
- `src/pages/app/Configuracoes.tsx` — link/atalho para auditoria (gated por role)

## 7. Validação após implementar

1. Build limpo.
2. Criar contrato → aparece linha `contract.created` em `/app/configuracoes/auditoria` (logado como admin).
3. Mudar status do contrato → `contract.status_changed` com `from/to` corretos.
4. Upload de documento → `document.uploaded`.
5. Logar como `corretor` → não consegue acessar a página de auditoria (RLS retorna vazio + RoleRoute bloqueia rota).
6. Tentar `UPDATE`/`DELETE` direto via SQL como usuário comum → negado.
7. Filtros de ação + período funcionam, paginação correta.

Aguardando aprovação para executar a migration e implementar.
