# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

"Meu Contrato Online" — multi-tenant SaaS for Brazilian real estate contracts (PT-BR UI/data). Generated/maintained partly via [Lovable](https://lovable.dev): pushes to this repo sync back to the Lovable project, and `src/integrations/supabase/types.ts` plus `src/integrations/supabase/client.ts` are auto-generated (the client hardcodes the project URL and anon key — do not edit by hand).

## Commands

Package manager is **bun** (`bun.lock` / `bun.lockb`), but npm scripts work too.

- `bun dev` (or `npm run dev`) — Vite dev server on port 8080 (host `::`).
- `bun run build` — production build. `bun run build:dev` builds with `--mode development` (keeps the `lovable-tagger` plugin, used to component-tag JSX for Lovable).
- `bun run lint` — ESLint over the whole repo.
- `bun run test` — Vitest single run. `bun run test:watch` for watch mode.
- Run one test file: `bunx vitest run src/lib/__tests__/placeholder-conditional.test.ts`
- Run by name: `bunx vitest run -t "resolves alias"`
- Tests live in `src/test/` and `src/**/__tests__/**`; setup file is `src/test/setup.ts` (jsdom + `@testing-library/jest-dom`).
- TypeScript is intentionally loose (`strict: false`, `noImplicitAny: false`, `strictNullChecks: false` in `tsconfig.json` / `tsconfig.app.json`). Don't tighten these without a reason — existing code relies on the loose mode.

## Architecture

### Frontend stack

React 18 + Vite + TypeScript, routed with `react-router-dom`. State server-side via `@tanstack/react-query` (single `QueryClient` in `App.tsx`); forms via `react-hook-form` + `zod`. UI is shadcn-ui (Radix primitives wrapped under `src/components/ui/*`) + Tailwind. Path alias `@/*` → `src/*`. The rich-text editor (`RichTextEditor.tsx`) is Tiptap.

### Auth, tenancy, and route gating

`src/contexts/AuthContext.tsx` is the single source of truth for the logged-in user. It loads three things in parallel after sign-in: `profiles` row (has `tenant_id`), `user_roles` rows, and the `tenants` row. Important behaviors:

- **Roles** (`Database["public"]["Enums"]["app_role"]`): `super_admin`, `admin_empresa`, `corretor`, `assistente`, `operacional`. Use `hasRole(role)` / `isSuperAdmin` from `useAuth()`.
- **Impersonation**: super admins can pick a tenant to "view as" via `setImpersonatedTenant`. **Always read `effectiveTenantId` (not `profile.tenant_id`) when querying tenant-scoped data** — it returns the impersonated tenant for super admins and the user's real tenant otherwise. Most hooks in `src/hooks/use*.ts` already do this.
- **Onboarding gate**: `tenants.onboarding_completed` must be true for non-super-admins; otherwise `ProtectedRoute` redirects to `/onboarding`. Super admins bypass.
- **The `setTimeout(..., 0)` inside `onAuthStateChange`** is intentional — it avoids a Supabase client deadlock when issuing queries from the auth callback. Don't remove it.

Routing is layered in `src/App.tsx`:

- Public: `/`, `/login`, `/cadastro`, `/esqueci-senha`, `/reset-password`.
- `ProtectedRoute` wraps `/onboarding` (with `skipOnboardingCheck`) and the `/app/*` shell (`AppLayout`).
- `RoleRoute` gates feature routes by allowed roles (`modelos`, `clausulas`, `agente-ia`, `empresas`, `auditoria`).
- `SuperAdminRoute` gates `/app/admin`.

### Data layer

All data goes through `@supabase/supabase-js`. Each domain has a hook in `src/hooks/use<Domain>.ts` that wraps `useQuery` + `useMutation` with a stable query key (typically `["domain", effectiveTenantId]`) and writes audit entries via `logAction` (`src/lib/audit.ts`). RLS handles tenant isolation server-side, but client queries still filter on `tenant_id` for clarity. Tenant resource limits are checked via the `check_tenant_limits` RPC and surfaced through `useTenantLimits`.

DB is Postgres on Supabase. Migrations live in `supabase/migrations/*.sql` (run against the project linked in `supabase/config.toml`). Generated types in `src/integrations/supabase/types.ts` are the single source of truth for table shapes — import via `Database["public"]["Tables"]["..."]["Row"]` rather than redefining.

### Edge functions (`supabase/functions/`)

Deno-based. Two have `verify_jwt = false` in `config.toml`: `seed-templates-leva1` and `extract-matricula`. The others require an Authorization header. Callers from the frontend use `supabase.functions.invoke(...)`.

- `extract-document` — OCRs uploaded participant docs (RG/CPF/CNH/etc.) via the **Lovable AI gateway** (`https://ai.gateway.lovable.dev/v1/chat/completions`) using `google/gemini-2.5-pro` with a tool-call schema; writes results to `extracted_document_data` and updates `participant_documents.processing_status`. Requires `LOVABLE_API_KEY` secret.
- `extract-matricula` — similar, for property "matrícula" docs.
- `parse-docx-template` — parses uploaded `.docx` template files (has unit tests in `index.test.ts`).
- `ai-chat` — generic AI-chat backend for the Agente IA page.
- `send-invite` — emails new-user invitations (paired with `accept_invitation` RPC and the `invitations` table).
- `seed-templates-leva1` — bulk-seeds the system templates from `payload.json`.

### Contract templating engine — the heart of this app

A contract is a stored template (`contract_templates.conteudo`, HTML from Tiptap) with placeholder tokens that get substituted with the `contracts.dados` JSONB at render time. Three coupled files live in `src/lib/`:

- **`placeholder.ts`** — the substitution engine. Supports two syntaxes:
  - Modern: `{{key}}` / `{{ key }}` (snake_case canonical keys).
  - Legacy: `[LABEL EM CAIXA ALTA]` from imported `.docx` files. `LEGACY_BRACKET_MAP` maps these labels to canonical keys (e.g. `"NOME COMPLETO DO(A) COMPRADOR(A)"` → `comprador_nome`).
  - Also handles conditionals (see `placeholder-conditional.test.ts`).
- **`template-variables.ts`** — `TEMPLATE_VARIABLES` is the catalog of every canonical key the UI exposes (Comprador, Vendedor, Cônjuge, Imóvel, Empresa, etc.), with helpers `pessoa(prefix, label, category)` and `dadosBancarios(prefix, ...)` to generate indexed-participant blocks (`vendedor2_*`, `comprador3_*`, ...).
- **`contract-enrichment.ts`** — runs before render: applies `PLACEHOLDER_ALIASES` (bidirectional canonical pairs like `empresa_nome` ↔ `imobiliaria_nome`), injects company/tenant data, formats CPF/CNPJ/CEP/BRL, and generates derived fields (`valor_total_extenso`, `data_contrato_extenso`).

When adding a new template variable: declare it in `template-variables.ts`, add the legacy bracket label (if any) to `placeholder.ts`, add aliases to `contract-enrichment.ts` if it shadows an existing concept, and add fixtures/tests in `src/lib/__tests__/`. The wizard surfaces variables via `FixedDataFields.tsx` and the per-participant cards in `src/components/contract/`.

### Pages & navigation

`src/pages/` holds public pages; `src/pages/app/` holds authenticated app pages. The big one is `src/pages/app/NovoContrato.tsx` — the contract creation wizard (>2000 lines, autosaves via `useWizardAutosave`, manages multi-participant state through `ManualParticipantManager` / `MultipleParticipantsPanel`). `Admin.tsx` is the super-admin console. The sidebar in `AppSidebar.tsx` filters menu items by role.

## Conventions to keep

- All UI strings, comments, and DB labels are PT-BR. Don't translate them.
- Tenant-scoped queries: filter by `effectiveTenantId` from `useAuth()`, not `profile.tenant_id`, or you'll break super-admin impersonation.
- Domain logic goes in `src/lib/` (pure, testable); `src/hooks/use*.ts` adapt it to React Query and toasts. Keep components in `src/pages/` and `src/components/` thin.
- Do not edit `src/integrations/supabase/{client,types}.ts` by hand — they regenerate.
- New shadcn components: `src/components/ui/*` per `components.json` (slate base, CSS variables, no prefix).

## Arquivos locais — nunca versionar (gitignored)

- **Handoffs** (`RETOMADA_*.md`, `HANDOFF_*.md`) são notas de trabalho locais — **nunca** versionar. Já são ignorados por padrão no `.gitignore`; mantenha essa política.
- **`src/scratch/`** é workspace efêmero para scripts/artefatos de migração pontuais — ignorado, **nunca** versionar. Não guarde ali nada que precise sobreviver.

## Regras Obrigatórias

1. Nunca criar tabelas diretamente no código, sempre utilizar MCP do Supabase para operações no banco
2. Nunca colocar keys de APIs diretamente no código, sempre usar Vault ou Secrets
3. Sempre planejar com viés estratégico de negócio para melhor entender os prompts do usuário
4. A interface deve ser sempre a mais intuitiva e agradável possível de usar, priorizando UX/UI de alto nível.
