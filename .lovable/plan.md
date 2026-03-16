

## Problema

Não há funcionalidade para convidar novos usuários para um tenant. O cadastro atual cria um novo tenant (empresa) para cada usuário. Não existe forma de um admin adicionar membros à sua empresa.

## Solução: Fluxo de Convite de Usuários

### Mudanças necessárias

| Componente | Descrição |
|------------|-----------|
| **Tabela `invitations`** | Nova tabela: `id`, `tenant_id`, `email`, `role` (app_role), `invited_by`, `status` (pending/accepted/expired), `token`, `created_at`, `expires_at`. RLS: admin_empresa e super_admin podem inserir/ver convites do seu tenant. |
| **Edge Function `send-invite`** | Recebe email + role, cria registro em `invitations`, envia email com link de convite (`/cadastro?token=xxx`). |
| **`src/pages/Cadastro.tsx`** | Detectar query param `token`. Se presente, validar convite e ao criar conta, vincular o usuário ao `tenant_id` do convite (em vez de criar tenant novo). Atribuir a role do convite. |
| **UI de convite na página Usuários** | Botão "Convidar Usuário" no `Contatos.tsx` (ou nova seção). Formulário com email + seleção de role. Visível apenas para admin_empresa e super_admin. |
| **Listagem de convites pendentes** | Mostrar convites enviados com status (pendente/aceito/expirado). |

### Fluxo
1. Admin clica "Convidar" → preenche email e role → sistema envia email com link
2. Novo usuário clica no link → chega na página de cadastro com token
3. Ao se cadastrar, é automaticamente vinculado ao tenant do admin e recebe a role definida
4. Convite muda status para "accepted"

~5 arquivos alterados/criados, 1 migration, 1 edge function.

