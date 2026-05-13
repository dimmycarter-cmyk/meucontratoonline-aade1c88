import { describe, it, expect } from "vitest";
import {
  stripRedundantPrefixes,
  preprocessTemplate,
  replacePlaceholders,
} from "../placeholder";
import { enrichDados } from "../contract-enrichment";

describe("stripRedundantPrefixes — BUG 2 (R$ R$)", () => {
  describe("sintaxe moderna {{valor_*}}", () => {
    it('remove "R$ " antes de {{valor_total}}', () => {
      expect(stripRedundantPrefixes("R$ {{valor_total}}")).toBe("{{valor_total}}");
    });

    it('remove "R$ " antes de {{valor_sinal}}', () => {
      expect(stripRedundantPrefixes("R$ {{valor_sinal}}")).toBe("{{valor_sinal}}");
    });

    it("tolera espaços múltiplos entre R$ e {{", () => {
      expect(stripRedundantPrefixes("R$   {{valor_total}}")).toBe("{{valor_total}}");
    });

    it("tolera ausência de espaço entre R$ e {{", () => {
      expect(stripRedundantPrefixes("R${{valor_total}}")).toBe("{{valor_total}}");
    });

    it("preserva texto ao redor", () => {
      const input = "O preço total é R$ {{valor_total}} pago à vista.";
      const expected = "O preço total é {{valor_total}} pago à vista.";
      expect(stripRedundantPrefixes(input)).toBe(expected);
    });

    it("cobre qualquer valor_<sufixo> arbitrário", () => {
      expect(stripRedundantPrefixes("R$ {{valor_xyz_123}}")).toBe("{{valor_xyz_123}}");
    });
  });

  describe("sintaxe legacy [VALOR ...]", () => {
    it("remove R$ antes de [VALOR TOTAL]", () => {
      expect(stripRedundantPrefixes("R$ [VALOR TOTAL]")).toBe("[VALOR TOTAL]");
    });

    it("remove R$ antes de [VALOR DO SINAL]", () => {
      expect(stripRedundantPrefixes("R$ [VALOR DO SINAL]")).toBe("[VALOR DO SINAL]");
    });

    it("remove R$ antes de [VALOR REMANESCENTE]", () => {
      expect(stripRedundantPrefixes("R$ [VALOR REMANESCENTE]")).toBe("[VALOR REMANESCENTE]");
    });

    it("remove R$ antes de [VALOR DO FINANCIAMENTO]", () => {
      expect(stripRedundantPrefixes("R$ [VALOR DO FINANCIAMENTO]")).toBe("[VALOR DO FINANCIAMENTO]");
    });

    it("remove R$ antes de [VALOR PARA O VENDEDOR]", () => {
      expect(stripRedundantPrefixes("R$ [VALOR PARA O VENDEDOR]")).toBe("[VALOR PARA O VENDEDOR]");
    });

    it("remove R$ antes de [VALOR DA CORRETAGEM]", () => {
      expect(stripRedundantPrefixes("R$ [VALOR DA CORRETAGEM]")).toBe("[VALOR DA CORRETAGEM]");
    });

    it("remove R$ antes de [VALOR TOTAL POR EXTENSO]", () => {
      expect(stripRedundantPrefixes("R$ [VALOR TOTAL POR EXTENSO]")).toBe("[VALOR TOTAL POR EXTENSO]");
    });

    it("remove R$ antes de [VALOR] solto (alíneas a/b/c)", () => {
      expect(stripRedundantPrefixes("R$ [VALOR]")).toBe("[VALOR]");
    });

    it("é case-insensitive nos labels", () => {
      expect(stripRedundantPrefixes("R$ [valor total]")).toBe("[valor total]");
      expect(stripRedundantPrefixes("R$ [Valor Do Sinal]")).toBe("[Valor Do Sinal]");
    });
  });

  describe("negativos (preserva intacto)", () => {
    it("não toca em R$ sem placeholder", () => {
      expect(stripRedundantPrefixes("Valor de R$ 100,00 referente ao mês")).toBe(
        "Valor de R$ 100,00 referente ao mês"
      );
    });

    it("não toca em {{valor_total}} sem R$ antes", () => {
      expect(stripRedundantPrefixes("Total: {{valor_total}}")).toBe("Total: {{valor_total}}");
    });

    it("não toca em R$ antes de bracket fora do whitelist", () => {
      // [VALOR DIDÁTICO] não está no LEGACY_BRACKET_MAP -> não deve casar
      expect(stripRedundantPrefixes("R$ [VALOR DIDÁTICO]")).toBe("R$ [VALOR DIDÁTICO]");
    });

    it("não toca em R$ antes de bracket não-valor", () => {
      expect(stripRedundantPrefixes("R$ [NOME DO COMPRADOR]")).toBe("R$ [NOME DO COMPRADOR]");
    });
  });
});

describe("stripRedundantPrefixes — BUG 5 (imóvel: imóvel:)", () => {
  describe("sintaxe moderna {{imovel_descricao}}", () => {
    it("remove 'imóvel:' antes de {{imovel_descricao}}", () => {
      expect(stripRedundantPrefixes("imóvel: {{imovel_descricao}}")).toBe("{{imovel_descricao}}");
    });

    it("é case-insensitive (Imóvel: maiúsculo)", () => {
      expect(stripRedundantPrefixes("Imóvel: {{imovel_descricao}}")).toBe("{{imovel_descricao}}");
    });

    it("aceita 'imovel:' sem acento", () => {
      expect(stripRedundantPrefixes("imovel: {{imovel_descricao}}")).toBe("{{imovel_descricao}}");
    });

    it("tolera espaços extras ao redor dos dois-pontos", () => {
      expect(stripRedundantPrefixes("imóvel  :  {{imovel_descricao}}")).toBe("{{imovel_descricao}}");
    });

    it("preserva texto antes do rótulo", () => {
      const input = "o objeto deste contrato é o imóvel: {{imovel_descricao}}, registrado...";
      const expected = "o objeto deste contrato é o {{imovel_descricao}}, registrado...";
      expect(stripRedundantPrefixes(input)).toBe(expected);
    });
  });

  describe("sintaxe legacy [DESCRIÇÃO ... IMÓVEL]", () => {
    it("remove 'imóvel:' antes de [DESCRIÇÃO COMPLETA DO IMÓVEL]", () => {
      expect(stripRedundantPrefixes("imóvel: [DESCRIÇÃO COMPLETA DO IMÓVEL]")).toBe(
        "[DESCRIÇÃO COMPLETA DO IMÓVEL]"
      );
    });

    it("remove 'imóvel:' antes de [DESCRIÇÃO DO IMÓVEL]", () => {
      expect(stripRedundantPrefixes("imóvel: [DESCRIÇÃO DO IMÓVEL]")).toBe("[DESCRIÇÃO DO IMÓVEL]");
    });

    it("é case-insensitive no label e no rótulo", () => {
      expect(stripRedundantPrefixes("IMÓVEL: [descrição completa do imóvel]")).toBe(
        "[descrição completa do imóvel]"
      );
    });

    it("tolera grafias sem acento", () => {
      expect(stripRedundantPrefixes("imovel: [DESCRICAO COMPLETA DO IMOVEL]")).toBe(
        "[DESCRICAO COMPLETA DO IMOVEL]"
      );
    });
  });

  describe("negativos (preserva intacto)", () => {
    it("não toca em 'imóvel' sem dois-pontos", () => {
      expect(stripRedundantPrefixes("imóvel localizado na cidade")).toBe("imóvel localizado na cidade");
    });

    it("não toca em 'imóvel:' antes de bracket fora do escopo", () => {
      expect(stripRedundantPrefixes("imóvel: [ENDEREÇO DO IMÓVEL]")).toBe("imóvel: [ENDEREÇO DO IMÓVEL]");
    });

    it("não toca em 'imóvel:' antes de texto livre (sem placeholder)", () => {
      expect(stripRedundantPrefixes("imóvel: Lote n. 13 do bairro X")).toBe("imóvel: Lote n. 13 do bairro X");
    });
  });
});

describe("preprocessTemplate — integração com stripConditionalBlocks", () => {
  it("aplica strip de prefixos APÓS strip de condicionais", () => {
    const input = "{{#if mostra}}R$ {{valor_total}}{{/if}}";
    const out = preprocessTemplate(input, { mostra: "true" });
    expect(out).toBe("{{valor_total}}");
  });

  it("não estraga template sem prefixos redundantes", () => {
    const input = "Total: {{valor_total}}";
    expect(preprocessTemplate(input, {})).toBe("Total: {{valor_total}}");
  });
});

describe("End-to-end: replacePlaceholders + enrichDados não duplicam mais", () => {
  // formatBRL usa toLocaleString("pt-BR") que emite NBSP ( ) entre R$
  // e o número. Asserções precisam casar exatamente.
  const NBSP = " ";

  it("BUG 2 sintaxe moderna: 'R$ {{valor_total}}' renderiza sem duplicar R$", () => {
    const template = "Preço: R$ {{valor_total}}";
    const dados = enrichDados({ valor_total: "350000" });
    const processed = preprocessTemplate(template, dados);
    const result = replacePlaceholders(processed, dados);
    expect(result).toBe(`Preço: R$${NBSP}350.000,00`);
    expect(result).not.toMatch(/R\$\s*R\$/);
  });

  it("BUG 2 sintaxe legacy: 'R$ [VALOR TOTAL]' renderiza sem duplicar R$", () => {
    const template = "Preço: R$ [VALOR TOTAL]";
    const dados = enrichDados({ valor_total: "350000" });
    const processed = preprocessTemplate(template, dados);
    const result = replacePlaceholders(processed, dados);
    expect(result).toBe(`Preço: R$${NBSP}350.000,00`);
    expect(result).not.toMatch(/R\$\s*R\$/);
  });

  it("BUG 2 todas as variantes legacy de [VALOR ...] no mesmo template", () => {
    const template = [
      "Total: R$ [VALOR TOTAL]",
      "Sinal: R$ [VALOR DO SINAL]",
      "Remanescente: R$ [VALOR REMANESCENTE]",
      "Corretagem: R$ [VALOR DA CORRETAGEM]",
    ].join("\n");
    const dados = enrichDados({
      valor_total: "350000",
      valor_sinal: "35000",
      valor_remanescente: "315000",
      valor_corretagem: "7000",
    });
    const processed = preprocessTemplate(template, dados);
    const result = replacePlaceholders(processed, dados);
    expect(result).not.toMatch(/R\$\s*R\$/);
    expect(result).toContain(`Total: R$${NBSP}350.000,00`);
    expect(result).toContain(`Sinal: R$${NBSP}35.000,00`);
    expect(result).toContain(`Remanescente: R$${NBSP}315.000,00`);
    expect(result).toContain(`Corretagem: R$${NBSP}7.000,00`);
  });

  it("BUG 5 sintaxe legacy: 'imóvel: [DESCRIÇÃO COMPLETA DO IMÓVEL]' não duplica quando o valor começa com 'Imóvel:'", () => {
    const template = "Constitui objeto deste contrato o imóvel: [DESCRIÇÃO COMPLETA DO IMÓVEL].";
    const dados = enrichDados({ imovel_descricao: "Imóvel: Lote n. 13 do bairro X" });
    const processed = preprocessTemplate(template, dados);
    const result = replacePlaceholders(processed, dados);
    expect(result).toBe("Constitui objeto deste contrato o Imóvel: Lote n. 13 do bairro X.");
    expect(result).not.toMatch(/imó?vel:\s*imó?vel:/i);
  });

  it("BUG 5 sintaxe moderna: '{{imovel_descricao}}' precedido por 'imóvel:' não duplica", () => {
    const template = "objeto: imóvel: {{imovel_descricao}}";
    const dados = enrichDados({ imovel_descricao: "Imóvel: Casa 200m²" });
    const processed = preprocessTemplate(template, dados);
    const result = replacePlaceholders(processed, dados);
    expect(result).toBe("objeto: Imóvel: Casa 200m²");
  });

  it("preserva comportamento atual quando NÃO há prefixo duplicado no template", () => {
    const template = "Total: {{valor_total}} — Imóvel descrito como {{imovel_descricao}}";
    const dados = enrichDados({
      valor_total: "100000",
      imovel_descricao: "Casa de 200m²",
    });
    const processed = preprocessTemplate(template, dados);
    const result = replacePlaceholders(processed, dados);
    expect(result).toBe(`Total: R$${NBSP}100.000,00 — Imóvel descrito como Casa de 200m²`);
  });
});
