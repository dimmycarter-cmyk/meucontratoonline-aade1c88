import { describe, it, expect } from "vitest";
import { enrichDados, type CompanyData } from "../contract-enrichment";
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
