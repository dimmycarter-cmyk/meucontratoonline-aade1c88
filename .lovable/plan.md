

## Plano: Fluxo Inteligente de Novo Contrato com IA

### Visao geral

Simplificar o fluxo de criacao de contrato em 2 caminhos apos selecionar o modelo:

**Caminho IA**: Modelo → Modo → Participantes + Upload docs → IA extrai dados → Revisao/Edicao → Editor final → Salvar
**Caminho Manual**: Modelo → Modo → Partes → Docs → Dados → Clausulas → Editor → Salvar (fluxo atual)

O ponto chave que voce pediu: apos a IA extrair e preencher, o usuario SEMPRE passa pelo editor para revisar e alterar livremente antes de salvar.

---

### Fase 1 — Banco de dados

**Novas tabelas (1 migration):**

- `contract_participants` — participantes do contrato com todos os dados pessoais (nome, CPF, RG, endereco completo, profissao, estado civil, etc.) e `role` (comprador, vendedor, conjuge, fiador, testemunha, procurador, interveniente)
- `participant_documents` — documentos por participante (file_name, file_path, document_type como cnh/rg/comprovante_endereco, processing_status)
- `extracted_document_data` — JSON extraido pela IA + confidence_score + flag reviewed

RLS: filtro por `tenant_id` + `has_role(super_admin)` para admin.

**Storage**: reutilizar bucket `contract-documents`, path `contracts/{contractId}/participants/{participantId}/`.

---

### Fase 2 — Edge function `extract-document`

Nova edge function que:
1. Recebe `file_path` do Storage + `document_type`
2. Baixa o arquivo do Supabase Storage
3. Converte para base64 e envia como imagem para Lovable AI Gateway (Gemini 2.5 Pro com vision)
4. Usa tool calling para retornar JSON estruturado com campos extraidos + confidence por campo
5. Salva em `extracted_document_data`
6. Atualiza `processing_status` no `participant_documents`

Campos extraidos: nome, CPF, RG, orgao expedidor, data nascimento, nacionalidade, estado civil, profissao, endereco completo (CEP, rua, numero, bairro, cidade, UF).

---

### Fase 3 — Componentes novos

| Componente | Funcao |
|-----------|--------|
| `ContractModeSelector` | 2 cards grandes: "Preencher com IA" (Sparkles) e "Preencher Manualmente" (Edit) |
| `ParticipantManager` | Accordion por role (Comprador, Vendedor, etc) com botao adicionar |
| `ParticipantCard` | Card com nome, role, area de upload de docs com drag&drop |
| `DocumentUploader` | Upload multiplo com preview, status badge, tipo de documento (dropdown) |
| `ExtractionProgress` | Tela de loading com animacao e mensagens de status |
| `ExtractedDataReview` | Cards por participante com campos extraidos, confianca (verde/amarelo/vermelho), edicao inline |

---

### Fase 4 — Novo fluxo no NovoContrato.tsx

Steps modo IA:
```text
1. Modelo (existente)
2. Modo de Preenchimento (NOVO)
3. Participantes + Upload (NOVO)
4. Processamento IA (NOVO - chama edge function por documento)
5. Revisao dos Dados (NOVO - campos editaveis com indicador de confianca)
6. Editor (existente - contrato ja preenchido, totalmente editavel)
7. Finalizar (existente)
```

Steps modo manual: 1 → 2 → fluxo atual (3-7).

**Ponto critico**: No step 6 (Editor), o contrato chega ja preenchido com os dados extraidos mapeados nas variaveis do template (`{{comprador_nome}}`, etc). O usuario pode editar TUDO livremente no editor rich text antes de salvar.

---

### Fase 5 — Mapeamento automatico

Dados extraidos dos participantes alimentam o `dados` (Record<string, string>):
- Primeiro participante com role "comprador" → `comprador_nome`, `comprador_cpf`, etc.
- Primeiro "vendedor" → `vendedor_nome`, etc.
- Template variables sao substituidas automaticamente no conteudo

---

### Validacoes

- CPF: validacao de digitos
- Campos com confianca < 70%: destaque amarelo
- Documento ilegivel: status "failed" com opcao de reenvio ou preenchimento manual
- Sempre permitir edicao manual como fallback

---

### Arquivos novos/alterados

| Arquivo | Acao |
|---------|------|
| Migration SQL | Criar 3 tabelas + RLS |
| `supabase/functions/extract-document/index.ts` | Edge function OCR/IA |
| `supabase/config.toml` | Adicionar `[functions.extract-document]` |
| `src/components/contract/ContractModeSelector.tsx` | Novo |
| `src/components/contract/ParticipantManager.tsx` | Novo |
| `src/components/contract/ParticipantCard.tsx` | Novo |
| `src/components/contract/DocumentUploader.tsx` | Novo |
| `src/components/contract/ExtractionProgress.tsx` | Novo |
| `src/components/contract/ExtractedDataReview.tsx` | Novo |
| `src/hooks/useContractParticipants.ts` | Novo |
| `src/hooks/useDocumentExtraction.ts` | Novo |
| `src/pages/app/NovoContrato.tsx` | Adaptar com steps condicionais |

---

### Implementacao em 2 rodadas

**Rodada 1 (esta)**: Migration das tabelas, todos os componentes UI, edge function de extracao, novo fluxo completo no NovoContrato com steps condicionais, upload funcional, extracao com IA, tela de revisao, e o editor final editavel.

**Rodada 2 (se necessario)**: Refinamentos de UX, validacoes avancadas (conflito entre documentos), suporte a HEIC, melhoria do prompt de extracao.

