/**
 * ⭐ ARQUIVO ÚNICO DE CONFIGURAÇÃO de fallback de placeholders.
 *
 * Para adicionar um novo campo opcional ao produto (telefone, OAB,
 * naturalidade, e-mail secundário, …), basta editar ESTE arquivo:
 *  1. Adicionar override exato em `PLACEHOLDER_FALLBACK_STRATEGY`, OU
 *  2. Adicionar / ajustar padrão em `FALLBACK_PATTERNS` (preferível
 *     quando a regra vale para todos os slots indexados — ex.:
 *     `vendedor_oab`, `vendedor2_oab`, `comprador_oab`, etc.).
 *
 * Nada mais precisa mudar — `replacePlaceholders` consulta esta config
 * automaticamente via `getFallbackStrategy(key)`.
 *
 * ESTRATÉGIAS DISPONÍVEIS:
 *
 * - `blank_line` → substitui por uma linha de underscores (`__________`),
 *   para campos que devem permanecer visualmente no contrato e podem
 *   ser completados à mão na assinatura presencial.
 *   Use quando: o campo é esperado em contratos formais e a ausência
 *   deve ser visível (não disfarçada) — RG, órgão expedidor, OAB de
 *   advogados, CRECI de corretores, etc.
 *
 * - `omit` → substitui por string vazia, para campos que o usuário deixou
 *   em branco intencionalmente e não precisam aparecer no documento.
 *   Use quando: o campo é descartável e não tem peso jurídico — data de
 *   nascimento, e-mail secundário, naturalidade, etc.
 *   ⚠ Quando o `omit` puro deixar pontuação órfã (ex.: "nascido em ,"),
 *   o **template** deve envelopar o trecho em `{{#if x}}…{{/if}}` — o
 *   engine já trata via `stripConditionalBlocks`.
 *
 * - `keep_literal` → mantém o `{{key}}` literal no resultado.
 *   Use apenas em preview/debug. Não é o default.
 */

export type FallbackStrategy = "blank_line" | "omit" | "keep_literal";

/** Comprimento do "blank_line" — caracteres `_` consecutivos. */
const BLANK_LINE = "__________";

/**
 * Overrides exatos por placeholder. Consultados ANTES da detecção por
 * sufixo. Use quando uma chave específica precisar de tratamento que
 * destoa do padrão do seu sufixo.
 */
export const PLACEHOLDER_FALLBACK_STRATEGY: Record<string, FallbackStrategy> = {
  // (vazio por enquanto — os casos atuais são bem cobertos pelos
  //  padrões de sufixo abaixo.)
};

/**
 * Padrões aplicados se o placeholder não estiver listado em
 * `PLACEHOLDER_FALLBACK_STRATEGY`. Avaliados em ordem; o primeiro match
 * vence.
 */
const FALLBACK_PATTERNS: Array<[RegExp, FallbackStrategy]> = [
  // Documentos de identidade e órgão expedidor (qualquer prefixo:
  // vendedor_rg, vendedor2_rg, comprador_rg, conjuge_rg, anuente_rg…)
  // Decisão UX (Sprint 2, ajuste-12): RG/órgão expedidor ausentes são
  // omitidos em vez de exibir "__________" — a linha em branco parecia
  // campo a preencher manualmente e atrapalhava a leitura do contrato.
  [/(^|_)(rg|orgao_expedidor)$/i, "omit"],

  // Datas de nascimento (qualquer prefixo)
  [/(^|_)(data_nascimento|nascimento)$/i, "omit"],
];

/** Estratégia global quando nenhum override nem padrão se aplica. */
const DEFAULT_STRATEGY: FallbackStrategy = "omit";

export function getFallbackStrategy(key: string): FallbackStrategy {
  if (key in PLACEHOLDER_FALLBACK_STRATEGY) {
    return PLACEHOLDER_FALLBACK_STRATEGY[key];
  }
  for (const [pattern, strategy] of FALLBACK_PATTERNS) {
    if (pattern.test(key)) return strategy;
  }
  return DEFAULT_STRATEGY;
}

/** Texto produzido por cada estratégia, dado o match original. */
export function applyFallback(strategy: FallbackStrategy, rawMatch: string): string {
  switch (strategy) {
    case "blank_line":
      return BLANK_LINE;
    case "omit":
      return "";
    case "keep_literal":
      return rawMatch;
  }
}
