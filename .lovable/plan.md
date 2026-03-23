

## Diagnostico Real - Por que nao consegue criar contrato manual

Analisei o codigo inteiro e encontrei **o problema principal**:

**No fluxo manual, o botao "Proximo" esta bloqueado se voce nao tiver contatos ja cadastrados.** O sistema exige selecionar um Comprador e um Vendedor da lista de contatos (`canProceed` verifica `!!compradorId && !!vendedorId`). Se nao tem contatos cadastrados, voce simplesmente nao consegue avancar. E isso que trava.

Alem disso, mesmo que consiga avancar (com contatos), o fluxo manual **nunca salva participantes** na tabela `contract_participants` (so o fluxo IA faz isso), entao a tela de detalhe nao mostra os dados.

---

## Plano de Correcao Definitivo

### 1. Permitir digitar comprador/vendedor na hora (NovoContrato.tsx - step "parties-docs")
- Adicionar campos de texto para Nome do Comprador e Nome do Vendedor, alem da busca de contatos
- Se o usuario digitar o nome, nao precisa selecionar contato da lista
- Atualizar `canProceed()` para aceitar **nome digitado OU contato selecionado**
- Manter a busca de contatos como opcao (selecionar preenche automaticamente)

### 2. Salvar participantes tambem no fluxo manual (NovoContrato.tsx - handleSave)
- Atualmente, o bloco `if (flowMode === "ai" && participants.length > 0)` so salva participantes no fluxo IA
- Adicionar logica para criar registros em `contract_participants` tambem no fluxo manual, usando os dados do contato selecionado ou os nomes digitados + dados do formulario
- Isso garante que a tela de detalhe sempre tem dados para mostrar

### 3. Preencher dados automaticamente ao digitar nomes (NovoContrato.tsx)
- Quando o usuario digita nome do comprador/vendedor manualmente, salvar em `dados["comprador_nome"]` e `dados["vendedor_nome"]`
- Quando seleciona contato da lista, continuar preenchendo todos os campos como ja faz

### 4. Garantir que dados aparecem na tela de detalhe (ContratoDetalhe.tsx)
- Ja esta implementado com `ContractDataDisplay` + query de `contract_participants`
- Com as correcoes acima (salvar participants em ambos os fluxos), os dados vao aparecer automaticamente

### Arquivos a modificar
- **`src/pages/app/NovoContrato.tsx`**:
  - Step "parties-docs": campos de texto para nomes + busca opcional
  - `canProceed()`: aceitar nome digitado
  - `handleSave()`: salvar participants para fluxo manual tambem
  - `autoFillDados()`: incluir nomes digitados

### Detalhes tecnicos
- Novos states: `compradorNome` e `vendedorNome` para nomes digitados manualmente
- `canProceed` para "parties-docs": `(!!compradorId || compradorNome.trim()) && (!!vendedorId || vendedorNome.trim())`
- No `handleSave`, criar participantes com role "comprador"/"vendedor" usando dados do contato selecionado ou dos campos `dados["comprador_*"]`
- Nenhuma migracao de banco necessaria (tabelas e RLS ja existem)

