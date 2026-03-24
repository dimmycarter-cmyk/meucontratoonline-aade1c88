

## Correção: Contrato sempre salvar como "rascunho"

### Problema
Na linha 640 de `NovoContrato.tsx`, o contrato é salvo com `status: "pronto"`. Deveria ser `"rascunho"` para que o operador mude manualmente quando estiver pronto.

### Correção
**Arquivo**: `src/pages/app/NovoContrato.tsx`
- Alterar `status: "pronto"` para `status: "rascunho"` no `handleSave`

Uma única linha. O operador já pode mudar o status na tela de detalhe do contrato (o `Select` de status já existe em `ContratoDetalhe.tsx`).

