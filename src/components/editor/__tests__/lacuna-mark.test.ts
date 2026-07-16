/**
 * D1 (2.2b, Bloco D) — round-trip da lacuna no TipTap.
 *
 * REGRA DA SESSÃO: contagem EXATA, nunca toBeGreaterThan. O teste de controle
 * (sem o mark) prova que a dívida era real — StarterKit sozinho derruba o span.
 */
import { describe, it, expect } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { LacunaMark } from "../lacuna-mark";
import { countLacunas } from "@/lib/placeholder-fallback";

const LACUNA = '<span class="lacuna">__________</span>';

/** Conta ocorrências exatas do span canônico da lacuna. */
const countSpans = (html: string): number =>
  (html.match(/<span class="lacuna">/g) || []).length;

function roundTrip(content: string, withMark = true): string {
  const editor = new Editor({
    extensions: withMark ? [StarterKit, LacunaMark] : [StarterKit],
    content,
  });
  const html = editor.getHTML();
  editor.destroy();
  return html;
}

describe("LacunaMark — round-trip parse/serialize do TipTap", () => {
  it("1 lacuna sobrevive intacta (classe + underscores)", () => {
    const html = roundTrip(`<p>RG ${LACUNA}, inscrito no CPF.</p>`);
    expect(html).toContain(LACUNA);
    expect(countSpans(html)).toBe(1);
    expect(countLacunas(html)).toBe(1);
  });

  it("3 lacunas na mesma qualificação: contagem exata preservada", () => {
    const html = roundTrip(
      `<p>RG ${LACUNA} - ${LACUNA}, CPF ${LACUNA}, domiciliado.</p>`
    );
    expect(countSpans(html)).toBe(3);
    expect(countLacunas(html)).toBe(3);
  });

  it("CONTROLE — sem o mark, o StarterKit derruba o span (a dívida era real)", () => {
    const html = roundTrip(`<p>RG ${LACUNA}, fim.</p>`, false);
    // O texto sobrevive, mas órfão de classe: invisível para countLacunas e
    // para o realce. É exatamente o que acontecia ao editar contrato salvo.
    expect(countSpans(html)).toBe(0);
    expect(countLacunas(html)).toBe(0);
    expect(html).toContain("__________");
  });

  it("span PREENCHIDO no editor: classe sobrevive e countLacunas para de contar", () => {
    // Semântica do confirm de impressão: o corretor digitou dentro da lacuna →
    // campo cheio. O span continua lá (realce removível depois), mas não conta.
    const html = roundTrip('<p>Nome: <span class="lacuna">João Silva</span>.</p>');
    expect(html).toContain('<span class="lacuna">João Silva</span>');
    expect(countSpans(html)).toBe(1);
    expect(countLacunas(html)).toBe(0);
  });

  it("digitação DENTRO da lacuna mantém o mark (mark inclusivo)", () => {
    const editor = new Editor({
      extensions: [StarterKit, LacunaMark],
      content: `<p>RG ${LACUNA}.</p>`,
    });
    // Posição 5 = dentro de "__________" (doc: <p> abre em 0, "RG " = 1..3).
    editor.commands.insertContentAt(5, "X");
    const html = editor.getHTML();
    editor.destroy();
    // O conteúdo digitado entra DENTRO do span (herda o mark) — 1 span exato,
    // que deixa de ser só-underscores e some da contagem de pendências.
    expect(countSpans(html)).toBe(1);
    expect(html).toMatch(/<span class="lacuna">_+X_+<\/span>/);
    expect(countLacunas(html)).toBe(0);
  });
});
