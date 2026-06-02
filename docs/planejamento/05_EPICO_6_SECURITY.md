# EPICO 6 - Security Hardening (RLS / Storage / Roles)

**Repositorio:** https://github.com/dimmycarter-cmyk/meucontratoonline-aade1c88
**Sprint:** 4 (Bloco Security - pos EPICO 5)
**Prioridade:** P0 (2 issues ERROR) + P2 (1 issue WARNING)
**Data de abertura:** 2026-06-02
**Branch base:** main @ 2e7677a
**Origem:** Security Scan do Lovable (3 issues) + investigacao FASE 1
**Status:** PLANEJAMENTO (nenhuma mudanca aplicada)

---

## 1. RESUMO EXECUTIVO

O Security Scan do Lovable apontou 3 issues. A investigacao FASE 1 (leitura de
migrations + hooks + paginas) confirmou as 3 e mapeou a causa-raiz de cada uma.

### As 3 issues

| # | Issue | Severidade | Tabela/Recurso | Causa-raiz curta |
|---|-------|-----------|----------------|------------------|
| 1 | Invitations publicly readable | ERROR | public.invitations | Policy USING(true) p/ anon |
| 2 | Bucket sem isolamento de tenant | ERROR | storage.objects | Policy so checa bucket_id |
| 3 | Role insertion sem policy | WARNING | public.user_roles | Sem policy de escrita |

### Severidade real (pos-investigacao)

- Issue 1: ERROR real. Qualquer visitante anonimo le a tabela inteira de convites
  (emails, roles, tenant_id de TODOS os clientes). Exposicao de dados pessoais (LGPD).
- Issue 2: ERROR real. Qualquer usuario autenticado le/deleta arquivos de QUALQUER
  tenant no bucket, bastando conhecer o path. Quebra de isolamento multi-tenant.
- Issue 3: WARNING. Sem policy de escrita + RLS on, o cliente ja NAO consegue inserir
  role direto (seguro por padrao). Risco e futuro: falta de intencao explicita.

### Estimativa total

- Issue 2: ~20 min (path ja tem prefixo tenant_id - fix de baixo risco)
- Issue 3: ~15 min (adicionar policies restritivas explicitas)
- Issue 1: ~40 min (exige decisao arquitetural - RPC vs edge function)
- Auditoria de arquivos legados + validacao + re-scan: ~30 min
- TOTAL estimado: ~1h45 a 2h (1 sessao)

---

## 2. CONTEXTO DA INVESTIGACAO

### O que foi descoberto na FASE 1

Investigacao read-only do codigo do projeto revelou:

- 29 migrations SQL no diretorio supabase/migrations/
- 6 edge functions deployadas (ai-chat, extract-document,
  extract-matricula, parse-docx-template, seed-templates-leva1, send-invite)
- Padrao consistente de RLS: tenant_id = get_user_tenant_id(auth.uid())
- Multi-tenant funciona via SECURITY DEFINER functions
  (has_role, get_user_tenant_id)

### Padrao arquitetural identificado

Tabelas-chave do schema public (18 mapeadas):

- profiles, user_roles (autenticacao)
- tenants, companies (multi-tenant base)
- contracts, contract_documents (negocio)
- contract_participants, participant_documents (relacionamento)
- contract_templates, template_clauses, clauses (templates)
- invitations (convites)
- audit_logs, admin_audit_logs (auditoria)
- plans, subscriptions (cobranca)
- extracted_document_data, contract_test_fixtures (suporte)
- contract_sequences (numeracao)

### Onde as 3 issues estao localizadas

ISSUE 1 - migration 20260316125020...sql
- Tabela: public.invitations
- Linha 40-42 da migration
- Policy: "Anyone can read invitation by token"
- Causa: USING (true) para anon + authenticated

ISSUE 2 - migration 20260308221804...sql
- Tabela: storage.objects (Supabase Storage)
- Linhas 37-50 da migration
- 3 policies (INSERT/SELECT/DELETE)
- Causa: bucket_id check sem tenant_id filter

ISSUE 3 - migration 20260308205131...sql
- Tabela: public.user_roles
- Linha 147-149 da migration
- So tem policy de SELECT (linha 147-149)
- Causa: faltam policies de INSERT/UPDATE/DELETE explicitas

### Arquivos de uso (lado do app)

- src/integrations/supabase/client.ts (cliente)
- src/hooks/useInvitations.ts (Issue 1 caller)
- src/hooks/useDocumentExtraction.ts (Issue 2 path com tenant_id)
- src/pages/Cadastro.tsx (Issue 1 - le token no signup)
- src/pages/app/NovoContrato.tsx:796 (Issue 2 - upload path)
- src/pages/app/ContratoDetalhe.tsx (Issue 2 - download)

### Validacao Supabase Dashboard (02/06/2026)

3 fontes verificadas pelo Founder:
1. Codigo (client.ts) -> URL ahewugbsgddrvggsllmt.supabase.co
2. Dashboard -> mesma URL + Healthy
3. Lovable Security Scan -> 3 issues confirmadas

Status: TODAS as 3 issues sao REAIS e PERSISTEM em producao.

---

## 3. ISSUE 1 - INVITATIONS POLICY USING(true)

### Em portugues simples

A tabela "invitations" guarda os convites enviados para novos
usuarios entrarem nas imobiliarias. Hoje, QUALQUER pessoa na
internet (sem login) pode LER toda a tabela. Isso vaza:

- E-mails de pessoas convidadas
- Quem convidou quem
- Estrutura organizacional das imobiliarias clientes

### O que muda para Andreia

Pre-fix: convites de Andreia para corretores ficam expostos.
Pos-fix: Andreia continua convidando normalmente, mas dados
ficam protegidos. Signup com token continua funcionando.

### Causa-raiz detalhada

Migration: 20260316125020...sql (linha 40-42)

A policy foi criada como ATALHO para permitir o fluxo de signup:
1. Admin envia convite
2. Usuario recebe email com link contendo token
3. Cadastro.tsx le invitations WHERE token = X
4. Usuario completa cadastro

Como policy nao consegue ler o token do request facilmente,
o desenvolvedor anterior usou USING (true) - libera tudo para
todos. Funciona mas vaza a tabela inteira.

### 3 OPCOES DE FIX

#### OPCAO A: RPC SECURITY DEFINER get_invitation_by_token

Criar funcao que recebe token e retorna SO o convite daquele
token (e nada mais). Cadastro.tsx chama a funcao em vez de
acessar a tabela diretamente.

Mudancas necessarias:
1. Criar funcao SQL: get_invitation_by_token(p_token uuid)
   - SECURITY DEFINER (bypassa RLS)
   - Retorna apenas linha do token especifico
   - Validacao interna (token nao expirado, status pending)
2. Remover policy "Anyone can read invitation by token"
3. Ajustar Cadastro.tsx para chamar RPC em vez de SELECT

Trade-offs:
- PRO: Solucao limpa e padrao Supabase
- PRO: Centraliza logica de validacao
- PRO: Auditavel (logs de chamadas)
- CON: Mais codigo (1 funcao + 1 ajuste no front)
- CON: Precisa migration nova

Risco: BAIXO
Tempo estimado: 30-45 min

#### OPCAO B: Edge Function dedicada

Criar edge function que recebe token via HTTP e retorna
convite. Cadastro.tsx faz fetch da edge function.

Mudancas necessarias:
1. Criar supabase/functions/get-invitation/index.ts
2. Deploy via Supabase CLI ou Dashboard
3. Remover policy "Anyone can read invitation by token"
4. Ajustar Cadastro.tsx para chamar edge function

Trade-offs:
- PRO: Separacao de concerns (logica fora do DB)
- PRO: Pode adicionar validacao customizada
- CON: Mais latencia (HTTP round-trip)
- CON: Mais complexidade operacional
- CON: Edge functions tem cold-start

Risco: MEDIO
Tempo estimado: 45-60 min

#### OPCAO C: Policy condicional via request header

Tentar criar policy que aceita SELECT apenas quando o
WHERE clause inclui condicao especifica de token.

Mudancas necessarias:
1. Reescrever policy com USING que valida estrutura do query
2. (Pode nao ser viavel na pratica)

Trade-offs:
- PRO: Sem codigo novo no front
- CON: Postgres RLS NAO valida estrutura de query
- CON: Provavelmente nao funciona como esperado
- CON: Solucao fragil

Risco: ALTO (pode nao funcionar)
Tempo estimado: ??? (incerto)

### RECOMENDACAO TECNICA (Claude Code)

OPCAO A (RPC SECURITY DEFINER):
- Padrao consolidado no projeto (has_role, get_user_tenant_id)
- Funcao reusavel (poderia ser usada por edge function tambem)
- Risco baixo + tempo razoavel
- Auditavel via logs do Supabase

OPCAO B fica como alternativa SE OPCAO A nao for viavel.
OPCAO C nao eh recomendada (fragil).

---

## 4. ISSUE 2 - STORAGE BUCKET CONTRACT-DOCUMENTS

### Em portugues simples

O bucket "contract-documents" armazena PDFs e documentos
enviados pelos usuarios (matriculas, contratos digitalizados,
docs de identidade). Hoje, QUALQUER usuario logado pode:

- Ler arquivos de OUTRAS imobiliarias
- Deletar arquivos de OUTRAS imobiliarias
- Basta saber/adivinhar o path do arquivo

Isso quebra o isolamento multi-tenant que o resto do sistema
respeita. Eh o mais critico dos 3 issues.

### O que muda para Andreia

Pre-fix: documentos de Andreia podem ser acessados/deletados
por qualquer outra conta logada (mesmo de outra imobiliaria).

Pos-fix: Andreia so consegue acessar arquivos do tenant dela.
Funcionalidade normal (upload/download) continua igual.

### Causa-raiz detalhada

Migration: 20260308221804...sql (linhas 37-50)

As 3 policies de storage.objects so checam:

INSERT: WITH CHECK (bucket_id = 'contract-documents')
SELECT: USING (bucket_id = 'contract-documents')
DELETE: USING (bucket_id = 'contract-documents')

Falta o filtro de tenant. Boa noticia: os UPLOADS ja seguem
convencao de path por tenant:

- useDocumentExtraction.ts:33
  path: ${tenant_id}/participants/${participantId}/...

- src/pages/app/NovoContrato.tsx:796
  path: ${tenant_id}/${timestamp}-${nome}

Entao o fix eh ALINHAR as policies com a convencao do codigo.

### 3 OPCOES DE FIX

#### OPCAO A: Storage policy com get_user_tenant_id

Adicionar filtro de tenant nas 3 policies de storage.objects
usando a funcao SECURITY DEFINER ja existente.

Mudancas necessarias:
1. Migration nova com policies atualizadas:
   (storage.foldername(name))[1] = get_user_tenant_id(auth.uid())::text
2. Drop das 3 policies antigas
3. Recreate com filtro de tenant

Trade-offs:
- PRO: Solucao limpa e padrao Supabase
- PRO: Usa funcao SECURITY DEFINER ja existente
- PRO: Reutiliza convencao tenant_id/ ja em uso
- PRO: Performance otima (filtro no banco)
- CON: Precisa auditar arquivos legados sem prefixo tenant_id/

Risco: BAIXO (paths ja seguem convencao)
Tempo estimado: 30-45 min

#### OPCAO B: Edge Function de proxy

Criar edge function que valida tenant antes de servir o arquivo.
Frontend chama edge function em vez de Supabase Storage direto.

Mudancas necessarias:
1. Criar supabase/functions/get-document/index.ts
2. Criar supabase/functions/delete-document/index.ts
3. Ajustar useDocumentExtraction.ts para chamar edge function
4. Ajustar ContratoDetalhe.tsx para chamar edge function
5. Manter policies abertas (fallback)

Trade-offs:
- PRO: Validacao customizada (logging, audit)
- PRO: Pode adicionar logica de acesso futura
- CON: Mais latencia (HTTP round-trip)
- CON: Cold-start de edge functions
- CON: Mais codigo no front
- CON: 2 edge functions novas pra manter

Risco: MEDIO
Tempo estimado: 1h30 - 2h

#### OPCAO C: Refactor para usar contract_documents apenas

Em vez de storage.objects publico, todo acesso via tabela
contract_documents (que ja tem RLS por tenant).

Mudancas necessarias:
1. Migrar logica de leitura para usar contract_documents
2. URLs assinadas geradas por funcao SECURITY DEFINER
3. Maior refactor no front
4. Auditar todos os pontos de download

Trade-offs:
- PRO: Modelo mais robusto a longo prazo
- CON: Refactor extenso (multiplos arquivos)
- CON: Mais risco de bugs durante migracao
- CON: Tempo muito maior

Risco: ALTO
Tempo estimado: 3-4h+

#### RECOMENDACAO TECNICA (Claude Code)

OPCAO A (storage policy com get_user_tenant_id):

- Paths ja seguem convencao tenant_id/
- Solucao cirurgica (so policies, sem refactor)
- Reusa SECURITY DEFINER existente
- Risco baixo + tempo razoavel
- Performance otima

OPCAO B fica como alternativa SE descobrir bug em OPCAO A.
OPCAO C eh refactor maior - backlog Sprint 5+.

### Atencao - Arquivos legados

ANTES de aplicar fix, validar se ha arquivos no bucket sem
prefix tenant_id/ (gravados antes da convencao atual).

Query proposta para AMANHA:
SELECT name FROM storage.objects
WHERE bucket_id = 'contract-documents'
AND name NOT LIKE '%/%';

Se houver arquivos legados:
- Opcao 1: mover para path correto manualmente
- Opcao 2: aceitar perda de acesso a esses arquivos
- Decidir baseado no resultado da query

---

## 5. ISSUE 3 - USER_ROLES SEM POLICIES EXPLICITAS

### Em portugues simples

A tabela "user_roles" guarda quem eh admin, super_admin, etc.
Hoje, so existe 1 policy (SELECT - usuario ve a propria role).
NAO existem policies de INSERT/UPDATE/DELETE.

Na pratica, o sistema esta SEGURO porque so funcoes SECURITY
DEFINER (que bypassam RLS) escrevem na tabela. Mas o WARNING
do Lovable eh por boa pratica: sem policies explicitas, eh
mais facil alguem futuro adicionar policy permissiva e abrir
escalacao de privilegio acidentalmente.

### O que muda para Andreia

Pre-fix: nada visivel (ja esta seguro na pratica).
Pos-fix: nada visivel. Apenas blindagem extra de governanca.

### Causa-raiz detalhada

Migration: 20260308205131...sql (linha 147-149)

UNICA policy existente em user_roles:

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

Quem escreve em user_roles na pratica:
- Trigger handle_new_user (auto cria role no signup)
- Funcao accept_invitation (vincula role ao convite)
- Funcoes admin (alteracao manual super_admin)

Todas SECURITY DEFINER - bypassam RLS por design.

### 3 OPCOES DE FIX

#### OPCAO A: 3 policies restritivas explicitas

Adicionar policies INSERT/UPDATE/DELETE permitindo APENAS
super_admin e admin_empresa (do mesmo tenant).

Mudancas necessarias:
1. Migration nova com 3 policies novas
2. Manter policy SELECT existente
3. Documentar intencao no comentario da migration

SQL proposto:

CREATE POLICY "Only admins can insert user roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'admin_empresa')
);

CREATE POLICY "Only admins can update user roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'admin_empresa')
);

CREATE POLICY "Only admins can delete user roles"
ON public.user_roles FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'admin_empresa')
);

Trade-offs:
- PRO: Resolve o WARNING explicitamente
- PRO: Documenta intencao no schema
- PRO: Protege contra mudancas futuras acidentais
- PRO: SECURITY DEFINER continua bypassando (sem impacto)
- CON: Mais policies pra manter

Risco: BAIXO (SECURITY DEFINER bypass nao quebra nada)
Tempo estimado: 15-30 min

#### OPCAO B: Manter como esta + comentario na tabela

Aceitar o WARNING como esta. Adicionar COMMENT na tabela
explicando que escrita eh via SECURITY DEFINER apenas.

Mudancas necessarias:
1. Migration nova com COMMENT explicativo

SQL proposto:

COMMENT ON TABLE public.user_roles IS
'Roles dos usuarios. Escrita exclusiva via SECURITY DEFINER:
handle_new_user, accept_invitation, funcoes admin. RLS ativo
mas sem policies de escrita por design.';

Trade-offs:
- PRO: Mais rapido (so comentario)
- PRO: Documenta intencao
- CON: WARNING continua aparecendo no Lovable
- CON: Auditor externo pode questionar

Risco: BAIXO
Tempo estimado: 5-10 min

#### OPCAO C: Hibrido

Adicionar policies explicitas (Opcao A) + COMMENT na tabela
explicando o design.

Mudancas necessarias:
1. Migration combinando A + B

Trade-offs:
- PRO: Resolve WARNING + documenta
- PRO: Defesa em profundidade
- CON: Migration um pouco maior

Risco: BAIXO
Tempo estimado: 20-35 min

#### RECOMENDACAO TECNICA (Claude Code)

OPCAO C (hibrido):

- Resolve o WARNING no Lovable
- Documenta intencao no schema (futura referencia)
- SECURITY DEFINER continua intacto
- Sem impacto operacional
- Defesa em profundidade

OPCAO A fica como minimo viavel.
OPCAO B se preferir velocidade sobre completude.

### Nota de refinamento para FASE 3

As policies propostas (Opcao A) checam apenas has_role, sem
filtro de tenant. Isso permitiria, em tese, um admin_empresa
inserir/alterar roles de usuarios de OUTRO tenant. Avaliar na
FASE 3 adicionar guard de tenant nas policies de escrita:

  AND tenant_id = get_user_tenant_id(auth.uid())

Para super_admin (cross-tenant por design) manter o OR isolado.

---

## 6. ESTRATEGIA DE EXECUCAO (AMANHA - 03/06/2026)

### Ordem sugerida das implementacoes

1. **PRIMEIRO: Issue 2 (storage bucket)**
   - Risco BAIXO (paths ja tenant_id)
   - Impacto ALTO (multi-tenant breach)
   - Mais rapido de validar

2. **SEGUNDO: Issue 3 (user_roles)**
   - Risco BAIXO (policies extras nao quebram)
   - Impacto LOW (WARNING apenas)
   - Pratica antes de Issue 1

3. **TERCEIRO: Issue 1 (invitations)**
   - Risco MEDIO (RPC nova + frontend ajuste)
   - Mais delicada
   - Deixar pra ultimo com cabeca fresca

### Justificativa da ordem

- Issue 2 = ROI maximo (alto impacto, baixo risco)
- Issue 3 = warm-up + ganho de WARNING limpo
- Issue 1 = mais complexa, melhor com confianca acumulada

### Tempo estimado total

- Issue 2: 30-45 min (Opcao A recomendada)
- Issue 3: 20-35 min (Opcao C hibrido)
- Issue 1: 30-45 min (Opcao A RPC)
- Validacao + commits: 30-45 min
- TOTAL: 2-3h dedicadas amanha

### Pre-requisitos amanha

- Manutencao Supabase 03/Jun 10h - aguardar terminar
- Ambiente DEV ativo
- Testes Vitest 174/174 passing
- Working tree clean
- Branch main aligned com origin

---

## 7. AUDITORIA DE ARQUIVOS LEGADOS

### Por que auditar antes de aplicar Issue 2

Issue 2 muda policies de storage.objects para exigir prefix
tenant_id/ no path. Se houver arquivos LEGADOS gravados ANTES
da convencao atual (sem prefix tenant_id/), eles ficarao:

- INACESSIVEIS (SELECT falha)
- INDELETAVEIS (DELETE falha)

### Query proposta de auditoria

Antes de aplicar Issue 2 amanha:

SELECT name, created_at FROM storage.objects
WHERE bucket_id = 'contract-documents'
AND name NOT LIKE '%/%'
ORDER BY created_at;

### Plano caso encontre arquivos legados

Cenario A: Nao ha arquivos legados (0 resultados)
- Aplicar Issue 2 normalmente

Cenario B: Poucos arquivos legados (< 20)
- Mover manualmente para path correto (UPDATE name)
- Aplicar Issue 2

Cenario C: Muitos arquivos legados (>= 20)
- Decidir: migrar todos OU aceitar perda
- Documentar decisao
- Aplicar Issue 2 apos resolver

---

## 8. ROLLBACK PLAN

### Como reverter cada fix

#### Issue 2 (storage policies)

Se algo quebrar apos aplicar:

DROP POLICY "Tenant-isolated upload" ON storage.objects;
DROP POLICY "Tenant-isolated read" ON storage.objects;
DROP POLICY "Tenant-isolated delete" ON storage.objects;

CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'contract-documents');
(recriar as 3 policies originais)

#### Issue 3 (user_roles policies)

Se algo quebrar:

DROP POLICY "Only admins can insert user roles" ON public.user_roles;
DROP POLICY "Only admins can update user roles" ON public.user_roles;
DROP POLICY "Only admins can delete user roles" ON public.user_roles;
(volta ao estado original)

#### Issue 1 (invitations RPC)

Se algo quebrar:

DROP FUNCTION public.get_invitation_by_token(uuid);

CREATE POLICY "Anyone can read invitation by token"
ON public.invitations FOR SELECT TO anon, authenticated
USING (true);
(volta ao estado original)

### Backup strategy

- Plano FREE Supabase NAO tem backup automatico
- Antes de cada migration: anotar manualmente estado anterior
- Considerar export da tabela invitations antes de Issue 1

### Sinais de regressao a observar

Apos cada fix:

- Testes Vitest passing (174/174)
- Lovable preview funcionando
- Login normal funcionando
- Upload/download de docs funcionando
- Convites continuam funcionando
- Re-rodar Security Scan do Lovable

---

## 9. RESTRICOES OPERACIONAIS

### Migration via MCP Supabase (nao SQL solto)

Restricao do projeto: migrations sao aplicadas via:
- MCP Supabase (preferencial)
- OU Dashboard Supabase (fallback)

NAO usar:
- supabase CLI direto sem MCP
- SQL solto rodado manualmente

### Validacao por etapas

Apos CADA fix:
1. Aplicar migration
2. Rodar Vitest (174/174)
3. Testar manualmente caso de uso afetado
4. Confirmar antes de proximo fix

### Quando rodar testes

- ANTES de cada fix (baseline)
- DEPOIS de cada fix (regressao)
- DEPOIS de TODOS os fixes (final)

### Quando re-rodar Security Scan

- Apos Issue 3 (esperado: warning gone)
- Apos Issue 2 (esperado: error gone)
- Apos Issue 1 (esperado: error gone)
- META FINAL: 0 errors + 0 warnings

### Validacao E2E final

Apos os 3 fixes aplicados + scan limpo:
- Login com conta Andreia (dimmycarter@gmail.com)
- Validar Bug A/B/C resolvidos (EPICO 5)
- Validar isolamento multi-tenant
- Validar convites funcionam
- Validar upload/download de docs funciona

---

## STATUS FINAL DO PLANO

EPICO 6 - Plano FASE 2 completo
Data: 02/06/2026
Sprint: 4
Foundation EPICO 5: 3/3 ATIVA
Issues a corrigir: 2 ERROR + 1 WARNING
Tempo estimado FASE 3: 2-3h dedicadas
Implementacao: AGENDADA PARA 03/06/2026 (apos manutencao 10h)

Aprovacao: PRONTO PARA COMMIT + PUSH

---
