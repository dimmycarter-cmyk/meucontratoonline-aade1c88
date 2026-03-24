

## Novo participante aparece no topo

### Problema
Quando adiciona um novo participante, ele aparece no final do grupo. O usuario quer que o novo (vazio) fique no topo e os ja preenchidos fiquem abaixo.

### Correcao
**Arquivo**: `src/components/contract/ManualParticipantManager.tsx`

Na funcao `handleAdd` (linha 60-63), mudar a ordem de insercao: colocar o novo participante no inicio do array antes do sort.

```typescript
const handleAdd = () => {
  const updated = [emptyParticipant(newRole), ...participants];
  onChange(smartSort(updated));
};
```

E na funcao `smartSort`, ajustar para que dentro de cada grupo de papel, participantes sem nome fiquem primeiro:

```typescript
// Dentro de cada grupo, colocar vazios no topo
const sortWithinGroup = (arr) => 
  [...arr.filter(p => !p.nome.trim()), ...arr.filter(p => p.nome.trim())];
```

Aplicar `sortWithinGroup` em cada sub-array (compradores, vendedores, etc.) antes de montar o resultado final.

