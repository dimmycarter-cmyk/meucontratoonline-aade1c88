

## Problema identificado

Os modelos existem na pagina de Modelos, mas aparecem com status **"rascunho"** (padrao ao criar). O dropdown em Novo Contrato filtra apenas modelos com `status === "ativo"`. O usuario precisa ir na pagina Modelos e clicar "Publicar" para o modelo aparecer no dropdown.

## Solucao

Duas correcoes para melhorar a UX:

### 1. Mostrar tambem modelos em rascunho no dropdown (com indicador)
No `NovoContrato.tsx`, mudar o filtro para incluir rascunhos tambem, mas com badge indicando o status:
- `activeTemplates = templates` (sem filtro de status, ou filtrar apenas os que nao foram "arquivados")
- Cada item no Select mostra badge "Rascunho" ou "Ativo"

### 2. Alternativa mais simples: mudar o status padrao ao criar modelo inline
No dialog de criacao de modelo dentro do NovoContrato (linha 424), o status ja e `"ativo"`. Porem modelos criados na pagina Modelos ficam como `"rascunho"`. A correcao e:
- Remover o filtro `status === "ativo"` e mostrar todos os modelos no dropdown
- Adicionar um badge visual no Select para diferenciar rascunho/ativo

### Arquivo alterado

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/app/NovoContrato.tsx` | Linha 138: mudar filtro de `t.status === "ativo"` para mostrar todos os modelos (ou pelo menos rascunho + ativo). Adicionar badge no SelectItem. |

Mudanca de 1 linha + ajuste visual no SelectItem.

