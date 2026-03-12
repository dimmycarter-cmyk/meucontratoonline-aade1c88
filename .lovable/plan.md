

## Plano: Titulo editavel na tela de detalhe do contrato

Adicionar um campo editavel inline no titulo do contrato (linha 120 de `ContratoDetalhe.tsx`). Ao clicar no titulo, ele vira um `Input` editavel. Ao sair do campo (blur) ou pressionar Enter, salva automaticamente via `updateContract`.

### Mudancas em `src/pages/app/ContratoDetalhe.tsx`

1. Adicionar estado `editingTitle` (boolean) e `titleValue` (string)
2. Substituir o `<h1>` fixo por um componente condicional:
   - Quando nao esta editando: `<h1>` com cursor pointer e icone de lapis sutil, clicavel
   - Quando esta editando: `<Input>` com o valor atual, autoFocus, que salva no blur/Enter e cancela no Escape
3. Ao salvar: chamar `updateContract({ id, nome: titleValue })` e `refetch()`

Mudanca localizada em ~15 linhas no mesmo arquivo.

