import { describe, it, expect } from "vitest";
import { replacePlaceholders, getUnresolvedPlaceholders } from "../placeholder";
import { applyFallback, getFallbackStrategy } from "../placeholder-fallback";

describe("placeholder fallback — estratégia tabular", () => {
  describe("getFallbackStrategy", () => {
    it("retorna blank_line para qualquer slot de RG", () => {
      expect(getFallbackStrategy("vendedor_rg")).toBe("blank_line");
      expect(getFallbackStrategy("comprador_rg")).toBe("blank_line");
      expect(getFallbackStrategy("vendedor2_rg")).toBe("blank_line");
      expect(getFallbackStrategy("conjuge_rg")).toBe("blank_line");
      expect(getFallbackStrategy("anuente_rg")).toBe("blank_line");
    });

    it("retorna blank_line para qualquer slot de órgão expedidor", () => {
      expect(getFallbackStrategy("vendedor_orgao_expedidor")).toBe("blank_line");
      expect(getFallbackStrategy("comprador3_orgao_expedidor")).toBe("blank_line");
    });

    it("retorna omit para qualquer slot de data de nascimento", () => {
      expect(getFallbackStrategy("vendedor_data_nascimento")).toBe("omit");
      expect(getFallbackStrategy("comprador_nascimento")).toBe("omit");
    });

    it("usa omit como default global", () => {
      expect(getFallbackStrategy("campo_arbitrario_nao_mapeado")).toBe("omit");
      expect(getFallbackStrategy("xyz")).toBe("omit");
    });
  });

  describe("applyFallback", () => {
    it("blank_line produz linha de underscores", () => {
      expect(applyFallback("blank_line", "{{vendedor_rg}}")).toMatch(/^_+$/);
      expect(applyFallback("blank_line", "{{vendedor_rg}}").length).toBeGreaterThanOrEqual(8);
    });

    it("omit produz string vazia", () => {
      expect(applyFallback("omit", "{{vendedor_data_nascimento}}")).toBe("");
    });

    it("keep_literal preserva o placeholder original", () => {
      expect(applyFallback("keep_literal", "{{vendedor_rg}}")).toBe("{{vendedor_rg}}");
    });
  });

  describe("replacePlaceholders — auto (default)", () => {
    it("substitui RG vazio por linha de underscores", () => {
      const html = "portador(a) do RG nº {{vendedor_rg}}, inscrito(a) no CPF.";
      const out = replacePlaceholders(html, {});
      expect(out).toMatch(/portador\(a\) do RG nº _+, inscrito\(a\) no CPF\./);
      expect(out).not.toContain("{{vendedor_rg}}");
    });

    it("omite data de nascimento vazia", () => {
      const html = "Data nasc: {{vendedor_data_nascimento}} fim";
      const out = replacePlaceholders(html, {});
      expect(out).toBe("Data nasc:  fim");
      expect(out).not.toContain("{{vendedor_data_nascimento}}");
    });

    it("preserva valor quando o dado existe", () => {
      const html = "RG {{vendedor_rg}}";
      const out = replacePlaceholders(html, { vendedor_rg: "12.345.678" });
      expect(out).toBe("RG 12.345.678");
    });

    it("aplica omit (default) para campo arbitrário sem dado", () => {
      const html = "início {{campo_qualquer}} fim";
      const out = replacePlaceholders(html, {});
      expect(out).toBe("início  fim");
    });
  });

  describe("replacePlaceholders — fallback override", () => {
    it("keep_literal preserva todos os placeholders sem dado", () => {
      const html = "RG {{vendedor_rg}} e data {{vendedor_data_nascimento}}";
      const out = replacePlaceholders(html, {}, { fallback: "keep_literal" });
      expect(out).toContain("{{vendedor_rg}}");
      expect(out).toContain("{{vendedor_data_nascimento}}");
    });

    it("blank_line forçado vale para tudo, mesmo data de nascimento", () => {
      const html = "Data: {{vendedor_data_nascimento}}";
      const out = replacePlaceholders(html, {}, { fallback: "blank_line" });
      expect(out).toMatch(/Data: _+/);
    });

    it("omit forçado vale para tudo, mesmo RG", () => {
      const html = "RG: {{vendedor_rg}}.";
      const out = replacePlaceholders(html, {}, { fallback: "omit" });
      expect(out).toBe("RG: .");
    });
  });

  describe("getUnresolvedPlaceholders — validação independente do fallback", () => {
    it("continua reportando RG vazio mesmo com fallback blank_line aplicado", () => {
      const html = "RG {{vendedor_rg}}";
      // render aplica blank_line, mas a validação cru continua flagging:
      replacePlaceholders(html, {});
      const unresolved = getUnresolvedPlaceholders(html, {});
      expect(unresolved).toContain("{{vendedor_rg}}");
    });

    it("continua reportando data de nascimento vazia mesmo com omit", () => {
      const html = "Data: {{vendedor_data_nascimento}}";
      replacePlaceholders(html, {});
      const unresolved = getUnresolvedPlaceholders(html, {});
      expect(unresolved).toContain("{{vendedor_data_nascimento}}");
    });
  });
});
