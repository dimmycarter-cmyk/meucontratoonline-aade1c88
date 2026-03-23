

## Problema

O contrato salva mas com dados em branco porque:

1. **Participantes do fluxo IA não são salvos na tabela `contract_participants`**: O `handleSave` não insere os dados dos participantes (nome, CPF, RG, endereço, etc.) na tabela `contract_participants`. Apenas salva `dados` (variáveis de template) e `conteudo_final`.

2. **`dados` pode estar vazio**: O `mapToDados()` só é chamado na transição "review" → "data". Se o usuário pula essa transição ou se `extractedData` está vazio nesse momento, `dados` fica `{}`.

3. **`conteudo_final` pode estar vazio**: Se o template não foi processado com substituição de variáveis, o conteúdo final fica como string vazia.

## Plano de Implementação

### 1. Salvar participantes na tabela `contract_participants` (`NovoContrato.tsx`)
No `handleSave`, após criar o contrato com sucesso, inserir cada participante do fluxo IA na tabela `contract_participants` com todos os campos extraídos (full_name, cpf, rg, endereço, etc.).

### 2. Garantir que `dados` seja preenchido antes de salvar (`NovoContrato.tsx`)
No `handleSave`, chamar `mapToDados()` novamente antes de montar o payload do contrato, para garantir que os dados extraídos mais recentes sejam incluídos mesmo que o usuário não tenha passado pela transição "review → data".

### 3. Garantir `conteudo_final` com substituição de variáveis (`NovoContrato.tsx`)
No `handleSave`, se `conteudoFinal` estiver vazio mas houver um template selecionado, fazer a substituição das variáveis do template com os dados extraídos antes de salvar.

### Arquivos a modificar
- **`src/pages/app/NovoContrato.tsx`** — `handleSave`: adicionar insert de participants + fallback de `mapToDados()` + substituição de template

