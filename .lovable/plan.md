# Simplificar seção "Imóvel" + extrair descrição da matrícula via Gemini

## 1. Simplificar UI da seção Imóvel
**Arquivo:** `src/components/contract/FixedDataFields.tsx` (linhas 125-143)

Remover do JSX os 9 campos: `imovel_tipo`, `imovel_matricula`, `imovel_cartorio`, `imovel_inscricao_municipal`, `imovel_indice_cadastral`, `imovel_area_total`, `imovel_area_privativa`, `imovel_area_acessoria`, `imovel_vagas`.

Manter:
- **Endereço do Imóvel** (`imovel_endereco`)
- **Descrição do Imóvel** (`imovel_descricao`, textarea) — continua editável

> As chaves continuam suportadas pelo motor de placeholders, só não aparecem na UI.

## 2. Botão "Anexar Matrícula"
Logo abaixo do textarea de descrição:

- Botão `variant="outline"` com ícone `Paperclip` (lucide-react) + texto **"Anexar Matrícula"**
- `<input type="file" hidden ref={fileRef}>` aceitando `application/pdf,image/jpeg,image/png`
- Validação client-side: tamanho máx. **10 MB** (toast destructive se exceder)
- Estado local: `isExtracting: boolean`
- Durante a extração: botão desabilitado, ícone trocado por `Loader2 animate-spin`, label vira **"Extraindo dados da matrícula..."**

## 3. Fluxo de upload e extração

1. Ler arquivo via `FileReader.readAsDataURL` → extrair base64 puro (`split(",")[1]`)
2. `setIsExtracting(true)`
3. Chamar `supabase.functions.invoke("extract-matricula", { body: { fileBase64, mimeType } })`
4. **Sucesso** (`data.success && data.descricao`): `onChange({ ...dados, imovel_descricao: data.descricao })` + `toast.success("Descrição extraída da matrícula")`
5. **Erro** (qualquer falha): `toast.error("Não foi possível extrair. Preencha manualmente.")` (variant destructive)
6. `setIsExtracting(false)` no `finally`; resetar `fileRef.current.value = ""` para permitir reanexar o mesmo arquivo

## 4. Nova edge function `extract-matricula`
**Arquivo novo:** `supabase/functions/extract-matricula/index.ts`

- CORS headers padrão + handler `OPTIONS`
- Validar input: `fileBase64` (string não-vazia), `mimeType` ∈ `["application/pdf","image/jpeg","image/png"]`
- Ler `LOVABLE_API_KEY` do env
- POST para `https://ai.gateway.lovable.dev/v1/chat/completions`:
  - **Modelo:** `google/gemini-2.5-pro` (consistente com `extract-document` que já funciona com PDFs/imagens; é o que melhor lida com OCR de matrículas no gateway atual)
  - `messages[0]` user com array de content:
    - `{ type: "text", text: PROMPT }` — prompt exato fornecido pelo usuário:
      > "Analise esta matrícula de imóvel e extraia APENAS o trecho descritivo do imóvel. Esse trecho começa com a palavra "Imóvel:" e termina com o nome do bairro (ex: "Bairro Fernão Dias."). Retorne somente esse texto extraído, sem comentários, sem markdown, sem nada mais."
    - `{ type: "image_url", image_url: { url: "data:<mime>;base64,<base64>" } }` — o gateway aceita PDF e imagem nesse mesmo formato (já validado em `extract-document`)
- Extrair `aiResult.choices[0].message.content` como texto puro (sem tool-calling — queremos texto livre)
- Limpar: `trim()`, remover crases/markdown caso o modelo escape
- Retorno:
  - `200 { success: true, descricao }` se texto não vazio
  - `200 { success: false, error: "empty" }` se vazio
  - `429` / `402` propagados com mensagens amigáveis
  - `500` para exceções
- Sem auth obrigatória (consistente com pattern do projeto; `verify_jwt` default).

## 5. Sem mudanças de banco / sem novos secrets
`LOVABLE_API_KEY` já está configurada. Nenhuma migration. Nenhum bucket novo (arquivo é processado em memória, não persistido).

## Arquivos tocados
```
src/components/contract/FixedDataFields.tsx     (edit)
supabase/functions/extract-matricula/index.ts   (new)
```
