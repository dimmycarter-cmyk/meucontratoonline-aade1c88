

# Fase 2 — Implementação do Banco de Dados + Auth + CRUD

O GitHub pode ser conectado a qualquer momento depois. Vamos focar agora na implementação da Fase 2.

## O que será feito

### 1. Migration SQL no Supabase
Criar todas as tabelas e políticas RLS:
- Enum `app_role` (super_admin, admin_empresa, corretor, assistente, operacional)
- `tenants` — id, nome, slug, status, created_at
- `profiles` — id (FK auth.users), tenant_id, nome, email, avatar_url, status
- `user_roles` — user_id, role, tenant_id (unique user_id+role)
- `contacts` — todos os campos (CPF, RG, endereço, dados bancários, etc.) + tenant_id
- `companies` — todos os campos (CNPJ, razão social, endereço, etc.) + tenant_id
- Funções `has_role()` e `get_user_tenant_id()` (security definer)
- RLS em todas as tabelas com isolamento por tenant
- Trigger `on_auth_user_created` para criar tenant + profile automaticamente

### 2. Auth Frontend
- `src/contexts/AuthContext.tsx` — provider com session, user, profile, signOut
- `src/components/ProtectedRoute.tsx` — guard para rotas /app
- Integrar Login, Cadastro, EsqueciSenha, ResetPassword com Supabase Auth
- Logout funcional no sidebar
- Wrap App.tsx com AuthProvider + ProtectedRoute

### 3. CRUD Real — Contatos e Empresas
- `src/hooks/useContacts.ts` — useQuery/useMutation para tabela contacts
- `src/hooks/useCompanies.ts` — useQuery/useMutation para tabela companies
- Atualizar páginas Contatos e Empresas com formulários completos, máscaras de input e dados reais do Supabase

### 4. Atualizar types.ts
- Regenerar tipos do Supabase para refletir o novo schema

