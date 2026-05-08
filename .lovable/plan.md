## Comparativo: Prompt L vs. estado atual

Inspecionei os 4 arquivos. Resumo:

| Arquivo | Loading hoje | Skeleton importado? | Aderência ao Prompt L |
|---|---|---|---|
| `Contratos.tsx` | Texto "Carregando..." centralizado | ❌ Não | **Faltante** — único que ainda usa spinner/texto |
| `Contatos.tsx` | 3× `<Skeleton className="h-14 w-full" />` genéricos | ✅ Sim | Parcial — não imita colunas da tabela |
| `Modelos.tsx` | 3× `<Skeleton className="h-48 w-full rounded-lg" />` (grid) | ✅ Sim | Bom — é grid de cards, skeleton já bate |
| `Clausulas.tsx` | 3× `<Skeleton className="h-16 w-full rounded-lg" />` (lista) | ✅ Sim | Bom — é lista de cards, skeleton já bate |

Variável de loading: todas usam `isLoading` (vindas dos hooks `useContracts/useContacts/useTemplates/useClauses`). Estado vazio (`EmptyState`) já está aplicado nos 4. Nenhuma lógica de fetch a tocar.

### Colunas reais das tabelas
- **Contratos** (6 cols): Código (mono curto) · Contrato (ícone+nome) · Status (badge) · Valor (lg:) · Data (sm:) · ações
- **Contatos** (5 cols): Nome · CPF · Contato (md:) · Cidade (lg:) · ações

### O que melhorar (escopo mínimo, sem ampliar Prompt L)

**1. `Contratos.tsx` — obrigatório (atualmente sem skeleton)**
- Adicionar `import { Skeleton } from "@/components/ui/skeleton"`.
- Substituir o `<div>Carregando...</div>` por um skeleton de tabela com 6 colunas e 5 linhas, respeitando os mesmos `hidden lg:table-cell` / `hidden sm:table-cell` para não quebrar mobile.
- Manter `<table>`/`<thead>` reais com larguras aproximadas: `w-16` (código), `w-48` (nome+ícone redondo), `w-20 rounded-full` (badge status), `w-24` (valor), `w-20` (data), `w-8` (ação).

**2. `Contatos.tsx` — melhoria de fidelidade**
- Trocar as 3 barras genéricas por skeleton de tabela com 5 colunas × 5 linhas, respeitando `hidden md:table-cell` / `hidden lg:table-cell`. Larguras: `w-40`, `w-28`, `w-44`, `w-24`, `w-8`.
- Skeleton já está importado — não duplicar import.

**3. `Modelos.tsx` — ajuste pequeno**
- Manter grid `sm:grid-cols-2 lg:grid-cols-3`, aumentar de 3 para 6 cards skeleton (preenche grid em desktop). Sem mudar altura nem layout.

**4. `Clausulas.tsx` — ajuste pequeno**
- Aumentar de 3 para 5 linhas skeleton (lista vertical) e trocar `h-16` por `h-[72px]` para bater melhor com a altura real do card de cláusula. Opcional; se quiser preservar 100% do estado atual, deixamos como está.

### Detalhes técnicos

- Cada `<Skeleton>` envolto em `<td className="py-3"><Skeleton className="h-4 w-X rounded" /></td>` (ou `rounded-full` para badge de status).
- Reusar exatamente o mesmo `<thead>` real de cada tabela para que o skeleton e o estado carregado tenham largura idêntica (sem "pulo" visual ao trocar).
- Nenhuma mudança em hook, query, mutation, EmptyState ou tratamento de erro.
- Nenhum arquivo fora dos 4 listados será tocado.

### Critério de aceite (espelha o Prompt L)
- Slow 3G nas 4 telas → skeleton no lugar de "Carregando..." / barras genéricas.
- Dados carregados → tabela real sem layout shift.
- Lista vazia → `EmptyState` intacto.
- Erro de fetch → comportamento atual preservado.
- Build limpo, lógica de fetch inalterada.

### Pergunta antes de executar

Você quer que eu inclua os ajustes pequenos em `Modelos.tsx` (3→6 cards) e `Clausulas.tsx` (3→5 linhas, altura ajustada), ou prefere que eu mexa **apenas** em `Contratos.tsx` + `Contatos.tsx` (onde há ganho real de fidelidade)?