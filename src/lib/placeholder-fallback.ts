/**
 * ⭐ ARQUIVO ÚNICO DE CONFIGURAÇÃO de fallback de placeholders.
 *
 * Para adicionar um novo campo ao produto (telefone, OAB, naturalidade,
 * e-mail secundário, …), basta editar ESTE arquivo. Campo novo cujo sufixo
 * já casa um padrão existente (`fiador_cpf`, `anuente3_endereco`) não exige
 * tocar em arquivo nenhum — os padrões são por sufixo, não listas literais.
 *
 * PRECEDÊNCIA (estrutural, não convencional — a posição DENTRO de cada
 * bucket é irrelevante; só o bucket decide):
 *
 *   1. PLACEHOLDER_FALLBACK_STRATEGY  → chave exata
 *   2. OMIT_EXCEPTIONS                → todas resolvem para `omit`
 *   3. BLANK_LINE_PATTERNS            → todas resolvem para `blank_line`
 *   4. DEFAULT_STRATEGY               → `omit`
 *
 * Este desenho substitui o array único de pares [RegExp, Strategy] em que a
 * ORDEM decidia o resultado: reordenar a lista invertia uma regra sem quebrar
 * teste algum — dívida silenciosa. Aqui, reordenar dentro de um bucket é
 * semanticamente nulo.
 *
 * ESTRATÉGIAS DISPONÍVEIS:
 *
 * - `blank_line` → linha de underscores (`__________`) para campos que devem
 *   permanecer VISÍVEIS no contrato e podem ser completados à mão na
 *   assinatura presencial. Use quando o campo é preenchido a mão pela
 *   imobiliária e a ausência precisa ser vista, não disfarçada: identidade e
 *   qualificação das partes (nome, CPF, CNPJ, RG, órgão expedidor, endereço),
 *   matrícula, valores e datas.
 *
 * - `omit` → string vazia, para campos deixados em branco intencionalmente e
 *   que não precisam aparecer. Use quando o campo é descartável e sem peso
 *   jurídico — data de nascimento, e-mail secundário, naturalidade — ou
 *   quando é ANDAIME INTERNO (título derivado, alias).
 *   ⚠ Quando o `omit` deixar pontuação órfã (ex.: "nascido em ,"), o
 *   **template** deve envelopar o trecho em `{{#if x}}…{{/if}}` — o engine
 *   já trata via `stripConditionalBlocks`.
 *
 * - `keep_literal` → mantém o `{{key}}` literal. Apenas preview/debug.
 */

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
 * (1) Overrides por chave EXATA. Consultados antes de tudo. Use quando uma
 * chave específica destoa do padrão do seu sufixo.
 */
export const PLACEHOLDER_FALLBACK_STRATEGY: Record<string, FallbackStrategy> = {
  // Campos opcionais do imóvel — ausentes, o contrato deve fluir sem
  // placeholders literais nem vírgulas órfãs. Declarados explicitamente
  // (mesmo coincidindo com o DEFAULT_STRATEGY "omit") para servir como
  // contrato verificável: alterar o default global não muda silenciosamente
  // o comportamento desses campos. Decisão Sprint 2 (ajuste-12 / BUG 7).
  //
  // `imovel_matricula` NÃO está aqui desde a 2.2a: migrou para blank_line via
  // o padrão (^|_)matricula$ — matrícula é dado essencial, sua ausência tem
  // de ser vista.
  imovel_area_privativa: "omit",
  imovel_area_total: "omit",
  imovel_area_acessoria: "omit",
  imovel_vagas: "omit",
  imovel_cartorio: "omit",
  imovel_inscricao_municipal: "omit",
  imovel_indice_cadastral: "omit",
};

/**
 * (2) Exceções NOMEADAS ao blank_line. Vencem BLANK_LINE_PATTERNS mesmo
 * quando ambos casam — é o caso de `vendedor_data_nascimento`, que casa
 * `^data_` mas não é dado que se assine à mão.
 *
 * Ordem interna irrelevante: todas resolvem para `omit`.
 */
const OMIT_EXCEPTIONS: RegExp[] = [
  // Datas de nascimento (qualquer prefixo). Opcional, sem peso jurídico.
  /(^|_)(data_nascimento|nascimento)$/i,
  // Títulos derivados — andaime interno, nunca frase visível ao cliente.
  /_titulo$/i,
];

/**
 * (3) Campos ESSENCIAIS — a tabela A2. Ausentes, deixam lacuna visível.
 * Ordem interna irrelevante: todas resolvem para `blank_line`.
 *
 * Os padrões usam `(^|_)` para casar tanto a chave PLANA e indexada do passe
 * externo (`vendedor_cpf`, `comprador3_cpf`) quanto a chave BARE dos itens de
 * {{#each}} (`cpf`) — mesma tabela nos dois passes, sem lista paralela.
 */
const BLANK_LINE_PATTERNS: RegExp[] = [
  // Identidade e qualificação das partes + localização do imóvel.
  /(^|_)(nome|cpf|cnpj|rg|orgao_expedidor|matricula|endereco|logradouro)$/i,
  // Valores monetários, inclusive os *_extenso derivados (ver nota abaixo).
  /^valor_/i,
  // Datas (data_contrato, data_contrato_extenso, …). data_nascimento é
  // exceção nomeada acima.
  /^data_/i,
];

// NOTA — derivados de enrichment e a aparente contradição da A2 (decisão 2.2a):
// "derivado → omit" vale para ANDAIME INTERNO (título, alias), não para
// derivado que compõe FRASE VISÍVEL ao cliente. `valor_total_extenso` e
// `data_contrato_extenso` seguem o padrão do campo-pai (blank_line) porque:
//   - com omit, o cenário "numérico preenchido + extenso não derivado" produz
//     "R$ 350.000,00 ()" — parêntese órfão, defeito NOVO;
//   - com blank_line, os dois cenários sinalizam corretamente:
//     "R$ __________ (__________)" e "Belo Horizonte, __________" (linha de
//     data assinada à mão — padrão de mercado).

/** (4) Estratégia global quando nenhum bucket acima se aplica. */
const DEFAULT_STRATEGY: FallbackStrategy = "omit";

export function getFallbackStrategy(key: string): FallbackStrategy {
  if (key in PLACEHOLDER_FALLBACK_STRATEGY) {
    return PLACEHOLDER_FALLBACK_STRATEGY[key];
  }
  if (OMIT_EXCEPTIONS.some((re) => re.test(key))) return "omit";
  if (BLANK_LINE_PATTERNS.some((re) => re.test(key))) return "blank_line";
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
