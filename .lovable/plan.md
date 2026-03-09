

## Deletar usuário dimmycarter@gmail.com para teste

O usuário `dimmycarter@gmail.com` (ID: `87723dcd-65cf-4f15-89c5-72c90de6ce9d`) precisa ser removido do sistema.

### O que será feito

Uma migration SQL que:
1. Identifica o `tenant_id` do usuário
2. Deleta em cascata: `subscriptions`, `contracts`, `contacts`, `companies`, `clauses`, `contract_templates`, `user_roles`, `profiles`, `tenants` associados
3. Deleta o usuário do `auth.users` (usando `DELETE FROM auth.users`)

Isso limpará completamente o usuário e seu tenant, permitindo recadastro limpo para testar o fluxo de onboarding.

### Arquivos

- 1 migration SQL (delete user + tenant data)

