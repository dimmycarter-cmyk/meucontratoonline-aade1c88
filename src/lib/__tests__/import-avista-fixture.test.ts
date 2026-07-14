/**
 * Fixture real: CONTRATO_AVISTA_EM_BRANCO.docx (import de 13/07/2026).
 *
 * BENCHMARK OFICIAL (corrigido em 2026-07-13): 58 brackets + 4 underscores,
 * contados sobre o texto FIEL ao word/document.xml. O benchmark anterior de
 * 55 era artefato do pandoc, que perdia 3 labels em tabela/textbox
 * (1× [DESCRIÇÃO COMPLETA DO IMÓVEL] + 2× [RG/ÓRGÃO EMISSOR]).
 *
 * A fixture .txt foi extraída do word/document.xml do .docx versionado ao
 * lado (</w:p> → \n, tags removidas, entidades decodificadas) — método que
 * preserva conteúdo de tabelas, ao contrário de conversores que as achatam.
 * O binário está versionado em fixtures/ para reextração/parse futuro.
 *
 * Meta da sessão 1.2 (item 6): maioria exact/high SEM calibração de
 * FUZZY_THRESHOLDS — medido aqui: 54/58 brackets (93%).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { detectTemplateFields } from "../import-detection";
import { indexRepeatableRoles, buildMappingRows, summarizeMapping } from "../import-mapping";

// cwd do Vitest é a raiz do repo (import.meta.url vem com scheme http no jsdom).
const text = readFileSync(
  join(process.cwd(), "src/lib/__tests__/fixtures/contrato-avista-em-branco.extracted.txt"),
  "utf8"
);

describe("fixture CONTRATO_AVISTA_EM_BRANCO — benchmark oficial 58/4", () => {
  it("texto cru contém 58 brackets e 4 runs de underscore", () => {
    expect([...text.matchAll(/\[[^\]]+\]/g)]).toHaveLength(58);
    expect([...text.matchAll(/_{3,}/g)]).toHaveLength(4);
  });

  const detections = detectTemplateFields("", text);
  const brackets = detections.filter((d) => d.syntax === "bracket");
  const underscores = detections.filter((d) => d.syntax === "underscore");

  it("detecção não descarta nada: 58 brackets + 4 underscores = 62 itens listados", () => {
    expect(detections).toHaveLength(62);
    expect(brackets).toHaveLength(58);
    expect(underscores).toHaveLength(4);
    expect(detections.filter((d) => d.syntax === "curly")).toHaveLength(0);
  });

  it("maioria exact/high: 40 exact + 14 high = 54/58 brackets (93%), sem calibração", () => {
    const byConf = (c: string) => brackets.filter((d) => d.confidence === c).length;
    expect(byConf("exact")).toBe(40);
    expect(byConf("high")).toBe(14);
    expect(byConf("none")).toBe(4);
    expect((byConf("exact") + byConf("high")) / brackets.length).toBeGreaterThanOrEqual(0.75);
  });

  it("[DESCRIÇÃO COMPLETA DO IMÓVEL] (label recuperado do document.xml, BUG 5) → imovel_descricao exact", () => {
    const d = brackets.filter((b) => b.raw === "[DESCRIÇÃO COMPLETA DO IMÓVEL]");
    expect(d).toHaveLength(1);
    expect(d[0].suggestion).toBe("imovel_descricao");
    expect(d[0].confidence).toBe("exact");
  });

  it("2× [RG/ÓRGÃO EMISSOR] (labels recuperados) resolvem papel por bloco: vendedor_rg e comprador_rg", () => {
    const d = brackets.filter((b) => b.raw === "[RG/ÓRGÃO EMISSOR]");
    expect(d.map((x) => x.suggestion).sort()).toEqual(["comprador_rg", "vendedor_rg"]);
    expect(d.every((x) => x.confidence === "high")).toBe(true);
  });

  it("genéricos em minúsculas resolvem por contexto: [nacionalidade] → vendedor/comprador", () => {
    const d = brackets.filter((b) => b.raw === "[nacionalidade]");
    expect(d.map((x) => x.suggestion).sort()).toEqual([
      "comprador_nacionalidade",
      "vendedor_nacionalidade",
    ]);
  });

  it("os 4 'none' de bracket são ambiguidade genuína ([DESCREVER], 3× [VALOR]) — listados, nunca descartados", () => {
    const none = brackets.filter((d) => d.confidence === "none");
    expect(none.map((d) => d.raw).sort()).toEqual(["[DESCREVER]", "[VALOR]", "[VALOR]", "[VALOR]"]);
    expect(none.every((d) => d.candidates.length === 0)).toBe(true);
  });

  it("4 underscores são linhas de assinatura (sem rótulo) → confidence none, listados para decisão explícita", () => {
    expect(underscores.every((d) => d.confidence === "none")).toBe(true);
  });

  it("fluxo da tela: 54 nascem 'Mapear', 8 nascem 'Revisar', 0 'Ignorar' — avanço exige decisão nas 8", () => {
    const rows = buildMappingRows(indexRepeatableRoles(detections));
    expect(summarizeMapping(rows)).toEqual({ mapped: 54, toReview: 8, ignored: 0 });
  });
});
