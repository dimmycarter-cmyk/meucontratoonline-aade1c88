## Comparativo: Prompt I vs. estado atual do código

Inspecionei os 4 arquivos. Resumo do que encontrei e o que recomendo ajustar no Prompt I antes de executar.

### 1. `src/pages/app/Empresas.tsx` ✅ substituível
- Estado único: `form` com `setForm` / `updateField("campo", v)`.
- Tem todos os 7 campos (`cep`, `rua`, `numero`, `complemento`, `bairro`, `cidade`, `estado`).
- Já usa `useCepLookup` no próprio arquivo — vai ficar **duplicado** (o `AddressForm` traz seu próprio lookup). Precisa **remover** o `useCepLookup`, `onCepResult` e import do `maskCEP` deste arquivo após a troca.

### 2. `src/pages/app/Contatos.tsx` ✅ substituível
- Mesma estrutura de Empresas (`form` + `updateField`). Todos os 7 campos presentes.
- Mesma observação: remover `useCepLookup`/`onCepResult`/`maskCEP` locais após a troca.

### 3. `src/components/contract/ManualParticipantCard.tsx` ✅ substituível
- Estado é o objeto `participant` atualizado via `updateField("campo", v)` (que internamente chama `onUpdate`). Todos os 7 campos presentes.
- Mesma observação de limpeza (`useCepLookup`/`onCepResult`).
- Labels atuais usam `text-xs` — o `AddressForm` usa `Label` padrão. **Pequena mudança visual** (labels ficam maiores neste card). Vale confirmar.

### 4. `src/pages/Onboarding.tsx` ⚠️ **NÃO substituir**
- Usa `react-hook-form` + `zod` + `<FormField>` + `<FormMessage>` com **validação obrigatória** por campo (`cep`, `rua`, `numero`, `bairro`, `cidade`, `estado` são `required` com mensagens).
- O `AddressForm` é controlado por `value`/`onChange` simples e **não renderiza `<FormMessage>`**. Substituir aqui **quebra a exibição dos erros do zod** e o asterisco `*` dos labels obrigatórios.
- Recomendo **excluir Onboarding deste prompt**. Para integrá-lo seria preciso uma variante `AddressFormRHF` (próximo prompt, opcional).

### Outras observações
- O Prompt I não menciona a **limpeza dos imports** (`useCepLookup`, `maskCEP`, `onCepResult`) que ficarão órfãos nos 3 arquivos substituídos. Deixar dead code geraria warning no lint. Incluir essa limpeza no escopo.
- Os labels do `AddressForm` (`Rua / Avenida`, `UF`, sem `*`) batem com Empresas/Contatos atuais. No `ManualParticipantCard` haverá leve aumento de tamanho de fonte dos labels de endereço.

### Plano de execução proposto (revisado)

Editar **3 arquivos** (não 4):

1. `src/pages/app/Empresas.tsx`
   - Substituir bloco CEP→UF (linhas ~131–166) por `<AddressForm value={...} onChange={handleAddressChange} />`.
   - `handleAddressChange` despacha para `updateField`.
   - Remover `useCepLookup`, `onCepResult`, e `import { maskCEP }` se não usados em outro lugar.

2. `src/pages/app/Contatos.tsx`
   - Mesma estratégia de Empresas.
   - Remover imports órfãos.

3. `src/components/contract/ManualParticipantCard.tsx`
   - Substituir bloco CEP→UF (linhas ~358–414) por `<AddressForm>`.
   - `onChange` → `updateField(field, value)` (já existe).
   - Remover `useCepLookup`, `onCepResult` locais.
   - Aceitar pequena mudança visual nos labels (ou, alternativa: pular este arquivo para preservar `text-xs`).

### Pontos a confirmar antes de executar

1. OK **excluir `Onboarding.tsx`** do escopo (preserva validação `react-hook-form` + zod)?
2. OK aceitar a leve mudança visual nos labels do `ManualParticipantCard` (de `text-xs` para padrão)? Alternativa: deixar este arquivo de fora também e substituir só Empresas/Contatos.
3. OK incluir a **limpeza dos imports órfãos** (`useCepLookup`, `onCepResult`, `maskCEP` quando não usado em outro campo) nos arquivos substituídos?
