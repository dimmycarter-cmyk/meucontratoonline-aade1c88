

## Varredura Completa - Diagnostico Definitivo

Depois de analisar todo o fluxo linha por linha, identifiquei **3 problemas raiz** que causam os dados em branco:

### Problema 1: `extractedData` fica vazio no momento do save
O hook `useDocumentExtraction` gerencia `extractedData` internamente. Quando o usuario avanca do sub-step "review" para "data", `mapToDados()` e chamado e os dados sao mergeados em `dados`. **Porem**, se a extracao da IA falhou ou retornou vazio (edge function com erro, documento ilegivel, etc.), `extractedData` fica `[]`, `mapToDados()` retorna `{}`, e `dados` permanece `{}`. **Nao ha nenhum aviso ao usuario de que a extracao nao trouxe dados.**

### Problema 2: Template sem conteudo = contrato vazio
Quando o usuario cria um template novo inline (botao "+"), o template e criado com `conteudo: ""`. Entao mesmo que `dados` tenha valores, `replaceVars("", dados)` retorna `""`. O contrato salva com `conteudo_final = ""`.

### Problema 3: Dados digitados no formulario nao chegam no save
No sub-step "data", o usuario pode editar campos manualmente via `setDados()`. Esses valores estao no state `dados`. No `handleSave`, o merge e `{ ...latestAiDados, ...dados }` — **isso esta correto**, mas se `dados` ficou `{}` porque o usuario nao editou nada manualmente E a IA nao extraiu nada, tudo fica vazio.

---

## Plano Definitivo de Correcao

### 1. Salvar dados dos participantes DIRETAMENTE dos campos do formulario (NovoContrato.tsx)
- No `handleSave`, em vez de depender apenas de `extractedData` + `mapToDados()`, **coletar os valores diretamente do state `dados`** que ja reflete o que o usuario ve/edita na tela
- Se `dados` estiver completamente vazio, mostrar um **alerta de confirmacao** perguntando se o usuario quer salvar sem dados

### 2. Montar `conteudo_final` com fallback inteligente (NovoContrato.tsx)
- Se o template nao tem conteudo E o usuario nao editou nada no editor, **gerar automaticamente um resumo HTML** com os dados preenchidos (nome, CPF, endereco, etc.) em vez de salvar vazio
- Isso garante que o contrato nunca apareca "em branco" na tela de detalhe

### 3. Salvar participantes usando dados do formulario, nao apenas da extracao (NovoContrato.tsx)
- No loop de insert de `contract_participants`, alem dos `fieldMap` da extracao, **tambem preencher campos a partir do state `dados`** com o mapeamento reverso (ex: `dados["comprador_cpf"]` → `cpf` do participante comprador)
- Isso garante que dados digitados manualmente no formulario tambem vao para `contract_participants`

### 4. Adicionar logs detalhados e alerta visual (NovoContrato.tsx)
- Antes do save, logar cada campo que sera salvo
- Se `mergedDados` tiver menos de 2 campos preenchidos, mostrar toast de aviso

### Arquivos a modificar
- **`src/pages/app/NovoContrato.tsx`** — handleSave: fallback de conteudo, merge bidirecional dados↔participantes, alerta de dados vazios

