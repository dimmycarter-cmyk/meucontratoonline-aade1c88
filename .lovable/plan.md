

## Diagnóstico

Existem **dois problemas** relacionados:

### Problema 1: Tela "Revisão" (ExtractedDataReview) perde dados
O `extractedData` vive apenas no state do hook `useDocumentExtraction` e **não é salvo no rascunho** (`buildDraftPayload` na linha 182 não inclui `extractedData`). Quando o componente remonta, o hook reinicializa com array vazio.

### Problema 2: Tela "Dados" perde dados ao navegar voltar→próximo
Quando o usuário está na sub-etapa "data" e clica **Voltar** (vai para "review") e depois **Próximo** novamente, o código na linha 400-403 executa:
```
const aiDados = mapToDados();
setDados((prev) => ({ ...prev, ...aiDados }));
```
Como `extractedData` está vazio (problema 1), `mapToDados()` retorna `{}`, e os dados previamente preenchidos são sobrescritos com nada.

### Causa raiz única
Tudo se resolve **persistindo `extractedData` no rascunho** e **restaurando-o ao montar**.

## Plano de Implementação

### 1. `src/hooks/useDocumentExtraction.ts`
- Adicionar parâmetro opcional `initialExtractedData` ao hook
- Usar como valor inicial do `useState<ParticipantExtractedData[]>`
- Expor `setExtractedData` para uso externo (restauração do draft)

### 2. `src/pages/app/NovoContrato.tsx`
- Incluir `extractedData` no `buildDraftPayload` (serializar junto com o resto)
- Passar `draft.current?.extractedData` como `initialExtractedData` ao chamar `useDocumentExtraction()`
- Adicionar `extractedData` no array de dependências do `buildDraftPayload`

### 3. Proteção extra no `handleNext`
- Na transição "review" → "data" (linha 400-403), só sobrescrever `dados` com `mapToDados()` se `extractedData` não estiver vazio, evitando apagar dados já preenchidos

Resultado: os dados extraídos sobrevivem a navegação entre telas, voltar/avançar, e recarregamento de página.

