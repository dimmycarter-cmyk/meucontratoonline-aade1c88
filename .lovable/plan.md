## Comparativo: Prompt K vs. estado atual do Onboarding

Inspecionei `src/pages/Onboarding.tsx` (384 linhas). Resposta às 7 perguntas do prompt + ajustes recomendados antes de executar.

### Respostas às perguntas de inspeção

1. **Nomes dos campos no schema zod**: `cep`, `rua`, `numero`, `complemento`, `bairro`, `cidade`, `estado` — **idênticos** aos defaults do `AddressForm`. Não precisa customizar `fieldNames`.
2. **Todos os 7 campos presentes**: ✅ sim, no `step2Schema` (linhas 25–33). `complemento` é `optional()`; os demais são obrigatórios com mensagens em PT-BR.
3. **`useForm` declarado como**: `const form2 = useForm<Step2Data>({ resolver: zodResolver(step2Schema), defaultValues: {...} })` (linhas 56–59). Acesso via `form2.control` e `form2.setValue` — compatível com a API proposta.
4. **Padrão de campos**: `<FormField control={form2.control} name="..." render={({ field }) => <FormItem>...<FormMessage/></FormItem>} />` — shadcn/ui padrão. ✅ compatível com `AddressFormRHF`.
5. **`useCepLookup` já importado**: ✅ sim (linha 16). Usado via `onCepResult` callback (linhas 61–69) que chama `form2.setValue` para os 4 campos. Após a substituição, **toda essa lógica sai do Onboarding** e vai pra dentro do `AddressFormRHF` — `onCepResult` e `lookupCep` ficam órfãos.
6. **Tipo inferido**: `type Step2Data = z.infer<typeof step2Schema>` (linha 36).
7. **Bloco de endereço**: linhas **252–353** (dentro do `<div className="grid gap-4 sm:grid-cols-2">`).

### Pontos a melhorar no Prompt K

1. **Labels com asterisco**: Onboarding usa `CEP *`, `Rua / Avenida *`, `Número *`, `Bairro *`, `Cidade *`, `UF *` (obrigatório) e `Complemento` (sem `*`). O `AddressFormRHF` proposto usa `CEP`, `Logradouro`, `Número`, etc. **sem asterisco e com "Logradouro" em vez de "Rua / Avenida"**. Isso muda o visual.
   - **Recomendo**: aceitar prop opcional `requiredFields?: Partial<Record<keyof AddressFieldNames, boolean>>` ou simplesmente hardcodar os labels reais do Onboarding (`Rua / Avenida *`, `UF *`, etc.) para preservar a UX atual.
2. **Lookup no `onBlur` vs `onChange`**: o Onboarding atual dispara `lookupCep` em `onChange` (linha 266), enquanto o prompt propõe `onBlur`. O `useCepLookup` já tem debounce de 500ms — mudar pra `onBlur` é uma alteração de comportamento perceptível ao usuário.
   - **Recomendo**: manter `lookup` em `onChange` (como `AddressForm.tsx` controlado já faz) para paridade total com o comportamento existente.
3. **Layout grid**: Onboarding usa um único `grid sm:grid-cols-2` envolvendo todos os campos, com `sm:col-span-2` no campo "Rua". O `AddressFormRHF` proposto tem múltiplos sub-grids separados (CEP+UF juntos, depois Rua sozinha, depois Número+Complemento, depois Bairro, depois Cidade). **Visual diferente** do atual. O `AddressForm` (versão controlada) já usa o mesmo layout grid único — vale espelhar essa estrutura no RHF para manter consistência visual entre as duas variantes e com o Onboarding original.
4. **Limpeza de imports**: após a substituição, ficam órfãos em `Onboarding.tsx`: `useCallback` (se não usado em outro lugar — é usado só no `onCepResult`), `maskCEP` (usado só no campo CEP), `useCepLookup`, e o callback `onCepResult` + `lookupCep`. **Incluir limpeza no escopo** (o prompt menciona "verificar antes de remover" mas não confirma).
5. **Tipos genéricos**: a interface `AddressFormRHFProps` proposta usa `Control` e `Path` sem genéricos. Para type safety com `Step2Data`, vale tipar como `AddressFormRHFProps<TFieldValues extends FieldValues>` com `control: Control<TFieldValues>` e `fieldNames: Record<keyof AddressFieldNames, Path<TFieldValues>>`. Custo zero, ganho de DX.
6. **`AddressFieldNames` interface duplicada**: o prompt define `AddressFieldNames` mas não a usa nas props (usa um objeto inline com `Path`). Pode ser removida ou usada de fato (`Record<keyof AddressFieldNames, Path<T>>`).

### Plano de execução proposto (revisado)

**Arquivo CRIADO**: `src/components/ui/AddressFormRHF.tsx`
- Genérico: `<TFieldValues extends FieldValues>`.
- Props: `control: Control<TFieldValues>`, `setValue: UseFormSetValue<TFieldValues>`, `fieldNames: Record<'cep'|'rua'|'numero'|'complemento'|'bairro'|'cidade'|'estado', Path<TFieldValues>>`, `disabled?`, `requiredFields?: Partial<Record<keyof AddressFieldNames, boolean>>` (default: todos true exceto `complemento`).
- Labels: `Rua / Avenida`, `UF` (espelhar `AddressForm.tsx`), com `*` quando `requiredFields[k]` for true.
- Layout: **grid único `sm:grid-cols-2`** com `sm:col-span-2` no Rua — idêntico ao `AddressForm.tsx` controlado e ao Onboarding atual.
- Lookup: disparar em `onChange` do CEP (paridade com Onboarding atual).
- `useCepLookup` chamado internamente; `setValue` usado pra preencher rua/bairro/cidade/estado com `{ shouldValidate: true }` opcional? — manter sem `shouldValidate` pra não disparar validação prematura (comportamento atual do Onboarding).

**Arquivo EDITADO**: `src/pages/Onboarding.tsx`
- Adicionar import `AddressFormRHF`.
- Substituir linhas 252–353 (todo o bloco grid de endereço) por:
  ```tsx
  <AddressFormRHF
    control={form2.control}
    setValue={form2.setValue}
    fieldNames={{ cep:"cep", rua:"rua", numero:"numero", complemento:"complemento", bairro:"bairro", cidade:"cidade", estado:"estado" }}
  />
  ```
- Remover linhas 61–71 (`onCepResult` + `lookupCep`).
- Remover imports órfãos: `useCallback`, `maskCEP`, `useCepLookup`. Manter `maskPhone`, `maskCNPJ` (usados no step1).

**Não tocar**: `AddressForm.tsx`, `useCepLookup.ts`, `step2Schema`, `handleStep2Submit`, payload da RPC, `form2.handleSubmit`.

### Pontos a confirmar antes de executar

1. OK manter labels **com asterisco** (`Rua / Avenida *`, `UF *`, etc.) via prop `requiredFields` — preservando 100% a UX atual? (Alternativa do prompt: labels sem `*`, mudando o visual.)
2. OK manter lookup do CEP em **`onChange`** (com debounce do hook), em vez de `onBlur` como o prompt propõe?
3. OK usar **layout grid único** `sm:grid-cols-2` (igual ao `AddressForm.tsx` e ao Onboarding atual), em vez dos múltiplos sub-grids do prompt?
4. OK incluir **limpeza dos imports órfãos** (`useCallback`, `maskCEP`, `useCepLookup`) no Onboarding após a substituição?