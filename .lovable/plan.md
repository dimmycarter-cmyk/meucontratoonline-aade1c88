

## Problema

Os logs da edge function mostram o erro claro:

```
invalid input syntax for type uuid: "temp-0"
invalid input syntax for type uuid: "temp-1"
```

O que acontece:
1. Os documentos são enviados ao storage com sucesso
2. A edge function `extract-document` recebe `document_id: "temp-0"` (porque `doc.id` é `undefined` — os docs nunca são salvos na tabela `participant_documents`)
3. A IA extrai os dados corretamente, mas na hora de salvar em `extracted_document_data` com `document_id = "temp-0"`, o Postgres rejeita porque a coluna é UUID
4. O insert falha, mas a função retorna `{ success: true, data: extractedData }` mesmo assim — então o frontend mostra "Extração concluída!"
5. Porém os dados extraídos pela IA **são retornados corretamente** ao frontend. O problema real pode estar em dois pontos: (a) o insert no banco falha mas os dados chegam ao hook, ou (b) os dados chegam mas não são exibidos na tela de revisão.

Analisando melhor: a extração **funciona** (a IA retorna dados), o insert no banco falha (não-crítico para o fluxo), e os dados **devem** estar sendo montados no `extractedData`. Preciso verificar se a tela de revisão está consumindo `extractedData` corretamente, e se o "0 de 2 documentos processados" indica que o progresso não está contando corretamente.

Vou verificar o componente de revisão para entender o fluxo completo.

## Solução

Dois problemas a corrigir:

### 1. Edge function: `document_id` inválido no insert
O hook passa `doc.id || "temp-${i}"` como `document_id`. Como os docs não são persistidos na tabela `participant_documents` antes da extração, `doc.id` é sempre `undefined`. A edge function tenta fazer insert/update com esse valor "temp-X" em colunas UUID, causando erros.

**Correção na edge function**: Tornar o insert em `extracted_document_data` e os updates em `participant_documents` condicionais — só executar se `document_id` for um UUID válido. Os dados extraídos já são retornados na response independentemente.

### 2. Hook: contador "0 de 2 documentos processados"
O progresso mostra "0 de 2" porque o `setProgress` não está sendo atualizado após processar cada documento com sucesso. A UI pode estar interpretando as falhas de insert como falhas totais.

**Correção no hook**: 
- Não passar IDs temporários como `document_id` — passar `null` ou omitir quando não houver UUID real
- Garantir que o contador de documentos processados reflita os que tiveram dados extraídos com sucesso

### Arquivos a modificar:

1. **`supabase/functions/extract-document/index.ts`**:
   - Tornar o insert em `extracted_document_data` condicional (só se `document_id` for UUID válido)
   - Tornar os updates de status em `participant_documents` condicionais
   - Manter o retorno dos dados extraídos independente do salvamento no banco

2. **`src/hooks/useDocumentExtraction.ts`**:
   - Remover o fallback `doc.id || "temp-${i}"` — passar `doc.id || null`
   - A edge function deve funcionar sem `document_id` válido (modo "extraction only")

