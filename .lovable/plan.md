

## Resposta: Sim, o plano anterior contempla ambos os caminhos

O plano aprovado anteriormente ja inclui as duas opcoes:

### Caminho 1 — Preencher com IA (OCR)
- Step "Participantes": adicionar compradores, vendedores, etc. e fazer upload de documentos (CNH, RG, comprovante)
- Step "Extracao IA": edge function `extract-document` processa os docs com Gemini Vision e extrai nome, CPF, RG, endereco, etc.
- Step "Revisao": campos extraidos editaveis com indicador de confianca (verde/amarelo/vermelho)
- Step "Editor": contrato ja preenchido automaticamente, editavel antes de salvar

### Caminho 2 — Preencher Manualmente
- Steps tradicionais: selecionar contatos existentes, preencher dados campo a campo, selecionar clausulas, editor final

### O que falta corrigir (bug atual)

O problema que voce reportou nao e do plano em si, mas de um **bug no filtro de status**:

- Linha 131 do `NovoContrato.tsx` filtra `status === "publicado"`, mas os modelos usam `status === "ativo"`
- Resultado: nenhum modelo aparece, e o usuario fica preso

### Plano de correcao imediata

1. **Corrigir filtro**: `"publicado"` → `"ativo"` na linha 131
2. **Substituir navegacao para Modelos** por um Dialog inline para criar modelo sem sair da tela
3. **Simplificar o Step 1**: trocar o grid de cards por um Select/Combobox simples (como no seu print) com botao "Escolher contrato"
4. **Reduzir steps**: juntar etapas relacionadas para ter no maximo 4-5 steps visiveis em vez de 8-9

Todos os componentes de IA (ParticipantManager, DocumentUploader, ExtractionProgress, ExtractedDataReview) ja estao criados e funcionais. A correcao e apenas no fluxo de navegacao/UX do wizard.

