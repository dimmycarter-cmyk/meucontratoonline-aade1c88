/**
 * Supressão de scaffold de campo com estratégia `omit` — e-mail é o único
 * ocupante HOJE (R3).
 *
 * ⚠ ESCOPO REDUZIDO NA 2.2a. R1a/R1b/R2/R4 (RG, órgão, CPF, endereço) foram
 * APOSENTADAS: esses campos migraram para `blank_line`, e a âncora de vazio
 * (`<strong>\s*</strong>`) nunca mais casa neles — a lacuna
 * (`<strong><span class="lacuna">…</span></strong>`) não é whitespace. As
 * regras ficaram inalcançáveis POR CONSTRUÇÃO, não "raramente acionadas".
 *
 * Os testes delas saíram no MESMO commit que o código. Motivo: eles chamavam
 * `suppressEmptyFieldScaffold` DIRETO, com `<strong></strong>` escrito à mão —
 * continuariam VERDES para sempre, exercitando um caminho que produção não
 * alcança. Regra morta com teste vivo é pior que a dívida original. Os NEG
 * (#2/#6/#13, "campo preenchido → intacto") caíram junto: sem R1a/R2, não
 * existe regra que pudesse tocar RG ou CPF — provariam nada.
 *
 * A cobertura do caminho REAL (renderEachItem com campo vazio) vive em
 * template-0-v2.test.ts e template-2-v2.test.ts, que passam pelo pipeline
 * inteiro. Estes aqui são unitários da função.
 *
 * Todos os asserts checam a STRING EXATA pós-supressão (sem espaço duplo, sem
 * espaço antes de vírgula) — a própria função normaliza o whitespace, não
 * dependemos do cleanOrphanPunctuation downstream.
 */
import { describe, it, expect } from "vitest";
import { suppressEmptyFieldScaffold } from "../text-cleanup";

const LACUNA = '<span class="lacuna">__________</span>';

describe("suppressEmptyFieldScaffold — R3 (e-mail)", () => {
  it("#7 e-mail vazio → sub-cláusula some", () => {
    const input =
      "<strong>111.111.111-11</strong>, endereço eletrônico: <strong></strong>, domiciliado";
    expect(suppressEmptyFieldScaffold(input)).toBe(
      "<strong>111.111.111-11</strong>, domiciliado"
    );
  });

  it("#8 e-mail preenchido → intacto (NEG)", () => {
    const input =
      "endereço eletrônico: <strong>joao@x.com</strong>, domiciliado";
    expect(suppressEmptyFieldScaffold(input)).toBe(input);
  });

  it("#9 e-mail vazio no meio da qualificação real → só o e-mail sai", () => {
    // Reescrito na 2.2a: RG/CPF agora chegam aqui como LACUNA (blank_line), não
    // como <strong> vazio. A função não os toca — e não deve.
    const input =
      `engenheiro, portador da Carteira de Identidade nº <strong>${LACUNA}</strong> - <strong>${LACUNA}</strong>, ` +
      `inscrito no CPF sob o nº <strong>${LACUNA}</strong>, endereço eletrônico: <strong></strong>, domiciliado na`;
    expect(suppressEmptyFieldScaffold(input)).toBe(
      `engenheiro, portador da Carteira de Identidade nº <strong>${LACUNA}</strong> - <strong>${LACUNA}</strong>, ` +
        `inscrito no CPF sob o nº <strong>${LACUNA}</strong>, domiciliado na`
    );
  });

  it("#9b a lacuna SOBREVIVE à supressão — nada de <strong> vazio é confundido com lacuna", () => {
    const input = `inscrito no CPF sob o nº <strong>${LACUNA}</strong>, domiciliado`;
    const out = suppressEmptyFieldScaffold(input);
    expect(out).toBe(input);
    expect(out).toContain(LACUNA);
  });

  it("#10 idempotência: aplicar 2x == 1x", () => {
    const input =
      `casado, inscrito no CPF sob o nº <strong>${LACUNA}</strong>, endereço eletrônico: <strong></strong>, domiciliado na`;
    const once = suppressEmptyFieldScaffold(input);
    expect(suppressEmptyFieldScaffold(once)).toBe(once);
  });

  it("#11 seguro com {{#if}} ainda presente (passagem ① per-item)", () => {
    const input =
      "casado, endereço eletrônico: <strong></strong>, domiciliado na {{endereco_rua}}{{#if endereco_complemento}}, {{endereco_complemento}}{{/if}}, Bairro";
    const out = suppressEmptyFieldScaffold(input);
    expect(out).toBe(
      "casado, domiciliado na {{endereco_rua}}{{#if endereco_complemento}}, {{endereco_complemento}}{{/if}}, Bairro"
    );
    expect(out).toContain("{{#if endereco_complemento}}");
  });

  it("#12 FEMININO: e-mail vazio sai; a lacuna de CPF permanece", () => {
    const input =
      `advogada, inscrita no CPF sob o nº <strong>${LACUNA}</strong>, endereço eletrônico: <strong></strong>, domiciliada na`;
    expect(suppressEmptyFieldScaffold(input)).toBe(
      `advogada, inscrita no CPF sob o nº <strong>${LACUNA}</strong>, domiciliada na`
    );
  });

  it("string vazia / falsy → passa intacto", () => {
    expect(suppressEmptyFieldScaffold("")).toBe("");
    expect(suppressEmptyFieldScaffold(null as unknown as string)).toBe(null);
  });
});
