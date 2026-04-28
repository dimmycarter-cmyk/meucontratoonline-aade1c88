## Inverter ordem Vendedor → Comprador no fluxo IA/Upload

A inversão anterior cobriu apenas `ManualParticipantManager.tsx`. O componente exibido no print é o `ParticipantManager.tsx` (modo IA/upload de docs), que ainda lista Comprador antes de Vendedor porque a ordem dos grupos vem das chaves de `ROLE_LABELS` em `ParticipantCard.tsx`.

### Mudanças

**1. `src/components/contract/ParticipantCard.tsx` (linha 16-26)**
Reordenar `ROLE_LABELS` colocando `vendedor` antes de `comprador`. Como `ParticipantManager` usa `Object.keys(ROLE_LABELS)` para definir a ordem dos grupos, isso já inverte a exibição dos blocos e a ordem das opções no select "Tipo de participante".

```ts
const ROLE_LABELS: Record<ParticipantRole, string> = {
  vendedor: "Vendedor",
  comprador: "Comprador",
  conjuge: "Cônjuge",
  anuente: "Anuente",
  fiador: "Fiador",
  testemunha: "Testemunha",
  procurador: "Procurador",
  interveniente: "Interveniente",
  outro: "Outro",
};
```

**2. `src/components/contract/ParticipantManager.tsx`**
- Linha 29: trocar default `useState<ParticipantRole>("comprador")` para `"vendedor"`.
- Linha 76: atualizar texto vazio para *"Adicione pelo menos um vendedor e um comprador para continuar"*.

### Fora do escopo
- Não mexer no tipo `ParticipantRole` (a ordem dele é só tipagem, não afeta UI).
- Não alterar `auto-fill-dados.ts` nem placeholders — ordem é puramente visual.
- `ManualParticipantManager.tsx` já está correto da task anterior.

### Validação
- Abrir wizard no modo IA/upload → grupo Vendedor aparece antes de Comprador.
- Select "Tipo de participante" abre com Vendedor selecionado.
- Rodar `bunx vitest run` para confirmar que nada quebrou.