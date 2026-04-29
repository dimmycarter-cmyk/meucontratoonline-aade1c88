## Objetivo

Aumentar em 2x a altura do campo "Descrição do Imóvel" na seção Imóvel.

## Mudança

**Arquivo:** `src/components/contract/FixedDataFields.tsx`

O campo usa o componente `Field` com `textarea` (rows=2, min-height padrão 80px). Vou substituir esse uso específico por um `Textarea` inline com `rows={4}` e `min-h-[160px]`, dobrando a altura visível atual.

```tsx
<div className="sm:col-span-2">
  <Label className="mb-1 text-xs text-muted-foreground">Descrição do Imóvel</Label>
  <Textarea
    value={dados.imovel_descricao || ""}
    onChange={(e) => setField(dados, onChange, "imovel_descricao", e.target.value)}
    placeholder="Descrição do Imóvel"
    rows={4}
    className="min-h-[160px]"
  />
</div>
```

Nenhuma outra alteração — só o tamanho visual do textarea da descrição do imóvel.