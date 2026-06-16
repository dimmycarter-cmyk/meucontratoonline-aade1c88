import { describe, it, expect } from "vitest";
import {
  isSnapshotShape,
  selectHydration,
  buildContractDraftWrite,
  autosaveEnabled,
} from "../wizard-draft";
import { reconstructParticipantsFromPlano } from "../auto-fill-dados";

/** Snapshot mínimo no shape de buildDraftPayload, com 2 vendedores. */
function makeSnapshot() {
  return {
    flowMode: "manual",
    currentStepIndex: 2,
    selectedTemplateId: "tpl-2",
    selectedClauseIds: ["c1"],
    conteudoFinal: "<p>x</p>",
    nomeContrato: "Contrato Y",
    dados: { vendedor_nome: "Geronimo", comprador_nome: "Penelope", valor: "450" },
    manualParticipants: [
      { id: "a", role: "vendedor", nome: "Geronimo" },
      { id: "b", role: "vendedor", nome: "Valquíria" },
      { id: "c", role: "comprador", nome: "Penelope" },
    ],
    participants: [],
    conteudoFinalDirty: false,
    dadosDirty: ["valor"],
    aiReviewDirty: false,
  };
}

describe("isSnapshotShape", () => {
  it("reconhece snapshot (flowMode/participants/currentStepIndex)", () => {
    expect(isSnapshotShape({ flowMode: "manual", participants: [] })).toBe(true);
    expect(isSnapshotShape({ currentStepIndex: 0 })).toBe(true);
    expect(isSnapshotShape({ manualParticipants: [] })).toBe(true);
  });
  it("NÃO confunde plano (vendedor_*) nem vazio com snapshot", () => {
    expect(isSnapshotShape({ vendedor_nome: "Geronimo", comprador_nome: "Penelope" })).toBe(false);
    expect(isSnapshotShape({})).toBe(false);
    expect(isSnapshotShape(null)).toBe(false);
  });
});

describe("selectHydration — três shapes, sem mishandle", () => {
  it("(1) wizard_state presente → canônico lossless", () => {
    const snap = makeSnapshot();
    const r = selectHydration({ id: "x", dados: snap.dados, wizard_state: snap });
    expect(r.source).toBe("wizard_state");
    expect(r.lossy).toBe(false);
    expect(r.state.flowMode).toBe("manual");
    expect(r.state.currentStepIndex).toBe(2);
    expect(r.state.manualParticipants).toHaveLength(3);
    expect(r.state.dados?.vendedor_nome).toBe("Geronimo");
  });

  it("(2) wizard_state NULL + dados é snapshot (18db1b7d) → legacy-snapshot lossless", () => {
    const snap = makeSnapshot();
    const r = selectHydration({ id: "18db1b7d", dados: snap, wizard_state: null });
    expect(r.source).toBe("legacy-snapshot");
    expect(r.lossy).toBe(false);
    expect(r.state.manualParticipants).toHaveLength(3);
    expect(r.state.flowMode).toBe("manual");
  });

  it("(3) wizard_state NULL + dados plano (96216482) → legacy-plano lossy, reconstrói", () => {
    const plano = {
      vendedor_nome: "Geronimo",
      vendedor_cpf: "11111111111",
      comprador_nome: "Penelope",
      empresa_nome: "Imob X",
    };
    const r = selectHydration({ id: "96216482", dados: plano, wizard_state: null, template_id: "tpl-1", conteudo_final: "<p>c</p>" });
    expect(r.source).toBe("legacy-plano");
    expect(r.lossy).toBe(true);
    expect(r.state.dados).toBe(plano); // plano preservado p/ leitores
    expect(r.state.selectedTemplateId).toBe("tpl-1");
    expect(r.state.conteudoFinal).toBe("<p>c</p>");
    const nomes = (r.state.manualParticipants ?? []).map((p) => p.nome);
    expect(nomes).toContain("Geronimo");
    expect(nomes).toContain("Penelope");
  });

  it("dados vazio {} → legacy-plano sem participantes (não vira snapshot)", () => {
    const r = selectHydration({ id: "novo", dados: {}, wizard_state: null });
    expect(r.source).toBe("legacy-plano");
    expect(r.state.manualParticipants).toEqual([]);
  });
});

describe("reconstructParticipantsFromPlano", () => {
  it("reconstrói multi-participante indexado com identidade escalar completa", () => {
    const plano = {
      vendedor_nome: "Geronimo", vendedor_cpf: "111", vendedor_email: "g@x.com", vendedor_genero: "M",
      vendedor2_nome: "Valquíria", vendedor2_cpf: "555", vendedor2_genero: "F",
      comprador_nome: "Penelope", comprador_rg: "MG-2",
      vendedor_endereco: "Rua das Flores, nº 10, Belo Horizonte/MG", // composto: perda granular
    };
    const ps = reconstructParticipantsFromPlano(plano);
    const v1 = ps.find((p) => p.nome === "Geronimo")!;
    const v2 = ps.find((p) => p.nome === "Valquíria")!;
    const c1 = ps.find((p) => p.nome === "Penelope")!;
    expect(ps).toHaveLength(3);
    expect(v1.role).toBe("vendedor");
    expect(v1.cpf).toBe("111");
    expect(v1.email).toBe("g@x.com");
    expect(v1.genero).toBe("M");
    expect(v2.role).toBe("vendedor");
    expect(v2.genero).toBe("F");
    expect(c1.role).toBe("comprador");
    expect(c1.rg).toBe("MG-2");
    // Perda documentada: endereço granular NÃO reverte.
    expect(v1.rua).toBe("");
    expect(v1.cidade).toBe("");
  });

  it("plano vazio → []", () => {
    expect(reconstructParticipantsFromPlano({})).toEqual([]);
  });
});

describe("buildContractDraftWrite — invariante de escrita + round-trip", () => {
  it("grava dados(plano) no topo + wizard_state(snapshot)", () => {
    const snap = makeSnapshot();
    const w = buildContractDraftWrite(snap);
    expect(w.dados).toBe(snap.dados); // plano para leitores
    expect(w.wizard_state).toBe(snap); // snapshot para retomada
    expect(w.dados.vendedor_nome).toBe("Geronimo");
  });

  it("round-trip: write → selectHydration reproduz o snapshot (lossless)", () => {
    const snap = makeSnapshot();
    const w = buildContractDraftWrite(snap);
    const row = { id: "rt", dados: w.dados, wizard_state: w.wizard_state };
    const r = selectHydration(row);
    expect(r.source).toBe("wizard_state");
    expect(r.lossy).toBe(false);
    expect(r.state.manualParticipants).toHaveLength(3);
    expect(r.state.currentStepIndex).toBe(2);
    expect(r.state.dadosDirty).toEqual(["valor"]);
  });
});

describe("autosaveEnabled — guard anti-clobber", () => {
  it("BLOQUEIA enquanto !hydrated (mesmo com id + rascunho)", () => {
    expect(autosaveEnabled({ contratoId: "x", status: "rascunho", hydrated: false })).toBe(false);
  });
  it("habilita só com id + rascunho + hydrated", () => {
    expect(autosaveEnabled({ contratoId: "x", status: "rascunho", hydrated: true })).toBe(true);
  });
  it("nunca habilita sem id ou fora de rascunho", () => {
    expect(autosaveEnabled({ contratoId: null, status: "rascunho", hydrated: true })).toBe(false);
    expect(autosaveEnabled({ contratoId: "x", status: "pronto", hydrated: true })).toBe(false);
  });
});
