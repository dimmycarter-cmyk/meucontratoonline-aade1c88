# PROMPT E — Permissões granulares + Proteção de delete de template

## Arquivos a modificar (3)

1. `src/pages/app/Contratos.tsx`
2. `src/pages/app/ContratoDetalhe.tsx`
3. `src/hooks/useTemplates.ts`

Zero migrations. Zero alterações em RLS. Sem novo hook de role (usa `useAuth().hasRole`).

## Tarefa 1 — Ocultar "Excluir" para corretor (`Contratos.tsx`)

- Adicionar import: `import { useAuth } from "@/contexts/AuthContext";`
- No componente: `const { hasRole } = useAuth();` e `const canDelete = hasRole("admin_empresa") || hasRole("super_admin");`
- Envolver o `<DropdownMenuItem>` de Excluir (linhas 113-118) com `{canDelete && (...)}`. Item interno inalterado.

## Tarefa 2 (adaptada) — Desabilitar Editar e Select de status para corretor em status ≠ "rascunho" (`ContratoDetalhe.tsx`)

- Trocar `const { profile } = useAuth();` por `const { profile, hasRole } = useAuth();`
- Adicionar helper local: `const isCorretorBloqueado = (status) => hasRole("corretor") && status !== "rascunho";`
- Após o early-return de `!contract`, calcular `const bloqueadoParaCorretor = isCorretorBloqueado(contract.status);`
- Botão "Editar" (linha ~231): adicionar `disabled={bloqueadoParaCorretor}` e `title={bloqueadoParaCorretor ? "Contrato finalizado — somente administradores podem editar" : undefined}`. `onClick` inalterado.
- `<Select>` de status (linha ~251): adicionar `disabled={bloqueadoParaCorretor}` e `title` análogo no `<SelectTrigger>`. `onValueChange` inalterado.

## Tarefa 3 (adaptada) — Banner condicional (`ContratoDetalhe.tsx`)

- Logo após `<div className="p-6 lg:p-8">` (raiz do JSX retornado), inserir:

```tsx
{bloqueadoParaCorretor && (
  <div className="mb-4 rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
    Este contrato está em status <strong>{contract.status}</strong> e não pode ser editado.
    Contate o administrador para solicitar alterações.
  </div>
)}
```

Sem depender de `isEditing` (não existe) — apenas role + status.

## Tarefa 4 — Bloquear delete de template em uso (`useTemplates.ts`)

Em `deleteMutation.mutationFn(id)`, antes do `.delete()` existente (linha 114):

```ts
const { count, error: checkError } = await supabase
  .from("contracts")
  .select("id", { count: "exact", head: true })
  .eq("template_id", id);

if (checkError) throw checkError;

if (count && count > 0) {
  throw new Error(
    `Este modelo está em uso em ${count} contrato${count > 1 ? "s" : ""}. Desvincule antes de excluir.`
  );
}
```

`.delete()` segue inalterado abaixo. O `onError` já usa `parseSupabaseError`, que repassa `error.message` quando não é código Postgres → toast exibirá a mensagem corretamente.

## Critério de aceite

- corretor: "Excluir" some da listagem
- corretor + status ≠ rascunho: botão Editar e Select status desabilitados com tooltip + banner amarelo
- corretor + status rascunho: tudo funciona normalmente
- admin_empresa/super_admin: comportamento idêntico ao atual
- Excluir template em uso: toast "Este modelo está em uso em N contrato(s)..."
- Excluir template sem uso: funciona normalmente
- Zero migrations, zero arquivos fora dos 3 listados
