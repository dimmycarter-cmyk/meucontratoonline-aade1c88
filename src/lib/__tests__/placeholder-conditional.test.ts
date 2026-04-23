import { describe, it, expect } from "vitest";
import {
  stripConditionalBlocks,
  preprocessTemplate,
  getUnresolvedPlaceholders,
} from "../placeholder";
import { seedComProcurador, seedComProcuradorParcial } from "./fixtures/seed-com-procurador";
import { seedSemProcurador } from "./fixtures/seed-sem-procurador";

const TEMPLATE_PROCURADOR = `Contrato de Compra e Venda.

Comprador: {{comprador_nome}}
Vendedor: {{vendedor_nome}}

{{#if tem_procurador}}
O VENDEDOR é representado por seu(sua) procurador(a) {{procurador_nome}}, portador(a) do CPF nº {{procurador_cpf}}{{#if procurador_oab}}, OAB nº {{procurador_oab}}{{/if}}, conforme procuração lavrada em {{procurador_data_procuracao}} no {{procurador_cartorio_procuracao}}.
{{/if}}

Local e data: São Paulo.`;

describe("stripConditionalBlocks — bloco simples", () => {
  it("Teste 1: tem_procurador=true → mantém conteúdo, remove tags", () => {
    const out = stripConditionalBlocks(TEMPLATE_PROCURADOR, seedComProcurador);
    expect(out).not.toContain("{{#if");
    expect(out).not.toContain("{{/if}}");
    expect(out).toContain("{{procurador_nome}}");
    expect(out).toContain("O VENDEDOR é representado");
  });

  it("Teste 2: tem_procurador=false → remove bloco inteiro", () => {
    const out = stripConditionalBlocks(TEMPLATE_PROCURADOR, seedSemProcurador);
    expect(out).not.toContain("procurador");
    expect(out).not.toContain("{{procurador_");
    expect(out).not.toContain("O VENDEDOR é representado");
  });

  it("Teste 3: flag ausente é tratada como false", () => {
    const out = stripConditionalBlocks(TEMPLATE_PROCURADOR, { vendedor_nome: "X" });
    expect(out).not.toContain("procurador");
  });
});

describe("getUnresolvedPlaceholders + preprocessTemplate", () => {
  it("Teste 4: seed-sem-procurador → zero pendências da categoria Procuração", () => {
    const processed = preprocessTemplate(TEMPLATE_PROCURADOR, seedSemProcurador);
    const pending = getUnresolvedPlaceholders(processed, seedSemProcurador);
    const procuradorPending = pending.filter((p) => p.includes("procurador"));
    expect(procuradorPending).toEqual([]);
  });

  it("Teste 5: seed-com-procurador parcial → lista só faltantes da Procuração", () => {
    const processed = preprocessTemplate(TEMPLATE_PROCURADOR, seedComProcuradorParcial);
    const pending = getUnresolvedPlaceholders(processed, seedComProcuradorParcial);
    // procurador_nome e procurador_cpf estão preenchidos → não devem aparecer
    expect(pending).not.toContain("{{procurador_nome}}");
    expect(pending).not.toContain("{{procurador_cpf}}");
    // os outros precisam aparecer
    expect(pending).toContain("{{procurador_data_procuracao}}");
    expect(pending).toContain("{{procurador_cartorio_procuracao}}");
  });
});

describe("stripConditionalBlocks — blocos aninhados", () => {
  it("Teste 6: aninhado com procurador_oab presente → vírgula + 'OAB nº' aparecem", () => {
    const processed = preprocessTemplate(TEMPLATE_PROCURADOR, seedComProcurador);
    // depois do replace ainda tem placeholders simples; basta checar o esqueleto
    expect(processed).toContain(", OAB nº {{procurador_oab}}");
  });

  it("Teste 7: aninhado com procurador_oab ausente → vírgula solta + 'OAB nº' NÃO aparecem", () => {
    // Cenário: tem_procurador=true mas SEM procurador_oab
    const data: Record<string, string> = {
      ...seedComProcurador,
      procurador_oab: "", // explicitamente vazio → tratado como false pelo strip
    };
    const processed = preprocessTemplate(TEMPLATE_PROCURADOR, data);
    expect(processed).not.toContain("OAB nº");
    // a vírgula imediatamente antes de "OAB" não deve sobrar isolada
    expect(processed).not.toMatch(/\{\{procurador_cpf\}\},\s*,/);
    // bloco externo continua visível
    expect(processed).toContain("O VENDEDOR é representado");
  });
});
