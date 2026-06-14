/**
 * Frente 4.D — supressão de scaffold de qualificação com campo vazio
 * (RG/órgão, CPF, e-mail). Itens de endereço (4/5) estão FORA — resolvidos
 * pela migração granular→composto.
 *
 * Todos os asserts checam a STRING EXATA pós-supressão (sem espaço duplo, sem
 * espaço antes de vírgula) — a própria suppressEmptyFieldScaffold normaliza o
 * whitespace, não dependemos do cleanOrphanPunctuation downstream.
 *
 * Coração da frente: campo PREENCHIDO (`<strong>887...</strong>`) nunca casa a
 * âncora de vazio → vírgula e "-" legítimos permanecem (caso Antonio, #6).
 */
import { describe, it, expect } from "vitest";
import { suppressEmptyFieldScaffold } from "../text-cleanup";

describe("suppressEmptyFieldScaffold — itens 1-3 (RG/CPF/email)", () => {
  it("#1 RG+órgão ambos vazios → cláusula inteira some", () => {
    const input =
      "engenheiro, portador da Carteira de Identidade nº <strong></strong> - <strong></strong>, inscrito no CPF sob o nº <strong>111.111.111-11</strong>, domiciliado";
    expect(suppressEmptyFieldScaffold(input)).toBe(
      "engenheiro, inscrito no CPF sob o nº <strong>111.111.111-11</strong>, domiciliado"
    );
  });

  it("#2 RG+órgão ambos preenchidos → intacto (NEG)", () => {
    const input =
      "engenheiro, portador da Carteira de Identidade nº <strong>MG-1</strong> - <strong>SSP/MG</strong>, inscrito no CPF sob o nº <strong>111.111.111-11</strong>, domiciliado";
    expect(suppressEmptyFieldScaffold(input)).toBe(input);
  });

  it("#3 PARCIAL: RG preenchido + órgão vazio → cai só o hífen pendurado", () => {
    const input =
      "portador da Carteira de Identidade nº <strong>MG-1</strong> - <strong></strong>, inscrito";
    expect(suppressEmptyFieldScaffold(input)).toBe(
      "portador da Carteira de Identidade nº <strong>MG-1</strong>, inscrito"
    );
  });

  it("#4 PARCIAL inverso: RG vazio + órgão preenchido → cláusula inteira some (assimetria)", () => {
    // Órgão NÃO pode virar "número": RG vazio derruba tudo, mesmo com órgão presente.
    const input =
      "engenheiro, portador da Carteira de Identidade nº <strong></strong> - <strong>SSP/MG</strong>, inscrito no CPF sob o nº <strong>111.111.111-11</strong>, domiciliado";
    expect(suppressEmptyFieldScaffold(input)).toBe(
      "engenheiro, inscrito no CPF sob o nº <strong>111.111.111-11</strong>, domiciliado"
    );
  });

  it("#5 CPF vazio → sub-cláusula some", () => {
    const input =
      "<strong>SSP/MG</strong>, inscrito no CPF sob o nº <strong></strong>, endereço eletrônico: <strong>joao@x.com</strong>, domiciliado";
    expect(suppressEmptyFieldScaffold(input)).toBe(
      "<strong>SSP/MG</strong>, endereço eletrônico: <strong>joao@x.com</strong>, domiciliado"
    );
  });

  it("#6 CPF preenchido — ANTONIO (NEG crítico): vírgula E o '-' do CPF ficam", () => {
    const input =
      "inscrito no CPF sob o nº <strong>887.616.656-49</strong>, endereço";
    const out = suppressEmptyFieldScaffold(input);
    expect(out).toBe(input);
    // CPF (com o "-" interno) + </strong> + vírgula seguem intactos.
    expect(out).toContain("887.616.656-49</strong>,");
  });

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

  it("#9 os 3 vazios juntos → só sobra o fecho", () => {
    const input =
      "engenheiro, portador da Carteira de Identidade nº <strong></strong> - <strong></strong>, inscrito no CPF sob o nº <strong></strong>, endereço eletrônico: <strong></strong>, domiciliado na";
    expect(suppressEmptyFieldScaffold(input)).toBe("engenheiro, domiciliado na");
  });

  it("#10 idempotência: aplicar 2x == 1x", () => {
    const input =
      "engenheiro, portador da Carteira de Identidade nº <strong></strong> - <strong></strong>, inscrito no CPF sob o nº <strong></strong>, endereço eletrônico: <strong></strong>, domiciliado na";
    const once = suppressEmptyFieldScaffold(input);
    expect(suppressEmptyFieldScaffold(once)).toBe(once);
  });

  it("#11 seguro com {{#if}} ainda presente (passagem ① per-item)", () => {
    const input =
      "casado, inscrito no CPF sob o nº <strong></strong>, endereço eletrônico: <strong></strong>, domiciliado na {{endereco_rua}}{{#if endereco_complemento}}, {{endereco_complemento}}{{/if}}, Bairro";
    const out = suppressEmptyFieldScaffold(input);
    expect(out).toBe(
      "casado, domiciliado na {{endereco_rua}}{{#if endereco_complemento}}, {{endereco_complemento}}{{/if}}, Bairro"
    );
    expect(out).toContain("{{#if endereco_complemento}}");
  });

  it("#12 FEMININO: portadora/inscrita com RG/CPF/email vazios → sub-cláusulas somem", () => {
    const input =
      "advogada, portadora da Carteira de Identidade nº <strong></strong> - <strong></strong>, inscrita no CPF sob o nº <strong></strong>, endereço eletrônico: <strong></strong>, domiciliada na";
    expect(suppressEmptyFieldScaffold(input)).toBe("advogada, domiciliada na");
  });

  it("#13 FEMININO Antonia — CPF preenchido → intacto (NEG)", () => {
    const input =
      "inscrita no CPF sob o nº <strong>987.654.321-00</strong>, endereço";
    const out = suppressEmptyFieldScaffold(input);
    expect(out).toBe(input);
    expect(out).toContain("987.654.321-00</strong>,");
  });

  it("string vazia / falsy → passa intacto", () => {
    expect(suppressEmptyFieldScaffold("")).toBe("");
    expect(suppressEmptyFieldScaffold(null as unknown as string)).toBe(null);
  });
});
