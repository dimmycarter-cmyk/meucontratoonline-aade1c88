

## Plano: Adicionar exclusao de convites

### Mudancas

1. **`src/hooks/useInvitations.ts`** -- Adicionar mutation `deleteInvite` que faz `supabase.from("invitations").delete().eq("id", id)`.

2. **RLS Policy** -- Adicionar policy DELETE na tabela `invitations` para admin_empresa e super_admin do mesmo tenant.

3. **`src/components/PendingInvites.tsx`** -- Adicionar botao de excluir (icone Trash2) ao lado do badge de status em cada convite, chamando `deleteInvite`.

