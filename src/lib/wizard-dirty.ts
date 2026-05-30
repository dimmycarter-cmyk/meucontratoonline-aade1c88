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

/** Bug B — autoFill: só preenche a chave quando o usuário não a editou. */
export function shouldAutoFillField(field: string, dadosDirty: Set<string>): boolean {
  return !dadosDirty.has(field);
}

/**
 * Bug B — filtra um objeto de "candidatos a auto-fill", removendo as chaves
 * marcadas como editadas pelo usuário. Útil em autoFillDados para separar
 * "coleta de candidatos" (sem condição) de "aplicação filtrada".
 */
export function pickAutoFillFields(
  candidates: Record<string, string>,
  dadosDirty: Set<string>
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(candidates)) {
    if (shouldAutoFillField(key, dadosDirty)) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Compara dois snapshots de `dados` e devolve as chaves que mudaram
 * (inclui adicionadas, alteradas e removidas). Usado pelo handleDadoChange
 * para alimentar dadosDirty.
 */
export function diffKeys(
  prev: Record<string, string>,
  next: Record<string, string>
): string[] {
  const changed: string[] = [];
  const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  for (const k of allKeys) {
    if (prev[k] !== next[k]) changed.push(k);
  }
  return changed;
}
