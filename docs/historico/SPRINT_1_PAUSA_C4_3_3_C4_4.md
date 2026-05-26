# Sprint 1 — Pausa em C4.3.2 / Retomada em C4.3.3

## Estado atual

- **10 commits aplicados** no `main` local. **SEM push** (combinado com o usuário).
- **Working tree LIMPO** (apenas `docs/` e `supabase/.temp/` untracked, não-relacionados ao trabalho).
- **Branch:** `main d43d3e3 [ahead 10]`.

## Lista de commits aplicados nesta Sprint

| Hash | Tipo | Descrição curta |
|---|---|---|
| `d43d3e3` | feat | C4.3.2 — Hook `useProfile` + `Configuracoes.tsx` reescrita com integração real (Perfil + Empresa via `CompanyEditForm`). |
| `815b390` | chore | C4.3.1.b — Regenera `types.ts` pós-migration (whatsapp+cargo) e remove `@ts-expect-error` obsoleto. |
| `93f476e` | chore | C4.3.1 — Migration `add_profile_whatsapp_cargo.sql` (aplicada manualmente em produção via Dashboard). |
| `87e5500` | feat | C4.2 — `cleanOrphanPunctuation` pós-substituição de placeholders (Bug 2 — vírgulas órfãs). |
| `d927267` | chore | Chore-gitignore — ignora `.git-commit-msg-*.tmp` (workflow Estratégia 3). |
| `feb10b5` | fix | C4.1 — `autoComplete="postal-code"` em CEP bloqueia Chrome autofill (Bug 1). |
| `e6fa288` | feat | C3 — Formatação canônica unificada de endereço com CEP (Ajuste 4). |
| `9e14d7f` | feat | C1 — RG e data de nascimento opcionais com fallback configurável (Ajustes 1+3). |
| `b1bc538` | fix | Security hotfix — untrack `.env`, migrate to `.env.local`. |
| `718bc91` | fix | C2 — Expor CRECI e dados bancários no form de Empresas (Ajuste 11). |

## O que falta — C4.3.3 (~25 min)

Refatorar `src/pages/app/Empresas.tsx` para usar o componente `CompanyEditForm` extraído em `src/components/empresa/CompanyEditForm.tsx` (criado no C4.3.2).

Hoje `Empresas.tsx` tem o form de empresa INLINE (~120 linhas, agora duplicado com o que está em `CompanyEditForm`). O refactor consiste em:

1. **Importar** `CompanyEditForm`, `companyToFormData`, `emptyCompanyForm`, `CompanyFormData` de `@/components/empresa/CompanyEditForm`.
2. **Substituir** o JSX inline do `<form>` no Dialog (linhas ~95-202) pelo componente `<CompanyEditForm>` controlado.
3. **Adaptar `form` state** para `CompanyFormData` (já é compatível em estrutura — atualmente é objeto solto em useState).
4. **Manter o Dialog wrapper** (Empresas usa Dialog modal; Configuracoes usa página inline) — só o conteúdo do form muda.
5. **Manter a lógica de criar nova vs editar existente** (`editingId`) e o submit que decide entre `createCompany` e `updateCompany`.
6. **Substituir `handleSubmit` por uma função compatível com a API do componente** (`onSubmit: (data: CompanyFormData) => Promise<void>`).
7. **Remover imports não-usados** após o refactor (`Collapsible`, `CollapsibleContent`, `CollapsibleTrigger`, `ChevronDown`, `maskCNPJ`, `maskPhone`, `cnpjSchema`, `AddressForm`, etc. — tudo passou para dentro do componente).

**Estratégia 3 normal no commit:**
- Tipo: `refactor(empresa): substitui form inline em Empresas.tsx pelo CompanyEditForm compartilhado`
- Mostra remoção de ~120 linhas de duplicação e prova de reuso do componente entre 2 telas.

## O que falta — C4.4 (~30 min + validação browser pelo usuário)

1. **Roda suite completa de testes:**
   ```
   ./node_modules/.bin/tsc --noEmit -p tsconfig.app.json
   ./node_modules/.bin/vitest run
   ```
   Esperado: TypeScript limpo, 85+ testes passando (talvez mais se C4.3.3 adicionar algum).

2. **Lista para o usuário validar manualmente no browser** (rodar `bun dev` e testar como imobiliária comum, não super_admin):
   - **Ajuste 11** (CRECI + bancários) agora editável pela tela `/app/configuracoes` da imobiliária — sem precisar do super_admin via `/app/empresas`.
   - **Ajustes 1+3** (RG e Data Nascimento opcionais) — criar participante sem esses campos, gerar contrato.
   - **Ajuste 4** (CEP no contrato + formato canônico) — confirmar `Rua X, nº 100, Bairro Y, Cidade/UF, CEP 00000-000`.
   - **Bug CEP autofill** — digitar 8 dígitos no CEP sem popup amarelo do Chrome interferir.
   - **Bug vírgulas órfãs** — gerar contrato sem profissão/estado civil/nacionalidade preenchidos; confirmar que NÃO tem `", , ,"` no HTML final.
   - **Painel Configuracoes** — imobiliária editando próprios dados de perfil (nome, WhatsApp, cargo) e empresa.
   - **Persistência** — recarregar página após salvar; dados continuam.
   - **C4.3.3** especificamente: confirmar que `/app/empresas` continua funcionando exatamente como antes (criar nova, editar existente, deletar), agora usando o componente compartilhado.

3. **Commit `chore(test)` ou skip** se nada quebrar.

## Pendências pós-Sprint 1 (NÃO fazer agora)

- **`git filter-repo`** para limpar histórico antes do push:
  - Remover `.env` versionado do commit `b1bc538` (token já revogado, mas higiene).
  - Reescrever mensagem do commit `9e14d7f` (bloco duplicado de "omit" no C1).
  - Reescrever mensagem do commit `e6fa288` (bloco duplicado de "Cobertura de testes" no C3).
- **Setup de staging Supabase + CLI** para futuras migrations (hoje aplicamos direto em produção via Dashboard).
- **Testes de UI** (React Testing Library + jsdom mais robusto) — `CompanyEditForm` e demais formulários sem cobertura DOM.
- **Seção Segurança e Plano** da `Configuracoes` (deixadas como mock com badge "em breve") — sprints dedicadas para troca de senha + billing.
- **`AgenteIA.tsx`** `initialMessages` e `quickActions` hardcoded em PT-BR — i18n ou customização por tenant.
- **`AddressFormRHF.tsx`** ganhou os atributos de autoComplete no C4.1 mas ainda não foi visualmente testado no browser (usado em forms react-hook-form que devem existir em alguma tela; validar no C4.4 se for tocado).

## Comando para retomar amanhã

Cola exatamente isto na nova sessão do Claude Code:

> Retomar Sprint 1 do meucontratoonline-aade1c88. Estado: 10 commits no main local sem push. Próximas tarefas: C4.3.3 (refatorar Empresas.tsx para usar CompanyEditForm extraído) e C4.4 (suite testes + validação manual no browser). Lê `src/scratch/SPRINT_1_PAUSA_C4_3_3_C4_4.md` para contexto completo e me confirma quando estiver contextualizado para continuar.
