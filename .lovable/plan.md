

## Problema

O componente `NovoContrato` armazena todo o estado do wizard em `useState`. Quando você navega para outra página (ex: clica em outro item do menu lateral) e volta, o componente é desmontado e remontado, perdendo todos os dados preenchidos.

## Solução: Persistir estado no sessionStorage

Vou salvar automaticamente o estado do wizard no `sessionStorage` a cada mudança, e restaurá-lo quando o componente montar. Assim, mesmo navegando para outra aba e voltando, os dados são preservados. O `sessionStorage` é limpo quando o contrato é salvo ou quando o usuário fecha a aba do navegador.

### Mudanças em `src/pages/app/NovoContrato.tsx`

1. **Criar função auxiliar** para salvar/carregar estado do sessionStorage com uma chave fixa (`novo-contrato-draft`).

2. **Inicializar todos os `useState` relevantes** a partir do sessionStorage (se existir):
   - `flowMode`, `currentStepIndex`, `selectedTemplateId`, `dados`, `selectedClauseIds`, `conteudoFinal`, `nomeContrato`
   - `compradorId`, `vendedorId`, `empresaId`, `checkedDocs`, `uploadedFiles`
   - `participants`, `aiReviewSubStep`

3. **Adicionar um `useEffect`** que observa todas essas variáveis e salva no sessionStorage quando mudam (debounced ou direto).

4. **Limpar o sessionStorage** ao salvar o contrato com sucesso (`handleSave`) e ao clicar em voltar no passo 1 (cancelar wizard).

### Detalhes técnicos

- Usar `sessionStorage` (não `localStorage`) para que o rascunho não persista entre sessões do navegador.
- Arquivos enviados ao Supabase Storage já estão salvos remotamente; apenas os metadados (`uploadedFiles`, `participants.documents`) precisam ser persistidos.
- O `extractedData` do hook `useDocumentExtraction` não será persistido (requer re-extração se perdido), pois contém dados temporários de processamento.

