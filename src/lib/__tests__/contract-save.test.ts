import { describe, it, expect } from "vitest";
import {
  resolveSaveMode,
  buildDraftContractPayload,
  buildFinalContractPayload,
  buildParticipantRows,
  diffParticipants,
  type ParticipantRow,
} from "../contract-save";

describe("resolveSaveMode — salvar-retomar-salvar não duplica linha", () => {
  it("com :id (retomada) → update (UPDATE na linha, sem nova linha)", () => {
    expect(resolveSaveMode("18db1b7d")).toBe("update");
  });
  it("sem :id (novo) → insert", () => {
    expect(resolveSaveMode(null)).toBe("insert");
    expect(resolveSaveMode(undefined)).toBe("insert");
    expect(resolveSaveMode("")).toBe("insert");
  });
});

describe("wizard_state presente nos DOIS caminhos de save", () => {
  const wizardState = { flowMode: "manual", participants: [], dados: { vendedor_nome: "Geronimo" } };

  it("buildDraftContractPayload inclui wizard_state + dados plano", () => {
    const p = buildDraftContractPayload({
      nome: "C", currentStep: "template", templateId: "t1",
      dados: { vendedor_nome: "Geronimo" }, wizardState,
      clausulasIds: [], conteudoFinal: "", compradorId: null, vendedorId: null, empresaId: null,
    });
    expect(p.wizard_state).toBe(wizardState);
    expect(p.status).toBe("rascunho");
    expect((p.dados as Record<string, string>).vendedor_nome).toBe("Geronimo");
  });

  it("buildFinalContractPayload inclui wizard_state + parseia valores", () => {
    // Nota: parsing herda o comportamento original do handleSave — trata vírgula
    // decimal ("450,50"→450.5), mas NÃO separador de milhar BR (quirk pré-existente,
    // fora de escopo). Testamos o caso suportado.
    const p = buildFinalContractPayload({
      nome: "C", templateId: "t1", compradorId: null, vendedorId: null, empresaId: null,
      dados: { vendedor_nome: "Geronimo", valor_total: "R$ 450,50", valor_sinal: "" },
      wizardState, conteudoFinal: "<p>x</p>", clausulasIds: ["c1"],
    });
    expect(p.wizard_state).toBe(wizardState);
    expect(p.status).toBe("rascunho");
    expect(p.current_step).toBe("concluido");
    expect(p.valor_total).toBe(450.5);
    expect(p.valor_sinal).toBe(null);
  });
});

describe("buildParticipantRows", () => {
  it("manual: projeta campos e pula sem nome", () => {
    const rows = buildParticipantRows({
      flowMode: "manual",
      participants: [],
      manualParticipants: [
        { role: "vendedor", nome: "Geronimo", cpf: "111", genero: "M" },
        { role: "vendedor", nome: "Valquíria", cpf: "555" },
        { role: "comprador", nome: "  " }, // sem nome → pulado
      ],
      mergedDados: {},
      extractedData: [],
    });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ role: "vendedor", full_name: "Geronimo", cpf: "111", gender: "M" });
    expect(rows[1]).toMatchObject({ role: "vendedor", full_name: "Valquíria", cpf: "555" });
    expect(rows[0].rg).toBe(null); // vazio → null
  });

  it("ai: usa extração + fallback de mergedDados", () => {
    const rows = buildParticipantRows({
      flowMode: "ai",
      participants: [{ id: "p1", role: "comprador", full_name: "Penelope" }],
      manualParticipants: [],
      mergedDados: { comprador_cpf: "222" },
      extractedData: [{ participantId: "p1", full_name: "Penelope Silva", fields: [{ key: "email", value: "p@x.com" }] }],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ role: "comprador", full_name: "Penelope Silva", email: "p@x.com", cpf: "222" });
  });
});

describe("diffParticipants — não duplica na relacional", () => {
  const mk = (role: string, nome: string): ParticipantRow => ({
    role, full_name: nome, cpf: null, rg: null, issuing_agency: null, profession: null,
    nationality: null, marital_status: null, email: null, whatsapp: null, gender: null,
    address_street: null, address_number: null, address_complement: null,
    address_neighborhood: null, address_city: null, address_state: null, address_zipcode: null,
  });

  it("existentes == desejados (mesma ordem/role) → tudo UPDATE, zero INSERT (sem duplicar)", () => {
    const existing = [
      { id: "v1", role: "vendedor" },
      { id: "v2", role: "vendedor" },
      { id: "c1", role: "comprador" },
    ];
    const desired = [mk("vendedor", "Geronimo"), mk("vendedor", "Valquíria"), mk("comprador", "Penelope")];
    const { toUpdate, toInsert } = diffParticipants(existing, desired);
    expect(toInsert).toHaveLength(0);            // ← nada de duplicata
    expect(toUpdate.map((u) => u.id).sort()).toEqual(["c1", "v1", "v2"]);
    expect(toUpdate.find((u) => u.id === "v2")!.fields.full_name).toBe("Valquíria");
  });

  it("desejado a mais no role → 1 INSERT, ids existentes preservados em UPDATE", () => {
    const existing = [{ id: "v1", role: "vendedor" }];
    const desired = [mk("vendedor", "Geronimo"), mk("vendedor", "Novo")];
    const { toUpdate, toInsert } = diffParticipants(existing, desired);
    expect(toUpdate).toHaveLength(1);
    expect(toUpdate[0].id).toBe("v1");           // id preservado → OCR intacto
    expect(toInsert).toHaveLength(1);
    expect(toInsert[0].full_name).toBe("Novo");
  });

  it("primeiro save (sem existentes) → tudo INSERT", () => {
    const desired = [mk("vendedor", "Geronimo"), mk("comprador", "Penelope")];
    const { toUpdate, toInsert } = diffParticipants([], desired);
    expect(toUpdate).toHaveLength(0);
    expect(toInsert).toHaveLength(2);
  });
});
