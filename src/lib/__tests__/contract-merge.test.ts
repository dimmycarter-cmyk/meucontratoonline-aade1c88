/**
 * Unitários do merge campo-a-campo do salvamento (Fase 2 / 2.1) —
 * buildMergedDados replica os STEPs 1 e 2 do handleSave legado.
 * Os testes documentam as semânticas PRESERVADAS (inclusive as assimétricas).
 */
import { describe, it, expect } from "vitest";
import { buildMergedDados, type MergeDadosInput } from "../contract-merge";
import { emptyParticipant, type ManualParticipantData } from "@/components/contract/manual-participant";

function mk(
  role: ManualParticipantData["role"],
  nome: string,
  extra: Partial<ManualParticipantData> = {}
): ManualParticipantData {
  return { ...emptyParticipant(role), nome, ...extra };
}

function baseInput(overrides: Partial<MergeDadosInput> = {}): MergeDadosInput {
  return {
    dados: {},
    dadosDirty: new Set<string>(),
    flowMode: "manual",
    manualParticipants: [],
    aiDados: {},
    ...overrides,
  };
}

describe("buildMergedDados — autofill manual (STEP 1)", () => {
  it("preenche chaves indexadas CRUAS a partir de manualParticipants (sem enrich)", () => {
    const merged = buildMergedDados(
      baseInput({
        manualParticipants: [
          mk("vendedor", "João Silva", { cpf: "11111111111" }),
          mk("vendedor", "Pedro Costa"),
        ],
      })
    );
    expect(merged.vendedor_nome).toBe("João Silva");
    expect(merged.vendedor2_nome).toBe("Pedro Costa");
    // cru: sem injeção de empresa nem derivados
    expect(merged.empresa_nome).toBeUndefined();
    expect(merged.valor_total_extenso).toBeUndefined();
  });

  it("respeita dadosDirty — chave editada à mão não é sobrescrita pelo autofill", () => {
    const merged = buildMergedDados(
      baseInput({
        dados: { vendedor_profissao: "editada à mão" },
        dadosDirty: new Set(["vendedor_profissao"]),
        manualParticipants: [mk("vendedor", "João Silva", { profissao: "engenheiro" })],
      })
    );
    expect(merged.vendedor_profissao).toBe("editada à mão");
    expect(merged.vendedor_nome).toBe("João Silva");
  });

  it("função pura — não modifica dados de entrada", () => {
    const dados = { valor_total: "100" };
    buildMergedDados(baseInput({ dados, manualParticipants: [mk("vendedor", "J")] }));
    expect(dados).toEqual({ valor_total: "100" });
  });
});

describe("buildMergedDados — contatos legados (paridade com produção)", () => {
  const CONTATO = {
    nome: "Carlos Lima",
    cpf: "22222222222",
    genero: "M",
    rua: "Av. Central",
    numero: "1000",
    complemento: "",
    bairro: "Centro",
    cidade: "Belo Horizonte",
    estado: "MG",
    cep: "30100000",
  };

  it("sobrescreve INCONDICIONALMENTE campo truthy por campo truthy (mesmo sobre chave dirty)", () => {
    const merged = buildMergedDados(
      baseInput({
        dados: { comprador_nome: "valor dirty" },
        dadosDirty: new Set(["comprador_nome"]),
        comprador: CONTATO,
      })
    );
    // contato legado vence até dirty — comportamento de produção preservado
    expect(merged.comprador_nome).toBe("Carlos Lima");
    expect(merged.comprador_genero).toBe("M");
  });

  it("campo vazio do contato NÃO apaga o valor existente", () => {
    const merged = buildMergedDados(
      baseInput({
        dados: { vendedor_email: "mantido@x.com" },
        vendedor: { ...CONTATO, email: "" },
      })
    );
    expect(merged.vendedor_email).toBe("mantido@x.com");
  });

  it("compõe endereço canônico do contato e da empresa", () => {
    const merged = buildMergedDados(
      baseInput({
        comprador: CONTATO,
        empresa: {
          nome_fantasia: "Imobiliária Alfa",
          cnpj: "12345678000190",
          rua: "Rua B",
          numero: "20",
          bairro: "Savassi",
          cidade: "Belo Horizonte",
          estado: "MG",
          cep: "30110000",
        },
      })
    );
    expect(merged.comprador_endereco).toContain("Av. Central");
    expect(merged.comprador_endereco).toContain("Belo Horizonte");
    expect(merged.empresa_nome).toBe("Imobiliária Alfa");
    expect(merged.empresa_endereco).toContain("Rua B");
  });
});

describe("buildMergedDados — precedência AI vs manual (STEP 2)", () => {
  it("freshDados (manual/wizard) vence sobre aiDados na colisão; chave só-AI sobrevive", () => {
    const merged = buildMergedDados(
      baseInput({
        dados: { comprador_cpf: "manual" },
        aiDados: { comprador_cpf: "ai", comprador_rg: "rg-da-ai" },
      })
    );
    expect(merged.comprador_cpf).toBe("manual");
    expect(merged.comprador_rg).toBe("rg-da-ai");
  });
});

describe("buildMergedDados — fallback de nomes", () => {
  it("fluxo AI: usa full_name do participante e depois da extração", () => {
    const merged = buildMergedDados(
      baseInput({
        flowMode: "ai",
        participants: [
          { id: "p1", role: "comprador", full_name: "Ana do Cadastro" },
          { id: "p2", role: "vendedor", full_name: "" },
        ],
        extractedData: [{ participantId: "p2", full_name: "Beto da Extração" }],
      })
    );
    expect(merged.comprador_nome).toBe("Ana do Cadastro");
    expect(merged.vendedor_nome).toBe("Beto da Extração");
  });

  it("fluxo AI: não sobrescreve nome já presente no merge", () => {
    const merged = buildMergedDados(
      baseInput({
        flowMode: "ai",
        dados: { comprador_nome: "Nome do Wizard" },
        participants: [{ id: "p1", role: "comprador", full_name: "Outro Nome" }],
      })
    );
    expect(merged.comprador_nome).toBe("Nome do Wizard");
  });

  it("fluxo manual: primeiro comprador/vendedor preenche nome ausente", () => {
    const merged = buildMergedDados(
      baseInput({
        // participante sem nome não passa pelo autofill (pula vazios),
        // mas o fallback de nome usa o primeiro do papel mesmo assim
        manualParticipants: [mk("comprador", "Ana Prado"), mk("comprador", "Segunda Pessoa")],
        dados: {},
      })
    );
    expect(merged.comprador_nome).toBe("Ana Prado");
    expect(merged.vendedor_nome).toBeUndefined();
  });
});
