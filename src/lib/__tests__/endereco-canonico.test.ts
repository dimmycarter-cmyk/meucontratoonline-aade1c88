import { describe, it, expect, vi } from "vitest";
import {
  composeEnderecoCanonico,
  isValidCep,
  type EnderecoParts,
} from "../contract-formatters";
import { enrichDados, type CompanyData } from "../contract-enrichment";
import { autoFillDadosFromParticipants } from "../auto-fill-dados";
import { emptyParticipant, type ManualParticipantData } from "@/components/contract/ManualParticipantCard";

function mk(
  role: ManualParticipantData["role"],
  nome: string,
  extra: Partial<ManualParticipantData> = {}
): ManualParticipantData {
  return { ...emptyParticipant(role), nome, ...extra };
}

describe("composeEnderecoCanonico — função pura", () => {
  it("endereço completo, normalizado", () => {
    const out = composeEnderecoCanonico({
      rua: "Avenida Brasil",
      numero: "1500",
      complemento: "Apto 302",
      bairro: "Centro",
      cidade: "Belo Horizonte",
      estado: "mg",
      cep: "30130000",
    });
    expect(out).toBe(
      "Avenida Brasil, nº 1500, Apto 302, Bairro Centro, Belo Horizonte/MG, CEP 30130-000"
    );
  });

  it("sem complemento — não emite vírgula órfã", () => {
    const out = composeEnderecoCanonico({
      rua: "Rua das Flores",
      numero: "100",
      bairro: "Vila Nova",
      cidade: "Curitiba",
      estado: "PR",
      cep: "80000123",
    });
    expect(out).toBe(
      "Rua das Flores, nº 100, Bairro Vila Nova, Curitiba/PR, CEP 80000-123"
    );
  });

  it("sem número, com rua → s/n", () => {
    const out = composeEnderecoCanonico({
      rua: "Estrada do Sertão",
      bairro: "Zona Rural",
      cidade: "Diamantina",
      estado: "MG",
      cep: "39100000",
    });
    expect(out).toBe(
      "Estrada do Sertão, s/n, Bairro Zona Rural, Diamantina/MG, CEP 39100-000"
    );
  });

  it("sem rua e sem número — não emite s/n órfão", () => {
    const out = composeEnderecoCanonico({
      bairro: "Centro",
      cidade: "Recife",
      estado: "PE",
    });
    expect(out).toBe("Bairro Centro, Recife/PE");
  });

  it("sem bairro e sem CEP — omite elegante", () => {
    const out = composeEnderecoCanonico({
      rua: "Rua Augusta",
      numero: "2500",
      complemento: "Sala 12",
      cidade: "São Paulo",
      estado: "SP",
    });
    expect(out).toBe("Rua Augusta, nº 2500, Sala 12, São Paulo/SP");
  });

  it("apenas cidade (sem UF)", () => {
    const out = composeEnderecoCanonico({ cidade: "Brasília" });
    expect(out).toBe("Brasília");
  });

  it("apenas UF (sem cidade)", () => {
    const out = composeEnderecoCanonico({ estado: "sp" });
    expect(out).toBe("SP");
  });

  it("entrada vazia → string vazia", () => {
    expect(composeEnderecoCanonico({})).toBe("");
  });

  it("colapsa espaços múltiplos no logradouro e complemento", () => {
    const out = composeEnderecoCanonico({
      rua: "Rua   das    Flores",
      numero: "10",
      complemento: "Apto  3  - Bloco  B",
      cidade: "São Paulo",
      estado: "SP",
    });
    expect(out).toBe(
      "Rua das Flores, nº 10, Apto 3 - Bloco B, São Paulo/SP"
    );
  });

  it("UF lowercase é normalizada para uppercase", () => {
    const out = composeEnderecoCanonico({
      rua: "Rua X",
      numero: "1",
      cidade: "Salvador",
      estado: "ba",
    });
    expect(out).toBe("Rua X, nº 1, Salvador/BA");
  });

  it("CEP com hífen é normalizado para padrão 5+3", () => {
    const out = composeEnderecoCanonico({
      rua: "Rua Y",
      numero: "1",
      cep: "30000-000",
    });
    expect(out).toContain("CEP 30000-000");
  });

  it("CEP só com 7 dígitos é emitido cru (sem formatar)", () => {
    const out = composeEnderecoCanonico({
      rua: "Rua Z",
      numero: "1",
      cep: "3013000",
    });
    expect(out).toContain("CEP 3013000");
  });

  it("CEP com lixo é emitido cru (formatador é honesto)", () => {
    const out = composeEnderecoCanonico({
      rua: "Rua W",
      numero: "1",
      cep: "abc-def",
    });
    expect(out).toContain("CEP abc-def");
  });

  it("trata null e undefined indistintamente", () => {
    const out = composeEnderecoCanonico({
      rua: "Rua A",
      numero: null,
      complemento: undefined,
      bairro: "",
      cidade: "São Paulo",
      estado: "SP",
      cep: null,
    });
    expect(out).toBe("Rua A, s/n, São Paulo/SP");
  });
});

describe("isValidCep", () => {
  it("aceita 8 dígitos sem hífen", () => {
    expect(isValidCep("30130000")).toBe(true);
  });

  it("aceita 8 dígitos com hífen", () => {
    expect(isValidCep("30130-000")).toBe(true);
  });

  it("rejeita tamanho errado", () => {
    expect(isValidCep("3013000")).toBe(false);
    expect(isValidCep("301300000")).toBe(false);
  });

  it("rejeita vazio/nulo", () => {
    expect(isValidCep("")).toBe(false);
    expect(isValidCep(null)).toBe(false);
    expect(isValidCep(undefined)).toBe(false);
  });

  it("rejeita string sem 8 dígitos", () => {
    expect(isValidCep("abc-def")).toBe(false);
  });
});

describe("warnings de CEP malformado", () => {
  it("emite warning quando company.cep é truthy mas inválido", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const company: CompanyData = { nome_fantasia: "X", cep: "3013000" };
      enrichDados({}, { company });
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0]).toMatch(/CEP malformado em empresa/);
    } finally {
      spy.mockRestore();
    }
  });

  it("NÃO emite warning quando CEP é vazio", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const company: CompanyData = { nome_fantasia: "X", cep: "" };
      enrichDados({}, { company });
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it("emite warning para participante com CEP malformado, identificando o slot", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      autoFillDadosFromParticipants([
        mk("vendedor", "Pessoa A", { cep: "abc-def" }),
        mk("comprador", "Pessoa B", { cep: "12345678" }), // válido
      ]);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0]).toMatch(/CEP malformado em vendedor/);
    } finally {
      spy.mockRestore();
    }
  });
});

describe("integração — formato canônico vale para TODOS os slots", () => {
  it("aplica a mesma função a vendedor, vendedor2, comprador, comprador2, conjuge", () => {
    const dados = autoFillDadosFromParticipants([
      mk("vendedor", "V1", {
        rua: "Rua A",
        numero: "1",
        bairro: "Centro",
        cidade: "Belo Horizonte",
        estado: "MG",
        cep: "30000000",
      }),
      mk("vendedor", "V2", {
        rua: "Rua B",
        bairro: "Savassi",
        cidade: "Belo Horizonte",
        estado: "MG",
        cep: "30100000",
      }),
      mk("comprador", "C1", {
        rua: "Av X",
        numero: "100",
        cidade: "São Paulo",
        estado: "SP",
        cep: "01000000",
      }),
      mk("comprador", "C2", {
        rua: "Av Y",
        numero: "200",
        complemento: "Apto 7",
        cidade: "São Paulo",
        estado: "SP",
      }),
      mk("conjuge", "K1", {
        rua: "Rua C",
        numero: "300",
        cidade: "Rio de Janeiro",
        estado: "RJ",
        cep: "20000000",
      }),
    ]);

    expect(dados.vendedor_endereco).toBe(
      "Rua A, nº 1, Bairro Centro, Belo Horizonte/MG, CEP 30000-000"
    );
    expect(dados.vendedor2_endereco).toBe(
      "Rua B, s/n, Bairro Savassi, Belo Horizonte/MG, CEP 30100-000"
    );
    expect(dados.comprador_endereco).toBe(
      "Av X, nº 100, São Paulo/SP, CEP 01000-000"
    );
    expect(dados.comprador2_endereco).toBe(
      "Av Y, nº 200, Apto 7, São Paulo/SP"
    );
    expect(dados.conjuge_endereco).toBe(
      "Rua C, nº 300, Rio de Janeiro/RJ, CEP 20000-000"
    );
  });

  it("aplica a mesma função a empresa_endereco", () => {
    const company: CompanyData = {
      nome_fantasia: "Imobiliária Teste",
      rua: "Av. Brasil",
      numero: "1500",
      complemento: "Sala 405",
      bairro: "Centro",
      cidade: "Belo Horizonte",
      estado: "MG",
      cep: "30130000",
    };
    const dados = enrichDados({}, { company });
    expect(dados.empresa_endereco).toBe(
      "Av. Brasil, nº 1500, Sala 405, Bairro Centro, Belo Horizonte/MG, CEP 30130-000"
    );
  });

  it("aplica a mesma função a participante de role anuente", () => {
    const dados = autoFillDadosFromParticipants([
      mk("anuente", "Anuente Teste", {
        rua: "Rua Anuente",
        numero: "50",
        cidade: "Curitiba",
        estado: "PR",
        cep: "80000000",
      }),
    ]);
    expect(dados.anuente_endereco).toBe(
      "Rua Anuente, nº 50, Curitiba/PR, CEP 80000-000"
    );
  });
});
