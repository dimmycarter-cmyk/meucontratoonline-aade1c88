/**
 * Camada pura da tela de mapeamento do import .docx (Fase 1, sessão 1.2).
 *
 * O ImportDocxDialog consome estas funções para transformar as detecções do
 * motor unificado (import-detection.ts) em linhas de decisão da UI:
 *
 *   detectTemplateFields → indexRepeatableRoles → buildMappingRows → UI
 *   UI (Selects) → applyMappingToHtml → finalHtml → extractVariables/gate
 *
 * Regras aprovadas (plano 1.2):
 *  - Default "map" só para exact/high; medium/none nascem "review";
 *    "ignore" NUNCA é default — sempre decisão explícita do usuário.
 *  - Avanço bloqueado enquanto houver linha "review" (canAdvanceMapping);
 *    ignoreAllPending existe para a ação em massa COM confirmação na UI.
 *  - Indexação por paridade (testemunha/procurador) valida a chave indexada
 *    via isKnownKey — nunca sugere chave morta; sem chave válida, rebaixa
 *    a confiança para "medium" (cai em revisão, nada silencioso).
 *  - applyMappingToHtml substitui por raw + occurrenceIndex no HTML do
 *    mammoth (posições do motor são do texto plano, não servem no HTML).
 *    Limitação herdada do fluxo atual: label fragmentado por tags inline
 *    no HTML não casa e permanece original — visível no preview/gate.
 */

import type { TemplateFieldDetection } from "./import-detection";
import { FUZZY_THRESHOLDS, isKnownKey } from "./import-detection";

export type MappingAction = "map" | "review" | "ignore";

export interface MappingRow {
  detection: TemplateFieldDetection;
  action: MappingAction;
  /** Chave destino escolhida; preenchida quando action === "map". */
  targetKey: string;
}

export interface MappingSummary {
  mapped: number;
  toReview: number;
  ignored: number;
}

// ============================================================================
// Indexação por paridade — item 5 (known issue #2 da 1.1)
// ============================================================================

/** Papéis repetíveis cuja sugestão de contexto sai sem índice do motor. */
const REPEATABLE_ROLE_RE = /^(testemunha|procurador)_([a-z][a-z_]*)$/;

/**
 * Reindexa sugestões de papel repetível por ordem de ocorrência:
 * testemunha_cpf → testemunha1_cpf, testemunha2_cpf; procurador mantém a
 * 1ª sem índice (procurador_* é a chave real do catálogo) e indexa da 2ª
 * em diante. Só mexe em sugestões de contexto (confidence high/medium) —
 * match "exact" do catálogo repetido é a MESMA pessoa (ex.: CPF do
 * procurador citado duas vezes) e passa intocado. Quando a chave indexada
 * não existe (ex.: testemunha3_*, procurador2_*), mantém a sugestão
 * original e rebaixa para "medium": a linha cai em revisão explícita.
 */
export function indexRepeatableRoles(
  detections: TemplateFieldDetection[]
): TemplateFieldDetection[] {
  const seen = new Map<string, number>();
  return detections.map((d) => {
    if (d.confidence !== "high" && d.confidence !== "medium") return d;
    const m = d.suggestion ? REPEATABLE_ROLE_RE.exec(d.suggestion) : null;
    if (!m) return d;

    const [, role, suffix] = m;
    const n = (seen.get(d.suggestion!) ?? 0) + 1;
    seen.set(d.suggestion!, n);

    // procurador_1ª: a chave sem índice é a real — nada a fazer.
    if (role === "procurador" && n === 1) return d;

    const indexedKey = `${role}${n}_${suffix}`;
    if (isKnownKey(indexedKey)) {
      return {
        ...d,
        suggestion: indexedKey,
        candidates: [indexedKey, ...d.candidates.filter((c) => c !== d.suggestion)],
      };
    }
    // Chave indexada inexistente: não inventa — rebaixa para revisão.
    return { ...d, confidence: "medium" as const };
  });
}

// ============================================================================
// Linhas de decisão da UI
// ============================================================================

/** Converte detecções em linhas com a ação default aprovada por confiança. */
export function buildMappingRows(
  detections: TemplateFieldDetection[]
): MappingRow[] {
  return detections.map((detection) => {
    const autoMap =
      (detection.confidence === "exact" || detection.confidence === "high") &&
      !!detection.suggestion;
    return {
      detection,
      action: autoMap ? ("map" as const) : ("review" as const),
      targetKey: autoMap ? detection.suggestion! : "",
    };
  });
}

export function summarizeMapping(rows: MappingRow[]): MappingSummary {
  const summary: MappingSummary = { mapped: 0, toReview: 0, ignored: 0 };
  for (const row of rows) {
    if (row.action === "map") summary.mapped++;
    else if (row.action === "review") summary.toReview++;
    else summary.ignored++;
  }
  return summary;
}

/** Avanço do Step 2 só com zero pendências de revisão (decisão aprovada). */
export function canAdvanceMapping(rows: MappingRow[]): boolean {
  return summarizeMapping(rows).toReview === 0;
}

/**
 * Ação em massa "Ignorar todos os restantes" — converte SÓ as linhas em
 * revisão. Imutável; a UI exige confirmação com contagem antes de chamar.
 */
export function ignoreAllPending(rows: MappingRow[]): MappingRow[] {
  return rows.map((row) =>
    row.action === "review" ? { ...row, action: "ignore" as const, targetKey: "" } : row
  );
}

// ============================================================================
// Aplicação do mapeamento no HTML
// ============================================================================

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Regex do raw no HTML. Raws que começam/terminam com "_" ganham lookarounds
 * (?<!_) / (?!_) para casar SÓ runs de comprimento exato — sem isso, um run
 * de 36 casaria dentro de um run de 41 que ficou no HTML por ter sido
 * ignorado (a substituição não remove raws de linhas "ignore"/"review").
 */
function rawRegExp(raw: string): RegExp {
  const core = escapeRegExp(raw);
  const prefix = raw.startsWith("_") ? "(?<!_)" : "";
  const suffix = raw.endsWith("_") ? "(?!_)" : "";
  return new RegExp(`${prefix}${core}${suffix}`, "g");
}

/**
 * Substitui no HTML cada raw mapeado por {{targetKey}}, casando a n-ésima
 * ocorrência do raw com a linha de mesmo occurrenceIndex.
 */
export function applyMappingToHtml(html: string, rows: MappingRow[]): string {
  const byRaw = new Map<string, MappingRow[]>();
  for (const row of rows) {
    const arr = byRaw.get(row.detection.raw) ?? [];
    arr.push(row);
    byRaw.set(row.detection.raw, arr);
  }

  let result = html;
  for (const [raw, group] of byRaw.entries()) {
    const re = rawRegExp(raw);
    let n = 0;
    result = result.replace(re, () => {
      const row = group.find((r) => r.detection.occurrenceIndex === n);
      n++;
      if (row && row.action === "map" && row.targetKey) return `{{${row.targetKey}}}`;
      return raw;
    });
  }
  return result;
}

// ============================================================================
// Metadado de import — item 4 (persistência p/ re-import e auditoria)
// ============================================================================

export interface ImportDecision {
  raw: string;
  syntax: TemplateFieldDetection["syntax"];
  occurrenceIndex: number;
  confidence: TemplateFieldDetection["confidence"];
  suggestion: string | null;
  action: MappingAction;
  targetKey: string;
}

export interface ImportMetadata {
  version: 1;
  source: "docx-import";
  filename: string;
  /** ISO 8601 — passado pela UI no momento da criação. */
  imported_at: string;
  thresholds: typeof FUZZY_THRESHOLDS;
  decisions: ImportDecision[];
}

/** Payload JSONB gravado em contract_templates.import_metadata. */
export function buildImportMetadata(args: {
  filename: string;
  importedAt: string;
  rows: MappingRow[];
}): ImportMetadata {
  return {
    version: 1,
    source: "docx-import",
    filename: args.filename,
    imported_at: args.importedAt,
    thresholds: FUZZY_THRESHOLDS,
    decisions: args.rows.map((row) => ({
      raw: row.detection.raw,
      syntax: row.detection.syntax,
      occurrenceIndex: row.detection.occurrenceIndex,
      confidence: row.detection.confidence,
      suggestion: row.detection.suggestion,
      action: row.action,
      targetKey: row.targetKey,
    })),
  };
}
