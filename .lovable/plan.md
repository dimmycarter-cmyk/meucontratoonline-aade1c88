

## Análise: Prompt vs. Estado Atual

### O que JÁ está implementado e funcionando

| Feature | Status |
|---------|--------|
| Multi-tenant com `tenant_id` | Feito |
| RBAC (super_admin, admin_empresa, corretor, etc.) | Feito |
| RLS por tenant + super admin | Feito |
| Onboarding obrigatório (2 etapas) | Feito |
| Dashboard do Super Admin (métricas, gráficos, gestão de tenants/usuários) | Feito |
| Dashboard da Empresa (dados reais, contratos por mês, contatos) | Feito |
| Impersonação de empresa pelo Super Admin | Feito |
| Filtros avançados + paginação no Admin | Feito |
| Audit logs de ações administrativas | Feito |
| AlertDialog de confirmação para ações críticas | Feito |
| Menu lateral com itens para empresa e super admin | Feito |

### O que FALTA implementar (ideias novas do prompt)

1. **Sistema de Planos e Assinaturas** — tabelas `plans` e `subscriptions`, trial automático de 7 dias, campos `subscription_status`, `plan_id`, `trial_start`, `trial_end` nos tenants
2. **Controle de Licenças** — limitar nº de usuários e contratos por plano, bloquear criação quando atingir limite
3. **Gestão de Planos no Admin** — CRUD de planos, visualização de assinaturas, status trial/ativo/expirado/suspenso
4. **Métricas adicionais no Super Admin** — empresas em trial, contratos por empresa, plano contratado na tabela de empresas
5. **Design Glassmorphism / Liquid Glass** — o design atual é clean mas não tem o efeito glass (backdrop-blur, transparência, bordas luminosas)
6. **Atividades recentes no Dashboard da empresa** — log de atividades (contratos gerados, contatos cadastrados, docs processados pela IA)
7. **Upload de logo no Onboarding** — campo existe no prompt mas não no onboarding atual

### O que pode ser MELHORADO no existente

- **Onboarding**: adicionar campo de logo (upload para storage bucket) e telefone
- **Dashboard empresa**: adicionar seção "Atividades Recentes" com timeline
- **Admin tabela de tenants**: adicionar colunas de CNPJ, Plano, Nº de Usuários, Status da Assinatura
- **Menu Super Admin**: adicionar itens "Planos" e "Assinaturas"

---

## Plano de Implementação

### Fase 1 — Sistema de Planos e Assinaturas (DB)

**Migration SQL:**
- Criar tabela `plans` (id, name, max_users, max_contracts_per_month, price, created_at)
- Criar tabela `subscriptions` (id, tenant_id, plan_id, status, start_date, end_date, trial_start, trial_end)
- Adicionar seed dos 3 planos (Starter, Professional, Enterprise)
- Adicionar `plan_id` e `subscription_status` ao tenant ou usar subscription separada
- RLS: super_admin full access, empresa pode ver própria subscription
- Atualizar `handle_new_user` para criar subscription com trial de 7 dias automaticamente

### Fase 2 — Controle de Licenças (Backend)

- Criar função RPC `check_tenant_limits(tenant_id)` que retorna se o tenant pode criar contratos/usuários
- Nos hooks `useContracts` (create) e `useAdminUsers` (create), verificar limites antes de inserir
- UI: mostrar aviso quando próximo do limite, bloquear quando atingir

### Fase 3 — Gestão de Planos no Admin

- Nova página/tab "Planos" no Admin com CRUD de planos
- Nova página/tab "Assinaturas" com tabela de todas as subscriptions
- Na tabela de tenants: adicionar colunas Plano, Status Assinatura, Nº Usuários
- Ações: alterar plano, suspender, reativar

### Fase 4 — Melhorias visuais (Glassmorphism)

- Atualizar CSS com classes utilitárias glass (backdrop-blur-xl, bg-white/10, border border-white/20)
- Aplicar nos Cards do dashboard, sidebar, e modais
- Adicionar animações suaves com framer-motion onde falta

### Fase 5 — Melhorias menores

- Upload de logo no Onboarding (usar bucket `contract-documents` ou criar novo)
- Atividades recentes no Dashboard da empresa (criar tabela `activity_log` ou derivar dos dados existentes)
- Métricas adicionais no get_admin_metrics (empresas em trial, contratos por empresa)

---

## Resumo de arquivos

```text
DB Migration
├── CREATE TABLE plans (seed 3 planos)
├── CREATE TABLE subscriptions  
├── UPDATE handle_new_user() → criar subscription trial
├── CREATE FUNCTION check_tenant_limits()
└── RLS policies para plans e subscriptions

New Files
├── src/pages/app/Planos.tsx
├── src/pages/app/Assinaturas.tsx
├── src/hooks/usePlans.ts
├── src/hooks/useSubscriptions.ts
└── src/hooks/useTenantLimits.ts

Modified Files
├── src/pages/app/Admin.tsx (+tabs Planos, Assinaturas, métricas trial)
├── src/pages/Onboarding.tsx (+upload logo)
├── src/pages/Dashboard.tsx (+atividades recentes)
├── src/components/AppSidebar.tsx (+menu items para super admin)
├── src/index.css (+glassmorphism utilities)
├── src/App.tsx (+rotas planos/assinaturas)
└── src/hooks/useContracts.ts (+verificação de limites)
```

Recomendo implementar em fases, começando pela Fase 1 (Planos + Assinaturas no DB) pois é a base para tudo mais.

