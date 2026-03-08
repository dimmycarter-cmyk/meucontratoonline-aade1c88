

# Fase 4 — Geração de Contratos + Exportação PDF

## Escopo

Implementar o fluxo completo do wizard "Novo Contrato" com 7 etapas funcionais, criar a tabela `contracts` no Supabase para persistir contratos gerados, e adicionar exportação em PDF.

## 1. Database Migration

Criar tabela `contracts`:
- `id` (uuid), `tenant_id` (FK tenants), `template_id` (FK contract_templates, nullable)
- `nome` (text), `status` (text, default 'rascunho')
- `comprador_id` (FK contacts, nullable), `vendedor_id` (FK contacts, nullable), `empresa_id` (FK companies, nullable)
- `dados` (jsonb) — armazena todos os valores preenchidos das variáveis
- `conteudo_final` (text) — HTML final com variáveis substituídas
- `clausulas_ids` (jsonb) — IDs das cláusulas selecionadas
- `valor_total`, `valor_sinal`, `valor_financiamento` (numeric, nullable)
- `created_at`, `updated_at` (timestamptz)

RLS: CRUD scoped por `tenant_id = get_user_tenant_id(auth.uid())`

## 2. Wizard — NovoContrato.tsx (reescrever completo)

**Step 1 — Modelo**: Carregar templates reais do Supabase (via `useTemplates`), selecionar um modelo ativo.

**Step 2 — Partes**: Selecionar comprador e vendedor a partir dos contatos existentes (via `useContacts`), e empresa intermediadora (via `useCompanies`). Combobox com busca.

**Step 3 — Documentos**: Upload/referência de documentos (placeholder por ora, sem storage — exibir checklist informativo dos documentos necessários).

**Step 4 — Dados**: Formulário dinâmico gerado a partir das `variaveis` do template selecionado. Campos agrupados por categoria (usando `TEMPLATE_VARIABLES` para labels). Auto-preencher com dados do comprador/vendedor/empresa selecionados.

**Step 5 — Cláusulas**: Listar cláusulas do tenant (via `useClauses`), checkbox para selecionar/deselecionar, reordenar.

**Step 6 — Editor/Preview**: Exibir o conteúdo do template com variáveis substituídas pelos valores preenchidos + cláusulas selecionadas concatenadas. Usar RichTextEditor para ajustes finais.

**Step 7 — Finalizar**: Preview final read-only, botão "Salvar Contrato" (insere no Supabase), botão "Exportar PDF".

## 3. Hook useContracts.ts

CRUD hook para a tabela `contracts`, mesmo padrão de `useContacts`/`useTemplates`.

## 4. Contratos.tsx — Dados Reais

Substituir mock data por dados reais da tabela `contracts`. Adicionar link para visualizar/editar contrato existente.

## 5. Exportação PDF

Usar `window.print()` com CSS `@media print` para gerar PDF diretamente do browser — sem dependência externa. Criar componente `ContractPrintView` com layout A4 otimizado para impressão.

Alternativa futura: edge function com puppeteer/jspdf se necessário.

## 6. Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| Migration SQL | Criar tabela `contracts` + RLS |
| `src/hooks/useContracts.ts` | Novo hook CRUD |
| `src/pages/app/NovoContrato.tsx` | Reescrever wizard completo (7 etapas) |
| `src/pages/app/Contratos.tsx` | Dados reais do Supabase |
| `src/components/ContractPrintView.tsx` | Componente de impressão/PDF |
| `src/App.tsx` | Rota para visualizar contrato (`/app/contratos/:id`) |

## Ordem de Implementação
1. Migration SQL (tabela contracts + RLS)
2. Hook useContracts
3. NovoContrato.tsx wizard completo
4. ContractPrintView + exportação PDF
5. Contratos.tsx com dados reais

