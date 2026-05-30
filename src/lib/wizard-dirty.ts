/**
 * Helpers puros do sistema de dirty flags do wizard de Novo Contrato.
 * Veja docs/planejamento/04_EPICO_5_DIRTY_FLAGS.md.
 *
 * Princípio: side-effects derivacionais (buildFinalContent, autoFillDados,
 * extractAll) só devem rodar quando o destino não foi editado pelo usuário.
 */

/** Bug A — TipTap: só refaz o HTML do template quando não há edição manual. */
export function shouldRebuildConteudo(conteudoFinalDirty: boolean): boolean {
  return !conteudoFinalDirty;
}

/** Reset de dirty quando o usuário escolhe outro template (base nova = sem edições). */
export function shouldResetDirtyOnTemplateChange(
  prevId: string | null,
  nextId: string | null
): boolean {
  return prevId !== nextId;
}
