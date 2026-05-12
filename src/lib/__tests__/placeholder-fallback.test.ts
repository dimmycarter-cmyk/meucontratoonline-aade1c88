import { describe, it, expect } from "vitest";
import { replacePlaceholders, getUnresolvedPlaceholders } from "../placeholder";
import { applyFallback, getFallbackStrategy } from "../placeholder-fallback";

describe("placeholder fallback — estratégia tabular", () => {
  describe("getFallbackStrategy", () => {
    it("retorna omit para qualquer slot de RG", () => {
      // Decisão Sprint 2 (ajuste-12): RG vazio omitido em vez de blank_line.
      // "__________" parecia campo a preencher e atrapalhava a leitura.
      expect(getFallbackStrategy("vendedor_rg")).toBe("omit");
      expect(getFallbackStrategy("comprador_rg")).toBe("omit");
      expect(getFallbackStrategy("vendedor2_rg")).toBe("omit");
      expect(getFallbackStrategy("conjuge_rg")).toBe("omit");
      expect(getFallbackStrategy("anuente_rg")).toBe("omit");
    });

    it("retorna omit para qualquer slot de órgão expedidor", () => {
      expect(getFallbackStrategy("vendedor_orgao_expedidor")).toBe("omit");
      expect(getFallbackStrategy("comprador3_orgao_expedidor")).toBe("omit");
    });

    it("retorna omit para qualquer slot de data de nascimento", () => {
      expect(getFallbackStrategy("vendedor_data_nascimento")).toBe("omit");
      expect(getFallbackStrategy("comprador_nascimento")).toBe("omit");
    });

    it("usa omit como default global", () => {
      expect(getFallbackStrategy("campo_arbitrario_nao_mapeado")).toBe("omit");
      expect(getFallbackStrategy("xyz")).toBe("omit");
    });

    it("retorna omit explícito para os 8 campos opcionais do imóvel (Sprint 2 BUG 7)", () => {
      // Overrides declarados em PLACEHOLDER_FALLBACK_STRATEGY: garantem que
      // alterar o DEFAULT_STRATEGY global não muda silenciosamente esses
      // campos. Coincidem com o default atual mas servem como contrato.
      expect(getFallbackStrategy("imovel_area_privativa")).toBe("omit");
      expect(getFallbackStrategy("imovel_area_total")).toBe("omit");
      expect(getFallbackStrategy("imovel_area_acessoria")).toBe("omit");
      expect(getFallbackStrategy("imovel_vagas")).toBe("omit");
      expect(getFallbackStrategy("imovel_matricula")).toBe("omit");
      expect(getFallbackStrategy("imovel_cartorio")).toBe("omit");
      expect(getFallbackStrategy("imovel_inscricao_municipal")).toBe("omit");
      expect(getFallbackStrategy("imovel_indice_cadastral")).toBe("omit");
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
    it("omite RG vazio (fallback default)", () => {
      // Sprint 2 (ajuste-12): RG → omit. Frase fica "RG nº " (espaço sobra
      // antes da vírgula — cleanOrphanPunctuation atual não cobre "X , Y",
      // alvo do Commit 3). O {{}} desaparece e o "__________" não vaza.
      const html = "portador(a) do RG nº {{vendedor_rg}}, inscrito(a) no CPF.";
      const out = replacePlaceholders(html, {});
      expect(out).not.toContain("{{vendedor_rg}}");
      expect(out).not.toMatch(/_{2,}/);
      expect(out).toContain("RG nº");
      expect(out).toContain("inscrito(a) no CPF");
    });

    it("omite órgão expedidor vazio em frase real", () => {
      const html = "RG {{vendedor_rg}} {{vendedor_orgao_expedidor}}, inscrito.";
      const out = replacePlaceholders(html, {});
      expect(out).not.toContain("{{vendedor_orgao_expedidor}}");
      expect(out).not.toContain("{{vendedor_rg}}");
      expect(out).not.toMatch(/_{2,}/);
    });

    it("preserva órgão expedidor quando o dado existe", () => {
      const html = "RG {{vendedor_rg}} {{vendedor_orgao_expedidor}}";
      const out = replacePlaceholders(html, {
        vendedor_rg: "12.345.678",
        vendedor_orgao_expedidor: "SSP/MG",
      });
      expect(out).toBe("RG 12.345.678 SSP/MG");
    });

    it("omite data de nascimento vazia (cleanup colapsa espaço duplo)", () => {
      const html = "Data nasc: {{vendedor_data_nascimento}} fim";
      const out = replacePlaceholders(html, {});
      // omit substitui por ""; cleanOrphanPunctuation colapsa o espaço duplo.
      expect(out).toBe("Data nasc: fim");
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
      // omit substitui por ""; cleanOrphanPunctuation colapsa o espaço duplo.
      expect(out).toBe("início fim");
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
      // omit substitui por ""; sem vírgula órfã, o cleanup não toca em "RG: ."
      // (espaço-antes-de-pontuação é responsabilidade do template).
      expect(out).toBe("RG: .");
    });
  });

  describe("getUnresolvedPlaceholders — validação independente do fallback", () => {
    it("continua reportando RG vazio mesmo com fallback omit aplicado", () => {
      const html = "RG {{vendedor_rg}}";
      // render aplica omit (Sprint 2), mas a validação cru continua flagging
      // — o usuário ainda precisa saber que o campo está pendente.
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
