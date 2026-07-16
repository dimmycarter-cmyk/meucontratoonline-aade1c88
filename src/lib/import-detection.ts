/**
 * Motor de detecção unificado do importador (Fase 1, sessão 1.1 — E2/E3/E4).
 *
 * Detecta as 3 sintaxes de campo em templates importados:
 *   {{curly}}  ·  [BRACKET LEGADO]  ·  lacunas de underscore (______)
 * e sugere a chave canônica com nível de confiança, SEM jamais descartar
 * uma detecção em silêncio (regra de ouro do E1): o que não tem match vira
 * item confidence "none" para a tela de mapeamento (sessão 1.2).
 *
 * Este módulo importa apenas import-catalog.ts e template-variables.ts
 * (ambos dependency-free) — permanece importável pela edge function Deno
 * na 1.2, sob a mesma premissa registrada no topo do import-catalog.ts.
 *
 * NÃO substitui extractVariables/replacePlaceholders (motor de render):
 * convive ao lado; a troca do fluxo do ImportDocxDialog acontece na 1.2.
 */

import {
  IMPORT_CATALOG,
  GENERIC_FIELD_SUFFIXES,
  ROLE_KEYWORDS,
  ORDER_FALLBACK,
} from "./import-catalog";
import { TEMPLATE_VARIABLES } from "./template-variables";

export type MatchConfidence = "exact" | "high" | "medium" | "none";

/**
 * Limiares do match fuzzy (similaridade normalizada 0..1).
 * Exportados para calibração na 1.2 contra o .docx real (Ajuste 2).
 */
export const FUZZY_THRESHOLDS = { high: 0.85, medium: 0.7 } as const;

/** Máximo de candidatos ranqueados devolvidos por detecção. */
const MAX_CANDIDATES = 4;

// ============================================================================
// Normalização
// ============================================================================

/** Normalização base: acentos, caixa, gênero "(A)", pontuação, espaços. */
function baseNormalize(label: string): string {
  return label
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/\((?:A|O|AS|OS)\)/g, "") // DO(A) → DO · VENDEDOR(A) → VENDEDOR
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

/** Vocabulário de tokens do catálogo — referência para singularização segura. */
const VOCAB: Set<string> = (() => {
  const vocab = new Set<string>();
  for (const entry of IMPORT_CATALOG) {
    for (const label of [entry.label, ...entry.aliases]) {
      for (const token of baseNormalize(label).split(" ")) vocab.add(token);
    }
  }
  for (const label of Object.keys(GENERIC_FIELD_SUFFIXES)) {
    for (const token of baseNormalize(label).split(" ")) vocab.add(token);
  }
  return vocab;
})();

/**
 * Normaliza um label para comparação: base + plural simples por token
 * (só singulariza quando o singular existe no vocabulário do catálogo —
 * "E-MAILS" → "E MAIL", mas "MÊS" fica "MES").
 */
export function normalizeLabel(label: string): string {
  const norm = baseNormalize(label);
  if (!norm) return "";
  return norm
    .split(" ")
    .map((token) => {
      if (token.endsWith("S") && !VOCAB.has(token) && VOCAB.has(token.slice(0, -1))) {
        return token.slice(0, -1);
      }
      return token;
    })
    .join(" ");
}

// ============================================================================
// Estruturas de lookup (derivadas do catálogo, construídas uma vez)
// ============================================================================

/** normalizado → chave canônica (match exato). Primeira grafia vence em colisão. */
const EXACT_LOOKUP: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const entry of IMPORT_CATALOG) {
    for (const label of [entry.label, ...entry.aliases]) {
      const norm = normalizeLabel(label);
      if (!map.has(norm)) map.set(norm, entry.key);
    }
  }
  return map;
})();

/** Pool para o fuzzy: toda grafia normalizada com sua chave. */
const FUZZY_POOL: Array<{ norm: string; key: string }> = (() => {
  const pool: Array<{ norm: string; key: string }> = [];
  const seen = new Set<string>();
  for (const entry of IMPORT_CATALOG) {
    for (const label of [entry.label, ...entry.aliases]) {
      const norm = normalizeLabel(label);
      if (seen.has(norm)) continue;
      seen.add(norm);
      pool.push({ norm, key: entry.key });
    }
  }
  return pool;
})();

/** Label genérico normalizado → sufixo ("CPF" → "cpf"). */
const GENERIC_NORM: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const [label, suffix] of Object.entries(GENERIC_FIELD_SUFFIXES)) {
    map.set(normalizeLabel(label), suffix);
  }
  return map;
})();

/** Chaves canônicas conhecidas (catálogo ∪ TEMPLATE_VARIABLES) p/ curly. */
const KNOWN_KEYS: Set<string> = (() => {
  const keys = new Set<string>(IMPORT_CATALOG.map((e) => e.key));
  for (const v of TEMPLATE_VARIABLES) keys.add(v.key);
  return keys;
})();

/**
 * Acesso read-only a KNOWN_KEYS (1.2 — indexação por paridade valida chaves
 * indexadas antes de sugerir; nunca expõe o Set mutável).
 */
export function isKnownKey(key: string): boolean {
  return KNOWN_KEYS.has(key);
}

// ============================================================================
// Similaridade (fuzzy sem lib externa)
// ============================================================================

/** Distância de Levenshtein clássica, DP com duas linhas. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/**
 * Similaridade combinada 0..1: máximo entre
 *  - Levenshtein normalizado (pega typos e flexões de gênero por extenso);
 *  - Dice de tokens 2|A∩B|/(|A|+|B|) (pega token extra/faltante e premia
 *    subconjunto: "ENDEREÇO COMPLETO DO VENDEDOR" ⊃ "ENDEREÇO DO VENDEDOR"
 *    pontua acima de um overlap parcial de mesmo tamanho).
 */
function similarity(a: string, b: string): number {
  const lev = 1 - levenshtein(a, b) / Math.max(a.length, b.length);
  const tokensA = new Set(a.split(" "));
  const tokensB = new Set(b.split(" "));
  let inter = 0;
  for (const t of tokensA) if (tokensB.has(t)) inter++;
  const tok = (2 * inter) / (tokensA.size + tokensB.size);
  return Math.max(lev, tok);
}

// ============================================================================
// E2 — matchBracketLabel
// ============================================================================

export interface BracketMatch {
  /** Chave canônica sugerida, ou null quando confidence é "none". */
  key: string | null;
  confidence: MatchConfidence;
  /** Até 4 candidatos ranqueados; [] quando "none". */
  candidates: string[];
}

/**
 * Casa um label de bracket contra o catálogo unificado.
 * Pipeline: normalização → match exato → fuzzy ranqueado.
 * Nunca "descarta": sem match viável, devolve item "none" com candidates [].
 */
export function matchBracketLabel(label: string): BracketMatch {
  const norm = normalizeLabel(label);
  if (!norm) return { key: null, confidence: "none", candidates: [] };

  const exact = EXACT_LOOKUP.get(norm);
  if (exact) return { key: exact, confidence: "exact", candidates: [exact] };

  // Fuzzy: melhor score por chave canônica
  const scoreByKey = new Map<string, number>();
  for (const { norm: candidate, key } of FUZZY_POOL) {
    const score = similarity(norm, candidate);
    if (score > (scoreByKey.get(key) ?? 0)) scoreByKey.set(key, score);
  }
  const ranked = [...scoreByKey.entries()]
    .filter(([, score]) => score >= FUZZY_THRESHOLDS.medium)
    .sort((a, b) => b[1] - a[1]);

  if (ranked.length === 0) return { key: null, confidence: "none", candidates: [] };

  const [bestKey, bestScore] = ranked[0];
  const candidates = ranked.slice(0, MAX_CANDIDATES).map(([key]) => key);
  return {
    key: bestKey,
    confidence: bestScore >= FUZZY_THRESHOLDS.high ? "high" : "medium",
    candidates,
  };
}

// ============================================================================
// Contexto de papel (compartilhado por E3 e brackets genéricos do E4)
// ============================================================================

/** Janela de texto anterior varrida em busca do papel do bloco/seção. */
const ROLE_WINDOW_CHARS = 600;

/**
 * Papel do bloco: palavra-chave de papel MAIS PRÓXIMA antes da posição,
 * dentro da janela — cobre tanto contexto local ("O COMPRADOR, CPF: __")
 * quanto herança do cabeçalho da seção ("PROMITENTE VENDEDORA:\nCPF: __").
 */
function inferRole(text: string, position: number): string | null {
  const windowStart = Math.max(0, position - ROLE_WINDOW_CHARS);
  const window = text.slice(windowStart, position);
  let best: { role: string; at: number } | null = null;
  for (const { role, rx } of ROLE_KEYWORDS) {
    const global = new RegExp(rx.source, "gi");
    let m: RegExpExecArray | null;
    let last = -1;
    while ((m = global.exec(window)) !== null) last = m.index;
    if (last >= 0 && (!best || last > best.at)) best = { role, at: last };
  }
  return best ? best.role : null;
}

/** Sugestão + candidatos a partir de (papel opcional, sufixo obrigatório). */
function suggestFromRoleSuffix(role: string | null, suffix: string) {
  if (role) {
    const primary = `${role}_${suffix}`;
    const others = ORDER_FALLBACK.filter((r) => r !== role)
      .slice(0, MAX_CANDIDATES - 1)
      .map((r) => `${r}_${suffix}`);
    return { suggestion: primary, confidence: "high" as const, candidates: [primary, ...others] };
  }
  const candidates = ORDER_FALLBACK.slice(0, MAX_CANDIDATES).map((r) => `${r}_${suffix}`);
  return { suggestion: candidates[0], confidence: "medium" as const, candidates };
}

// ============================================================================
// E3 — detectUnderscoreFields
// ============================================================================

/**
 * Lacunas de underscore: runs de _{3,} e máscaras compostas (__/__/____,
 * ___-___), fundidas numa detecção única por lacuna.
 */
const UNDERSCORE_RE = /_+(?:\s?[/\-.]\s?_+)+|_{3,}/g;

/** Tokens de ligação/ruído entre o rótulo e a lacuna ("CPF nº ______"). */
const NOISE_TOKENS = new Set([
  "N", "NO", "NUM", "NUMERO", "DE", "DO", "DA", "DOS", "DAS",
  "O", "A", "OS", "AS", "E", "EM", "POR", "SOB",
]);

export interface UnderscoreDetection {
  /** A lacuna literal, ex: "______" ou "__/__/____". */
  raw: string;
  /** Índice da lacuna no texto plano. */
  position: number;
  /** Snippet ~80 chars antes + ~30 depois, para a UI de mapeamento. */
  context: string;
  /** Chave sugerida (papel_sufixo) ou null quando indeterminado. */
  suggestion: string | null;
  confidence: MatchConfidence;
  /** Candidatos ranqueados; [] quando não há nem sufixo inferível. */
  candidates: string[];
}

/**
 * Sufixo do campo a partir do rótulo imediatamente anterior na linha:
 * "CPF: ______" → cpf. Ignora tokens de ruído no fim ("nº", "do", ...)
 * e tenta janelas de 3→1 tokens contra GENERIC_FIELD_SUFFIXES.
 */
function inferSuffix(beforeText: string): string | null {
  const norm = normalizeLabel(beforeText);
  if (!norm) return null;
  const tokens = norm.split(" ");
  while (tokens.length && NOISE_TOKENS.has(tokens[tokens.length - 1])) tokens.pop();
  for (let k = Math.min(3, tokens.length); k >= 1; k--) {
    const candidate = tokens.slice(-k).join(" ");
    const suffix = GENERIC_NORM.get(candidate);
    if (suffix) return suffix;
  }
  return null;
}

function contextSlice(text: string, position: number, rawLength: number): string {
  const start = Math.max(0, position - 80);
  const end = Math.min(text.length, position + rawLength + 30);
  return text.slice(start, end);
}

export function detectUnderscoreFields(text: string): UnderscoreDetection[] {
  if (!text) return [];
  const detections: UnderscoreDetection[] = [];
  for (const m of text.matchAll(UNDERSCORE_RE)) {
    const raw = m[0];
    const position = m.index ?? 0;
    const lineStart = text.lastIndexOf("\n", position - 1) + 1;
    const suffix = inferSuffix(text.slice(lineStart, position));
    const context = contextSlice(text, position, raw.length);

    if (!suffix) {
      detections.push({ raw, position, context, suggestion: null, confidence: "none", candidates: [] });
      continue;
    }
    const role = inferRole(text, position);
    const { suggestion, confidence, candidates } = suggestFromRoleSuffix(role, suffix);
    detections.push({ raw, position, context, suggestion, confidence, candidates });
  }
  return detections;
}

// ============================================================================
// E4 — detectTemplateFields (API única sobre as 3 sintaxes)
// ============================================================================

export type DetectionSyntax = "curly" | "bracket" | "underscore";

export interface TemplateFieldDetection {
  /** Token literal detectado: "{{chave}}", "[LABEL]" ou "______". */
  raw: string;
  syntax: DetectionSyntax;
  /** Chave canônica sugerida ou null (confidence "none"). */
  suggestion: string | null;
  confidence: MatchConfidence;
  /** Candidatos ranqueados (até 4); [] quando "none". */
  candidates: string[];
  /** Índice no texto plano. */
  position: number;
  /** Snippet ~80 chars antes + ~30 depois. */
  context: string;
  /** N-ésima ocorrência deste raw específico (0-indexada). */
  occurrenceIndex: number;
}

/**
 * Falsos positivos de bracket: citações legais, numerais e datas literais.
 *
 * CÓPIA DECLARADA de `isLegalReference` (placeholder.ts, fonte única do
 * filtro no pipeline de render — 2.2b B1), com extras próprios do motor de
 * IMPORT: nº sem âncora (linha do "n 123 do cartório") e datas literais.
 * Unificação consumindo a fonte única é frente própria (backlog 2.2b) —
 * muda semântica observável do import e flipa testes da 1.1.
 */
function isNonFieldBracket(inner: string): boolean {
  if (/^\d+([.,]\d+)?$/.test(inner)) return true;
  // "§" fica fora do grupo com \b: não é word char, então "\b" nunca casa após ele.
  if (/^(art\.?|lei|inc(iso)?|par[áa]grafo)\b|^§/i.test(inner)) return true;
  if (/^n[º°.]?\s*\d+/i.test(inner)) return true;
  if (/^\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}$/.test(inner)) return true;
  return false;
}

/**
 * Detecção unificada: {{curly}}, [brackets] e underscores numa lista única
 * ordenada por posição. `text` é o texto plano (fonte das posições e do
 * contexto); `html` fica reservado para a 1.2 (casamento de posições no
 * HTML do editor) — quando `text` vier vazio, cai para `html`.
 */
export function detectTemplateFields(html: string, text: string): TemplateFieldDetection[] {
  const source = text || html || "";
  if (!source) return [];
  const detections: TemplateFieldDetection[] = [];

  // 1. {{curly}} — chave já explícita; conhecida → exact, custom → high
  for (const m of source.matchAll(/\{\{\s*([\w]+)\s*\}\}/g)) {
    const key = m[1];
    const position = m.index ?? 0;
    detections.push({
      raw: m[0],
      syntax: "curly",
      suggestion: key,
      confidence: KNOWN_KEYS.has(key) ? "exact" : "high",
      candidates: [key],
      position,
      context: contextSlice(source, position, m[0].length),
      occurrenceIndex: 0,
    });
  }

  // 2. [brackets] — genéricos resolvem por contexto de papel; demais via match
  for (const m of source.matchAll(/\[([^\]]+)\]/g)) {
    const inner = m[1].trim();
    if (isNonFieldBracket(inner)) continue;
    const position = m.index ?? 0;
    const context = contextSlice(source, position, m[0].length);

    const genericSuffix = GENERIC_NORM.get(normalizeLabel(inner));
    if (genericSuffix) {
      const role = inferRole(source, position);
      const { suggestion, confidence, candidates } = suggestFromRoleSuffix(role, genericSuffix);
      detections.push({ raw: m[0], syntax: "bracket", suggestion, confidence, candidates, position, context, occurrenceIndex: 0 });
    } else {
      const match = matchBracketLabel(inner);
      detections.push({
        raw: m[0],
        syntax: "bracket",
        suggestion: match.key,
        confidence: match.confidence,
        candidates: match.candidates,
        position,
        context,
        occurrenceIndex: 0,
      });
    }
  }

  // 3. Underscores
  for (const u of detectUnderscoreFields(source)) {
    detections.push({
      raw: u.raw,
      syntax: "underscore",
      suggestion: u.suggestion,
      confidence: u.confidence,
      candidates: u.candidates,
      position: u.position,
      context: u.context,
      occurrenceIndex: 0,
    });
  }

  // Lista única ordenada por posição + occurrenceIndex por raw
  detections.sort((a, b) => a.position - b.position);
  const countByRaw = new Map<string, number>();
  for (const d of detections) {
    const count = countByRaw.get(d.raw) ?? 0;
    d.occurrenceIndex = count;
    countByRaw.set(d.raw, count + 1);
  }
  return detections;
}
