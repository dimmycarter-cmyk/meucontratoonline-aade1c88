

# Meu Contrato Online — Plano de Implementação

## Visão Geral
Plataforma SaaS completa para o mercado imobiliário brasileiro com geração inteligente de contratos, leitura automática de documentos por IA, autopreenchimento, editor visual e gestão de contatos/empresas. Integração com **GitHub** e **Supabase externo** como banco de dados.

---

## FASE 1 — Fundação (Landing Page + Auth + Layout Base)

### 1.1 Landing Page Comercial
- Hero section com headline forte: *"Gere contratos imobiliários em minutos com IA"*
- Seções: benefícios, funcionalidades, uso de IA, leitura de documentos, planos/preços, FAQ, depoimentos
- Paleta: azul principal, branco, cinza claro — visual premium jurídico/imobiliário
- CTAs de cadastro e login

### 1.2 Autenticação (Supabase Auth)
- Login, cadastro, logout, recuperação de senha
- Página de reset de senha (`/reset-password`)
- Redirecionamento pós-login para o dashboard

### 1.3 Banco de Dados — Estrutura Base (Supabase)
- Tabelas: `tenants`, `profiles`, `user_roles` (enum: super_admin, admin_empresa, corretor, assistente, operacional)
- RLS com isolamento por `tenant_id` em todas as tabelas
- Função `has_role()` security definer para evitar recursão
- Trigger para criar perfil automático no signup

### 1.4 Layout do App
- Sidebar escura com navegação por módulos
- Área principal clara com cards elegantes
- Design responsivo e profissional
- Controle de menu por role do usuário

---

## FASE 2 — Dashboard + Cadastros Base

### 2.1 Dashboard
- Cards: novos clientes, contratos pendentes/finalizados, tempo médio
- Gráfico de contratos por mês (Recharts)
- Lista de atividades recentes e tarefas pendentes
- Status dos contratos com indicadores visuais

### 2.2 Cadastro de Contatos
- CRUD completo com listagem, busca, filtros, paginação
- Todos os campos: nome, CPF, RG, profissão, WhatsApp, email, endereço, dados bancários, etc.
- Máscaras para CPF, CEP, WhatsApp, datas
- Papéis: comprador, vendedor, testemunha, procurador, representante legal

### 2.3 Cadastro de Empresas
- CRUD com CNPJ, razão social, nome fantasia, endereço, dados bancários
- Upload de logo (Supabase Storage)
- Máscaras para CNPJ, CEP, WhatsApp

### 2.4 Tabelas adicionais no banco
- `contacts`, `companies`, `properties`, `activity_logs`
- RLS por tenant em todas as tabelas

---

## FASE 3 — Modelos de Contrato + Cláusulas + Editor

### 3.1 Modelos de Contrato
- Tabelas: `contract_templates`, `template_fields`
- 2 modelos iniciais: Compra e Venda (Financiado e À Vista)
- Placeholders dinâmicos (ex: `{{ comprador_nome }}`, `{{ vendedor_cpf }}`)
- Estrutura preparada para novos modelos futuros

### 3.2 Cláusulas Específicas
- Tabela `specific_clauses` com título, categoria, texto base, placeholders
- Toggle ativar/desativar por contrato
- Cláusulas iniciais: quitação, alienação fiduciária, habite-se, rescisão, pagamento parcelado, etc.

### 3.3 Editor de Contratos
- Editor rich text visual e profissional
- Carrega modelo base com placeholders
- Substituição automática dos placeholders pelos dados reais
- Edição manual livre do texto
- Autosave
- Exportação em PDF

---

## FASE 4 — Fluxo de Novo Contrato + Upload de Documentos

### 4.1 Fluxo Guiado de Novo Contrato (Wizard)
- Passo 1: Escolher modelo de contrato
- Passo 2: Selecionar/cadastrar partes (comprador, vendedor, etc.)
- Passo 3: Upload de documentos dos envolvidos
- Passo 4: IA lê e extrai dados
- Passo 5: Tela de revisão dos dados extraídos
- Passo 6: Autopreenchimento do contrato
- Passo 7: Ativar cláusulas específicas
- Passo 8: Editor final de revisão
- Passo 9: Gerar PDF e salvar

### 4.2 Upload de Documentos
- Upload múltiplo (PDF, JPG, PNG) via Supabase Storage
- Categorização: documentos pessoais, do imóvel, da empresa
- Vinculação por parte (comprador, vendedor, etc.)
- Tabelas: `contract_documents`, `extracted_document_data`

### 4.3 Histórico de Contratos
- Listagem com nome, tipo, data, valor, status
- Status: rascunho, em preenchimento, aguardando revisão, pronto, exportado, assinado, cancelado
- Filtros, busca, exportação
- Versionamento (`contract_versions`)

---

## FASE 5 — Agente de IA + OCR + Autopreenchimento

### 5.1 Edge Function para Leitura de Documentos (OCR + IA)
- Edge function usando Lovable AI Gateway
- Recebe documento → identifica tipo → extrai texto (OCR) → interpreta com IA
- Retorna dados estruturados com score de confiança
- Extração: dados pessoais, endereço, dados do imóvel, dados empresariais

### 5.2 Tela de Revisão de Dados Extraídos
- Dados agrupados por categoria (comprador, vendedor, imóvel, empresa)
- Indicação de confiança por campo (alta, média, baixa)
- Edição inline antes de aplicar
- Botão "Preencher contrato automaticamente"

### 5.3 Agente de IA Jurídico Imobiliário
- Chat integrado no painel lateral
- Edge function com prompt especializado em contratos imobiliários brasileiros
- Funções: sugerir modelo, orientar documentos, revisar contrato, explicar cláusulas, apontar inconsistências, montar checklist
- Streaming de respostas em tempo real

---

## FASE 6 — Gestão de Planos + Permissões Avançadas + Polimento

### 6.1 Estrutura de Planos (preparação)
- Tabelas: `subscription_plans`, `tenant_subscriptions`
- 3 planos: Starter, Pro, Imobiliária/Premium
- Limites por plano (usuários, contratos, documentos, IA)
- UI de planos na configuração — sem cobrança real no MVP

### 6.2 Gestão de Usuários e Permissões
- Tela para admin convidar/gerenciar usuários do tenant
- Atribuição de roles
- Controle de acesso em rotas, menus e ações por role

### 6.3 Configurações e Perfil
- Edição de perfil, foto, dados pessoais
- Configurações da empresa/tenant
- Logs de atividade (`activity_logs`)

### 6.4 Polimento Final
- Estados vazios elegantes
- Loading states consistentes
- Feedback visual (toasts) de sucesso/erro
- Validações completas em formulários
- Responsividade mobile

---

## Integrações e Conexões
- **GitHub**: Conectar repositório para versionamento de código
- **Supabase externo**: Banco de dados, Auth, Storage, Edge Functions, RLS
- **Lovable AI Gateway**: Para OCR + extração de dados + agente de IA
- **Preparado para futuro**: assinatura digital, WhatsApp, consulta CEP/CNPJ, gateway de pagamento

---

## Observações Técnicas
- Multi-tenant com `tenant_id` em todas as tabelas e RLS rigoroso
- Roles em tabela separada (`user_roles`) com função `has_role()` security definer
- Storage seguro por tenant com buckets e policies
- Nunca expor service role key no client
- Edge functions para toda lógica sensível e IA

