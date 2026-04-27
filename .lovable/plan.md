# Inverter ordem dos participantes — Vendedor antes de Comprador

## Objetivo
Na etapa "Participantes" do wizard de Novo Contrato, exibir o bloco **Vendedor** acima do bloco **Comprador** (e ajustar a ordenação interna correspondente, incluindo cônjuges).

## Escopo
Alteração isolada em `src/components/contract/ManualParticipantManager.tsx`. Nenhuma mudança em dados, placeholders, persistência ou auto-fill — a ordem é puramente visual/organizacional dos cards no wizard.

## Mudanças

### 1. `ROLE_ORDER` (linha 22-24)
Trocar a ordem dos dois primeiros itens:
```ts
const ROLE_ORDER: ParticipantRole[] = [
  "vendedor", "comprador", "conjuge", "anuente", "fiador", "testemunha", "procurador", "interveniente", "outro",
];
```

### 2. `smartSort` (linhas 30-49)
Inverter a montagem final para Vendedor + cônjuges do vendedor primeiro, depois Comprador + cônjuges do comprador:
```ts
return [
  ...vendedores,
  ...conjugesVendedor,
  ...compradores,
  ...conjugesComprador,
  ...others,
];
```
A lógica de divisão dos cônjuges entre comprador/vendedor permanece igual — apenas a ordem de concatenação muda.

### 3. Default do select "Tipo de participante" (linha 62)
Trocar default de `"comprador"` para `"vendedor"` para refletir a nova ordem natural.

### 4. Texto vazio (linha 120)
Atualizar para *"Adicione pelo menos um vendedor e um comprador para continuar"*.

## Fora do escopo
- `ParticipantManager.tsx` (modo IA/upload de docs) — confirmar com o usuário se também deve ser invertido. Por padrão, **não** alterar nesta task; o print mostra apenas o modo manual.
- Ordem dos slots em `auto-fill-dados.ts` (`comprador`, `comprador2`, `vendedor`, `vendedor2`...) permanece intacta — placeholders continuam funcionando como antes.

## Validação
- Abrir `/app/novo-contrato` → etapa Participantes: blocos devem aparecer na ordem Vendedor → Comprador.
- Adicionar 1 vendedor + 1 comprador + 1 cônjuge: cônjuge deve continuar agrupado corretamente após o respectivo titular.
- Rodar `bunx vitest run` para garantir que nenhum teste de auto-fill quebra (não deve, pois só mexe em UI).
