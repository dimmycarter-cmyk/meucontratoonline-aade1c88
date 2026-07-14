/**
 * Camada pura da tela de mapeamento (Fase 1, sessão 1.2 — item 1/5 do escopo).
 *
 * Cobre: defaults por confiança (Mapear p/ exact-high, Revisar p/ medium-none,
 * Ignorar NUNCA default), contadores do rodapé, bloqueio de avanço, ignorar
 * em massa (decisão explícita), indexação por paridade (testemunha/procurador),
 * aplicação do mapeamento no HTML por raw+ocorrência e metadado de import.
 */
import { describe, it, expect } from "vitest";
import type { TemplateFieldDetection } from "../import-detection";
import {
  buildMappingRows,
  indexRepeatableRoles,
  summarizeMapping,
  canAdvanceMapping,
  ignoreAllPending,
  applyMappingToHtml,
  buildImportMetadata,
} from "../import-mapping";

/** Fábrica de detecção com defaults neutros. */
function det(partial: Partial<TemplateFieldDetection>): TemplateFieldDetection {
  return {
    raw: "[X]",
    syntax: "bracket",
    suggestion: null,
    confidence: "none",
    candidates: [],
    position: 0,
    context: "",
    occurrenceIndex: 0,
    ...partial,
  };
}

// ============================================================================
// buildMappingRows — defaults por confiança
// ============================================================================

describe("buildMappingRows — ação default por confiança", () => {
  it("exact e high → Mapear com a sugestão; medium e none → Revisar", () => {
    const rows = buildMappingRows([
      det({ raw: "{{valor_total}}", syntax: "curly", suggestion: "valor_total", confidence: "exact", candidates: ["valor_total"] }),
      det({ raw: "[CPF]", suggestion: "vendedor_cpf", confidence: "high", candidates: ["vendedor_cpf", "comprador_cpf"] }),
      det({ raw: "______", syntax: "underscore", suggestion: "vendedor_cpf", confidence: "medium", candidates: ["vendedor_cpf"] }),
      det({ raw: "[DESCREVER]", suggestion: null, confidence: "none" }),
    ]);
    expect(rows.map((r) => r.action)).toEqual(["map", "map", "review", "review"]);
    expect(rows[0].targetKey).toBe("valor_total");
    expect(rows[1].targetKey).toBe("vendedor_cpf");
    expect(rows[2].targetKey).toBe("");
    expect(rows[3].targetKey).toBe("");
  });

  it("nunca gera 'ignore' como default, mesmo sem sugestão", () => {
    const rows = buildMappingRows([det({ suggestion: null, confidence: "none" })]);
    expect(rows.some((r) => r.action === "ignore")).toBe(false);
  });
});

// ============================================================================
// summarizeMapping / canAdvanceMapping / ignoreAllPending
// ============================================================================

describe("contadores e avanço", () => {
  const rows = buildMappingRows([
    det({ raw: "[A]", suggestion: "foro", confidence: "exact", candidates: ["foro"] }),
    det({ raw: "[B]", suggestion: "vendedor_cpf", confidence: "medium", candidates: ["vendedor_cpf"] }),
    det({ raw: "[C]", suggestion: null, confidence: "none" }),
  ]);

  it("summarizeMapping conta mapeados / a revisar / ignorados", () => {
    expect(summarizeMapping(rows)).toEqual({ mapped: 1, toReview: 2, ignored: 0 });
  });

  it("canAdvanceMapping bloqueia enquanto houver 'a revisar'", () => {
    expect(canAdvanceMapping(rows)).toBe(false);
  });

  it("ignoreAllPending converte só as pendentes e libera o avanço", () => {
    const after = ignoreAllPending(rows);
    expect(summarizeMapping(after)).toEqual({ mapped: 1, toReview: 0, ignored: 2 });
    expect(canAdvanceMapping(after)).toBe(true);
    // imutável: original preservado
    expect(summarizeMapping(rows).toReview).toBe(2);
  });
});

// ============================================================================
// indexRepeatableRoles — item 5 (known issue #2 da 1.1)
// ============================================================================

describe("indexRepeatableRoles — paridade testemunha/procurador", () => {
  it("testemunha_cpf vira testemunha1_cpf e testemunha2_cpf por ordem de ocorrência", () => {
    const out = indexRepeatableRoles([
      det({ raw: "______", syntax: "underscore", suggestion: "testemunha_cpf", confidence: "high", candidates: ["testemunha_cpf"], position: 10 }),
      det({ raw: "______", syntax: "underscore", suggestion: "testemunha_cpf", confidence: "high", candidates: ["testemunha_cpf"], position: 90, occurrenceIndex: 1 }),
    ]);
    expect(out[0].suggestion).toBe("testemunha1_cpf");
    expect(out[1].suggestion).toBe("testemunha2_cpf");
    expect(out[0].confidence).toBe("high");
    expect(out[0].candidates[0]).toBe("testemunha1_cpf");
  });

  it("3ª testemunha (chave inexistente) não inventa chave: mantém sugestão e rebaixa para medium", () => {
    const three = ["a", "b", "c"].map((_, i) =>
      det({ raw: "______", syntax: "underscore", suggestion: "testemunha_cpf", confidence: "high", candidates: ["testemunha_cpf"], position: i * 50 })
    );
    const out = indexRepeatableRoles(three);
    expect(out[2].suggestion).toBe("testemunha_cpf");
    expect(out[2].confidence).toBe("medium");
  });

  it("procurador: 1ª ocorrência mantém procurador_cpf (chave real); 2ª rebaixa (não existe procurador2_*)", () => {
    const out = indexRepeatableRoles([
      det({ raw: "[CPF]", suggestion: "procurador_cpf", confidence: "high", candidates: ["procurador_cpf"], position: 10 }),
      det({ raw: "[CPF]", suggestion: "procurador_cpf", confidence: "high", candidates: ["procurador_cpf"], position: 90, occurrenceIndex: 1 }),
    ]);
    expect(out[0].suggestion).toBe("procurador_cpf");
    expect(out[0].confidence).toBe("high");
    expect(out[1].suggestion).toBe("procurador_cpf");
    expect(out[1].confidence).toBe("medium");
  });

  it("match exact do catálogo NUNCA é reindexado (CPF do procurador repetido é a mesma pessoa)", () => {
    const out = indexRepeatableRoles([
      det({ raw: "[CPF DO(A) PROCURADOR(A)]", suggestion: "procurador_cpf", confidence: "exact", candidates: ["procurador_cpf"] }),
      det({ raw: "[CPF DO(A) PROCURADOR(A)]", suggestion: "procurador_cpf", confidence: "exact", candidates: ["procurador_cpf"], position: 50, occurrenceIndex: 1 }),
    ]);
    expect(out[0].suggestion).toBe("procurador_cpf");
    expect(out[1].suggestion).toBe("procurador_cpf");
    expect(out[1].confidence).toBe("exact");
  });

  it("papéis não repetíveis (vendedor_cpf) passam intocados", () => {
    const out = indexRepeatableRoles([
      det({ raw: "[CPF]", suggestion: "vendedor_cpf", confidence: "high", candidates: ["vendedor_cpf"] }),
      det({ raw: "[CPF]", suggestion: "vendedor_cpf", confidence: "high", candidates: ["vendedor_cpf"], position: 50, occurrenceIndex: 1 }),
    ]);
    expect(out[0].suggestion).toBe("vendedor_cpf");
    expect(out[1].suggestion).toBe("vendedor_cpf");
  });
});

// ============================================================================
// applyMappingToHtml — substituição por raw + occurrenceIndex
// ============================================================================

describe("applyMappingToHtml", () => {
  it("substitui as 3 sintaxes conforme decisão, preservando as ignoradas", () => {
    const html = "<p>{{valor_total}} — [CPF] — CPF: ______ — [DESCREVER]</p>";
    const rows = buildMappingRows([
      det({ raw: "{{valor_total}}", syntax: "curly", suggestion: "valor_total", confidence: "exact", candidates: ["valor_total"], position: 3 }),
      det({ raw: "[CPF]", suggestion: "vendedor_cpf", confidence: "high", candidates: ["vendedor_cpf"], position: 20 }),
      det({ raw: "______", syntax: "underscore", suggestion: "comprador_cpf", confidence: "high", candidates: ["comprador_cpf"], position: 35 }),
      det({ raw: "[DESCREVER]", suggestion: null, confidence: "none", position: 50 }),
    ]);
    const out = applyMappingToHtml(html, ignoreAllPending(rows));
    expect(out).toBe("<p>{{valor_total}} — {{vendedor_cpf}} — CPF: {{comprador_cpf}} — [DESCREVER]</p>");
  });

  it("mesmo raw com decisões distintas por ocorrência (1ª mapeia, 2ª ignora)", () => {
    const html = "<p>[CPF] e depois [CPF]</p>";
    const rows = buildMappingRows([
      det({ raw: "[CPF]", suggestion: "vendedor_cpf", confidence: "high", candidates: ["vendedor_cpf"], position: 3 }),
      det({ raw: "[CPF]", suggestion: "comprador_cpf", confidence: "medium", candidates: ["comprador_cpf"], position: 20, occurrenceIndex: 1 }),
    ]);
    const out = applyMappingToHtml(html, ignoreAllPending(rows));
    expect(out).toBe("<p>{{vendedor_cpf}} e depois [CPF]</p>");
  });

  it("runs de underscore de tamanhos diferentes não se atropelam (36 dentro de 41)", () => {
    const long = "_".repeat(41);
    const short = "_".repeat(36);
    const html = `<p>${long}</p><p>CPF: ${short}</p>`;
    const rows = buildMappingRows([
      det({ raw: long, syntax: "underscore", suggestion: null, confidence: "none", position: 3 }),
      det({ raw: short, syntax: "underscore", suggestion: "vendedor_cpf", confidence: "high", candidates: ["vendedor_cpf"], position: 60 }),
    ]);
    const out = applyMappingToHtml(html, ignoreAllPending(rows));
    expect(out).toBe(`<p>${long}</p><p>CPF: {{vendedor_cpf}}</p>`);
  });

  it("linha em 'review' (sem decisão) mantém o original — nada de descarte silencioso", () => {
    const html = "<p>[CPF]</p>";
    const rows = buildMappingRows([
      det({ raw: "[CPF]", suggestion: "vendedor_cpf", confidence: "medium", candidates: ["vendedor_cpf"] }),
    ]);
    expect(applyMappingToHtml(html, rows)).toBe("<p>[CPF]</p>");
  });
});

// ============================================================================
// buildImportMetadata — item 4 (persistência p/ re-import e auditoria)
// ============================================================================

describe("buildImportMetadata", () => {
  it("gera payload versionado com thresholds e uma decisão por linha", () => {
    const rows = buildMappingRows([
      det({ raw: "[CPF]", suggestion: "vendedor_cpf", confidence: "high", candidates: ["vendedor_cpf"] }),
      det({ raw: "[DESCREVER]", suggestion: null, confidence: "none" }),
    ]);
    const meta = buildImportMetadata({
      filename: "CONTRATO_AVISTA_EM BRANCO.docx",
      importedAt: "2026-07-13T21:00:00.000Z",
      rows: ignoreAllPending(rows),
    });
    expect(meta.version).toBe(1);
    expect(meta.source).toBe("docx-import");
    expect(meta.filename).toBe("CONTRATO_AVISTA_EM BRANCO.docx");
    expect(meta.imported_at).toBe("2026-07-13T21:00:00.000Z");
    expect(meta.thresholds).toEqual({ high: 0.85, medium: 0.7 });
    expect(meta.decisions).toEqual([
      {
        raw: "[CPF]",
        syntax: "bracket",
        occurrenceIndex: 0,
        confidence: "high",
        suggestion: "vendedor_cpf",
        action: "map",
        targetKey: "vendedor_cpf",
      },
      {
        raw: "[DESCREVER]",
        syntax: "bracket",
        occurrenceIndex: 0,
        confidence: "none",
        suggestion: null,
        action: "ignore",
        targetKey: "",
      },
    ]);
  });
});
