## Objetivo

Duas melhorias cirúrgicas em `contracts` (apenas `ALTER TABLE`) + integração com o wizard atual e os badges da listagem. Sem recriar tabela, sem mexer em RLS, sem tocar em outras tabelas.

## 1. Migration — apenas ALTER TABLE

Ajuste decidido com você: o `CHECK` de `current_step` vai refletir os steps reais do wizard (não os 6 valores genéricos do prompt original), porque o fluxo atual tem modos AI/Manual com nomes próprios.

```sql
-- 1. current_step (reflete os steps reais do wizard atual)
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS current_step TEXT NOT NULL DEFAULT 'template'
  CHECK (current_step IN (
    'template',         -- escolha de template / modo
    'parties-docs',     -- partes + documentos (manual)
    'participants',     -- participantes (AI)
    'review-data',      -- extração + revisão (AI)
    'data-clauses',     -- dados + cláusulas
    'editor-finish',    -- editor / revisão final
    'concluido'         -- finalizado
  ));

-- 2. internal_code (será preenchido no Prompt B; aqui só cria a coluna)
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS internal_code TEXT;

-- 3. Status expandido
ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_status_check;
ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_status_check
  CHECK (status IN (
    'rascunho','partes_pendentes','dados_pendentes',
    'revisao_juridica','aguardando_assinatura',
    'concluido','arquivado','cancelado'
  ));

-- 4. Migra status legado
UPDATE public.contracts SET status = 'concluido' WHERE status = 'ativo';

-- 5. Índices
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_status
  ON public.contracts(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_step
  ON public.contracts(tenant_id, current_step);
```

Nada de DROP, nada de recriar, RLS intacta, default `'rascunho'` mantido.

## 2. Frontend — `src/pages/app/NovoContrato.tsx`

Estratégia (decidida com você): **localStorage como cache, banco como fonte da verdade** para `current_step`.

- Ao abrir `/contratos/:id`:
  - SELECT em `contracts` para ler `current_step`.
  - Se `null`/inexistente → inicializar em `'template'`.
  - Resolver o índice via lookup no array de steps do modo ativo (`aiSteps` ou `manualSteps`); se não bater (ex.: contrato salvo num modo, aberto noutro), cair em `0`.
  - LocalStorage continua sendo usado para os dados do wizard (cache rápido), mas o ponteiro do step vem do banco.
- Ao avançar/voltar de step (`handleNext`, `handleBack`, `setCurrentStepIndex`):
  - Disparar `UPDATE contracts SET current_step = '<id do step>' WHERE id = :id` (fire-and-forget, sem bloquear UI).
  - Continuar atualizando o estado local normalmente.
- Ao concluir o wizard: `current_step = 'concluido'` + `status` apropriado (sem alterar a lógica de status existente).

Sem novas dependências, sem refatorar o wizard.

## 3. Listagem — badges de status

Em `src/pages/app/Contratos.tsx` (e/ou helper compartilhado de status badge), atualizar o mapa:

```ts
const STATUS_LABELS = {
  rascunho:               { label: "Rascunho",               tone: "gray" },
  partes_pendentes:       { label: "Partes pendentes",       tone: "yellow" },
  dados_pendentes:        { label: "Dados pendentes",        tone: "orange" },
  revisao_juridica:       { label: "Em revisão",             tone: "blue" },
  aguardando_assinatura:  { label: "Aguardando assinatura",  tone: "purple" },
  concluido:              { label: "Concluído",              tone: "green" },
  arquivado:              { label: "Arquivado",              tone: "gray-dark" },
  cancelado:              { label: "Cancelado",              tone: "red" },
};
```

Cores aplicadas via tokens semânticos do design system (sem classes brutas tipo `bg-yellow-500`). Se não houver token para "gray escuro" ou "purple", crio variantes em `index.css` + `tailwind.config.ts`.

## 4. Tipos TypeScript

Após a migration, o `src/integrations/supabase/types.ts` é regenerado automaticamente. Vou apenas:

- Atualizar (se existir) tipo manual `ContractStatus`/`ContractStep` em `src/types/` ou inline para incluir os novos valores.
- Garantir que comparações de status no app não quebrem com os novos valores (busca por `'ativo'`, `status ===` etc.).

## Regras duras respeitadas

- ✅ Nada de recriar `contracts`
- ✅ Não toco em `contract_templates`, `contract_participants`, `clauses`, `tenants`, `profiles`
- ✅ `dados jsonb` preservado
- ✅ RLS de `contracts` intacta
- ✅ Default `'rascunho'` mantido
- ✅ Apenas `ADD COLUMN IF NOT EXISTS`, `DROP CONSTRAINT IF EXISTS` + novo `CHECK`, `UPDATE` de migração de dado legado, `CREATE INDEX IF NOT EXISTS`

## Arquivos que serão tocados

- Migration SQL (via tool de migration)
- `src/pages/app/NovoContrato.tsx` — leitura inicial do step + UPDATE ao avançar
- `src/pages/app/Contratos.tsx` (e/ou componente de badge de status) — novo mapeamento
- Possível: `src/types/contract.ts` (ou similar) — union types atualizados
- Possível: `index.css` / `tailwind.config.ts` — tokens de cor faltantes para badges

## Validação após implementar

1. Build limpo.
2. Abrir um contrato existente: deve cair em `'template'` (current_step null) sem erro.
3. Avançar um step → recarregar página → deve abrir no step correto.
4. Listagem mostra os 8 status com cores distintas.
