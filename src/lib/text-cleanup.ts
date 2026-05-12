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
