/**
 * Lógica pura do gate de importação de modelo — sem React, sem Supabase.
 *
 * Fase 0 (auditoria) — item 3: o importador aceitava um `.docx` do qual
 * NENHUMA variável foi detectada (formato underscore, brackets fora do mapa,
 * etc.) e criava um modelo inerte exibindo um toast com tom de sucesso
 * ("0 variáveis detectadas"). Ver docs/AUDITORIA_COMPLETA_2026-07.md, E1/E2.
 *
 * Esta função concentra a decisão pura de quando a criação deve ser bloqueada:
 * um modelo com zero variáveis só pode ser criado após confirmação explícita
 * do usuário (checkbox "Entendo, criar mesmo assim").
 */

export interface ImportGateState {
  /** true quando o modelo não tem nenhuma variável — dispara o alerta destacado. */
  showZeroVariablesWarning: boolean;
  /** true quando a criação deve ser bloqueada (0 variáveis e ainda sem confirmação). */
  createBlocked: boolean;
}

/**
 * Resolve o estado do gate a partir da contagem de variáveis detectadas no
 * conteúdo final e da confirmação explícita do usuário.
 *
 *  - `variableCount > 0`            → fluxo normal, nada bloqueado, sem alerta.
 *  - `variableCount === 0` sem ack  → alerta visível e criação BLOQUEADA.
 *  - `variableCount === 0` com ack  → alerta visível, criação LIBERADA.
 *
 * `variableCount` negativo ou não-finito é tratado como 0 (defensivo).
 */
export function resolveImportGate(
  variableCount: number,
  zeroVarsAcknowledged: boolean
): ImportGateState {
  const safeCount = Number.isFinite(variableCount) && variableCount > 0 ? variableCount : 0;
  const showZeroVariablesWarning = safeCount === 0;
  const createBlocked = showZeroVariablesWarning && !zeroVarsAcknowledged;
  return { showZeroVariablesWarning, createBlocked };
}
