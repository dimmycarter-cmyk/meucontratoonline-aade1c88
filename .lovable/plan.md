
# Execução Final — Leva 1 (T1-T5)

Sair do Plan mode e executar a sequência atômica abaixo.

## Passo 1 — Insert dos 5 templates globais
Inserir T1-T5 em `contract_templates` via insert tool, lendo `SEED_TEMPLATES` de `src/lib/seed-templates.ts`:
- `is_global = true`
- `tenant_id = null`
- `status = 'ativo'`
- `nome`, `descricao`, `tipo`, `conteudo` vindos do seed
- `variaveis`: array de placeholders extraídos do `conteudo` via regex `{{(\w+)}}` (deduplicado)

Antes do insert, deletar templates globais pré-existentes com mesmo `nome` para garantir idempotência (sem afetar templates de tenants).

## Passo 2 — Fixtures de teste
Inserir T2, T3, T5 em `contract_test_fixtures`:
- `template_id` = id retornado no Passo 1
- `nome`, `descricao` espelhando o template
- `conteudo_original`: variante do conteúdo com PII fictícia injetada (CPFs/CNPJs/nomes inventados) para validar o `pii-detector`
- `pii_detected`: resultado de `detectPII()` rodado sobre o `conteudo_original`

T1 e T4 dispensados (T1 é estrutural mínimo; T4 é variação de T3).

## Passo 3 — Smoke test
Verificar via SELECT:
- 5 linhas em `contract_templates` com `is_global=true` e `status='ativo'`
- 3 linhas em `contract_test_fixtures` com `pii_detected` não-vazio
- Cada template tem `array_length(variaveis) > 0`

Confirmar visualmente no preview:
- `/app/modelos` lista os 5 com badge "Global"
- `/app/contratos/novo` etapa 1 mostra os 5 no dropdown

## Passo 4 — Relatório final Leva 1
Resumo entregue:
- Schema (creci, contract_test_fixtures, pii-detector) ✅
- Helpers (contract-formatters, contract-enrichment, placeholder unificado) ✅
- 5 templates globais ativos ✅
- Fixtures de PII para regressão ✅
- Débito técnico documentado (T6 Procurador, FEBRABAN select, resolveAmbiguousLabels) ✅
- Próximo: Leva 2 (UI múltiplos participantes + parcelas + validação de pendências + T6)

## Detalhes técnicos
- Insert via tool de "Modify database" (uma chamada com os 5 INSERTs + 3 fixtures encadeados em transação implícita)
- Extração de `variaveis`: script Node ad-hoc rodado no sandbox lendo `seed-templates.ts` → gera SQL
- PII fictícia: CPF `123.456.789-00`, CNPJ `12.345.678/0001-90`, nomes `João da Silva`, `Maria Souza` — claramente sintéticos mas formatados corretamente para acionar o detector
- Sem alterações de schema neste passo — apenas DML
