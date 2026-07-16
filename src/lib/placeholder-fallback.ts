/**
 * ⭐ ARQUIVO ÚNICO DE CONFIGURAÇÃO de fallback de placeholders.
 *
 * REGRA DE OURO (2.2b, Commit 2 — decisão de produto): nenhum campo pode
 * sumir do documento sem estar numa lista explícita e justificada. Se não dá
 * para justificar por que o campo pode sumir, ele é LACUNA.
 *
 * O default é `blank_line` e o `omit` é exceção fechada. Motivo: enumerar o
 * que o mundo escreve num template é infinito; enumerar o que o próprio
 * sistema deriva é finito. Fail-loud é requisito jurídico do produto — campo
 * apagado em silêncio é defeito invisível num contrato assinado.
 *
 * Este desenho INVERTE a 2.2a (default `omit` + tabela A2 de essenciais): a
 * A2 estava calibrada para a fixture, não para o mundo — todo campo novo
 * nascia "omissível" até alguém lembrar de listá-lo. Agora nasce lacuna.
 *
 * PRECEDÊNCIA (estrutural, não convencional — a posição DENTRO de cada
 * bucket é irrelevante; só o bucket decide):
 *
 *   1. PLACEHOLDER_FALLBACK_STRATEGY  → chave exata
 *   2. SYSTEM_DERIVED_FIELDS          → todas resolvem para `omit`
 *   3. DEFAULT_STRATEGY               → `blank_line`
 *
 * Este desenho substitui o array único de pares [RegExp, Strategy] em que a
 * ORDEM decidia o resultado: reordenar a lista invertia uma regra sem quebrar
 * teste algum — dívida silenciosa. Aqui, reordenar dentro de um bucket é
 * semanticamente nulo.
 *
 * ESTRATÉGIAS DISPONÍVEIS:
 *
 * - `blank_line` (DEFAULT) → linha de underscores (`__________`) para campo
 *   que deve permanecer VISÍVEL no contrato e pode ser completado à mão na
 *   assinatura presencial. Ausência precisa ser vista, não disfarçada.
 *
 * - `omit` → string vazia, APENAS para campo que o sistema deriva/injeta e
 *   que, ausente, não é pedido ao usuário (SYSTEM_DERIVED_FIELDS) — ou
 *   override por chave exata com justificativa escrita.
 *   ⚠ Template que queira OCULTAR um campo opcional (data de nascimento,
 *   e-mail) deve envelopar o trecho em `{{#if x}}…{{/if}}` — decisão do
 *   autor do template, não default silencioso do motor.
 *
 * - `keep_literal` → mantém o `{{key}}` literal. Apenas preview/debug.
 */

import { AGREEMENT_TOKEN_SUFFIXES } from "./agreement";

export type FallbackStrategy = "blank_line" | "omit" | "keep_literal";

/**
 * Formato de emissão do `blank_line`.
 *
 * - `"text"` (default) → `__________` cru. Preserva o contrato de todo
 *   chamador anterior à 2.2a e serve contextos não-HTML.
 * - `"html"` → `<span class="lacuna">__________</span>`, para que a lacuna
 *   possa ser realçada em tela (CSS da 2.2b) e contada por `countLacunas`.
 *   Opt-in: `renderContract` liga; o engine cru não.
 */
export type BlankLineFormat = "text" | "html";

/** Comprimento do "blank_line" — caracteres `_` consecutivos. */
const BLANK_LINE = "__________";

/** Classe do span emitido por `blank_line` no formato `"html"`. */
export const LACUNA_CLASS = "lacuna";

/**
 * (1) Overrides por chave EXATA. Consultados antes de tudo.
 *
 * VAZIO desde a 2.2b (Commit 2): os 7 overrides de imóvel da Sprint 2
 * (ajuste-12 / BUG 7 — áreas, vagas, cartório, inscrição municipal, índice
 * cadastral) foram formalmente REVERTIDOS: são campos pedidos ao usuário;
 * ausentes, são lacuna como todo o resto.
 *
 * Quando usar: chave exata que NÃO é system-derived mas precisa sumir do
 * documento — deve ser quase nunca. Cada entrada exige justificativa no
 * comentário da própria linha respondendo "por que este campo PODE sumir de
 * um contrato sem que ninguém veja?".
 *
 * O bucket vazio permanece pela precedência estrutural: removê-lo convidaria
 * a próxima pessoa a reinventar o array ordenado que este desenho aposentou.
 */
export const PLACEHOLDER_FALLBACK_STRATEGY: Record<string, FallbackStrategy> = {};

/**
 * (2) Exceção FECHADA ao default — campos que o SISTEMA deriva/injeta.
 *
 * CRITÉRIO DE ADMISSÃO: omit é permitido APENAS para campo que o sistema
 * deriva/injeta e que, ausente, não é pedido ao usuário. Todo o resto é
 * lacuna. Adicionar entrada aqui exige justificativa no próprio comentário
 * da linha.
 *
 * DERIVADO de AGREEMENT_TOKEN_SUFFIXES (fonte única do Commit 1.5, NÃO
 * redigitar sufixos à mão — a doença E1 dos dicionários paralelos): os
 * tokens N2 (`<papel>_titulo`, `<papel>_artigo`, `<papel>_denominado`) são
 * emitidos por `buildAgreementVarsL2` para TODOS os papéis do catálogo;
 * papel sem participantes emite string vazia, que não é dado faltante do
 * usuário — é andaime do próprio motor e deve sumir, nunca virar lacuna.
 * Sufixo novo na constante entra aqui (e no tipo, e na emissão)
 * automaticamente.
 *
 * Colateral deliberado do padrão por sufixo: `clausula_titulo` /
 * `secao_titulo` (andaime de template, nunca frase visível) também casam
 * `_titulo$` e seguem omit. O padrão exige o underscore — `titulo` BARE não
 * é system-derived e cai no default (lacuna, fail-loud).
 */
export const SYSTEM_DERIVED_FIELDS: ReadonlyArray<RegExp> =
  AGREEMENT_TOKEN_SUFFIXES.map((suffix) => new RegExp(`_${suffix}$`, "i"));

/**
 * (3) Estratégia global quando nenhum bucket acima se aplica — INVERTIDA na
 * 2.2b (Commit 2): campo vazio deixa lacuna visível por default.
 */
const DEFAULT_STRATEGY: FallbackStrategy = "blank_line";

export function getFallbackStrategy(key: string): FallbackStrategy {
  if (key in PLACEHOLDER_FALLBACK_STRATEGY) {
    return PLACEHOLDER_FALLBACK_STRATEGY[key];
  }
  if (SYSTEM_DERIVED_FIELDS.some((re) => re.test(key))) return "omit";
  return DEFAULT_STRATEGY;
}

/** Texto produzido por cada estratégia, dado o match original. */
export function applyFallback(
  strategy: FallbackStrategy,
  rawMatch: string,
  format: BlankLineFormat = "text"
): string {
  switch (strategy) {
    case "blank_line":
      return format === "html"
        ? `<span class="${LACUNA_CLASS}">${BLANK_LINE}</span>`
        : BLANK_LINE;
    case "omit":
      return "";
    case "keep_literal":
      return rawMatch;
  }
}

/**
 * Conta lacunas AINDA VAZIAS num HTML renderizado.
 *
 * Conta apenas spans `.lacuna` cujo conteúdo seja EXCLUSIVAMENTE underscores.
 * Span com texto digitado dentro é campo PREENCHIDO (o corretor completou a
 * lacuna no editor) e não conta — senão o confirm de impressão (2.2b) acusaria
 * pendência num campo cheio.
 *
 * Tolerante ao round-trip do editor: casa a classe dentro de um `class` com
 * outras classes e em qualquer posição da lista de atributos.
 */
export function countLacunas(html: string): number {
  if (!html) return 0;
  const re = new RegExp(
    `<span\\b[^>]*\\bclass\\s*=\\s*["'][^"']*\\b${LACUNA_CLASS}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/span>`,
    "gi"
  );
  let n = 0;
  for (const m of html.matchAll(re)) {
    if (/^_+$/.test(m[1].trim())) n += 1;
  }
  return n;
}
