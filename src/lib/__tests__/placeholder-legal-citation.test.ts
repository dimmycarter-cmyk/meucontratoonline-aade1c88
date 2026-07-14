/**
 * Fix 1.2 (item 7) — filtro de citação legal de getUnresolvedPlaceholders.
 *
 * Bug latente herdado (known issue #1 da sessão 1.1): "§" não é word char,
 * então o \b do grupo nunca casa após ele — "[§ 2º]" aparecia como pendência
 * de render. Mesmo fix já aplicado no motor novo (isNonFieldBracket,
 * import-detection.ts): alternativa ancorada |^§ fora do grupo com \b.
 * Único toque permitido no render engine nesta sessão.
 */
import { describe, it, expect } from "vitest";
import { getUnresolvedPlaceholders } from "../placeholder";

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
