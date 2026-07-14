/**
 * Unitários do pipeline único de render (Fase 2 / 2.1).
 *
 * renderContract é COMPOSIÇÃO do motor existente — estes testes provam o
 * contrato da composição (ordem das etapas, opts, unresolved pré-replace,
 * anexação de cláusulas, resumo de fallback), não re-testam o motor.
 */
import { describe, it, expect } from "vitest";
import {
  renderContract,
  appendClausesHtml,
  buildSummaryHtml,
} from "../render-contract";
import { emptyParticipant, type ManualParticipantData } from "@/components/contract/manual-participant";

function mk(
  role: ManualParticipantData["role"],
  nome: string,
  extra: Partial<ManualParticipantData> = {}
): ManualParticipantData {
  return { ...emptyParticipant(role), nome, ...extra };
}

describe("renderContract — sequência canônica", () => {
  it("expande {{#each}}, resolve {{#if}} e substitui placeholders planos num único passe", () => {
    const template =
      "<p>Vendedores: {{#each vendedores}}{{nome}}{{/each}}.</p>" +
      "{{#if valor_sinal}}<p>Sinal: {{valor_sinal}}</p>{{/if}}" +
      "<p>Total: {{valor_total}}</p>";
    const { html } = renderContract(
      template,
      { valor_total: "R$ 500.000,00" },
      [mk("vendedor", "João Silva", { genero: "M" }), mk("vendedor", "Maria Souza", { genero: "F" })]
    );
    expect(html).toContain("João Silva e Maria Souza");
    expect(html).toContain("Total: R$ 500.000,00");
    // {{#if valor_sinal}} sem dado → bloco removido
    expect(html).not.toContain("Sinal:");
    // nenhum construto sobra
    expect(html).not.toMatch(/\{\{#(each|if)/);
    expect(html).not.toContain("{{/");
  });

  it("template vazio → resultado vazio, sem unresolved", () => {
    const r = renderContract("", { comprador_nome: "Ana" }, []);
    expect(r.html).toBe("");
    expect(r.body).toBe("");
    expect(r.unresolved).toEqual([]);
  });

  it("injeta empresa via opts.company (enrichDados)", () => {
    const { html } = renderContract(
      "<p>{{empresa_nome}} — CNPJ {{empresa_cnpj}}</p>",
      {},
      [],
      { company: { nome_fantasia: "Imobiliária Alfa", cnpj: "12345678000190" } }
    );
    expect(html).toContain("Imobiliária Alfa");
    expect(html).toContain("12.345.678/0001-90"); // formatter aplicado
  });

  it("repassa eachOptions para expandEachBlocks", () => {
    const { html } = renderContract(
      "{{#each vendedores}}{{nome}}{{/each}}",
      {},
      [mk("vendedor", "A"), mk("vendedor", "B"), mk("vendedor", "C")],
      { eachOptions: { separator: "; ", lastSeparator: "; e " } }
    );
    expect(html).toBe("A; B; e C");
  });
});

describe("renderContract — unresolved pré-replace", () => {
  it("detecta placeholder sem dado ANTES do replace (que o omitiria)", () => {
    const r = renderContract(
      "<p>{{comprador_nome}}, CPF {{comprador_cpf}}</p>",
      { comprador_nome: "Ana Prado" },
      []
    );
    expect(r.unresolved).toContain("{{comprador_cpf}}");
    // no html o token já foi consumido pelo fallback (omit)
    expect(r.html).not.toContain("{{comprador_cpf}}");
  });

  it("não flagga derivados que o enrichment resolve (falso positivo eliminado)", () => {
    const r = renderContract(
      "<p>{{valor_total}} ({{valor_total_extenso}})</p>",
      { valor_total: "500000" },
      []
    );
    expect(r.unresolved).toEqual([]);
    expect(r.html).toContain("quinhentos mil reais");
  });

  it("não flagga placeholders dentro de {{#if}} desativado nem de {{#each}} sem participantes", () => {
    const r = renderContract(
      "{{#if procurador_oab}}<p>OAB {{procurador_oab}}</p>{{/if}}" +
        "{{#each fiadores}}<p>{{nome}}, CPF {{cpf}}</p>{{/each}}",
      {},
      []
    );
    expect(r.unresolved).toEqual([]);
  });
});

describe("renderContract — cláusulas (opts.appendClauses)", () => {
  const CLAUSES = [
    { titulo: "Rescisão", conteudo: "<p>Multa de 10%.</p>" },
    { titulo: "foro de eleição", conteudo: "<p>Foro de BH/MG.</p>" },
  ];

  it("anexa bloco de cláusulas byte-idêntico ao formato legado do handleSave", () => {
    const r = renderContract("<p>Corpo.</p>", {}, [], { appendClauses: CLAUSES });
    expect(r.body).toBe("<p>Corpo.</p>");
    expect(r.html).toBe(
      "<p>Corpo.</p>" +
        "\n\n<h2>CLÁUSULAS</h2>\n" +
        "\n<h3>CLÁUSULA 1ª — RESCISÃO</h3>\n<p>Multa de 10%.</p>\n" +
        "\n<h3>CLÁUSULA 2ª — FORO DE ELEIÇÃO</h3>\n<p>Foro de BH/MG.</p>\n"
    );
  });

  it("sem cláusulas ⇒ html === body", () => {
    const r = renderContract("<p>Corpo.</p>", {}, []);
    expect(r.html).toBe(r.body);
    expect(appendClausesHtml("<p>X</p>", [])).toBe("<p>X</p>");
  });

  it("unresolved é calculado no corpo, não nas cláusulas", () => {
    const r = renderContract("<p>{{comprador_nome}}</p>", {}, [], {
      appendClauses: [{ titulo: "T", conteudo: "<p>{{token_da_clausula}}</p>" }],
    });
    expect(r.unresolved).toEqual(["{{comprador_nome}}"]);
  });
});

describe("buildSummaryHtml — resumo de fallback (movido do handleSave)", () => {
  it("gera seções apenas para prefixos com dados, com labels humanizados", () => {
    const html = buildSummaryHtml({
      comprador_nome: "Ana Prado",
      comprador_estado_civil: "solteira",
      valor_total: "R$ 100.000,00",
      vendedor_nome: "", // vazio → seção VENDEDOR omitida
    });
    expect(html).toContain("<h2>RESUMO DO CONTRATO</h2>");
    expect(html).toContain("<h3>COMPRADOR</h3>");
    expect(html).toContain("<li><strong>Nome:</strong> Ana Prado</li>");
    expect(html).toContain("<li><strong>Estado Civil:</strong> solteira</li>");
    expect(html).toContain("<h3>VALORES</h3>");
    expect(html).not.toContain("<h3>VENDEDOR</h3>");
  });

  it("sem dados ⇒ apenas o cabeçalho", () => {
    expect(buildSummaryHtml({})).toBe("<h2>RESUMO DO CONTRATO</h2>\n");
  });
});
