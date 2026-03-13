

## Plano: Adicionar "Matrícula" à lista de documentos

Mudança simples em **`src/components/contract/ContractModeSelector.tsx`** linha 37:

Alterar o array `["CNH", "RG", "Comprovante"]` para `["CNH", "RG", "Comprovante", "Matrícula"]`.

Também adicionar o tipo `matricula_imovel` ao `DocType` e ao `DOC_TYPE_LABELS` em **`src/components/contract/DocumentUploader.tsx`** para que o usuário possa selecionar "Matrícula do Imóvel" ao fazer upload.

| Arquivo | Mudança |
|---------|---------|
| `ContractModeSelector.tsx` | Adicionar "Matrícula" ao array de tags (linha 37) |
| `DocumentUploader.tsx` | Adicionar `matricula_imovel` ao tipo `DocType` e ao `DOC_TYPE_LABELS` |

~3 linhas de mudança.

