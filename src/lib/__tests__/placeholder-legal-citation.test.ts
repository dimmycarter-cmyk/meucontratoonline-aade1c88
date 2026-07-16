/**
 * Filtro de citação legal do pipeline de render.
 *
 * Histórico: fix 1.2 (item 7) — "§" não é word char, o \b do grupo nunca casa
 * após ele; "[§ 2º]" aparecia como pendência.
 *
 * 2.2b (Bloco B): o filtro vira FONTE ÚNICA (`isLegalReference`), consumida
 * por `getUnresolvedPlaceholders` E pelo passo 2 de `replacePlaceholders` —
 * antes, a citação em colchetes era APAGADA do documento em silêncio pelo
 * fallback default `omit`; agora permanece CRUA. Detector e motor nunca
 * divergem sobre o mesmo label.
 */
import { describe, it, expect } from "vitest";
import {
  getUnresolvedPlaceholders,
  isLegalReference,
  replacePlaceholders,
} from "../placeholder";
import { countLacunas } from "../placeholder-fallback";

describe("getUnresolvedPlaceholders — filtro de citação legal", () => {
  it("[§ 2º] é citação legal, não pendência (bug do \\b após §)", () => {
    expect(getUnresolvedPlaceholders("conforme [§ 2º] da lei", {})).toEqual([]);
  });

  it("demais citações seguem filtradas: art., lei, inciso, parágrafo, numerais, nº", () => {
    const text = "[art. 5] [Lei 8.245] [inciso II] [parágrafo único] [123] [1.5]";
    expect(getUnresolvedPlaceholders(text, {})).toEqual([]);
  });

  it("placeholder real sem dado continua reportado como pendência", () => {
    expect(getUnresolvedPlaceholders("[FORO] e [§ 2º]", {})).toEqual(["[FORO]"]);
  });

  it("placeholder real com dado preenchido não é pendência", () => {
    expect(getUnresolvedPlaceholders("[FORO]", { foro: "Comarca de BH" })).toEqual([]);
  });
});

describe("isLegalReference — fonte única do filtro (2.2b, B1)", () => {
  it("reconhece citações legais, numerais e nº+dígitos", () => {
    expect(isLegalReference("Lei 8.245")).toBe(true);
    expect(isLegalReference("art. 5º")).toBe(true);
    expect(isLegalReference("§ 2º")).toBe(true);
    expect(isLegalReference("inciso II")).toBe(true);
    expect(isLegalReference("parágrafo único")).toBe(true);
    expect(isLegalReference("123")).toBe(true);
    expect(isLegalReference("1.5")).toBe(true);
    expect(isLegalReference("nº 123")).toBe(true);
    expect(isLegalReference("no 123")).toBe(true);
  });

  it("NÃO casa labels de campo reais (âncora $ no nº protege palavras após)", () => {
    expect(isLegalReference("FORO")).toBe(false);
    expect(isLegalReference("NOME COMPLETO DO(A) COMPRADOR(A)")).toBe(false);
    expect(isLegalReference("Nº DA MATRÍCULA")).toBe(false);
  });
});

describe("replacePlaceholders — citação legal permanece CRUA (2.2b, B2)", () => {
  it("não consome citação pelo fallback (antes: omit apagava em silêncio)", () => {
    const tpl =
      "nos termos da [Lei 8.245], [art. 5º] e [§ 2º], itens [123] e [nº 123]";
    expect(replacePlaceholders(tpl, {})).toBe(tpl);
  });

  it("B4: citação crua E lacuna convivem na mesma frase — contagem exata", () => {
    const tpl =
      "<p>Nos termos da [Lei 8.245], o vendedor, CPF {{vendedor_cpf}}, assina.</p>";
    const html = replacePlaceholders(tpl, {}, { blankLineFormat: "html" });
    expect(html).toContain("[Lei 8.245]");
    expect(html).toContain('<span class="lacuna">');
    expect(countLacunas(html)).toBe(1);
  });

  it("fonte única: [nº 123] fica CRU no HTML e NÃO é pendência — os dois lados concordam", () => {
    const tpl =
      "<p>conforme instrumento [nº 123], o comprador, CPF {{comprador_cpf}}, assina.</p>";
    const html = replacePlaceholders(tpl, {}, { blankLineFormat: "html" });
    expect(html).toContain("[nº 123]");
    expect(countLacunas(html)).toBe(1);
    expect(getUnresolvedPlaceholders(tpl, {})).toEqual(["{{comprador_cpf}}"]);
  });
});
