import { describe, it, expect } from "vitest";
import { resolveAmbiguousLabels, type AmbiguousLabel } from "@/lib/placeholder";

/**
 * Lote G.2 — testes da heurística resolveAmbiguousLabels()
 * usada pelo importador .docx para sugerir mapeamento de labels
 * genéricos (ex: "[CPF]") a chaves canônicas (ex: "vendedor_cpf").
 */

describe("resolveAmbiguousLabels", () => {
  it("Teste 1 — contexto explícito 'vendedor' → high confidence", () => {
    const labels: AmbiguousLabel[] = [
      {
        raw: "[CPF]",
        occurrenceIndex: 0,
        context: "Pelo presente instrumento, o vendedor portador do CPF [CPF]",
      },
    ];
    const result = resolveAmbiguousLabels("", labels);
    expect(result[0].suggestedKey).toBe("vendedor_cpf");
    expect(result[0].confidence).toBe("high");
    expect(result[0].suggestedKeys).toContain("comprador_cpf");
  });

  it("Teste 2 — contexto explícito 'comprador' → high confidence", () => {
    const labels: AmbiguousLabel[] = [
      {
        raw: "[RG]",
        occurrenceIndex: 1,
        context: "o comprador qualificado portador do RG [RG] expedido por",
      },
    ];
    const result = resolveAmbiguousLabels("", labels);
    expect(result[0].suggestedKey).toBe("comprador_rg");
    expect(result[0].confidence).toBe("high");
  });

  it("Teste 3 — sem contexto, 1ª ocorrência → vendedor (low)", () => {
    const labels: AmbiguousLabel[] = [
      { raw: "[CPF]", occurrenceIndex: 0, context: "Documento número [CPF]" },
    ];
    const result = resolveAmbiguousLabels("", labels);
    expect(result[0].suggestedKey).toBe("vendedor_cpf");
    expect(result[0].confidence).toBe("low");
  });

  it("Teste 4 — sem contexto, 3ª ocorrência → cônjuge (low)", () => {
    const labels: AmbiguousLabel[] = [
      { raw: "[CPF]", occurrenceIndex: 2, context: "outro CPF: [CPF]" },
    ];
    const result = resolveAmbiguousLabels("", labels);
    expect(result[0].suggestedKey).toBe("conjuge_cpf");
    expect(result[0].confidence).toBe("low");
  });

  it("Teste 5 — label não reconhecido → suggestedKeys vazio", () => {
    const labels: AmbiguousLabel[] = [
      { raw: "[FOO_DESCONHECIDO]", occurrenceIndex: 0, context: "qualquer coisa" },
    ];
    const result = resolveAmbiguousLabels("", labels);
    expect(result[0].suggestedKey).toBe("");
    expect(result[0].suggestedKeys).toEqual([]);
  });

  it("Teste 6 — contexto 'procurador' → procurador_cpf (high)", () => {
    const labels: AmbiguousLabel[] = [
      {
        raw: "[CPF]",
        occurrenceIndex: 5,
        context: "representado por seu procurador inscrito no CPF [CPF]",
      },
    ];
    const result = resolveAmbiguousLabels("", labels);
    expect(result[0].suggestedKey).toBe("procurador_cpf");
    expect(result[0].confidence).toBe("high");
  });

  it("Teste 7 — contexto 'cônjuge' (com acento) → conjuge_nome (high)", () => {
    const labels: AmbiguousLabel[] = [
      {
        raw: "[NOME]",
        occurrenceIndex: 0,
        context: "casado com sua cônjuge de nome [NOME], também",
      },
    ];
    const result = resolveAmbiguousLabels("", labels);
    expect(result[0].suggestedKey).toBe("conjuge_nome");
    expect(result[0].confidence).toBe("high");
  });
});
