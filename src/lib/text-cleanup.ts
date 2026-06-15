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
 * quando os campos RG/órgão, CPF ou e-mail do participante renderizam vazios
 * no bloco de qualificação.
 *
 * Diferente de `cleanOrphanPunctuation` (que só tira pontuação solta), aqui
 * derrubamos a sub-cláusula completa — senão sobra "inscrito no CPF sob o nº ,"
 * (rótulo pendurado), que limpeza de vírgula sozinha não resolve.
 *
 * ÂNCORA EM `<strong>…</strong>` VAZIO: campo omitido vira `<strong></strong>`;
 * campo preenchido tem conteúdo dentro do `<strong>` e NUNCA casa. Assim a
 * pontuação e os hífens legítimos (ex.: o "-" de um CPF formatado
 * `887.616.656-49` e a vírgula que o segue) são SEMPRE preservados.
 *
 * Chamada por-item em `renderEachItem` (placeholder.ts), onde os campos do
 * participante e os tokens de concordância (`c_portador`/`c_inscrito`) já
 * estão resolvidos para texto. Função pura e idempotente; normaliza o próprio
 * whitespace (não depende da ordem com `cleanOrphanPunctuation`).
 *
 * ESCOPO: RG/órgão, CPF, e-mail (R1-R3) e o tail "domiciliado em" do endereço
 * COMPOSTO vazio (R4). A variante granular de endereço NÃO é tratada aqui — é
 * migrada para a composta (`{{endereco}}`, montada por `composeEnderecoCanonico`
 * omitindo segmentos vazios); R4 fecha o resíduo todo-vazio que a composta deixa.
 *
 * Regra de assimetria do RG (decisão de negócio): RG (número) vazio suprime a
 * cláusula INTEIRA mesmo com órgão preenchido — apresentar o órgão expedidor
 * como se fosse o número seria erro semântico. Já órgão vazio com RG presente
 * apenas remove o hífen pendurado, mantendo o número.
 */
export function suppressEmptyFieldScaffold(text: string): string {
  if (!text) return text;

  // Campo omitido (entre as tags, só whitespace) e campo com conteúdo.
  const EMPTY = "<strong[^>]*>\\s*<\\/strong>";
  const ANY = "<strong[^>]*>[^<]*?<\\/strong>"; // vazio OU preenchido
  const FILLED = "<strong[^>]*>[^<]*?\\S[^<]*?<\\/strong>"; // exige conteúdo

  let out = text;

  // R1a' — RG (1º <strong>) VAZIO ⇒ suprime "portador da Carteira … nº <rg> - <órgão>,"
  // independentemente do órgão (2º <strong> com conteúdo qualquer). Assimetria.
  out = out.replace(
    new RegExp(
      `\\b(?:portadora?) da Carteira de Identidade nº ${EMPTY}\\s*-\\s*${ANY}\\s*,`,
      "gi"
    ),
    ""
  );

  // R1b — RG preenchido + órgão VAZIO ⇒ remove só o hífen pendurado + <strong> vazio.
  out = out.replace(
    new RegExp(`(Carteira de Identidade nº ${FILLED})\\s*-\\s*${EMPTY}`, "gi"),
    "$1"
  );

  // R2 — CPF VAZIO ⇒ suprime "inscrito no CPF sob o nº <cpf>,".
  // `inscrit[oa]` cobre masculino (inscrito) E feminino (inscrita) — NÃO use
  // `inscrita?`, que casaria "inscrit" e deixaria o "o" de "inscrito" pendurado.
  out = out.replace(
    new RegExp(`\\b(?:inscrit[oa]) no CPF sob o nº ${EMPTY}\\s*,`, "gi"),
    ""
  );

  // R3 — e-mail VAZIO ⇒ suprime "endereço eletrônico: <email>,".
  out = out.replace(
    new RegExp(`endere[çc]o eletr[ôo]nico:\\s*${EMPTY}\\s*,`, "gi"),
    ""
  );

  // R4 — endereço COMPOSTO vazio ⇒ suprime ", domiciliado em" no FIM do item.
  // Na variante composta ({{c_domiciliado}} em {{endereco}}), endereco="" deixa
  // "…, domiciliado em " pendurado no fim do item (endereco é o ULTIMO elemento).
  // Ancora em fim-de-string ($): item preenchido tem texto apos "em" (ex.: "em
  // Rua X, nº 10…" cheio, "em Rua X, s/n…" parcial) → \s*$ falha → nao casa.
  // composeEnderecoCanonico ja monta parcial juntando so segmentos nao-vazios;
  // R4 so pega o todo-vazio. Remove a virgula lider junto.
  out = out.replace(/,\s*domiciliad[oa] em\s*$/i, "");

  // Normaliza o gap (espaço duplo) que a supressão deixa. Self-contained: não
  // dependemos do cleanOrphanPunctuation downstream para a correção da função.
  out = out.replace(/[ \t]{2,}/g, " ");

  return out;
}
