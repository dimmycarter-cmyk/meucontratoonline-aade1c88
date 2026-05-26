# Pendencias Descobertas Durante C4.4 — Validacao Manual de Contrato Gerado

## Contexto
Durante o C4.4 (cenarios 5+6+7 — gerar contrato com participantes
extremos), foram descobertos 7 bugs no contrato HTML gerado pelo
wizard de Novo Contrato. Sao bugs DIFERENTES da classe stale
closure que corrigimos nos commits ea68ceb, 57ca754 e 8fd4bd8 —
sao bugs de **template + populacao de placeholders**.

Decisao: Documentar como pendencias para Sprint 2/3 em vez de
corrigir na Sprint 1, preservando o marco de "Sprint 1 fechada
com 13 commits limpos + push".

## Bugs encontrados (em ordem de severidade)

### BUG 1 — RG/Data Nascimento opcionais NAO aplicam fallback
**Severidade:** ALTA (era objetivo do Ajuste 1+3 — commit 9e14d7f)
**Sintoma:** quando participante nao tem RG preenchido, contrato
mostra "portador(a) da Carteira de Identidade nº __________"
(underline literal) em vez de aplicar PLACEHOLDER_FALLBACK_STRATEGY.
**Esperado:** omitir frase OU substituir por "RG a informar" OU
reescrever para "inscrito(a) no CPF sob o nº...".
**Hipotese:** o fallback strategy foi implementado mas pode nao
estar conectado ao gerador final do contrato HTML. Investigar
src/lib/placeholder.ts e PLACEHOLDER_FALLBACK_STRATEGY.

### BUG 2 — Valor monetario com "R$ R$" duplicado
**Severidade:** ALTA (cosmetico mas afeta TODOS os valores
monetarios — visivelmente ruim para imobiliaria final)
**Sintoma:** contrato mostra "R$ R$ 350.000,00", "R$ R$ 35.000,00",
"R$ R$ 7.000,00" — "R$" duplicado.
**Causa provavel:** template do contrato tem "R$ {{valor}}"
hardcoded, mas o placeholder {{valor}} ja vem com mascara
"R$ ..." da formatacao monetaria.
**Fix:** ou remover "R$" hardcoded do template, ou stripar "R$"
do valor antes de injetar.

### BUG 3 — Intermediadora "Imobi Teste" NAO populada no contrato
**Severidade:** ALTA (era objetivo do Ajuste 11 — commit 718bc91
e da reformatacao do C4.3.2 — commit d43d3e3)
**Sintoma:** clausula SETIMA mostra "empresas intermediadoras
desta negociacao, CNPJ/PIX , e , CNPJ/PIX , executaram..."
com placeholders VAZIOS, mesmo a Imobi Teste estando preenchida
na empresa intermediadora do wizard.
**Hipotese:** os dados da company (selecionada como
intermediadora no wizard) nao estao sendo passados para o
gerador do contrato. Verificar como NovoContrato.tsx propaga
intermediadora_id/data para o replacePlaceholders.

### BUG 4 — Vírgulas órfãs em multiplos lugares no contrato
**Severidade:** MEDIA (era objetivo do Ajuste 2 — commit 87e5500)
**Sintoma:** contrato tem varios "de ,", "agência ,", "conta ,",
"CNPJ/PIX ,", "no banco ,", "nº " (placeholders vazios sem
limpeza) e "nº ." (vazio + ponto).
**Esperado:** cleanOrphanPunctuation deveria remover essas
vírgulas/pontos orfaos.
**Hipotese:** cleanOrphanPunctuation pode estar sendo aplicado
APENAS no fluxo de save, nao no fluxo de preview/visualizacao.
Investigar pipelines de geracao do HTML.

### BUG 5 — Endereco do imovel duplicado "imóvel: Imóvel:"
**Severidade:** BAIXA (cosmetico)
**Sintoma:** "Constitui objeto de compra e venda deste contrato
o imóvel: Imóvel: Lote n. 13..."
**Causa provavel:** template tem "o imóvel: {{descricao_imovel}}"
e a descricao do imovel ja começa com "Imóvel: ".
**Fix:** remover "Imóvel:" do template ou padronizar que
descricao nao deve começar com "Imóvel:".

### BUG 6 — Data do contrato vazia mesmo preenchida no wizard
**Severidade:** MEDIA
**Sintoma:** "Belo Horizonte MG, de de ." — sem dia/mes/ano.
**Causa:** Data 12/05/2026 foi preenchida no wizard mas nao foi
propagada para o placeholder de data do template.
**Hipotese:** placeholder pode ter nome diferente do esperado
(ex: {{data_contrato}} vs {{data_assinatura}}). Verificar
mapeamento.

### BUG 7 — Campos de detalhes do imovel vazios sem fallback
**Severidade:** BAIXA (cosmetico)
**Sintoma:** "com área privativa de , área acessória de , área
total de , vagas de garagem , matriculado no Cartório de
Registro de Imóveis sob o nº..." — campos vazios com vírgulas
orfas (sobrepoe com BUG 4).
**Causa:** template tem campos especificos do imovel
(area_privativa, area_total, matricula, etc.) que nao sao
preenchidos no wizard atual.
**Fix:** ou adicionar campos no wizard, ou aplicar fallback
estrategia para esses placeholders especificamente, ou
reescrever clausula para condicional.

## Decisao arquitetural sugerida para Sprint 2

A maioria dos bugs aponta para uma SINGLE ROOT CAUSE: o pipeline
de geracao do contrato HTML nao esta aplicando consistentemente:
- PLACEHOLDER_FALLBACK_STRATEGY (BUG 1, 7)
- cleanOrphanPunctuation (BUG 4)
- formatacao monetaria sem duplicar R$ (BUG 2)
- mapeamento de campos do wizard (BUG 3, 6)

Sugestao Sprint 2 (titulo proposto):
"Sprint 2 — Qualidade do contrato gerado: pipeline unificado
de templating com fallback + cleanup + formatacao"

Itens da Sprint 2:
1. Auditar pipeline atual de geracao do HTML do contrato
2. Centralizar aplicacao de PLACEHOLDER_FALLBACK_STRATEGY +
   cleanOrphanPunctuation + composeEnderecoCanonico em ponto
   unico
3. Corrigir mapeamento de placeholders (intermediadora, data,
   campos do imovel)
4. Remover "R$" hardcoded de templates ou stripar do valor
5. Testes de geracao de contrato com participante extremo
   (validar que o output e LIMPO)
6. Considerar criar um Contract Generator service em
   src/lib/contract-generator.ts (se nao existir) que aplica
   todas as transformacoes em pipeline unico

## Pendencias arquiteturais OUTRAS (de sprints anteriores)
- FixedDataFields.tsx:137 — stale closure no extract-matricula
  (mesma classe dos bugs C4.4 corrigidos, ja documentado)
- Avaliar useListUpdater hook se padrao virar recorrente
- Setup de staging Supabase
- Setup de Supabase CLI
- Setup de React Testing Library + jsdom para testes de UI
- Secao Seguranca da Configuracoes (mock atual com "em breve")
- Secao Plano da Configuracoes (mock atual com "em breve")
- AgenteIA.tsx initialMessages/quickActions hardcoded

## Higiene de historico Git (pos-Sprint 1)

### TAREFA — Limpar .env do historico Git via filter-repo
**Severidade:** BAIXA (token ja revogado; repo privado)
**Contexto:** O commit b1bc538 ("fix(security): hotfix .env
exposto") removeu o .env do indice e ampliou .gitignore, mas
o blob continua acessivel via git show <commit>:.env nos
commits anteriores. Token SUPABASE_ACCESS_TOKEN dentro JA FOI
REVOGADO (zero risco ativo).
**Quando fazer:** quando tiver Python instalado E tempo (~30
min). Antes de tornar o repo publico.
**Como fazer:**
   1. pip install git-filter-repo
   2. git tag pre-filter-repo-cleanup HEAD (backup)
   3. git remote get-url origin (anota)
   4. git filter-repo --path .env --invert-paths --force
   5. git remote add origin <URL>
   6. tsc + vitest (validar build)
   7. git push --force-with-lease origin main
   8. Coordenar com colaboradores se houver (recriar branches)
