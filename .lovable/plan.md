

## Plano: Remover campos desnecessários da extração e revisão

Remover `father_name`, `mother_name` e `birth_date` de três pontos:

### 1. `supabase/functions/extract-document/index.ts`
- Remover as propriedades `birth_date`, `father_name` e `mother_name` do schema JSON enviado à IA (linhas ~138-144), para que a IA nem extraia esses campos.

### 2. `src/components/contract/ExtractedDataReview.tsx`
- Remover as entradas `birth_date`, `father_name` e `mother_name` do `FIELD_LABELS` (linhas 27, 32-33).

### 3. `src/hooks/useDocumentExtraction.ts`
- Adicionar um filtro no processamento dos resultados para ignorar esses três campos caso venham na resposta da IA (proteção extra).

