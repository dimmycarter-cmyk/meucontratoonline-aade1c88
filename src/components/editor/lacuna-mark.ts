/**
 * LacunaMark (2.2b, Bloco D / D1) — preserva `<span class="lacuna">` no
 * round-trip do TipTap.
 *
 * Dívida aberta desde a 2.2a: o save pós-2.1 grava a saída do renderContract
 * direto, sem passar pelo editor — mas ao EDITAR um contrato salvo
 * (ContratoDetalhe / WizardStepEditor), o TipTap reparseia o HTML e o
 * StarterKit derruba spans desconhecidos: a lacuna virava texto solto
 * (`__________` sem classe), invisível para `countLacunas` e para o realce.
 *
 * Este mark só faz parse/serialize — não é formatação que o usuário liga ou
 * desliga, então não expõe comandos nem input rules. Digitar DENTRO da lacuna
 * mantém o mark (comportamento default de mark inclusivo): o span passa a
 * conter texto e `countLacunas` para de contá-lo — exatamente a semântica de
 * "campo preenchido pelo corretor no editor".
 *
 * A classe vem de LACUNA_CLASS (placeholder-fallback.ts) — fonte única; não
 * redigitar "lacuna" aqui.
 */
import { Mark, mergeAttributes } from "@tiptap/core";
import { LACUNA_CLASS } from "@/lib/placeholder-fallback";

export const LacunaMark = Mark.create({
  name: "lacuna",

  parseHTML() {
    return [{ tag: `span.${LACUNA_CLASS}` }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: LACUNA_CLASS }), 0];
  },
});
