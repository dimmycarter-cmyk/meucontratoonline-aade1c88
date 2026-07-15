/**
 * Limpeza de pontuação órfã e espaços redundantes em HTML/texto
 * pós-substituição de placeholders.
 *
 * Motivação: quando um placeholder com estratégia `omit` é substituído
 * por string vazia (ex.: `{{vendedor_profissao}}` ausente), templates
 * como `{{vendedor_nome}}, {{vendedor_profissao}}, portador(a)…`
 * passam a produzir `João, , portador(a)…` — com vírgula órfã.
 *
 * Estratégia: pós-processamento conservador via regex, aplicado APENAS
 * sobre o texto já substituído. Não toca em template puro. Loop com teto
 * defensivo (caso patológico que não estabilize).
 *
 * Função pura — sem side effects.
 */

const MAX_ITERATIONS = 10;

/**
 * Remove vírgulas órfãs, espaços antes de pontuação e espaços múltiplos.
 *
 *  - `", , , ,"` → `","`
 *  - `", ."` → `"."` (idem para `;`, `:`, `!`, `?`)
 *  - `"(  ,"` → `"("`
 *  - `",  )"` → `")"`
 *  - múltiplos espaços → único espaço
 *  - vírgula no início de bloco/parágrafo → removida
 *
 * Idempotente: aplicar 2x produz o mesmo resultado.
 */
export function cleanOrphanPunctuation(text: string): string {
  if (!text) return text;

  let prev: string;
  let curr = text;
  let iterations = 0;

  do {
    prev = curr;
    curr = curr
      // Vírgulas múltiplas (vírgula seguida de uma ou mais vírgulas)
      .replace(/,(\s*,)+/g, ",")
      // Vírgula seguida de outro sinal de pontuação encerrador
      .replace(/,\s*([.;:!?])/g, "$1")
      // Vírgula imediatamente após abertura de parêntese/colchete
      .replace(/([(\[])\s*,\s*/g, "$1")
      // Vírgula imediatamente antes de fechamento de parêntese/colchete
      .replace(/\s*,\s*([)\]])/g, "$1")
      // Vírgula encostada no início de uma tag de fechamento HTML (ex.: "X, </p>")
      // se for vírgula órfã antes do </tag>, remove a vírgula
      .replace(/,\s*(<\/[a-z][^>]*>)/gi, "$1")
      // Vírgula logo após uma tag de abertura HTML (ex.: "<p>, X" → "<p>X")
      .replace(/(<[a-z][^>]*>)\s*,\s*/gi, "$1")
      // ⭐ Regra α-conservadora (Sprint 2, ajuste-12): vírgula órfã
      // imediatamente após preposição PT-BR + espaços + algo não-whitespace
      // (ex.: "de , no banco" → "de no banco", "em , à esquerda" → "em à
      // esquerda"). Cobre BUG 4 e BUG 7 em casos pós-preposição (campos
      // vazios via fallback omit em frases tipo "área privativa de
      // {{...}}, área total de...").
      // Decisão UX: "no false positives wins over coverage" — vírgulas em
      // contratos têm peso jurídico, listas legítimas em PT-BR ("João,
      // brasileiro, casado") NÃO têm espaço antes da vírgula e são
      // preservadas. Casos pós-substantivo ("agência ,", "nº ,") ficam
      // para Sprints futuras com regex específicas adicionais.
      .replace(
        /\b(de|da|do|dos|das|em|no|na|nos|nas|sob|com|para|por|a|ao|à|às|aos)[ \t]+,[ \t]+(?=\S)/gi,
        "$1 "
      )
      // Espaços/tabs múltiplos (não toca em \n)
      .replace(/[ \t]{2,}/g, " ");

    iterations += 1;
  } while (curr !== prev && iterations < MAX_ITERATIONS);

  if (iterations >= MAX_ITERATIONS && curr !== prev) {
    // eslint-disable-next-line no-console
    console.warn(
      "[text-cleanup] cleanOrphanPunctuation atingiu o teto de " +
        MAX_ITERATIONS +
        " iterações sem estabilizar. Input pode conter padrão patológico."
    );
  }

  return curr;
}

// ============================================================================
// suppressEmptyFieldScaffold — supressão de sub-cláusula de qualificação vazia
// ============================================================================

/**
 * Remove o SCAFFOLD inteiro (rótulo + separadores + vírgula final) deixado
 * quando um campo com estratégia `omit` renderiza vazio no bloco de
 * qualificação — e o e-mail é o único ocupante HOJE.
 *
 * ⚠ O nome é deliberadamente genérico: a função limpa scaffold de campos com
 * estratégia `omit`, não "scaffold de e-mail". Um nome e-mail-específico
 * congelaria o dado de 2026-07 dentro do identificador — foi assim que
 * nasceram os 3 dicionários dessincronizados que a Fase 1 teve de consolidar.
 * Campo novo que entre em `omit` e ganhe rótulo no template é regra nova aqui,
 * sem renomear nada.
 *
 * R1a/R1b/R2/R4 APOSENTADAS na 2.2a — RG/órgão/CPF/endereço migraram para
 * `blank_line`. Elas ancoravam em `<strong>` VAZIO; com a lacuna
 * (`<strong><span class="lacuna">__________</span></strong>`) o `\s*` da
 * âncora não casa `<span`, e as regras se tornaram inalcançáveis por
 * construção — não "raramente acionadas", impossíveis. Removidas junto com os
 * testes que as cobriam: regra morta com teste vivo é pior que a dívida
 * original (14/14 verde sobre caminho que produção não alcança).
 *
 * Diferente de `cleanOrphanPunctuation` (que só tira pontuação solta), aqui
 * derrubamos a sub-cláusula completa — senão sobra "endereço eletrônico: ,"
 * (rótulo pendurado), que limpeza de vírgula sozinha não resolve.
 *
 * ÂNCORA EM `<strong>…</strong>` VAZIO: campo omitido vira `<strong></strong>`;
 * campo preenchido tem conteúdo dentro do `<strong>` e NUNCA casa — a
 * pontuação legítima é SEMPRE preservada.
 *
 * Chamada por-item em `renderEachItem` (placeholder.ts), onde os campos do
 * participante e os tokens de concordância (`c_portador`/`c_inscrito`) já
 * estão resolvidos para texto. Função pura e idempotente; normaliza o próprio
 * whitespace (não depende da ordem com `cleanOrphanPunctuation`).
 */
export function suppressEmptyFieldScaffold(text: string): string {
  if (!text) return text;

  // Campo com estratégia `omit` (entre as tags, só whitespace).
  const EMPTY = "<strong[^>]*>\\s*<\\/strong>";

  let out = text;

  // R3 — e-mail VAZIO ⇒ suprime "endereço eletrônico: <email>,".
  out = out.replace(
    new RegExp(`endere[çc]o eletr[ôo]nico:\\s*${EMPTY}\\s*,`, "gi"),
    ""
  );

  // Normaliza o gap (espaço duplo) que a supressão deixa. Self-contained: não
  // dependemos do cleanOrphanPunctuation downstream para a correção da função.
  out = out.replace(/[ \t]{2,}/g, " ");

  return out;
}
