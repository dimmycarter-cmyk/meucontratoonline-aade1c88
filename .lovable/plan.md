

## Diagnostico Definitivo

Depois de analisar todo o codigo linha por linha, o problema tem **duas causas reais**:

### Causa 1: `dados` chega vazio no `handleSave`
- No fluxo manual, `autoFillDados()` so roda ao sair do step "parties-docs" (linha 392-394)
- Se o usuario digita nomes mas nao preenche nenhum campo no step "data-clauses" e vai direto para o editor, `dados` tem apenas `comprador_nome` e `vendedor_nome`
- Mas o `handleSave` faz `mergedDados = { ...mapToDados(), ...dados }`. No fluxo manual, `mapToDados()` retorna `{}` (so funciona com `extractedData` do fluxo IA). Entao `mergedDados` = `dados` que pode ser praticamente vazio
- **O `handleSave` nao chama `autoFillDados()` antes de salvar**, entao se houve qualquer re-render que resetou `dados`, ele salva vazio

### Causa 2: Participantes nao sao criados quando `fullName` esta vazio
- Na linha 686: `if (!fullName.trim()) continue;` — se `compradorNome` esta vazio e nao tem contato selecionado, o participante nao e criado
- Resultado: nenhum registro em `contract_participants`, nada aparece no detalhe

## Plano de Correcao (2 arquivos, correcao cirurgica)

### 1. `src/pages/app/NovoContrato.tsx` — handleSave
- **Chamar `autoFillDados()` dentro do `handleSave`** antes de montar `mergedDados`, para garantir que dados dos contatos/nomes digitados sempre estejam presentes
- Usar o state `dados` **atualizado apos autoFill** para o merge final
- Adicionar fallback: se `mergedDados["comprador_nome"]` ainda estiver vazio, pegar de `compradorNome` ou `comprador?.nome`
- Mesmo para vendedor
- Remover a condicao `if (!fullName.trim()) continue;` que silenciosamente pula participantes — em vez disso, sempre criar o registro se houver qualquer dado (nome digitado, contato, ou dado no formulario)

### 2. `src/pages/app/NovoContrato.tsx` — handleSave (conteudo_final)
- Chamar `buildFinalContent()` no handleSave para garantir que o conteudo final esteja atualizado com os dados mais recentes
- Usar o conteudo recem-calculado em vez do state (que pode estar desatualizado)

### Resultado esperado
- O contrato sempre salva com os dados que o usuario digitou/selecionou
- Participantes sempre sao criados (comprador e vendedor)
- O texto do contrato nunca fica vazio se houver dados ou template
- A tela de detalhe mostra tudo corretamente (ja funciona, so precisa de dados no banco)

