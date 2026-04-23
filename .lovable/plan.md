# Lovable — Plano consolidado da Leva 3

> Última atualização: Lote H (relatório de fechamento da Leva 3).

---

## Leva 3 — Resumo executivo

A Leva 3 fechou o ciclo do wizard de contratos com três frentes:

| Frente | Lotes | Resultado |
|---|---|---|
| **F. UX do wizard** | F.1, F.2, F.3 | Editor reorganizado em componentes (`WizardActions`, `WizardStepEditor`), dialog `UnresolvedPlaceholdersDialog` separa modos `hard` (PDF) e `soft` (Salvar), Salvar como rascunho deixou de exigir confirmação extra. |
| **G. Importador .docx** | G.1, G.2, G.3 | Edge function `parse-docx-template` extrai conteúdo via `mammoth`, classifica labels ambíguos com `resolveAmbiguousLabels`, detecta PII server-side. UI `ImportDocxDialog` em 4 passos com checkbox de PII e filtro de warnings ruidosos. |
| **H. Fechamento** | H | Este relatório. |

---

## Lote F — UX do wizard

### F.3 — Modo dual no `UnresolvedPlaceholdersDialog`
- **Arquivo:** `src/components/contract/UnresolvedPlaceholdersDialog.tsx`
- Adicionado prop `mode: "hard" | "soft"`.
  - `hard` (PDF): único CTA "Voltar para corrigir", sem opção de ignorar.
  - `soft` (legado): mantém "Continuar mesmo assim" via `onContinueAnyway`.
- **`ContratoDetalhe.tsx`** e **`NovoContrato.tsx`**: chamadas de `handlePrintClick` passam `mode: "hard"`.
- **`NovoContrato.tsx#handleSaveClick`**: simplificado para `void handleSave()` — Salvar nunca abre modal, grava direto como rascunho com toast amarelo informativo quando há pendências.

### F.1 + F.2 — Decomposição do editor
- **Criados:** `src/components/contract/wizard/WizardActions.tsx` e `WizardStepEditor.tsx`.
- `NovoContrato.tsx` perdeu ~250 linhas inline; o passo 4 (editor + ações) agora é uma única chamada `<WizardStepEditor />`.
- `canProceed()` e `handleNext()` confirmados sem dependência de `liveUnresolved` — navegação sempre livre.

---

## Lote G — Importador .docx

### G.2 — Heurística client-side `resolveAmbiguousLabels`
- **Arquivo:** `src/lib/placeholder.ts`
- Novo `resolveAmbiguousLabels(text, ambiguous)` que recebe o texto bruto + ocorrências `[CPF]`, `[NOME]`, etc. e retorna sugestão de chave canônica + nível de confiança (`high` / `low`) baseado em janela de contexto (~110 chars).
- **Tests:** `src/lib/__tests__/resolve-ambiguous-labels.test.ts` (8 cenários cobrindo comprador/vendedor/procurador, alta vs baixa confiança).

### G.1 — Edge function `parse-docx-template`
- **Arquivo:** `supabase/functions/parse-docx-template/index.ts`
- `mammoth.convertToHtml({ buffer })` (corrigido após erro 500 inicial — o Deno exige `Uint8Array`, não `ArrayBuffer`).
- Detecta `[LABEL]` com regex, classifica em `knownPlaceholders` / `ambiguousLabels`, captura `occurrenceIndex` + contexto.
- PII server-side: CPF, CNPJ, telefone, email, CEP, valores monetários com extenso.
- Limites: 5 MB, `.docx` only, validação Zod do filename, CORS completo.
- **Smoke test:** `index.test.ts` cobre 405/400.

### G.3 — UI `ImportDocxDialog` (4 passos)
- **Arquivo:** `src/components/templates/ImportDocxDialog.tsx`
- **Passo 1 — Upload:** dropzone .docx + chamada à edge function. Bloco "Limitações da conversão" só aparece quando há warnings relevantes (filtro aplicado server-side: `Unrecognised paragraph style`, `no style mapping`, `default style` etc. são silenciados; só `image`, `table`, `merged cell`, `unsupported` sobem).
- **Passo 2 — Mapeamento:** lista cada label ambíguo com sugestão de `resolveAmbiguousLabels`, badge de confiança e contexto. Select permite escolher chave canônica ou ignorar.
- **Passo 3 — PII:** resumo agregado por tipo, lista das primeiras 30 ocorrências, e checkbox obrigatório com texto: *"Confirmo que revisei o documento e removi ou anonimizei todos os dados pessoais reais antes de salvar como modelo."* Botão "Próximo" desabilitado até a confirmação.
- **Passo 4 — Confirmar:** nome, tipo, descrição, preview HTML sanitizado via `dompurify`, contagem de variáveis. Salva via `useTemplates.createTemplate`.
- **Integração:** botão "Importar .docx" no header de `Modelos.tsx`.
- **Dependência:** `dompurify` adicionado.

---

## Estado dos arquivos

### Criados na Leva 3
- `src/components/contract/wizard/WizardActions.tsx`
- `src/components/contract/wizard/WizardStepEditor.tsx`
- `src/components/templates/ImportDocxDialog.tsx`
- `src/lib/__tests__/resolve-ambiguous-labels.test.ts`
- `supabase/functions/parse-docx-template/index.ts`
- `supabase/functions/parse-docx-template/index.test.ts`

### Editados
- `src/components/contract/UnresolvedPlaceholdersDialog.tsx`
- `src/lib/placeholder.ts`
- `src/pages/app/ContratoDetalhe.tsx`
- `src/pages/app/NovoContrato.tsx`
- `src/pages/app/Modelos.tsx`
- `package.json` / `bun.lock`

---

## Validação final

| Verificação | Resultado |
|---|---|
| `tsc --noEmit` | 0 erros |
| Vitest (suite completa) | 20/20 ✅ |
| Edge function `parse-docx-template` | Deploy OK; reimportação do .docx de teste sem warnings espúrios |
| Smoke manual G.3 | Passo 3 bloqueia avanço até checkbox; passo 4 cria template com variáveis |

---

## Decisões registradas

1. **Salvar nunca confirma.** Wizard de contrato grava rascunho direto, mesmo com placeholders pendentes — só PDF usa hard block.
2. **PII no .docx é barreira intencional.** Checkbox de confirmação obrigatório para registrar ciência do usuário, em vez de bloqueio absoluto.
3. **Mammoth tem limites conhecidos.** Tabelas mescladas e imagens são descartadas; aviso explícito no passo 1 do importador remete ao preview do passo 4 antes de confirmar.
4. **Warnings técnicos do mammoth são filtrados.** Só mensagens com impacto visível (imagem, tabela, mesclagem, recurso não suportado) chegam à UI.

---

## Próximos passos sugeridos (fora da Leva 3)

- Suporte a importação de `.doc` (legado) via conversão prévia com LibreOffice — fora do escopo atual; demanda infra extra.
- Persistência das decisões de mapeamento como dicionário do tenant para acelerar futuras importações.
- Telemetria de uso do importador (quantos modelos importados vs criados do zero) para validar a hipótese de adoção.
