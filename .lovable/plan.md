

# PDF Export, Duplicação de Contratos e Estrutura para Assinatura Digital

## 1. Exportação PDF com html2pdf.js

**Instalar dependência:** `html2pdf.js` (leve, sem backend, gera PDF direto do HTML no browser)

**Alterações em `ContratoDetalhe.tsx`:**
- Adicionar botão "Exportar PDF" ao lado de "Imprimir"
- Função `handleExportPDF()` que usa `html2pdf()` para converter o conteúdo do contrato em PDF A4 com margens, fontes e formatação profissional
- Configurar: format A4, margins 20mm, filename baseado no nome do contrato
- Atualizar status para "exportado" após gerar PDF

**Alterações em `NovoContrato.tsx` (Step 7):**
- Adicionar botão "Exportar PDF" na etapa final, mesma lógica

## 2. Duplicar Contrato como Rascunho

**Alterações em `useContracts.ts`:**
- Adicionar mutation `duplicateContract(id)`: busca contrato por ID, cria cópia com `nome: "Cópia de [nome]"`, `status: "rascunho"`, sem `id`/`created_at`/`updated_at`

**Alterações em `Contratos.tsx`:**
- Adicionar item "Duplicar" no dropdown de cada contrato (ícone Copy)

**Alterações em `ContratoDetalhe.tsx`:**
- Adicionar botão "Duplicar" no header, navega para o contrato duplicado

## 3. Estrutura para Assinatura Digital

Preparar o contrato para integração futura com plataformas como DocuSign, Clicksign, D4Sign.

**Migration SQL — Nova tabela `contract_signatures`:**
- `id` (uuid), `contract_id` (FK contracts), `tenant_id`
- `signer_name`, `signer_email`, `signer_cpf` (text)
- `signer_role` (text: 'comprador', 'vendedor', 'testemunha')
- `status` (text: 'pendente', 'enviado', 'assinado', 'recusado')
- `provider` (text: nullable — 'docusign', 'clicksign', 'd4sign')
- `external_id` (text: nullable — ID da plataforma externa)
- `signed_at` (timestamptz, nullable)
- `created_at` (timestamptz)
- RLS por `tenant_id`

**Novo status de contrato:** Adicionar `"aguardando assinatura"` e `"assinado"` aos statusOptions

**Alterações em `ContratoDetalhe.tsx`:**
- Nova seção "Assinaturas" no sidebar, listando signatários com status
- Botão "Adicionar Signatário" (dialog com nome, email, CPF, papel)
- Badge de status por signatário (pendente/assinado)
- Botão "Enviar para Assinatura" (desabilitado com tooltip "Em breve — integração com plataforma de assinatura")

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `package.json` | Adicionar `html2pdf.js` |
| Migration SQL | Tabela `contract_signatures` + RLS |
| `src/hooks/useContracts.ts` | Adicionar `duplicateContract` |
| `src/pages/app/ContratoDetalhe.tsx` | PDF export, duplicar, seção assinaturas |
| `src/pages/app/Contratos.tsx` | Item "Duplicar" no dropdown |
| `src/pages/app/NovoContrato.tsx` | Botão PDF na etapa final |
| `src/components/ContractPrintView.tsx` | Ajustar para uso com html2pdf |

## Ordem de Implementação
1. Instalar html2pdf.js + exportação PDF
2. Duplicar contrato (hook + UI)
3. Migration contract_signatures + RLS
4. Seção de assinaturas na página de detalhe

