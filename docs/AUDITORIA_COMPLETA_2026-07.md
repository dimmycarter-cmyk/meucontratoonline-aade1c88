# AUDITORIA COMPLETA READ-ONLY — CONTRACT GENIUS AI (Meu Contrato Online)

**Data:** 13/07/2026
**Commit auditado:** `b385d32` (main), working tree limpo
**Método:** leitura de código (zero alterações), `bunx tsc --noEmit`, `bunx vitest run`, varredura em 3 frentes paralelas (pipeline core, multi-tenant/segurança, qualidade/testes), com verificação de primeira mão de todas as afirmações críticas.
**Regra seguida:** evidência antes de opinião — toda afirmação cita `arquivo:linha`.

---

## a) VEREDICTO EXECUTIVO

O projeto **não é intrinsecamente complicado** — o domínio é substituição de strings em templates, um problema resolvido. O fluxo core não fecha por **três lacunas estruturais**, não por complexidade: (1) o braço de **ingestão** (.docx → template) é um funil de dicionários fechados com match exato que descarta variáveis **silenciosamente** — E1 e E2 confirmadas; (2) a saída prometida — **Word editável — não existe no código**: a única exportação é PDF via `window.print()`; (3) o pipeline de render está **triplicado** (preview, save, detalhe) com divergências reais entre as cópias. Os 354 testes verdes cobrem quase exclusivamente o braço de *render* já migrado; o braço de *import* tem cobertura efetiva **zero** — por isso o produto quebra em produção com a suíte 100% verde. Conclusão: **arquitetura com problemas estruturais localizados e corrigíveis**, concentrados na fronteira de entrada (import) e de saída (export) do pipeline.

---

## b) DIAGRAMA DO PIPELINE REAL (como É hoje)

### Braço 1 — Ingestão (.docx → template) — **QUEBRADO/SILENCIOSO**

```
Usuário seleciona .docx (máx 5 MB)
  └─ ImportDocxDialog.handleFileSelected            ImportDocxDialog.tsx:87-130
       └─ supabase.functions.invoke("parse-docx-template")   :102-104
            └─ EDGE FUNCTION parse-docx-template/index.ts
                 ├─ mammoth.convertToHtml({buffer})            index.ts:108
                 ├─ mammoth.extractRawText({buffer})           index.ts:109
                 ├─ Detecção de [BRACKETS] sobre o TEXTO       index.ts:133-161
                 │    ├─ em GENERIC_AMBIGUOUS (16 labels)   → "ambíguo"      index.ts:44-48,153
                 │    ├─ em KNOWN_QUALIFIED_LABELS (~25)    → "known"        index.ts:28-41,155
                 │    └─ QUALQUER OUTRO label               → "ambíguo"      index.ts:157-160
                 ├─ Detecção de {{curly}}                      index.ts:164-167
                 ├─ UNDERSCORES (______): **NENHUMA detecção** (não existe regex)
                 └─ PII + warnings (tabelas/imagens apenas)    index.ts:172-212
       ├─ Step 2: resolveAmbiguousLabels             placeholder.ts:617-666
       │    └─ só sugere chave para 16 labels GENÉRICOS (genericLabelToFieldSuffix,
       │       placeholder.ts:584-604); label qualificado fora do mini-dicionário
       │       → suggestedKeys: [] → UI default "Ignorar"     ImportDocxDialog.tsx:325,337
       ├─ Step 4: finalHtml (só substitui os mapeados)  ImportDocxDialog.tsx:135-162
       ├─ CONTAGEM: extractVariables(finalHtml)         ImportDocxDialog.tsx:192,461
       │    └─ conta {{curly}} + [BRACKET] com MATCH EXATO no
       │       LEGACY_BRACKET_MAP (~186 entradas); resto é DESCARTADO
       │       em silêncio                              placeholder.ts:505-515
       └─ createTemplate({conteudo, variaveis})  →  contract_templates
            **SEM nenhum aviso/bloqueio quando variaveis.length === 0**
```

### Braço 2 — Render (template + dados → documento) — **FUNCIONAL, mas triplicado**

```
NovoContrato.tsx (wizard, 1871 linhas)
  PREVIEW: buildFinalContent                        NovoContrato.tsx:686-699
    enrichDados(dados,{company})                    contract-enrichment.ts:191-203  :688
    → buildParticipantsByRole                       :693
    → enrichParticipantsWithAgreementL1             :694
    → buildAgreementVarsL2                          :695
    → expandEachBlocks                              placeholder.ts:321   :696
    → preprocessTemplate (stripConditionalBlocks
       + stripRedundantPrefixes)                    placeholder.ts:440   :697
    → replacePlaceholders                           placeholder.ts:459   :698
    → conteudoFinal → TipTap/preview (dangerouslySetInnerHTML,
       WizardStepEditor.tsx:72-76,138-141)

  SAVE: handleSave — pipeline RE-IMPLEMENTADO       NovoContrato.tsx:1108-1134
    (mesma sequência, mas partindo de mergedDados ≠ dados,
     com merge manual campo-a-campo :998-1043 e cláusulas
     anexadas ao HTML :1157-1162 — o preview NÃO anexa)

  EXPORT: handlePrint = () => window.print()        NovoContrato.tsx:1335
    → ContractPrintView (@media print,
      dangerouslySetInnerHTML)                      ContractPrintView.tsx:12-35
    → **PDF pelo navegador. NÃO EXISTE export .docx/Word**
      (nenhuma lib: docx/html-docx/file-saver/jspdf ausentes do package.json)
    → hard block se houver placeholders pendentes   NovoContrato.tsx:1343-1349

  DETALHE: ContratoDetalhe.tsx:175 roda SÓ preprocessTemplate
    (sem expandEachBlocks/agreement) — 3º caminho de render, divergente.
```

### Campos faltantes (comportamento real)

- Estratégia default = **`omit`**: o token **some** (`DEFAULT_STRATEGY`, placeholder-fallback.ts:79; overrides :45-76 também resolvem para omit). `blank_line` (→ `"__________"`, :38,94) existe mas **nenhum campo o usa por default**.
- Limpeza pós-omissão: `cleanOrphanPunctuation` (text-cleanup.ts:31-85) e `suppressEmptyFieldScaffold` (:120-174).
- Sinalização é **só na UI do wizard** (alerta "N campos sem dados", WizardStepEditor.tsx:55-70) + hard block do PDF. **No documento gerado NÃO há sinalização** de campo faltante — o campo desaparece. Isso contradiz a spec do produto ("campos faltantes ficam em branco e sinalizados no documento").

---

## c) TOP 5 CAUSAS PROVÁVEIS DE "NUNCA GERA CONTRATO COMPLETO"

Ordenadas por probabilidade de impacto no fluxo core.

### 1. Braço de import descarta variáveis em silêncio (E1 + E2) — **CONFIRMADA**

**E1 — CONFIRMADA no mecanismo.** Detecção e substituição divergem de fato:

- O **contador** (`extractVariables`, placeholder.ts:505-515) só reconhece `[BRACKET]` com **match EXATO** (após trim+uppercase) no `LEGACY_BRACKET_MAP` (~186 entradas literais, placeholder.ts:13-224). Bracket com qualquer variação de grafia → **descartado sem log, sem aviso** (placeholder.ts:511: `if (key) vars.add(key)` — o else é silêncio).
- O **motor** (`replacePlaceholders`, placeholder.ts:481-495) é mais permissivo: tenta o mapa (:483), depois deriva `directKey` de **qualquer** bracket (:487) e por fim aplica fallback (:493). Ou seja: o motor *renderiza* brackets que o contador *não conta*.
- Agravante servidor: a edge function classifica com `KNOWN_QUALIFIED_LABELS` de **~25 labels** (index.ts:28-41) contra ~186 do mapa client — labels canônicos que o motor resolve (`[VALOR DO SINAL]`, `[MATRÍCULA]`, `[FORO]`, `[DIA]`…) chegam ao Step 2 como "desconhecidos/ambíguos" (index.ts:157-160).
- Agravante client: `resolveAmbiguousLabels` só sugere chave para **16 labels genéricos** (placeholder.ts:584-604); qualquer label qualificado fora disso recebe `suggestedKeys: []` → o Select default é **"Ignorar (manter original)"** (ImportDocxDialog.tsx:325,337) → o bracket fica cru no `finalHtml`.
- Resultado "0 variáveis": para exibir zero com ~40 brackets, basta que **nenhum** label tenha match exato no mapa — plausível no mundo real, onde a grafia varia infinitamente e o mapa exige igualdade literal. *Ambiguidade registrada:* sem o .docx real não é possível afirmar qual variação de grafia ocorreu (ou se o mammoth fragmentou labels no HTML); o mecanismo do zero silencioso, porém, está confirmado em código.

**Evidência-chave:** placeholder.ts:505-515 (contador fechado) vs placeholder.ts:481-495 (motor aberto); index.ts:28-48 (dicionários mínimos do servidor); ImportDocxDialog.tsx:192,461 (contagem no client).

### 2. Não existe geração de Word — o entregável core não foi construído — **CONFIRMADA**

A spec do produto promete "contrato pronto em Word editável". No código:
- **Nenhuma** biblioteca de geração de documento no `package.json` (verificado: docx, html-docx, html-to-docx, docxtemplater, pizzip, file-saver, jspdf, html2pdf — todas ausentes).
- A única exportação é `handlePrint = () => window.print()` (NovoContrato.tsx:1335) sobre `ContractPrintView` (ContractPrintView.tsx:12-35) → PDF do navegador, com fidelidade dependente do print CSS do browser.
- Não há rota, botão ou função de "baixar .docx" em nenhum arquivo de `src/`.

O fluxo core, portanto, **não pode fechar como especificado** — o último elo da corrente não existe.

### 3. Sem aviso de "0 variáveis" + sem suporte a underscores (E2) — **CONFIRMADA**

**E2 — CONFIRMADA integralmente:**
- **Nenhuma detecção/conversão de underscores** em lugar algum: as únicas regex do import são brackets (index.ts:133) e curly (index.ts:164); nada de `_{3,}` ou equivalente no servidor nem no client. Underscores só existem como *saída* do fallback `blank_line` (placeholder-fallback.ts:38) — nunca como *entrada*.
- **Nenhum alerta de "nenhuma variável detectada"**: o toast exibe a contagem incondicionalmente (ImportDocxDialog.tsx:202 — com zero, mostra "0 variáveis detectadas" como se fosse sucesso); o Step 4 idem (:460-462); não há gate impedindo criar template com 0 variáveis; os `warnings` do servidor cobrem só tabelas/imagens (index.ts:184-212).

Como lacunas de underscore são o formato **dominante** nos contratos reais de imobiliária, o import aceita o formato mais comum do mercado e produz um template **inerte**, sem uma palavra de aviso.

### 4. Pipeline de render triplicado com divergências reais — **CONFIRMADA**

Três implementações da mesma sequência canônica, que não está encapsulada em `src/lib/`:
- `buildFinalContent` (NovoContrato.tsx:686-699) — preview/editor, parte de `dados`.
- `handleSave` (NovoContrato.tsx:1108-1134) — save, parte de `mergedDados` (merge manual campo-a-campo :998-1043, regra de precedência AI vs manual :1050-1069) e **anexa cláusulas ao HTML** (:1157-1162), coisa que o preview não faz (cláusulas aparecem como blocos separados, WizardStepEditor.tsx:142-159).
- `ContratoDetalhe.tsx:175` — roda **só** `preprocessTemplate`, sem `expandEachBlocks` nem agreement: um contrato com `{{#each}}` renderiza **diferente** na tela de detalhe.

Consequência: "funciona no preview, quebra depois" é um desfecho estrutural, não acidental. A sequência canônica existe apenas como comentário num teste (template-0-v2.test.ts:4-8).

### 5. Suíte de testes aponta para o braço errado — **CONFIRMADA**

354/354 verdes, mas:
- **Zero** cobertura do braço de import: nenhum teste importa `ImportDocxDialog`; o teste da edge function (parse-docx-template/index.test.ts, 2 casos Deno) está **fora do include do Vitest** (`vitest.config.ts:9` = `src/**`), não roda no CI, e seus 2 casos fazem `fetch` a localhost e **retornam sem falhar** se a função não estiver de pé (index.test.ts:11-13,25) — smoke test no-op. O próprio header declara que não testa parsing/detecção (:2-3).
- **Nenhum** .docx real ou fixture binária no repositório (varredura: zero arquivos .docx). Os testes "ponta-a-ponta" (template-0-v2, template-2-v2) partem de strings já migradas do `payload.json` — nunca do binário nem do parsing.
- **1 único** teste de componente em toda `src/components/` (ManualParticipantCard.genero.test.tsx); wizard, import dialog e editor: zero.

É exatamente por isso que 354 verdes convivem com produto que não fecha: os testes provam que o *meio* do pipeline funciona; as *pontas* (entrada .docx e saída Word) não têm teste — uma porque falha em silêncio, outra porque não existe.

---

## d) RISCOS MULTI-TENANT (com evidência)

### ALTA

1. **`extract-matricula` é um endpoint público sem NENHUMA autenticação** — `verify_jwt=false` (config.toml:6-7) e o código não lê `Authorization` nem valida usuário/role (extract-matricula/index.ts:25-127). Qualquer anônimo consome a `LOVABLE_API_KEY` do servidor como proxy gratuito de Gemini 2.5 Pro (denial-of-wallet). Contraste: `seed-templates-leva1` também tem `verify_jwt=false` mas faz check manual de super_admin (seed index.ts:35-59) — proteção que depende inteiramente de não regredir.

2. **Policy `"Anyone can read invitation by token" USING (true)`** (migration 20260316125020:40-42) expõe a tabela `invitations` inteira — e-mails, roles, tenant_ids e os **tokens** (credencial do `accept_invitation`) — a `anon`. Harvest de token = entrada no tenant. Correção canônica: RPC `SECURITY DEFINER` que recebe o token, nunca `USING(true)`.

3. **Divergência de tenant contrato-vs-filhos durante impersonação.** O contrato é criado com `effectiveTenantId` (via `useContracts`), mas os filhos são gravados com `profile.tenant_id`: participantes/contatos/documentos em NovoContrato.tsx:1196,1221,1230,1238,1250,1258,1282,1312 e path de storage :898; `useClauses.ts:41`, `useCompanies.ts:67`, `useContacts.ts:60`, `useDocumentExtraction.ts:29-63` (INSERTs). Como as policies de super_admin usam `WITH CHECK (has_role('super_admin'))`, o INSERT no tenant errado **passa sem erro** — corrupção silenciosa: contrato no tenant X, filhos no tenant Y. (27 ocorrências de `profile.tenant_id` só em NovoContrato.tsx.)

### MÉDIA

- `useTemplates.ts:28` (caso conhecido) e `useClauses.ts:25,34` — queryKey/`enabled` presos ao `profile`, cache não invalida ao impersonar; `useInvitations.ts:26-36` mostra convites do tenant próprio, não do impersonado.
- `useTemplates.updateMutation` (useTemplates.ts:88-93) é o único write de template que **não** passa por `resolveTemplateOwnership` — se a UI um dia enviar `is_global` num update, viola o mesmo CHECK do fix `39924be`. Os demais writes (createMutation :56-66, seed :77-88, migration 20260423175800) satisfazem o CHECK.
- `profiles` sem policy de SELECT para super_admin (migration 20260308205131:130-144) — impersonação não enxerga perfis do tenant impersonado.
- Lacunas de auditoria: `useClauses` (create/update/delete), `useContacts` (todas), `useCompanies` (create/delete), `useInvitations` (send/delete), `useTemplates` (delete) não chamam `logAction`; `participant.deleted` e `document.deleted` estão declarados em audit.ts:11,13 e **nunca são emitidos**.

### Resolvido/OK

- Storage: policies permissivas originais corrigidas com isolamento por pasta de tenant (migration 20260603145157:15-52).
- Tabelas core (`contract_templates`, `contracts`, `contacts`, `profiles`, `companies`, `clauses`): policies tenant-scoped ou gated por super_admin; nenhuma `USING(true)` além das citadas.

---

## e) GAP DE TESTES — o que os 354 verdes NÃO cobrem

| Trecho do fluxo core | Cobertura |
|---|---|
| Upload .docx → mammoth → detecção de labels (edge function) | **ZERO efetiva** (2 smoke tests Deno fora do CI, no-op sem servidor local — index.test.ts:11-13,25) |
| `ImportDocxDialog` (mapeamento, contagem, criação do modelo) | **ZERO** |
| Parsing a partir de um .docx REAL (binário/fixture) | **ZERO** (nenhum .docx no repo) |
| Underscores como placeholder | **ZERO** (a funcionalidade não existe) |
| Export (PDF hoje; Word inexistente) | **ZERO** |
| Wizard `NovoContrato` como componente | **ZERO** (1871 linhas sem teste) |
| Componentes em geral | 1 teste em 28 componentes não-ui |
| Funções puras de `src/lib/` (motor, enrichment, cleanup, agreement, save-payload) | **BOA** — 19 arquivos unitários + 4 integrados (template-0/2-v2 leem template real do payload.json e rodam o pipeline completo) |

Padrão: a cobertura é excelente exatamente onde o código já é puro e extraído (`src/lib/`), e zero onde a lógica mora em componente/edge function. O gap de teste é um **espelho do gap arquitetural**.

---

## f) PLANO DE CORREÇÃO EM FASES (sem executar)

Avaliado pelas 3 lentes: **[P]** SaaS profissional · **[U]** simplicidade UX · **[E]** escalabilidade 100+ imobiliárias.

### Fase 0 — Estancar sangramentos (segurança + silêncio) — 1 sessão
1. Autenticação em `extract-matricula` (mesmo padrão manual do seed, ou `verify_jwt=true`). **[P][E]**
2. Substituir a policy `USING(true)` de invitations por RPC `SECURITY DEFINER` por token. **[P]**
3. Alerta bloqueante no import quando `variaveis.length === 0` no Step 4 ("Nenhuma variável detectada — este modelo não terá campos preenchíveis. Deseja continuar?"), com explicação dos formatos aceitos. Elimina o modo de falha silencioso de E1/E2 em ~20 linhas. **[U]**

### Fase 1 — Import assistido com mapeamento de campos (decisão de produto) — 2-3 sessões
O coração da correção de E1/E2. Detectar **três** sintaxes e pedir confirmação do usuário:
1. **Unificar dicionários**: um único módulo compartilhado (client + edge function importam a mesma fonte; hoje são 3 dicionários dessincronizados: LEGACY_BRACKET_MAP ~186, KNOWN_QUALIFIED_LABELS ~25, genericLabelToFieldSuffix 16). **[E]** — elimina a classe de bug, não a instância.
2. **Match tolerante** de brackets: normalização (acentos, pontuação, plurais, "DO(A)") + distância/fuzzy contra o catálogo, em vez de igualdade literal. Todo bracket vira item da tela de mapeamento com sugestão ranqueada — nunca descartado em silêncio. **[U][E]**
3. **Detecção de underscores**: runs de `_{3,}` viram candidatos a campo, com sugestão inferida do texto imediatamente anterior ("CPF: ______" → `*_cpf`) reaproveitando `ROLE_KEYWORDS`/contexto já existentes em resolveAmbiguousLabels (placeholder.ts:567-577). **[U]** — abraça o formato dominante do mundo real.
4. **Tela de mapeamento única** (evolução do Step 2): tabela com TODAS as detecções ({{}}, brackets, underscores), sugestão, confiança e ação por linha; default "mapear" para alta confiança, nunca "ignorar" silencioso. **[U]**
5. Persistir o mapeamento como metadado do template (auditabilidade e re-import). **[P]**

### Fase 2 — Um único pipeline de render — 2 sessões
1. Extrair `renderContract(template, dados, participants, opts)` para `src/lib/` encapsulando a sequência canônica (each → enrichment → preprocess → replace) hoje triplicada em NovoContrato.tsx:686-699, :1108-1134 e ContratoDetalhe.tsx:175. Preview, save, detalhe e print consomem a MESMA função. **[P][E]**
2. Sinalização de campo faltante **no documento** conforme a spec: estratégia tabular `blank_line` vs `omit` aplicada no render (default `omit` como hoje, `blank_line` com marcação visual para campos essenciais), fechando a promessa "em branco e sinalizados". **[U]**
3. Mover `buildSummaryHtml` e o merge campo-a-campo de `handleSave` para `src/lib/` com testes. **[P]**

### Fase 3 — Export Word real — 1-2 sessões
1. Decisão técnica: geração client-side de .docx a partir do HTML do render (lib `docx`/`html-to-docx`) vs edge function server-side. Recomendação: client-side primeiro (sem custo de infra, HTML já é canônico), edge se a fidelidade exigir. **[P]**
2. Botão "Baixar Word (.docx)" ao lado do PDF, usando o MESMO HTML do pipeline unificado da Fase 2. **[U]**
3. Manter o hard block de placeholders pendentes para ambos os formatos. **[P]**

### Fase 4 — Consistência multi-tenant — 1-2 sessões
1. Trocar `profile.tenant_id` por `effectiveTenantId` em TODOS os INSERTs de filhos do contrato (NovoContrato.tsx:1196-1312, :898) e nos hooks `useClauses:41`, `useCompanies:67`, `useContacts:60`, `useDocumentExtraction`. **[P][E]**
2. Rotear `updateMutation` de templates por `resolveTemplateOwnership`. **[P]**
3. Completar `logAction` nas mutations sem auditoria; emitir `participant.deleted`/`document.deleted`. **[P]**

### Fase 5 — Rede de testes nas pontas — 1-2 sessões
1. Fixtures .docx reais no repo (1 com brackets, 1 com underscores, 1 misto) + teste de integração import → detecção → mapeamento → template → render → HTML final. **[E]**
2. Incluir os testes da edge function no CI (job Deno dedicado) ou portar a lógica de detecção para o módulo compartilhado da Fase 1 (testável no Vitest — preferível). **[P]**
3. Testes de componente dos steps do import dialog e do wizard (mínimo: caminho feliz + caminho "0 variáveis"). **[P]**

**Dependências:** Fase 1 depende do item 3 da Fase 0; Fase 3 depende da Fase 2; Fases 4 e 5 são paralelizáveis com as demais.

---

## g) ESTIMATIVA HONESTA

| Fase | Sessões |
|---|---|
| 0 — Sangramentos | 1 |
| 1 — Import assistido | 2-3 |
| 2 — Pipeline único + sinalização | 2 |
| 3 — Export Word | 1-2 |
| 4 — Multi-tenant | 1-2 |
| 5 — Testes nas pontas | 1-2 |
| **Total até fluxo core 100%** | **8-12 sessões** |

Premissas: sessões no ritmo das últimas entregas (fix por sessão com validação em produção via smoke test); "100%" = importar um .docx real de imobiliária (brackets OU underscores), mapear campos com confirmação, preencher no wizard, e baixar Word editável com faltantes sinalizados. O caminho crítico é Fase 1 → 2 → 3 (5-8 sessões); Fases 4-5 podem intercalar. Estimativa **não** inclui backfill de templates já importados com 0 variáveis (frente separada, análoga ao backfill do fix valor_total).

---

## ANEXOS

### A1. Tabela de divergências — Detector (import) vs Motor (substituição)

| Aspecto | Detector (import) | Motor (placeholder.ts) | Divergência |
|---|---|---|---|
| `{{key}}` | Detecta (index.ts:164; extractVariables :507) | Substitui (:475) | Alinhado |
| `[BRACKET]` regex | `/\[([^\]]+)\]/g` (index.ts:133; :509) | idem (:481) | Regex igual |
| Dicionário servidor | KNOWN_QUALIFIED_LABELS ~25 (index.ts:28-41) | LEGACY_BRACKET_MAP ~186 (:13-224) | **~161 labels que o motor resolve chegam como "desconhecidos"** |
| Bracket fora do mapa | extractVariables: **descartado sem contar** (:511) | replacePlaceholders: tenta directKey + fallback (:487-494) | **Motor renderiza o que o contador não conta — núcleo de E1** |
| Sugestão p/ label qualificado desconhecido | suggestedKeys: [] → default "Ignorar" (placeholder.ts:622-629; Dialog :325,337) | — | Import descarta o que o motor aceitaria |
| `{{#if}}` / `{{#each}}` | Não detectados no import | Suportados (:246, :321) | Import não valida construtos de bloco |
| Underscores `______` | **Inexistente** | **Inexistente** (só como saída de blank_line) | **Núcleo de E2** |
| Filtros anti-falso-positivo (art./lei/nº) | index.ts:140-141 | getUnresolvedPlaceholders:531-532 | Alinhado |

### A2. Verificações de qualidade (13/07/2026)

- `bunx tsc --noEmit`: **exit 0, zero erros**.
- `bunx vitest run`: **27 arquivos / 354 testes / 354 passed** (23.4s).

### A3. Débito técnico complementar

- `NovoContrato.tsx`: **1871 linhas** (valor exato; CLAUDE.md cita ">2000" — desatualizado). 2,4× o segundo maior arquivo (Admin.tsx, 785). Lógica de negócio inline: merge campo-a-campo :998-1043, precedência AI/manual :1050-1069, `buildSummaryHtml` :1080-1100, rascunho localStorage :124-166.
- `formatBRL` reimplementado inline em 3 páginas (Admin.tsx:61, ContratoDetalhe.tsx:167, Contratos.tsx:33) em vez de importar contract-formatters.ts:8.
- Dois módulos paralelos de formatação BR (contract-formatters.ts vs masks.ts) com regras de pontuação duplicadas.
- Componente morto: `src/components/NavLink.tsx` (0 imports).
- `src/scratch/` (11 arquivos de script) está **gitignored** (.gitignore:49) conforme política do CLAUDE.md — presente no disco, fora do versionamento. OK.
- `AddressForm.tsx` vs `AddressFormRHF.tsx`: duas variantes do mesmo form (candidatas a consolidação).

### A4. Ambiguidades registradas (sem pergunta, conforme regra)

1. **E1 — grafia exata dos 40 brackets**: sem o .docx original não é possível determinar se o zero veio de variação de grafia (mais provável, dado o match literal) ou de fragmentação de labels pelo mammoth no HTML. O mecanismo do descarte silencioso está confirmado em código; a instância exata exigiria o arquivo.
2. **Contagem de entradas do LEGACY_BRACKET_MAP** citada como "~186" (contagem literal do bloco :13-224; duplicatas de valor não deduplicadas).
3. **"354 testes"**: número reportado pelo Vitest; a contagem por grep de `it/test` dá ~337 âncoras (diferença = casos gerados por `.each`).
