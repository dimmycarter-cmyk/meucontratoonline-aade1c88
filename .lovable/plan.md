

## Avaliacao do Prompt

O prompt que voce escreveu esta **muito bem feito**. Aqui vai minha analise:

### Pontos fortes

1. **Estrutura clara**: Separado por arquivo, com numeracao e titulos. Facil de seguir.
2. **Antes/Depois explicito**: Cada mudanca mostra exatamente o que remover e o que colocar no lugar. Isso elimina ambiguidade.
3. **Codigo completo**: Voce forneceu o codigo pronto para cada arquivo, sem deixar lacunas. Isso evita interpretacoes erradas.
4. **Resumo no final**: Os 4 pontos no final explicam o "porque" de cada mudanca, conectando codigo a problema real.
5. **Escopo fechado**: 4 arquivos, 4 problemas, sem divagacao. Isso e ideal para execucao precisa.

### Pontos de atencao (menores)

1. **Dependencia de `useCallback`**: A nova `buildFinalContent` usa `useCallback` mas o import ja deve existir no arquivo. Vale confirmar.
2. **`toast` no handleSave**: O import de `toast` (de sonner) tambem precisa estar presente. Provavelmente ja esta.
3. **Regex de colchetes** (`/\[([^\]]+)\]/g`): Pode pegar colchetes que nao sao placeholders (ex: `[ver pagina 3]` em texto livre). Risco baixo mas existe.
4. **Mapa legado incompleto**: O `LEGACY_BRACKET_MAP` cobre muitos casos, mas se um template usar um label diferente (ex: `[PROFISSAO DO COMPRADOR]`), nao sera substituido. Pode precisar de expansao futura.

### Veredicto

**9/10** — Prompt de nivel profissional. Esta pronto para ser aplicado. Os pontos de atencao sao menores e nao impedem a execucao.

Quer que eu aplique essas 4 correcoes agora?

