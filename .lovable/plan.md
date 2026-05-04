
# PROMPT D — Validators Zod + Erros RLS amigáveis (FINAL APROVADO)

Decisões: Opção A (sem Tarefa 4), 9 hooks reais, manter títulos de toast.

## Arquivos a criar (2)

### 1. `src/lib/validators.ts`

```ts
import { z } from "zod";

function validarCPF(cpf: string): boolean {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += +d[i] * (10 - i);
  let r = (s * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== +d[9]) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += +d[i] * (11 - i);
  r = (s * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === +d[10];
}

function validarCNPJ(cnpj: string): boolean {
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (str: string, w: number[]) => w.reduce((a, v, i) => a + +str[i] * v, 0);
  const mod = (n: number) => { const r = n % 11; return r < 2 ? 0 : 11 - r; };
  return (
    mod(calc(d, [5,4,3,2,9,8,7,6,5,4,3,2])) === +d[12] &&
    mod(calc(d, [6,5,4,3,2,9,8,7,6,5,4,3,2])) === +d[13]
  );
}

export const cpfSchema = z.string().min(1, "CPF é obrigatório").refine(validarCPF, "CPF inválido");
export const cnpjSchema = z.string().min(1, "CNPJ é obrigatório").refine(validarCNPJ, "CNPJ inválido");
export const cepSchema = z.string().min(1, "CEP é obrigatório").refine((v) => /^\d{5}-?\d{3}$/.test(v), "CEP inválido");
export const telefoneBRSchema = z.string().refine(
  (v) => !v || /^(\(?\d{2}\)?\s?)(\d{4,5}[-\s]?\d{4})$/.test(v.replace(/\s/g, "")),
  "Telefone inválido",
);
export const emailSchema = z.string().min(1, "E-mail é obrigatório").email("E-mail inválido");
```

### 2. `src/lib/supabase-errors.ts`

```ts
export function parseSupabaseError(error: unknown): string {
  if (!error || typeof error !== "object") return "Erro inesperado.";
  const e = error as Record<string, unknown>;
  const code = String(e.code ?? "");
  const msg = String(e.message ?? "").toLowerCase();

  if (
    ["42501", "PGRST301", "PGRST116"].some((c) => code.includes(c)) ||
    msg.includes("policy") ||
    msg.includes("permission denied") ||
    msg.includes("row-level security")
  ) {
    return "Você não tem permissão para esta ação.";
  }
  if (code === "23505") {
    if (msg.includes("email")) return "Este e-mail já está cadastrado.";
    if (msg.includes("cpf")) return "Este CPF já está cadastrado.";
    if (msg.includes("cnpj")) return "Este CNPJ já está cadastrado.";
    return "Registro duplicado.";
  }
  if (code === "23503") return "Não é possível excluir — este item está em uso.";
  if (code === "23502") return "Campo obrigatório não preenchido.";
  return String(e.message ?? "Erro ao processar a solicitação.");
}
```

## Arquivos a editar (9 hooks) — só `onError` `description`

Padrão em todos: adicionar `import { parseSupabaseError } from "@/lib/supabase-errors";` no topo, e em cada `onError` trocar `description: error.message` por `description: parseSupabaseError(error)`. Títulos preservados.

| # | Arquivo | Mutations a tocar (onError) |
|---|---|---|
| 3 | `src/hooks/useContracts.ts` | createMutation, updateMutation, deleteMutation |
| 4 | `src/hooks/useTemplates.ts` | createMutation, updateMutation, deleteMutation |
| 5 | `src/hooks/useContacts.ts` | createMutation, updateMutation, deleteMutation |
| 6 | `src/hooks/useCompanies.ts` | createMutation, updateMutation, deleteMutation |
| 7 | `src/hooks/useClauses.ts` | createMutation, updateMutation, deleteMutation |
| 8 | `src/hooks/useInvitations.ts` | sendInvite, deleteInvite |
| 9 | `src/hooks/useAdminTenants.ts` | updateStatusMutation |
| 10 | `src/hooks/useAdminUsers.ts` | updateUserStatusMutation, addRoleMutation, removeRoleMutation |
| 11 | `src/hooks/useSubscriptions.ts` | updateMutation |

Total: 18 blocos `onError` editados, 9 imports adicionados.

## Não alterar
- Nenhum outro arquivo (componentes, rotas, schemas, migrations).
- Nenhuma lógica de mutation (mutationFn, onSuccess, queryKey, etc.).
- Nenhum título de toast.
- Não acoplar `cpfSchema` em `onBlur` neste prompt (Opção A).

## Validação pós-implementação
- Build limpo.
- `validators.ts` importável: `import { cpfSchema } from "@/lib/validators"` funciona.
- Forçar erro RLS (ex: tentar deletar registro de outro tenant via DevTools) → toast com "Você não tem permissão para esta ação."
- Fluxos existentes (criar contrato, salvar template, etc.) continuam funcionando normalmente em caminho feliz.

Aguardando aprovação para sair do plan mode e aplicar as edições.
