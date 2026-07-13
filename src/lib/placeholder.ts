/**
 * Motor unificado de placeholders
 * Suporta: {{key}}, {{ key }}, [LABEL LEGADO], [label]
 *
 * O dicionário LEGACY_BRACKET_MAP normaliza labels em colchetes (legado .docx)
 * para chaves canônicas em snake_case. Aliases entre chaves canônicas
 * (ex: empresa_* ↔ imobiliaria_*) são resolvidos pelo enrichDados.
 */

import { applyFallback, getFallbackStrategy, type FallbackStrategy } from "./placeholder-fallback";
import { cleanOrphanPunctuation, suppressEmptyFieldScaffold } from "./text-cleanup";
import {
  buildLegacyBracketMap,
  GENERIC_FIELD_SUFFIXES,
  ORDER_FALLBACK,
  ROLE_KEYWORDS,
} from "./import-catalog";

/**
 * Dicionário legado label→chave (171 pares). Desde a Fase 1 (sessão 1.1)
 * é DERIVADO do catálogo unificado em import-catalog.ts — fonte única de
 * verdade (E1); não edite pares aqui, edite o IMPORT_CATALOG.
 * A grade completa é validada contra o fixture congelado em
 * __tests__/fixtures/legacy-bracket-map.fixture.ts (guarda anti-regressão).
 *
 * Nota herdada: os labels genéricos sem qualificação ([CPF], [ENDEREÇO]...)
 * continuam mapeando para vendedor_* como fallback de 1ª ocorrência — a
 * resolução por contexto de papel vive em resolveAmbiguousLabels (client)
 * e no novo motor import-detection.ts.
 */
export const LEGACY_BRACKET_MAP: Record<string, string> = buildLegacyBracketMap();

/**
 * Remove blocos condicionais {{#if FLAG}}…{{/if}} cuja FLAG não esteja
 * truthy em `vars` (truthy = "true" case-insensitive).
 *
 * Quando a flag é truthy: as tags são removidas, o conteúdo interno permanece.
 * Quando é falsy/ausente: o bloco inteiro é removido (incluindo conteúdo).
 *
 * Falsy = "" | "false" | "0" | "no" | "não"  (case-insensitive, trim).
 * Qualquer outro valor preenchido é truthy — isso permite usar tanto flags
 * boolean ("true"/"false") quanto blocos condicionados à presença de um
 * campo (ex: {{#if procurador_oab}}…{{/if}} fica visível só se o OAB existir).
 *
 * Suporta blocos aninhados via execução iterativa até estabilizar — o
 * padrão non-greedy `[\s\S]*?` casa o `{{/if}}` mais próximo, então a cada
 * iteração resolvemos os blocos mais internos primeiro.
 *
 * IMPORTANTE: deve ser chamado ANTES de `replacePlaceholders` e
 * `getUnresolvedPlaceholders` — caso contrário, placeholders dentro de
 * blocos desativados serão erroneamente listados como pendentes.
 */
export function stripConditionalBlocks(
  text: string,
  vars: Record<string, string>
): string {
  if (!text) return text;
  const isTruthy = (key: string) => {
    const v = (vars[key] ?? "").toString().trim().toLowerCase();
    if (v === "" || v === "false" || v === "0" || v === "no" || v === "não") return false;
    return true;
  };

  // Parser balanceado: a cada iteração, encontra o bloco MAIS INTERNO
  // (último `{{#if X}}` antes do primeiro `{{/if}}` que o segue) e o resolve.
  // Isso evita que o regex non-greedy case `{{/if}}` interno como fim do externo.
  const openRe = /\{\{#if\s+([\w]+)\}\}/g;
  const closeStr = "{{/if}}";

  let curr = text;
  let safety = 0;
  while (safety < 50) {
    safety++;
    const closeIdx = curr.indexOf(closeStr);
    if (closeIdx === -1) break;

    // Encontra o último `{{#if ...}}` antes desse `{{/if}}`
    openRe.lastIndex = 0;
    let lastOpen: { idx: number; len: number; flag: string } | null = null;
    let m: RegExpExecArray | null;
    while ((m = openRe.exec(curr)) !== null) {
      if (m.index >= closeIdx) break;
      lastOpen = { idx: m.index, len: m[0].length, flag: m[1] };
    }
    if (!lastOpen) break; // `{{/if}}` órfão — para evitar loop, sai

    const innerStart = lastOpen.idx + lastOpen.len;
    const inner = curr.slice(innerStart, closeIdx);
    const replacement = isTruthy(lastOpen.flag) ? inner : "";
    curr = curr.slice(0, lastOpen.idx) + replacement + curr.slice(closeIdx + closeStr.length);
  }
  return curr;
}

/**
 * Expande blocos de repetição {{#each <papel>}}…{{/each}}, renderizando o
 * bloco interno uma vez por participante daquele papel e unindo os
 * resultados com concordância PT-BR (", " entre itens, " e " antes do
 * último). É o construto irmão de {{#if}} para listas dinâmicas de partes.
 *
 * `<papel>` é a chave PLURAL do grupo (vendedores, compradores, anuentes,
 * fiadores, testemunhas) — a mesma usada em `participantsByRole`.
 *
 * Dentro do bloco, os campos do participante atual são referenciados por
 * {{campo}} (nome, cpf, rg, profissao, estado_civil, endereco, banco,
 * agencia, conta, pix, …). A substituição é POR ITEM: cada {{campo}} cujo
 * nome existe no registro do participante é trocado pelo valor daquele
 * participante (mesmo vazio, para a limpeza de pontuação órfã agir).
 * Placeholders que NÃO são campos do participante (ex.: {{valor_total}})
 * são deixados intactos para o passe externo (`replacePlaceholders`).
 *
 * Papel com 0 participantes ⇒ bloco rende string vazia. A remoção do texto
 * ao redor (rótulos, "ASSINATURAS", etc.) continua a cargo de {{#if}}.
 *
 * Parser balanceado idêntico ao de `stripConditionalBlocks` (resolve o
 * bloco mais interno primeiro), com teto defensivo de iterações.
 *
 * IMPORTANTE: deve rodar ANTES de `preprocessTemplate`/`replacePlaceholders`
 * — depois da expansão, só restam placeholders planos/compartilhados.
 */
export interface EachOptions {
  /** Separador entre itens não-finais. Default ", ". */
  separator?: string;
  /** Separador antes do último item. Default " e ". Ex.: "; e " (estilo serial jurídico). */
  lastSeparator?: string;
}

export function expandEachBlocks(
  text: string,
  participantsByRole: Record<string, Array<Record<string, string>>>,
  options: EachOptions = {}
): string {
  if (!text) return text;
  const sep = options.separator ?? ", ";
  const lastSep = options.lastSeparator ?? " e ";

  const openRe = /\{\{#each\s+([\w]+)\}\}/g;
  const closeStr = "{{/each}}";

  let curr = text;
  let safety = 0;
  while (safety < 50) {
    safety++;
    const closeIdx = curr.indexOf(closeStr);
    if (closeIdx === -1) break;

    // Último `{{#each ...}}` antes desse `{{/each}}` (bloco mais interno)
    openRe.lastIndex = 0;
    let lastOpen: { idx: number; len: number; role: string } | null = null;
    let m: RegExpExecArray | null;
    while ((m = openRe.exec(curr)) !== null) {
      if (m.index >= closeIdx) break;
      lastOpen = { idx: m.index, len: m[0].length, role: m[1] };
    }
    if (!lastOpen) break; // `{{/each}}` órfão — evita loop

    const innerStart = lastOpen.idx + lastOpen.len;
    const inner = curr.slice(innerStart, closeIdx);
    const items = participantsByRole[lastOpen.role] ?? [];
    const rendered = items.map((item) => renderEachItem(inner, item));
    const joined = joinWithConjunction(rendered, sep, lastSep);
    curr = curr.slice(0, lastOpen.idx) + joined + curr.slice(closeIdx + closeStr.length);
  }
  return curr;
}

/**
 * Renderiza o bloco interno de um {{#each}} para UM participante.
 * Só substitui {{campo}} cujo nome é propriedade própria de `item`
 * (campos vazios viram ""); demais placeholders ficam intactos para o
 * passe externo. Limpa pontuação órfã deixada por campos omitidos.
 */
function renderEachItem(inner: string, item: Record<string, string>): string {
  const out = inner.replace(/\{\{\s*([\w]+)\s*\}\}/g, (full, key) => {
    if (Object.prototype.hasOwnProperty.call(item, key)) return item[key] ?? "";
    return full;
  });
  // Suprime sub-cláusulas de qualificação cujo campo (RG/órgão, CPF, e-mail)
  // ficou vazio ANTES do cleanup de pontuação — o scaffold inteiro sai, não só
  // a vírgula. Ordem: suprime → normaliza pontuação remanescente.
  return cleanOrphanPunctuation(suppressEmptyFieldScaffold(out));
}

/**
 * Une os itens já renderizados com concordância PT-BR:
 *   0 → ""  ·  1 → "A"  ·  2 → "A{lastSep}B"  ·  3+ → "A{sep}B{lastSep}C"
 */
function joinWithConjunction(items: string[], sep: string, lastSep: string): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  const head = items.slice(0, -1).join(sep);
  return head + lastSep + items[items.length - 1];
}

/**
 * Remove prefixos literais que duplicariam saída de formatters/dados ao
 * renderizar o template. Sprint 3 — BUGs 2 e 5.
 *
 *  BUG 2: `formatBRL` (aplicado em `applyFormatters` para `valor_*`) já
 *  prefixa "R$ " no valor. Templates importados de `.docx` frequentemente
 *  trazem "R$ {{valor_total}}" ou "R$ [VALOR TOTAL]" — gera "R$ R$ X".
 *
 *  BUG 5: a descrição livre do imóvel (`imovel_descricao`) tipicamente
 *  começa com "Imóvel:" (hábito de OCR/digitação). Templates importados
 *  trazem "imóvel: {{imovel_descricao}}" — gera "imóvel: Imóvel: X".
 *
 * O fix é estrutural (no render, não no template do tenant) para cobrir
 * automaticamente futuros `.docx` importados com os mesmos hábitos.
 *
 * Lista de labels casados para `[VALOR ...]` é restritiva — só os que o
 * `LEGACY_BRACKET_MAP` mapeia para `valor_*`. Evita falso-positivo em
 * brackets ad-hoc que possam conter a palavra VALOR sem ser canônicos.
 */
export function stripRedundantPrefixes(text: string): string {
  if (!text) return text;
  let out = text;

  // BUG 2 — "R$ " literal antes de placeholder de valor monetário
  out = out.replace(
    /R\$\s*(\{\{\s*valor_[a-z0-9_]+\s*\}\})/gi,
    "$1"
  );
  out = out.replace(
    /R\$\s*(\[\s*VALOR(?:\s+(?:TOTAL|DO\s+SINAL|REMANESCENTE|DO\s+FINANCIAMENTO|PARA\s+O\s+VENDEDOR|DA\s+CORRETAGEM)(?:\s+POR\s+EXTENSO)?)?\s*\])/gi,
    "$1"
  );

  // BUG 5 — "imóvel:" literal antes de placeholder de descrição
  out = out.replace(
    /(?:im[óo]vel)\s*:\s*(\{\{\s*imovel_descricao\s*\}\})/gi,
    "$1"
  );
  out = out.replace(
    /(?:im[óo]vel)\s*:\s*(\[\s*DESCRI[ÇC][ÃA]O(?:\s+COMPLETA)?\s+DO\s+IM[ÓO]VEL\s*\])/gi,
    "$1"
  );

  return out;
}

/**
 * Helper de conveniência: pré-processa o template (resolve condicionais
 * e remove prefixos literais redundantes) para que tanto
 * `replacePlaceholders` quanto `getUnresolvedPlaceholders` recebam
 * exatamente o mesmo texto base e não divirjam.
 */
export function preprocessTemplate(
  text: string,
  vars: Record<string, string>
): string {
  const stripped = stripConditionalBlocks(text, vars);
  return stripRedundantPrefixes(stripped);
}

export interface ReplaceOptions {
  /**
   * Estratégia aplicada quando o placeholder não tem dado correspondente.
   * Default: `"auto"` — consulta `getFallbackStrategy(key)` para decidir
   * (`blank_line` para RG/órgão, `omit` para datas de nascimento, etc.).
   * Use `"keep_literal"` para preservar o `{{key}}` no resultado (debug
   * ou preview que sinaliza pendências ao usuário).
   */
  fallback?: "auto" | FallbackStrategy;
}

export function replacePlaceholders(
  text: string,
  vars: Record<string, string>,
  options: ReplaceOptions = {}
): string {
  if (!text) return text;
  const fallbackMode = options.fallback ?? "auto";
  const resolveFallback = (key: string, rawMatch: string): string => {
    const strategy: FallbackStrategy =
      fallbackMode === "auto" ? getFallbackStrategy(key) : fallbackMode;
    return applyFallback(strategy, rawMatch);
  };

  let result = text;

  // 1. Substituir {{key}} e {{ key }}
  result = result.replace(/\{\{\s*([\w]+)\s*\}\}/g, (_match, key) => {
    if (vars[key] !== undefined && vars[key] !== "") return vars[key];
    return resolveFallback(key, _match);
  });

  // 2. Substituir [LABEL LEGADO]
  result = result.replace(/\[([^\]]+)\]/g, (_match, label) => {
    const normalized = label.trim().toUpperCase();
    const canonicalKey = LEGACY_BRACKET_MAP[normalized];
    if (canonicalKey && vars[canonicalKey] !== undefined && vars[canonicalKey] !== "") {
      return vars[canonicalKey];
    }
    const directKey = label.trim().toLowerCase().replace(/[\s/()]+/g, "_");
    if (vars[directKey] !== undefined && vars[directKey] !== "") {
      return vars[directKey];
    }
    // Sem dado: aplica fallback usando a chave canônica (se houver)
    // ou a chave derivada do próprio label.
    const fallbackKey = canonicalKey || directKey;
    return resolveFallback(fallbackKey, _match);
  });

  // 3. Limpa pontuação órfã deixada por placeholders omitidos
  // (ex.: "João, , portador(a)" → "João, portador(a)"). Aplicado apenas
  // sobre o resultado da substituição, não sobre o template puro.
  result = cleanOrphanPunctuation(result);

  return result;
}

export function extractVariables(text: string): string[] {
  const vars = new Set<string>();
  const curlyMatches = text.matchAll(/\{\{\s*([\w]+)\s*\}\}/g);
  for (const m of curlyMatches) vars.add(m[1]);
  const bracketMatches = text.matchAll(/\[([^\]]+)\]/g);
  for (const m of bracketMatches) {
    const key = LEGACY_BRACKET_MAP[m[1].trim().toUpperCase()];
    if (key) vars.add(key);
  }
  return [...vars];
}

export function getUnresolvedPlaceholders(
  text: string,
  vars: Record<string, string>
): string[] {
  const unresolved: string[] = [];
  const curlyMatches = text.matchAll(/\{\{\s*([\w]+)\s*\}\}/g);
  for (const m of curlyMatches) {
    if (!vars[m[1]] || vars[m[1]].trim() === "") {
      unresolved.push(`{{${m[1]}}}`);
    }
  }
  const bracketMatches = text.matchAll(/\[([^\]]+)\]/g);
  for (const m of bracketMatches) {
    const label = m[1].trim();
    if (/^(art\.?|lei|inc(iso)?|§|par[áa]grafo)\b/i.test(label)) continue;
    if (/^\d+([.,]\d+)?$/.test(label)) continue;
    const key = LEGACY_BRACKET_MAP[label.toUpperCase()];
    if (!key || !vars[key] || vars[key].trim() === "") {
      unresolved.push(`[${label}]`);
    }
  }
  return [...new Set(unresolved)];
}

// ============================================================================
// resolveAmbiguousLabels — heurística do importador .docx (Leva 3 / G.2)
// ============================================================================

/**
 * Label genérico em colchetes detectado no .docx importado, sem qualificação
 * explícita do papel (ex: "[CPF]" em vez de "[CPF DO VENDEDOR]").
 */
export interface AmbiguousLabel {
  /** ex: "[CPF]" */
  raw: string;
  /** Posição da n-ésima ocorrência DESSE label específico no texto (0-indexada). */
  occurrenceIndex: number;
  /** Snippet ~80 chars antes + ~30 depois, para inspeção heurística. */
  context: string;
}

export interface ResolvedLabel extends AmbiguousLabel {
  /** Melhor sugestão (vendedor_cpf, comprador_cpf, etc.) ou string vazia se nada conhecido. */
  suggestedKey: string;
  /** Lista ranqueada de candidatos (até 4). Vazia quando o label é desconhecido. */
  suggestedKeys: string[];
  /** "high" = contexto local explícito · "medium" = ordem com fallback razoável · "low" = pura ordem. */
  confidence: "high" | "medium" | "low";
}

// ROLE_KEYWORDS e ORDER_FALLBACK agora vivem em import-catalog.ts (fonte
// única, Fase 1/E1) e são importados no topo deste arquivo.

/**
 * Mapeia o label genérico (sem qualificação) ao sufixo canônico.
 * Ex: "CPF" → "cpf", "RG" → "rg", "PROFISSÃO" → "profissao".
 * Retorna null se o label não é reconhecido como campo genérico.
 */
function genericLabelToFieldSuffix(rawLabel: string): string | null {
  const upper = rawLabel.replace(/^\[|\]$/g, "").trim().toUpperCase();
  return GENERIC_FIELD_SUFFIXES[upper] ?? null;
}

/**
 * Heurística que sugere a chave canônica para labels genéricos detectados
 * pelo importador .docx.
 *
 * 1. Se o contexto local contém uma palavra-chave de papel (vendedor, comprador,
 *    procurador, etc.), gera `<role>_<suffix>` com confidence "high".
 * 2. Caso contrário, usa ORDER_FALLBACK pela `occurrenceIndex` (low).
 * 3. Sempre retorna até 4 candidatos ranqueados.
 *
 * Labels não reconhecidos como genéricos (ex: "[FOO]") retornam suggestedKeys: [].
 */
export function resolveAmbiguousLabels(
  _text: string,
  ambiguousLabels: AmbiguousLabel[]
): ResolvedLabel[] {
  return ambiguousLabels.map((al) => {
    const suffix = genericLabelToFieldSuffix(al.raw);
    if (!suffix) {
      return {
        ...al,
        suggestedKey: "",
        suggestedKeys: [],
        confidence: "low" as const,
      };
    }

    // 1. Contexto explícito
    const ctx = al.context || "";
    for (const { role, rx } of ROLE_KEYWORDS) {
      if (rx.test(ctx)) {
        const primary = `${role}_${suffix}`;
        // Adiciona até 3 outros candidatos (ordem padrão) para override
        const others = ORDER_FALLBACK
          .filter((r) => r !== role)
          .slice(0, 3)
          .map((r) => `${r}_${suffix}`);
        return {
          ...al,
          suggestedKey: primary,
          suggestedKeys: [primary, ...others],
          confidence: "high" as const,
        };
      }
    }

    // 2. Fallback por ordem de aparição
    const idx = Math.max(0, al.occurrenceIndex);
    const role = ORDER_FALLBACK[Math.min(idx, ORDER_FALLBACK.length - 1)];
    const primary = `${role}_${suffix}`;
    const others = ORDER_FALLBACK
      .filter((r) => r !== role)
      .slice(0, 3)
      .map((r) => `${r}_${suffix}`);
    return {
      ...al,
      suggestedKey: primary,
      suggestedKeys: [primary, ...others],
      confidence: "low" as const,
    };
  });
}

