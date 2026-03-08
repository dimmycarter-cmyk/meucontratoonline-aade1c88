

# Fase 5 — Storage, Visualização de Contrato e Agente IA

## 1. Storage para Documentos (Etapa 3 do Wizard)

**Migration SQL:**
- Criar bucket `contract-documents` (private)
- Criar tabela `contract_documents` (id, contract_id nullable, tenant_id, file_name, file_path, file_size, mime_type, created_at)
- RLS na tabela: CRUD por `tenant_id = get_user_tenant_id(auth.uid())`
- Storage policies: upload/download/delete para authenticated users no path `tenant_id/`

**Frontend (NovoContrato.tsx — Step 3):**
- Substituir checklist estático por área de upload (input file + lista de arquivos)
- Upload via `supabase.storage.from('contract-documents').upload()`
- Listar arquivos com opção de remover
- Manter checklist como seção informativa secundária
- Salvar referências na tabela `contract_documents` ao finalizar contrato

## 2. Página de Visualização/Edição (`/app/contratos/:id`)

**Novo arquivo: `src/pages/app/ContratoDetalhe.tsx`**
- Carregar contrato por ID (adicionar `useContract(id)` no hook)
- Exibir: nome, status, partes, valores, data de criação
- Conteúdo final renderizado em HTML (modo leitura)
- Botão "Editar": abre RichTextEditor para editar `conteudo_final` e salvar
- Botão "Imprimir/PDF" via ContractPrintView + window.print()
- Alterar status do contrato (dropdown)
- Listar documentos anexados do storage

**Alterações:**
- `App.tsx`: adicionar rota `contratos/:id`
- `Contratos.tsx`: link "Visualizar" no dropdown
- `useContracts.ts`: adicionar query individual por ID

## 3. Agente IA com Lovable AI Gateway

**Edge Function: `supabase/functions/ai-chat/index.ts`**
- CORS headers
- System prompt especializado em direito imobiliário brasileiro
- Usa `LOVABLE_API_KEY` (já disponível nos secrets) com modelo `google/gemini-3-flash-preview`
- Streaming SSE para respostas em tempo real
- Tratamento de erros 429/402 com mensagens amigáveis

**config.toml:** Adicionar `[functions.ai-chat]` com `verify_jwt = false`

**Frontend (`AgenteIA.tsx`):** Reescrever com:
- Streaming real token-by-token via fetch + SSE parsing
- Loading state com indicador de digitação
- Quick actions funcionais
- Markdown rendering nas respostas

## 4. Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| Migration SQL | Bucket + tabela `contract_documents` + RLS + storage policies |
| `supabase/functions/ai-chat/index.ts` | Nova edge function |
| `supabase/config.toml` | Adicionar config da function |
| `src/pages/app/ContratoDetalhe.tsx` | Nova página |
| `src/pages/app/NovoContrato.tsx` | Upload na etapa 3 |
| `src/pages/app/Contratos.tsx` | Link para visualizar |
| `src/pages/app/AgenteIA.tsx` | Chat funcional com streaming |
| `src/hooks/useContracts.ts` | Query por ID |
| `src/App.tsx` | Nova rota |

## Ordem de Implementação
1. Migration SQL (bucket + tabela + RLS)
2. Upload de documentos na etapa 3
3. ContratoDetalhe + rota + link em Contratos
4. Edge function ai-chat + deploy
5. AgenteIA.tsx com streaming real

