import { describe, it, expect } from "vitest";
import {
  FUZZY_THRESHOLDS,
  normalizeLabel,
  matchBracketLabel,
  detectUnderscoreFields,
  detectTemplateFields,
} from "../import-detection";

// ============================================================================
// FUZZY_THRESHOLDS (Ajuste 2 — calibráveis na 1.2 contra o .docx real)
// ============================================================================

describe("FUZZY_THRESHOLDS", () => {
  it("expõe os limiares nomeados para calibração", () => {
    expect(FUZZY_THRESHOLDS).toEqual({ high: 0.85, medium: 0.7 });
  });
});

// ============================================================================
// normalizeLabel
// ============================================================================

describe("normalizeLabel", () => {
  it("remove acentos e sobe caixa", () => {
    expect(normalizeLabel("Profissão do Comprador")).toBe("PROFISSAO DO COMPRADOR");
  });

  it("neutraliza os marcadores de gênero DO(A)/(A)", () => {
    expect(normalizeLabel("CPF DO(A) VENDEDOR(A)")).toBe("CPF DO VENDEDOR");
    expect(normalizeLabel("PROMISSÁRIO(A) COMPRADOR(A)")).toBe("PROMISSARIO COMPRADOR");
  });

  it("converte pontuação em espaço e colapsa espaços múltiplos", () => {
    expect(normalizeLabel("RG/ÓRGÃO   EMISSOR")).toBe("RG ORGAO EMISSOR");
    expect(normalizeLabel("CIDADE/UF")).toBe("CIDADE UF");
    expect(normalizeLabel("  ÓRGÃO EXPEDIDOR (COMPRADOR) ")).toBe("ORGAO EXPEDIDOR COMPRADOR");
  });

  it("singulariza plural simples quando o singular existe no vocabulário do catálogo", () => {
    expect(normalizeLabel("E-MAILS")).toBe("E MAIL");
  });

  it("não mutila palavras terminadas em S que já são vocabulário (MÊS)", () => {
    expect(normalizeLabel("MÊS")).toBe("MES");
  });
});

// ============================================================================
// matchBracketLabel (E2)
// ============================================================================

describe("matchBracketLabel — match exato normalizado", () => {
  it("label canônico literal → exact", () => {
    const r = matchBracketLabel("CPF DO(A) VENDEDOR(A)");
    expect(r).toMatchObject({ key: "vendedor_cpf", confidence: "exact" });
    expect(r.candidates[0]).toBe("vendedor_cpf");
  });

  it("alias conhecido → exact (CPF DO VENDEDOR)", () => {
    expect(matchBracketLabel("CPF DO VENDEDOR").key).toBe("vendedor_cpf");
    expect(matchBracketLabel("CPF DO VENDEDOR").confidence).toBe("exact");
  });

  it("variação de caixa/acento/gênero resolve para exact via normalização", () => {
    expect(matchBracketLabel("cpf do vendedor")).toMatchObject({ key: "vendedor_cpf", confidence: "exact" });
    expect(matchBracketLabel("PROFISSAO DO COMPRADOR")).toMatchObject({ key: "comprador_profissao", confidence: "exact" });
    expect(matchBracketLabel("MATRICULA DO IMOVEL")).toMatchObject({ key: "imovel_matricula", confidence: "exact" });
    expect(matchBracketLabel("NOME DA IMOBILIARIA")).toMatchObject({ key: "empresa_nome", confidence: "exact" });
  });
});

describe("matchBracketLabel — fuzzy (variações reais de grafia)", () => {
  it("typo de 1 caractere → high (PROFISÃO DO COMPRADOR)", () => {
    const r = matchBracketLabel("PROFISÃO DO COMPRADOR");
    expect(r.key).toBe("comprador_profissao");
    expect(r.confidence).toBe("high");
  });

  it("gênero por flexão real (feminino escrito por extenso) → high", () => {
    const r = matchBracketLabel("PROFISSÃO DA VENDEDORA");
    expect(r.key).toBe("vendedor_profissao");
    expect(r.confidence).toBe("high");
  });

  it("token extra → pelo menos medium, com candidato certo no topo", () => {
    const r = matchBracketLabel("ENDEREÇO COMPLETO DO VENDEDOR");
    expect(r.key).toBe("vendedor_endereco");
    expect(["high", "medium"]).toContain(r.confidence);
    expect(r.candidates[0]).toBe("vendedor_endereco");
  });

  it("candidates vêm ranqueados, sem duplicatas e com no máximo 4", () => {
    const r = matchBracketLabel("CPF DO VENDEDOR 22");
    expect(r.candidates.length).toBeGreaterThan(0);
    expect(r.candidates.length).toBeLessThanOrEqual(4);
    expect(new Set(r.candidates).size).toBe(r.candidates.length);
  });
});

describe("matchBracketLabel — REGRA DE OURO: nada é descartado", () => {
  it("label alienígena → none com candidates vazios (item ainda existe)", () => {
    const r = matchBracketLabel("CLÁUSULA DÉCIMA PRIMEIRA");
    expect(r.key).toBeNull();
    expect(r.confidence).toBe("none");
    expect(r.candidates).toEqual([]);
  });
});

// ============================================================================
// detectUnderscoreFields (E3)
// ============================================================================

describe("detectUnderscoreFields — inferência de sufixo pelo rótulo anterior", () => {
  it("CPF: ______ → sufixo cpf (sem papel → medium com candidatos por ordem)", () => {
    const [d] = detectUnderscoreFields("CPF: ______");
    expect(d.raw).toBe("______");
    expect(d.suggestion).toBe("vendedor_cpf");
    expect(d.confidence).toBe("medium");
    expect(d.candidates).toEqual(["vendedor_cpf", "comprador_cpf", "conjuge_cpf", "anuente_cpf"]);
  });

  it("ignora tokens de ruído entre rótulo e lacuna (CPF nº ______)", () => {
    const [d] = detectUnderscoreFields("CPF nº ______");
    expect(d.suggestion).toBe("vendedor_cpf");
  });

  it("dois campos na mesma linha → duas detecções com sufixos corretos", () => {
    const ds = detectUnderscoreFields("Nacionalidade: ____, estado civil: ____");
    expect(ds).toHaveLength(2);
    expect(ds[0].suggestion).toBe("vendedor_nacionalidade");
    expect(ds[1].suggestion).toBe("vendedor_estado_civil");
  });

  it("máscara de data __/__/____ é fundida numa única detecção", () => {
    const ds = detectUnderscoreFields("Data: __/__/____");
    expect(ds).toHaveLength(1);
    expect(ds[0].raw).toBe("__/__/____");
  });

  it("run sem rótulo reconhecível → none com candidates vazios (nunca descartado)", () => {
    const [d] = detectUnderscoreFields("assinado em ______");
    expect(d.confidence).toBe("none");
    expect(d.suggestion).toBeNull();
    expect(d.candidates).toEqual([]);
  });

  it("runs curtos demais (__ isolado) não disparam detecção", () => {
    expect(detectUnderscoreFields("a __ b")).toHaveLength(0);
  });
});

describe("detectUnderscoreFields — herança de papel do bloco/seção", () => {
  const bloco = [
    "PROMITENTE VENDEDORA: Maria da Silva, brasileira, casada.",
    "CPF: ______",
    "RG: ______",
  ].join("\n");

  it("herda vendedor_ do cabeçalho da seção → high", () => {
    const ds = detectUnderscoreFields(bloco);
    expect(ds).toHaveLength(2);
    expect(ds[0]).toMatchObject({ suggestion: "vendedor_cpf", confidence: "high" });
    expect(ds[1]).toMatchObject({ suggestion: "vendedor_rg", confidence: "high" });
  });

  it("papel local vence: bloco de comprador gera comprador_*", () => {
    const ds = detectUnderscoreFields("O COMPRADOR, portador do CPF: ______");
    expect(ds[0]).toMatchObject({ suggestion: "comprador_cpf", confidence: "high" });
    expect(ds[0].candidates[0]).toBe("comprador_cpf");
  });
});

// ============================================================================
// detectTemplateFields (E4) — API única
// ============================================================================

describe("detectTemplateFields — unificação das 3 sintaxes", () => {
  const template = [
    "Contrato entre {{vendedor_nome}} e [NOME COMPLETO DO(A) COMPRADOR(A)].",
    "O COMPRADOR, CPF: ______, declara.",
  ].join("\n");

  it("detecta curly, bracket e underscore numa lista única ordenada por posição", () => {
    const ds = detectTemplateFields("", template);
    expect(ds.map((d) => d.syntax)).toEqual(["curly", "bracket", "underscore"]);
    const positions = ds.map((d) => d.position);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it("curly com chave canônica → exact; chave custom → high (nunca descartada)", () => {
    const ds = detectTemplateFields("", "{{vendedor_nome}} {{campo_custom_xyz}}");
    expect(ds[0]).toMatchObject({ raw: "{{vendedor_nome}}", suggestion: "vendedor_nome", confidence: "exact" });
    expect(ds[1]).toMatchObject({ raw: "{{campo_custom_xyz}}", suggestion: "campo_custom_xyz", confidence: "high" });
  });

  it("caso de ouro: [nacionalidade] em bloco de VENDEDORA → vendedor_nacionalidade", () => {
    const texto = "A PROMITENTE VENDEDORA, [nacionalidade], [estado civil], residente em [endereço].";
    const ds = detectTemplateFields("", texto);
    expect(ds).toHaveLength(3);
    expect(ds[0]).toMatchObject({ suggestion: "vendedor_nacionalidade", confidence: "high" });
    expect(ds[1]).toMatchObject({ suggestion: "vendedor_estado_civil", confidence: "high" });
    expect(ds[2]).toMatchObject({ suggestion: "vendedor_endereco", confidence: "high" });
  });

  it("bracket genérico sem papel no contexto → medium com candidatos por ordem", () => {
    const ds = detectTemplateFields("", "Documento: [CPF]");
    expect(ds[0]).toMatchObject({ suggestion: "vendedor_cpf", confidence: "medium" });
    expect(ds[0].candidates).toContain("comprador_cpf");
  });

  it("casos negativos: citações legais e numerais não viram campo", () => {
    const texto = "Conforme [art. 5º] da [Lei nº 8.245], item [1.234], [§ 2º], [n. 123].";
    expect(detectTemplateFields("", texto)).toHaveLength(0);
  });

  it("REGRA DE OURO: brackets desconhecidos entram todos como none, zero descartes", () => {
    const brackets = Array.from({ length: 10 }, (_, i) => `[TERMO INUSITADO ${String.fromCharCode(65 + i)}]`);
    const ds = detectTemplateFields("", brackets.join(" "));
    expect(ds).toHaveLength(10);
    for (const d of ds) {
      expect(d.syntax).toBe("bracket");
      expect(d.confidence).toBe("none");
      expect(d.candidates).toEqual([]);
    }
  });

  it("occurrenceIndex conta repetições do mesmo raw", () => {
    const ds = detectTemplateFields("", "[CPF] texto [CPF]");
    expect(ds[0].occurrenceIndex).toBe(0);
    expect(ds[1].occurrenceIndex).toBe(1);
  });

  it("cada detecção carrega contexto para a UI de mapeamento", () => {
    const ds = detectTemplateFields("", "O VENDEDOR indicado, CPF: ______");
    expect(ds[0].context).toContain("VENDEDOR");
  });
});
