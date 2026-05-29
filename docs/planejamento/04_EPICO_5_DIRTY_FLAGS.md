# 🚩 ÉPICO 5 — Sistema de Dirty Flags (Bug Voltar/Perda de Dados)

**Repositório:** `https://github.com/dimmycarter-cmyk/meucontratoonline-aade1c88`
**Sprint:** 4 (Bloco P0 — Bugs críticos)
**Prioridade:** P0 (bloqueante de uso real)
**Estimativa:** 4 commits, ~2h de implementação + 1h de testes
**Data de abertura:** 2026-05-26
**Branch base:** `main` @ `dce6db6`
**Bugs cobertos:** A (TipTap editor) + B (autoFillDados manual) + C (extractAll IA)

---

## 1. CONTEXTO

### Resumo do bug

Ao navegar entre etapas do wizard de criação de contrato (`/app/contratos/novo`), o handler `handleNext` dispara **side-effects que sobrescrevem incondicionalmente dados que o usuário editou manualmente**. Não há controle de "sujeira" (dirty state) por campo derivado, então qualquer fluxo "ida → volta → ida" entre etapas reconstrói o conteúdo a partir do template/participantes e descarta edições intermediárias.

O bug afeta os três principais artefatos editáveis do wizard: (1) o HTML final do contrato no `RichTextEditor` (TipTap, step 4), (2) campos derivados de participantes em `dados` (manual step 3) e (3) revisão pós-extração da IA (sub-step `review`). O problema é arquitetural e não acidental: `handleNext` é a única "porta" entre etapas e mistura *transição* com *re-derivação*, sem checar se há trabalho do usuário downstream.

### Cenário reproduzível (Bug A — TipTap)

1. Usuário avança do step 3 ("Dados & Cláusulas" ou "Revisão & Dados") para o step 4 ("Editor & Finalizar"). `buildFinalContent` roda e popula `conteudoFinal` com HTML substituído.
2. Usuário edita o contrato no `RichTextEditor` (insere cláusula, ajusta parágrafo, formata).
3. Usuário percebe que esqueceu um dado e clica **Voltar** → vai para step 3. O estado de `conteudoFinal` ainda contém a edição manual (parent não desmonta).
4. Usuário corrige o dado e clica **Próximo** → `handleNext` dispara `buildFinalContent()` novamente → `setConteudoFinal(...)` **sobrescreve toda a edição manual** com uma nova substituição limpa do template.
5. Em até 400ms, o autosave em `localStorage` grava a versão sobrescrita → a edição se perde também no rascunho local. Sem rede e sem botão "undo", o trabalho é irrecuperável.

### Cenário reproduzível (Bug B — autoFillDados)

1. Usuário no step 2 manual preenche participantes. Avança para step 3 → `autoFillDados` popula `dados[comprador_endereco]` a partir de `rua/numero/bairro/cidade/estado/cep`.
2. No step 3, usuário edita manualmente `dados.comprador_endereco` (ex: adiciona "ap 302" entre número e bairro de forma livre).
3. Clica **Voltar** → step 2. Ajusta o telefone de um participante (não toca em endereço).
4. Clica **Próximo** → `autoFillDados` recompõe `comprador_endereco` a partir dos campos atômicos → **descarta o "ap 302" que estava na string livre**.

### Cenário reproduzível (Bug C — extractAll IA)

1. Usuário no fluxo IA chega ao step 3 (`review-data`) sub-passo `extraction`. IA extrai dados dos documentos.
2. Avança para sub-passo `review` → `ExtractedDataReview` lista os campos extraídos; usuário corrige nome com acento errado, ajusta CPF.
3. Volta para step 2 (`participants`) para anexar mais um documento que faltava.
4. Clica **Próximo** → `extractAll(participants)` re-executa do zero, `aiReviewSubStep` retorna a `extraction`, **edições do passo 2 da revisão são descartadas**.

### Por que P0 — três lentes

**Lente SaaS profissional:** SaaS pago de B2B (R$ 79/mês por imobiliária) tem expectativa-base de não perder trabalho. Bug do tipo "perde o que digitei" é o que mais gera cancelamento e ticket de suporte caro. Concorrentes (DocuSign, Contraktor, Zeev) tratam esse fluxo há anos.

**Lente UX:** O wizard com "Voltar / Próximo" *promete* navegação livre. Quebrar essa promessa silenciosamente (sem aviso, sem confirmação) viola o princípio de "menor surpresa". O usuário precisa de heurística mental "se eu voltar, perco tudo" — o que invalida o desenho do wizard.

**Lente escalabilidade:** Com a chegada de novos fluxos (importação `.docx`, multi-procurador, contratos com mais de 2 participantes), o número de campos derivados cresce. Sem padrão de dirty-flag, cada novo campo derivado herda o bug. É dívida composta.

---

## 2. DECISÃO ARQUITETURAL

### Caminho A — Dirty Flag (escolhido)

Cada artefato editável passa a ter um *marcador booleano* (ou `Set<string>` para granularidade por chave). O marcador vira `true` na primeira edição do usuário e é o **guard** que impede `handleNext` de sobrescrever.

```
┌─────────────────┐    handleConteudoChange     ┌──────────────────┐
│ RichTextEditor  │ ──────────────────────────► │ conteudoFinal-   │
└─────────────────┘    (vira true 1 vez)        │ Dirty = true     │
                                                 └────────┬─────────┘
                                                          │
┌─────────────────┐                                       ▼
│ handleNext      │ ── if (!conteudoFinalDirty) ──► buildFinalContent()
│ (step 3 → 4)    │ ── else ──────────────────────► skip (preserva edição)
└─────────────────┘
```

**Vantagens:**
- Cirúrgico: 3 `useState` + 3 if-guards. Diff mínimo.
- Reversível: cada commit é isolado e revertível independente.
- Compatível com autosave existente (dirty-flag entra no payload, sobrevive reload).
- Não muda contrato público (props/types dos sub-componentes).

**Desvantagens aceitas:**
- Se o usuário quiser *propositalmente* regenerar o HTML do template, vai precisar de uma ação explícita futura (botão "Regenerar do template"). Não implementado nesta sprint — backlog.

### Caminho B — Diff + Merge (rejeitado)

Aplicar `diff` entre o conteúdo gerado pelo template e o conteúdo atual, e tentar fazer *merge* das edições do usuário ao novo render. Tecnicamente correto, mas:
- Complexidade alta: `diff` de HTML/Tiptap é não-trivial (estrutura em árvore, marks, attrs).
- Falsos positivos: alterações em `dados` podem coincidir com edições do usuário no mesmo trecho.
- Para Bug B (`dados`), exige diff por chave e detecção de "edição livre vs derivação" — heurística frágil.
- Custo de manutenção alto para benefício marginal nesta fase.

### Caminho C — Modal de confirmação (rejeitado)

Mostrar diálogo "Você editou o contrato. Deseja regenerar e perder as alterações?" antes de `buildFinalContent`. Funciona, mas:
- Adiciona friction em todo "ida-volta-ida" — mesmo quando o usuário só voltou para conferir e não tocou em nada.
- O modal precisaria de heurística para detectar se há edição (= dirty-flag de qualquer forma).
- Quebra fluxo natural; usuários veteranos vão clicar "OK" automaticamente, perdendo trabalho mesmo assim.
- Padrão "modal pra tudo" envelhece mal — concorrentes resolvem silenciosamente.

### Princípios aplicados

- **Princípio #1 (Sprint 3) — "Preview = Save":** continua válido. O pipeline `enrichDados → preprocessTemplate → replacePlaceholders` permanece a única fonte do HTML inicial. Dirty-flag só protege edições *posteriores* a esse render.
- **Princípio #60 (candidato) — "Side-effect derivacional só em first-touch":** funções que reconstroem dados a partir de outras (i.e. `buildFinalContent`, `autoFillDados`, `extractAll`) devem rodar **uma vez** na transição em que o dado é gerado pela primeira vez. Em transições subsequentes, são *idempotentes-by-skip*: rodam apenas se o destino estiver "limpo".

---

## 3. ESCOPO TÉCNICO

### Bug A — TipTap (RichTextEditor)

**Localização:** `src/pages/app/NovoContrato.tsx:644` (chamada de `buildFinalContent` em `handleNext`).

**Estado novo:** `const [conteudoFinalDirty, setConteudoFinalDirty] = useState<boolean>(draft.current?.conteudoFinalDirty ?? false);`

**Plug point — handler de mudança no editor:**
- Hoje: `<RichTextEditor onChange={setConteudoFinal} />` no `WizardStepEditor`.
- Depois: handler intermediário `handleConteudoChange(html)` que faz `setConteudoFinal(html)` + `setConteudoFinalDirty(true)`.
- Importante: o **primeiro set** de `conteudoFinal` (vindo de `buildFinalContent`) **não** deve marcar dirty. Isso ocorre porque a chamada vem do parent, não do editor — então o handler intermediário só dispara em eventos de UI do TipTap.

**Guard em handleNext:**
```
if (stepId === "data-clauses" || (flowMode === "ai" && stepId === "review-data")) {
  if (!conteudoFinalDirty) {
    buildFinalContent();
  }
  // se dirty, preserva conteudoFinal atual
}
```

**Reset do flag:** em duas situações (a confirmar na implementação):
1. Quando usuário muda `selectedTemplateId` (template novo → flag volta para `false`).
2. Quando contrato é salvo com sucesso (`handleSaveClick` completa) — opcional, decidir no commit.

**Persistência:** `conteudoFinalDirty` entra em `autosavePayload` e em `buildDraftPayload` → sobrevive reload de página.

---

### Bug B — autoFillDados (Manual step 2 → 3)

**Localização:** `src/pages/app/NovoContrato.tsx:638-640` (chamada de `autoFillDados` em `handleNext`).

**Estado novo:** `const [dadosDirty, setDadosDirty] = useState<Set<string>>(new Set(draft.current?.dadosDirty ?? []));`

`Set<string>` em vez de `boolean` porque a granularidade aqui importa: usuário pode ter editado só `comprador_endereco` e querer que `vendedor_nome` continue sendo derivado de participantes.

**Plug point — handler de mudança em campo de dados:**
- Hoje: `<FixedDataFields onChange={setDados} />`, `<ParcelasManager onChange={setDados} />` e inline `onChange={(e) => setDados((prev) => ({ ...prev, [v.key]: e.target.value }))}`.
- Depois: handler intermediário `handleDadoChange(nextDados)` que:
  1. Calcula diff entre `dados` atual e `nextDados` (chaves alteradas).
  2. `setDados(nextDados)`.
  3. `setDadosDirty(prev => new Set([...prev, ...changedKeys]))`.

**Guard em autoFillDados (refatorado):**
- A função passa a aceitar opcionalmente um `Set<string>` de chaves "sujas".
- Para cada chave que ela calcularia (ex: `comprador_endereco`), se a chave está em `dadosDirty`, **pula** essa atribuição.
- Resto da função permanece igual.

**Reset do flag:**
- Não há reset automático. Uma vez sujo, fica sujo até o contrato ser salvo. Decisão de produto: usuário decide se quer "desfazer" via UI futura.

**Persistência:** `Array.from(dadosDirty)` em `autosavePayload` (Set não serializa direto em JSON).

---

### Bug C — extractAll IA (step 2 → 3 e dentro do step 3)

**Localização:** `src/pages/app/NovoContrato.tsx:647-651` (chamada de `extractAll` em `handleNext` ao sair de `participants`).

**Estado novo:** `const [aiReviewDirty, setAiReviewDirty] = useState<boolean>(draft.current?.aiReviewDirty ?? false);`

Granularidade aqui é booleana porque o `ExtractedDataReview` opera sobre um único blob `extractedData` (vindo de `useDocumentExtraction`); não vale a pena granular por campo no v1.

**Plug point — handler de mudança no review:**
- Hoje: `<ExtractedDataReview onUpdateField={updateField} />` (de `useDocumentExtraction`).
- Depois: handler intermediário `handleReviewUpdate(participantId, field, value)` que faz `updateField(...)` + `setAiReviewDirty(true)`.

**Guard duplo:**
1. Em `handleNext` ao sair de `participants`:
   ```
   if (flowMode === "ai" && stepId === "participants") {
     if (!aiReviewDirty) {
       extractAll(participants);
       setAiReviewSubStep("extraction");
     } else {
       // já tem revisão suja: pula a step ou mantém como está
       setAiReviewSubStep("review");
     }
   }
   ```
2. Adicionalmente, considerar bloquear o **re-trigger** de `extractAll` mesmo sem dirty se já houve uma extração prévia bem-sucedida. Decidir no commit (pode ficar para backlog).

**Reset do flag:**
- Quando usuário **adiciona um novo documento** a um participante: `aiReviewDirty` volta a `false` (novo documento = nova extração faz sentido).
- Implementação: adicionar `setAiReviewDirty(false)` nos handlers `handleUploadDocs` ou `handleAddParticipant`.

**Persistência:** booleano em `autosavePayload`.

---

## 4. PLANO DE 4 COMMITS

Cada commit é **Strategy 3** (foco único, revertível independente, ASCII puro nas mensagens, sem mojibake). Após cada commit, executar Vitest e auditar via Chat antes do próximo.

### Commit 1 — Foundation: types, useState, persistência

**Mensagem proposta:** `feat(epico-5/1): adiciona infraestrutura de dirty flags`

**Escopo:**
- Declarar os 3 `useState` em `NovoContrato.tsx` (`conteudoFinalDirty`, `dadosDirty`, `aiReviewDirty`).
- Adicionar campos correspondentes ao `autosavePayload` e ao `buildDraftPayload`.
- Hidratar do `draft.current` no mount (com fallback seguro para `false` / `new Set()`).
- Helper utilitário no topo do arquivo: `diffKeys(prev: Record<string,string>, next: Record<string,string>): string[]`.
- Sem mudar nenhum comportamento (todos os 3 flags ficam não-utilizados nesta etapa).

**Validação:**
- `bun run lint` zero novos warnings.
- `bunx tsc --noEmit` zero erros.
- Smoke test: abrir `/app/contratos/novo`, navegar steps, recarregar página → flags persistem (verificar via DevTools localStorage).

### Commit 2 — Bug A: guarda do TipTap

**Mensagem proposta:** `fix(epico-5/2): preserva edicoes do TipTap ao voltar etapa`

**Escopo:**
- Criar `handleConteudoChange` em `NovoContrato.tsx`.
- Passar `handleConteudoChange` em vez de `setConteudoFinal` para `<WizardStepEditor onConteudoChange={...} />`.
- Aplicar guard `if (!conteudoFinalDirty) buildFinalContent()` em `handleNext`.
- Reset de flag quando `selectedTemplateId` muda (via `useEffect`).
- Teste em `src/lib/__tests__/wizard-dirty-flags.test.ts` (ou similar) cobrindo o cenário Bug A.

**Validação:** ver seção 5 (cenários A1, A2, A3).

### Commit 3 — Bug B: guarda do autoFillDados

**Mensagem proposta:** `fix(epico-5/3): preserva dados editados ao re-entrar step 3 manual`

**Escopo:**
- Criar `handleDadoChange(next)` que computa diff e popula `dadosDirty`.
- Substituir `onChange={setDados}` por `onChange={handleDadoChange}` nos pontos: `FixedDataFields`, `ParcelasManager`, inputs inline do AI flow e do mode form.
- Refatorar `autoFillDados` para aceitar `dadosDirty` e pular chaves sujas.
- Estender o teste com cenários Bug B (B1, B2).

**Atenção:** `MultipleParticipantsPanel.onChange` **não** é o mesmo que `setDados` — passa `setManualParticipants`. Não confundir. Só os onChange que setam o `dados` precisam virar `handleDadoChange`.

### Commit 4 — Bug C: guarda do extractAll IA

**Mensagem proposta:** `fix(epico-5/4): preserva revisao da IA ao voltar para participants`

**Escopo:**
- Criar `handleReviewUpdate` que envolve `updateField` + `setAiReviewDirty(true)`.
- Passar `handleReviewUpdate` para `<ExtractedDataReview onUpdateField={...} />`.
- Aplicar guard em `handleNext` ao sair de `participants`.
- Reset de flag em `handleUploadDocs` (novo doc = autoriza nova extração).
- Estender o teste com cenários Bug C (C1, C2).

---

## 5. PLANO DE TESTES

Testes em `src/lib/__tests__/wizard-dirty-flags.test.ts`, mesmo padrão dos testes da Sprint 3 (`placeholder-conditional.test.ts`, etc.). Padrão: Vitest + jsdom + `@testing-library/react`. Foco em **lógica de guards**, não em pixel-perfect rendering.

Onde a lógica está no componente (`NovoContrato.tsx`), extrair os helpers puros (`shouldRebuildConteudo`, `pickAutoFillDados`, `shouldReExtract`) para `src/lib/wizard-dirty.ts` e testar isoladamente. Componente fica fino, lógica fica testável.

### Bug A — TipTap (3 cenários)

**A1 — Ida-volta-ida sem edit:**
- step 3 → 4 (`buildFinalContent` roda, flag = false)
- Voltar → step 3
- Próximo → step 4 (deve rodar `buildFinalContent` novamente porque flag continua false)
- Resultado esperado: `conteudoFinal` reflete dados atuais.

**A2 — Ida-volta-ida com edit:**
- step 3 → 4 (flag = false)
- Usuário edita TipTap (flag = true)
- Voltar → step 3
- Próximo → step 4 (NÃO deve rodar `buildFinalContent`)
- Resultado esperado: `conteudoFinal` mantém edição do usuário.

**A3 — Ida-volta-ida com edit + mudança de dados:**
- step 3 → 4 (flag = false)
- Usuário edita TipTap (flag = true)
- Voltar → step 3 → altera `dados.valor_total`
- Próximo → step 4 (NÃO deve rodar `buildFinalContent`)
- Resultado esperado: `conteudoFinal` mantém edição do usuário; usuário responsável por aplicar a mudança no editor (limitação aceita do v1).

### Bug B — autoFillDados (2 cenários)

**B1 — Campo único editado:**
- step 2 manual com participante (rua, número, etc.) → step 3 (`comprador_endereco` derivado)
- Usuário edita `dados.comprador_endereco` (vira `dadosDirty = {'comprador_endereco'}`)
- Voltar → step 2 → altera telefone do mesmo participante
- Próximo → step 3 (NÃO deve sobrescrever `comprador_endereco`, MAS deve atualizar `comprador_telefone`)
- Resultado: `comprador_endereco` mantém edição livre; `comprador_telefone` atualizado.

**B2 — Múltiplos campos editados:**
- step 2 → step 3
- Usuário edita `comprador_endereco` E `vendedor_endereco` (`dadosDirty = {'comprador_endereco', 'vendedor_endereco'}`)
- Voltar → step 2 → altera dois telefones e adiciona um vendedor 2
- Próximo → step 3
- Resultado: endereços manuais preservados; telefones atualizados; `vendedor2_*` derivado normalmente.

### Bug C — extractAll IA (2 cenários)

**C1 — Review com edit:**
- step `participants` → step `review-data` sub-step `extraction` → `review`
- Usuário edita campo extraído (flag = true)
- Voltar → step `participants` (sem adicionar doc)
- Próximo → step `review-data`
- Resultado: NÃO re-extrai; mantém `review` com edições.

**C2 — Review sem edit, novo documento:**
- step `participants` → step `review-data` sub-step `extraction` → `review`
- Usuário NÃO edita nada (flag = false)
- Voltar → step `participants` → anexa novo documento (flag reset = false)
- Próximo → step `review-data`
- Resultado: re-extrai normalmente (novo doc justifica re-trigger).

---

## 6. CRITÉRIOS DE FECHAMENTO

- [ ] 4 commits no GitHub (branch `main` direto, em sequência)
- [ ] Mensagens de commit no padrão `feat(epico-5/N):` ou `fix(epico-5/N):`, ASCII puro, sem mojibake
- [ ] Vitest: todos os testes existentes + novos cenários A1-A3, B1-B2, C1-C2 verdes
- [ ] `bunx tsc --noEmit` zero erros
- [ ] `bun run lint` zero novos warnings
- [ ] Validação manual no browser (`bun dev`) cobrindo os 3 cenários reproduzíveis da seção 1
- [ ] Andreia (usuária piloto) confirma comportamento em produção (build Lovable após push)
- [ ] Atualização da memória `[[project_arquitetura_render]]` com pointer para `[[project_dirty_flags]]` (a criar)

---

## 7. PRÓXIMOS PASSOS (pós-fechamento do Épico 5)

### Sprint 4 — itens remanescentes (após dirty flags)
- Item 1 — RG opcional (depende de migration; ver `[[project_pendencia_supabase_staging]]`)
- Item 4 — CEP no contrato
- Item 6 — Autopreenchimento por CNPJ
- Item 7 — Refator qualificação de cônjuges
- Item 8 — Negrito em descrição de imóvel
- Item 9 — Multa diária configurável
- Item 10 — Assinaturas no rodapé
- Item 11 — Dados de imobiliária no contrato

### Sprint 5+ — débitos técnicos
- Backlog `[[project_backlog_pos_sprint_4]]` — UI text hardcoded em `AgenteIA.tsx`, anon key em Bearer da edge function
- Warnings LF/CRLF do git no Windows (configurar `core.autocrlf` ou `.gitattributes`)
- Configurar Antigravity Analytics ou substituto para telemetria de uso
- Limpeza do histórico via `git filter-repo` (`[[project_pendencia_filter_repo]]`) — só quando staging Supabase estiver pronto
- Botão "Regenerar do template" no editor (UX para usuário propositalmente descartar edições)
- Detecção de campos derivados "fora de sincronia" (dirty mas com `dados` fonte mudou) — pode virar princípio #61

---

**FIM DO DOCUMENTO**
