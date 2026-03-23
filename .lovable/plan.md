

## Explicacao Simples

O problema tem duas partes:

1. **Os dados estao sendo salvos no banco**, mas a **tela de detalhe do contrato nao mostra esses dados**. Ela so mostra o nome do comprador/vendedor e o texto do contrato. Todos os outros campos (CPF, RG, endereco, profissao, etc.) estao guardados mas nao aparecem na tela.

2. **O texto do contrato pode estar vazio** porque o sistema so monta o texto quando voce passa por certas etapas do wizard. Se pular ou se nao tiver modelo selecionado, salva vazio.

## Plano de Correcao

### 1. Exibir todos os dados salvos na tela de detalhe (`ContratoDetalhe.tsx`)
- Ler o campo `dados` (JSON) do contrato salvo e exibir todos os campos preenchidos: CPF, RG, endereco, profissao, estado civil, nacionalidade, etc.
- Ler os participantes da tabela `contract_participants` e exibir seus dados completos no sidebar
- Organizar por categorias (Comprador, Vendedor, Imovel, Financeiro) para ficar claro

### 2. Garantir que o texto do contrato nunca salve vazio (`NovoContrato.tsx`)
- Chamar `buildFinalContent()` dentro do `handleSave`, imediatamente antes de salvar, para que o texto sempre tenha as variaveis substituidas
- Se nao houver template selecionado mas houver dados extraidos, montar um resumo basico com os dados
- Adicionar log no console para debug caso `conteudoFinal` esteja vazio no momento do save

### 3. Adicionar console.log de debug temporario no handleSave
- Logar `mergedDados`, `conteudoFinal`, `extractedData` e `participants` antes de enviar ao banco, para que possamos ver exatamente o que esta sendo salvo e identificar se o problema e no envio ou na exibicao

### Arquivos a modificar
- `src/pages/app/ContratoDetalhe.tsx` — adicionar exibicao dos dados do contrato e participantes
- `src/pages/app/NovoContrato.tsx` — chamar buildFinalContent no handleSave + logs de debug

