

## Plano: Editor de contrato estilo Word/Google Docs

### Objetivo
Transformar o `RichTextEditor` atual (toolbar basica com 8 botoes) num editor com visual e ferramentas semelhantes ao Word/Google Docs, conforme o print de referencia.

### O que muda

#### 1. Instalar extensoes TipTap adicionais
- `@tiptap/extension-text-align` — alinhamento esquerda/centro/direita/justificado
- `@tiptap/extension-font-family` — selecao de fonte (Arial, Times New Roman, etc.)
- `@tiptap/extension-text-style` — base para font-family e font-size
- `@tiptap/extension-color` — cor do texto
- `@tiptap/extension-font-size` — tamanho da fonte (10, 10.5, 11, 12, 14, etc.)
- `@tiptap/extension-superscript` e `@tiptap/extension-subscript`

#### 2. Redesenhar toolbar do RichTextEditor
Layout em 2 linhas como Word:

**Linha 1 (barra principal):**
- Select de fonte (Arial, Times New Roman, Courier...)
- Select de tamanho (10, 10.5, 11, 12, 14, 16, 18...)
- Separador
- Bold, Italic, Underline, Strikethrough
- Cor do texto (color picker simples)
- Highlight
- Separador
- Alinhamento (esquerda, centro, direita, justificado)
- Separador
- Listas (bullet, numbered)
- Separador
- Headings (H1, H2, H3)
- Separador
- Undo, Redo
- Botao "Inserir Variavel"

#### 3. Layout estilo documento A4
- Fundo cinza claro atras do editor
- Area de edicao centralizada com largura fixa (~210mm / 794px), sombra suave, fundo branco
- Padding interno simulando margens de pagina (25mm lateral, 20mm topo/base)
- Fonte padrao Times New Roman 12pt (como contratos reais)
- Texto justificado por padrao

#### 4. Arquivo alterado
| Arquivo | Mudanca |
|---------|---------|
| `src/components/RichTextEditor.tsx` | Reescrever com toolbar expandida, extensoes novas, layout A4 |

### Extensoes a instalar
```
@tiptap/extension-text-align
@tiptap/extension-text-style
@tiptap/extension-font-family
@tiptap/extension-color
@tiptap/extension-superscript
@tiptap/extension-subscript
```

> Nota: `font-size` nao tem extensao oficial no TipTap 3, sera implementado como extensao customizada inline style.

