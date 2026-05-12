import { describe, it, expect } from "vitest";
import { enrichDados, type CompanyData } from "../contract-enrichment";
import { decomposeData } from "../contract-formatters";
import { replacePlaceholders } from "../placeholder";

const TEMPLATE_HTML = `
<p>INTERVENIENTE ANUENTE — IMOBILIÁRIA: {{empresa_nome}}, inscrita no CNPJ sob o nº {{empresa_cnpj}},
CRECI {{empresa_creci}}, com sede em {{empresa_endereco}}, e-mail {{empresa_email}},
WhatsApp {{empresa_whatsapp}}.</p>
<p>Conta da imobiliária: Banco {{empresa_banco}}, Ag. {{empresa_agencia}}, C/C {{empresa_conta}},
PIX {{empresa_pix}}.</p>
`;

describe("enrichDados — injeção de dados da empresa (Ajuste 11)", () => {
  it("injeta CRECI, banco, agência, conta e PIX a partir da company", () => {
    const company: CompanyData = {
      nome_fantasia: "Imobiliária Exemplo",
      cnpj: "12345678000190",
      creci: "CRECI-MG 99999-J",
      email: "contato@exemplo.test",
      whatsapp: "31999991234",
      rua: "Av. Teste",
      numero: "100",
      bairro: "Centro",
      cidade: "Belo Horizonte",
      estado: "MG",
      cep: "30000000",
      banco: "Banco Teste S.A.",
      agencia: "0001",
      conta: "12345-6",
      pix: "contato@exemplo.test",
    };

    const dados = enrichDados({}, { company });

    expect(dados.empresa_creci).toBe("CRECI-MG 99999-J");
    expect(dados.empresa_banco).toBe("Banco Teste S.A.");
    expect(dados.empresa_agencia).toBe("0001");
    expect(dados.empresa_conta).toBe("12345-6");
    expect(dados.empresa_pix).toBe("contato@exemplo.test");
  });

  it("preenche placeholders no template HTML após enriquecimento", () => {
    const company: CompanyData = {
      nome_fantasia: "Imobiliária Exemplo",
      cnpj: "12345678000190",
      creci: "CRECI-SP 12345-J",
      email: "contato@exemplo.test",
      whatsapp: "11999998888",
      rua: "Rua A",
      numero: "200",
      bairro: "Vila Y",
      cidade: "São Paulo",
      estado: "SP",
      cep: "01000000",
      banco: "Banco Teste",
      agencia: "1234",
      conta: "98765-0",
      pix: "contato@exemplo.test",
    };

    const dados = enrichDados({}, { company });
    const rendered = replacePlaceholders(TEMPLATE_HTML, dados);

    expect(rendered).toContain("CRECI CRECI-SP 12345-J");
    expect(rendered).toContain("Banco Banco Teste");
    expect(rendered).toContain("Ag. 1234");
    expect(rendered).toContain("C/C 98765-0");
    expect(rendered).toContain("PIX contato@exemplo.test");
    expect(rendered).not.toContain("{{empresa_");
  });

  it("não sobrescreve valores manuais já presentes em dados", () => {
    const company: CompanyData = {
      nome_fantasia: "Imobiliária Padrão",
      creci: "CRECI-MG 00000-J",
      banco: "Banco Padrão",
    };

    const dados = enrichDados(
      {
        empresa_creci: "CRECI-RJ 77777-J",
        empresa_banco: "Banco Override",
      },
      { company }
    );

    expect(dados.empresa_creci).toBe("CRECI-RJ 77777-J");
    expect(dados.empresa_banco).toBe("Banco Override");
  });

  it("deixa placeholders bancários não resolvidos quando company não tem os campos", () => {
    const company: CompanyData = {
      nome_fantasia: "Imobiliária Sem Banco",
      cnpj: "12345678000190",
      creci: "CRECI-MG 12345-J",
    };

    const dados = enrichDados({}, { company });

    expect(dados.empresa_creci).toBe("CRECI-MG 12345-J");
    expect(dados.empresa_banco).toBeUndefined();
    expect(dados.empresa_agencia).toBeUndefined();
    expect(dados.empresa_conta).toBeUndefined();
    expect(dados.empresa_pix).toBeUndefined();
  });
});

describe("decomposeData (Sprint 2 ajuste-12 / BUG 6)", () => {
  it("decompõe string ISO yyyy-mm-dd em dia/mes/ano", () => {
    expect(decomposeData("2026-05-12")).toEqual({
      dia: "12",
      mes: "maio",
      ano: "2026",
    });
  });

  it("decompõe string dd/mm/yyyy", () => {
    expect(decomposeData("01/01/2030")).toEqual({
      dia: "1",
      mes: "janeiro",
      ano: "2030",
    });
  });

  it("decompõe objeto Date", () => {
    expect(decomposeData(new Date(2025, 11, 25))).toEqual({
      dia: "25",
      mes: "dezembro",
      ano: "2025",
    });
  });

  it("retorna null para entrada inválida/vazia", () => {
    expect(decomposeData("")).toBeNull();
    expect(decomposeData(null)).toBeNull();
    expect(decomposeData(undefined)).toBeNull();
    expect(decomposeData("não é data")).toBeNull();
  });

  it("dia sem zero-padding (estilo PT-BR jurídico)", () => {
    // "1 de maio", não "01 de maio".
    expect(decomposeData("2026-05-01")?.dia).toBe("1");
  });
});

describe("enrichDados — deriva data_dia/data_mes/data_ano (BUG 6)", () => {
  it("preenche as 3 partes quando só data_contrato existe", () => {
    const dados = enrichDados({ data_contrato: "2026-05-12" });
    expect(dados.data_dia).toBe("12");
    expect(dados.data_mes).toBe("maio");
    expect(dados.data_ano).toBe("2026");
  });

  it("também preenche data_contrato_extenso e _curta", () => {
    const dados = enrichDados({
      data_contrato: "2026-05-12",
      cidade_contrato: "Belo Horizonte",
    });
    expect(dados.data_contrato_curta).toBe("12/05/2026");
    expect(dados.data_contrato_extenso).toBe("Belo Horizonte, 12 de maio de 2026");
  });

  it("não sobrescreve data_dia/mes/ano se já preenchidos manualmente", () => {
    const dados = enrichDados({
      data_contrato: "2026-05-12",
      data_dia: "1",
      data_mes: "abril",
    });
    expect(dados.data_dia).toBe("1");
    expect(dados.data_mes).toBe("abril");
    // data_ano não foi setado manualmente — deve ser derivado
    expect(dados.data_ano).toBe("2026");
  });

  it("não preenche partes se data_contrato ausente", () => {
    const dados = enrichDados({});
    expect(dados.data_dia).toBeUndefined();
    expect(dados.data_mes).toBeUndefined();
    expect(dados.data_ano).toBeUndefined();
  });

  it("renderiza template 'de DIA de MES de ANO' corretamente", () => {
    const dados = enrichDados({ data_contrato: "2026-05-12" });
    const html = "de {{data_dia}} de {{data_mes}} de {{data_ano}}.";
    const out = replacePlaceholders(html, dados);
    expect(out).toBe("de 12 de maio de 2026.");
  });
});

describe("enrichDados — alias empresa ↔ intermediadora1 (BUG 3)", () => {
  it("propaga empresa_nome/cnpj/banco/etc para intermediadora1_*", () => {
    const company: CompanyData = {
      nome_fantasia: "Imobi Teste",
      cnpj: "12345678000190",
      banco: "Banco Imobi",
      agencia: "0042",
      conta: "12345-6",
      pix: "imobi@teste.com",
    };

    const dados = enrichDados({}, { company });

    expect(dados.intermediadora1_nome).toBe("Imobi Teste");
    expect(dados.intermediadora1_cnpj).toBe("12.345.678/0001-90");
    expect(dados.intermediadora1_banco).toBe("Banco Imobi");
    expect(dados.intermediadora1_agencia).toBe("0042");
    expect(dados.intermediadora1_conta).toBe("12345-6");
    expect(dados.intermediadora1_pix).toBe("imobi@teste.com");
  });

  it("preserva intermediadora1 preenchida manualmente (não sobrescreve)", () => {
    const company: CompanyData = {
      nome_fantasia: "Empresa Tenant",
      cnpj: "11111111000111",
    };

    const dados = enrichDados(
      {
        intermediadora1_nome: "Outra Imobiliária",
        intermediadora1_cnpj: "22222222000222",
      },
      { company }
    );

    expect(dados.intermediadora1_nome).toBe("Outra Imobiliária");
    expect(dados.intermediadora1_cnpj).toBe("22.222.222/0002-22");
  });

  it("propaga intermediadora1 manual para empresa_* quando vazia (bidirecional)", () => {
    // Cenário: contrato antigo onde só intermediadora1 foi preenchida.
    // Aliases bidirecionais garantem que empresa_* (template canônico)
    // também renderiza.
    const dados = enrichDados({
      intermediadora1_nome: "Imobi Avulsa",
      intermediadora1_cnpj: "33333333000133",
    });

    expect(dados.empresa_nome).toBe("Imobi Avulsa");
    expect(dados.empresa_cnpj).toBe("33.333.333/0001-33");
  });
});
