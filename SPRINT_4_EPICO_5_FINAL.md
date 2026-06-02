# 🏆 SPRINT 4 - ÉPICO 5 FINAL: DIRTY FLAGS (3/3 BUGS P0)

**Status:** ÉPICO 5 FECHADO 3/3 ✅
**Período:** 29/05/2026 a 02/06/2026
**Foundation:** 3/3 ATIVA
**Bugs P0 resolvidos:** 3 de 3 (100%)
**Testes:** 174/174 passing
**Validação E2E:** PENDENTE (FASE 4)

---

## 1. RESUMO EXECUTIVO

ÉPICO 5 da Sprint 4 entregou sistema robusto de dirty flags
para preservar edicoes manuais do usuario contra rebuilds e
re-extracoes automaticas no wizard de Novo Contrato.

### 3 bugs P0 resolvidos
- Bug A: editor TipTap preserva edicoes (9f8ae3e)
- Bug B: campos formulario preservam edicoes (1322fe8)
- Bug C: revisao IA + AI merge preservam edicoes (677cdb0)

### Foundation arquitetural
Sistema reutilizavel estabelecido em src/lib/wizard-dirty.ts
com 6 helpers puros testaveis isoladamente.

### Numeros principais
- 174/174 testes Vitest passing (zero regressao)
- ~365 linhas inseridas, ~53 deletadas
- 5 commits no GitHub (plano + foundation + 3 fixes)
- Duracao: 29/05/2026 a 02/06/2026 (em 2 sessoes principais)

---

## 2. CONTEXTO E MOTIVACAO

### Origem do problema
Usuario (cliente piloto Andreia) reportou perda de dados ao
voltar etapas no wizard. Sistema regenerava conteudo a partir
do template, descartando edicoes manuais.

### Impacto pre-fix
- Frustracao recorrente do usuario
- Re-trabalho manual a cada navegacao
- Risco de erros em contratos finais
- Confianca no sistema reduzida
- Diferencial competitivo (fluxo IA) prejudicado

### Decisao arquitetural
Implementar dirty flags (etiquetas digitais) que rastreiam
o que o usuario editou, e bloqueiam side-effects derivacionais
(buildFinalContent, autoFillDados, extractAll) quando dirty=true.

### Por que dirty flags vs outras solucoes
- Diff completo entre estados: muito custoso em React
- Snapshot/restore: perderia historico de mudancas legitimas
- Confirmacao do usuario: ruim para UX
- Dirty flags: cirurgico, performante, reutilizavel

---

## 3. LINHA DO TEMPO COMPLETA

### Commits do EPICO 5 (timestamps reais do git)

| Hash | Data | Tipo | Descricao |
|------|------|------|-----------|
| fbc8979 | 29/05/2026 19:21 | docs | Plano EPICO 5 |
| 357534e | 29/05/2026 21:51 | feat | Foundation - 3 useState |
| 9f8ae3e | 29/05/2026 22:22 | fix  | Bug A - TipTap guard |
| 1322fe8 | 29/05/2026 22:54 | fix  | Bug B - autoFillDados |
| 677cdb0 | 02/06/2026 07:55 | fix  | Bug C - extractAll + AI merge |

### Distribuicao temporal
- 29/05/2026 (noite): 4 commits (plano + foundation + Bug A + Bug B)
- 02/06/2026 (manha): 1 commit (Bug C - fecha EPICO)
- Pausa estrategica entre sessoes (principio #87)

### Sequencia logica

Plano gerou Foundation, que ativou Bug A, que pavimentou
caminho para Bug B (com helpers novos), que foi reutilizado
pelo Bug C (reuso de pickAutoFillFields). Cada commit
construiu sobre o anterior.

### Tempo total

~6 horas distribuidas em 2 sessoes principais.

---

## 4. ARQUITETURA - DIRTY FLAGS

### 3 etiquetas digitais

| Flag | Tipo | Bug | Significa |
|------|------|-----|-----------|
| conteudoFinalDirty | boolean | A | Editor TipTap foi editado |
| dadosDirty | Set string | B | Quais campos foram editados |
| aiReviewDirty | boolean | C | Revisao IA foi editada |

### Por que tipos diferentes

- Bug A: editor inteiro = booleano simples
- Bug B: campos individuais = Set para granularidade
- Bug C: revisao IA inteira = booleano simples

### Persistencia em 2 camadas + runtime

Camadas de persistencia real (sobrevivem a reload):
1. localStorage (recovery local instantaneo)
2. Supabase DB (cross-device autosave debounced)

Runtime React (memoria de sessao, nao persiste):
3. useState (estado in-memory react)
4. useMemo deps (re-render triggers controlados)

### Guards em handleNext

handleNext verifica as 3 dirty flags antes de executar
side-effects derivacionais:

- shouldRebuildConteudo(conteudoFinalDirty) -> bloqueia rebuild
- shouldAutoFillField(field, dadosDirty) -> filtra autoFill
- shouldRunExtractAll(aiReviewDirty) -> bloqueia extracao IA

Resultado: edicoes manuais do usuario sao preservadas em
TODAS as navegacoes do wizard.

---

---

## 5. STATUS FINAL v1

### Documento em versao v1

Este documento foi escrito IMEDIATAMENTE apos fechamento do
EPICO 5 (3/3 bugs P0 resolvidos no GitHub, hash 677cdb0).

Devido a limite de output da ferramenta de escrita (Antigravity
trunca outputs longos em ~50-60 linhas), optou-se por **doc
minimo viavel v1** priorizando validacao E2E em producao com
cliente piloto Andreia.

### O que esta documentado (v1)

- Secao 1: Resumo executivo do EPICO 5
- Secao 2: Contexto e motivacao da arquitetura
- Secao 3: Linha do tempo completa (commits + datas reais)
- Secao 4: Arquitetura dirty flags (3 flags + persistencia + guards)

### O que sera adicionado (v2 futuro)

- Helpers puros detalhados (6 funcoes em src/lib/wizard-dirty.ts)
- Pattern collect-filter-merge explicado
- Bugs A/B/C casos detalhados (cenarios reproducao + solucao)
- Numeros consolidados (linhas, testes, performance)
- 30+ principios engenheirados registrados (#69-#112)
- Decisoes estrategicas (Opcao A/B/C de cada bug)
- Backlog Sprint 5+
- Lessons learned

### Plano de complementacao

Apos validacao E2E Andreia bem-sucedida:
1. Reabrir SPRINT_4_EPICO_5_FINAL.md
2. Adicionar secoes 6-15 em sessao dedicada
3. Marcar como v2 (definitivo)
4. Novo commit "docs(sprint-4): SPRINT_4_EPICO_5_FINAL v2"

### Validacao E2E pendente

3 cenarios a testar em producao Lovable:

**Cenario Bug A (TipTap):**
- Editar contrato no editor (etapa 4)
- Voltar etapa 3 + avancar
- Verificar edicao preservada

**Cenario Bug B (autoFillDados):**
- Editar campo derivado (ex: comprador_endereco)
- Voltar etapa 2 + avancar
- Verificar edicao preservada

**Cenario Bug C (extractAll + AI merge):**
- Editar revisao IA (fluxo IA)
- Voltar etapa + avancar
- Verificar edicao preservada

### Aprovacao final v1

EPICO 5 FECHADO 3/3
Data: 02/06/2026
HEAD: 677cdb0
Testes: 174/174 passing
Foundation: 3/3 ATIVA

Status: PRONTO PARA VALIDACAO E2E

---
