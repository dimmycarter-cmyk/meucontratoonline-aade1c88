import { describe, it, expect } from "vitest";
import {
  effectiveDraftId,
  resolveDraftSaveMode,
  canSaveDraft,
  hasMinimalDraftData,
  buildDraftContractPayload,
  shouldSyncDraftUrl,
  isSelfSavedDraft,
  type CanSaveDraftInput,
} from "../contract-save";

// (a) Idempotência — dois saves consecutivos geram 1 linha (UPDATE no 2º).
describe("idempotência do rascunho persistente (createdDraftIdRef)", () => {
  it("1º save de contrato novo (sem rota, sem id capturado) → insert", () => {
    expect(resolveDraftSaveMode(null, null)).toBe("insert");
    expect(effectiveDraftId(null, null)).toBe(null);
  });

  it("2º save após capturar id do 1º INSERT → update (NÃO duplica linha)", () => {
    // Simula o fluxo: 1º save insere e devolve id; a tela guarda em createdDraftIdRef.
    const createdId = "draft-abc-123";
    expect(resolveDraftSaveMode(null, createdId)).toBe("update");
    expect(effectiveDraftId(null, createdId)).toBe(createdId);
  });

  it("retomada por rota :id sempre update e vence o id capturado", () => {
    expect(resolveDraftSaveMode("route-id", null)).toBe("update");
    expect(effectiveDraftId("route-id", "other-id")).toBe("route-id");
  });
});

// (a.2) Idempotência cross-mount — sincronizar URL após o 1º INSERT e pular a
// re-hidratação do rascunho recém-salvo por este mount.
describe("shouldSyncDraftUrl — leva o id do rascunho para a URL após o 1º INSERT", () => {
  it("contrato novo (sem rota, sem id capturado) + savedId → sincroniza", () => {
    expect(shouldSyncDraftUrl(null, null, "draft-1")).toBe(true);
  });

  it("INSERT sem savedId (falha) → não sincroniza", () => {
    expect(shouldSyncDraftUrl(null, null, null)).toBe(false);
  });

  it("2º save (id já capturado no mount) → não sincroniza (URL já refletiria após o replace)", () => {
    expect(shouldSyncDraftUrl(null, "draft-1", "draft-1")).toBe(false);
  });

  it("retomada por rota :id → não sincroniza (URL já tem o id)", () => {
    expect(shouldSyncDraftUrl("route-id", null, "route-id")).toBe(false);
  });
});

describe("isSelfSavedDraft — guard anti-race da re-hidratação", () => {
  it("rota :id == id inserido por este mount → pula re-hidratação", () => {
    expect(isSelfSavedDraft("draft-1", "draft-1")).toBe(true);
  });

  it("retomada fria (sem id capturado) → hidrata do banco", () => {
    expect(isSelfSavedDraft("route-id", null)).toBe(false);
  });

  it("sem rota :id → não é auto-salvo (contrato novo em memória)", () => {
    expect(isSelfSavedDraft(null, "draft-1")).toBe(false);
  });

  it("rota :id diferente do capturado (retomada de outro rascunho) → hidrata do banco", () => {
    expect(isSelfSavedDraft("route-id", "draft-1")).toBe(false);
  });
});

// (b) Regra canSaveDraft — template sem nome/dado = desabilitado.
describe("canSaveDraft — habilitação anti-lixo", () => {
  const base: CanSaveDraftInput = {
    hasTenant: true,
    currentStepIndex: 1,
    selectedTemplateId: "t1",
    hasMinimalData: true,
    isDirty: true,
    isSavingDraft: false,
  };

  it("habilita com todos os requisitos satisfeitos", () => {
    expect(canSaveDraft(base)).toBe(true);
  });

  it("template selecionado mas SEM dado mínimo (sem nome/dado) → desabilitado", () => {
    expect(canSaveDraft({ ...base, hasMinimalData: false })).toBe(false);
  });

  it("ainda na etapa de seleção (index 0) → desabilitado", () => {
    expect(canSaveDraft({ ...base, currentStepIndex: 0 })).toBe(false);
  });

  it("sem template selecionado → desabilitado", () => {
    expect(canSaveDraft({ ...base, selectedTemplateId: null })).toBe(false);
  });

  it("sem tenant → desabilitado", () => {
    expect(canSaveDraft({ ...base, hasTenant: false })).toBe(false);
  });

  it("form limpo (isDirty=false) → desabilitado", () => {
    expect(canSaveDraft({ ...base, isDirty: false })).toBe(false);
  });

  it("já salvando (reentrância) → desabilitado", () => {
    expect(canSaveDraft({ ...base, isSavingDraft: true })).toBe(false);
  });
});

describe("hasMinimalDraftData — o que conta como 'não-lixo'", () => {
  it("participante manual com nome real → true", () => {
    expect(
      hasMinimalDraftData({
        manualParticipants: [{ nome: "João Silva" }],
        participants: [],
        dados: {},
      }),
    ).toBe(true);
  });

  it("participante IA com full_name → true", () => {
    expect(
      hasMinimalDraftData({
        manualParticipants: [],
        participants: [{ full_name: "Penélope" }],
        dados: {},
      }),
    ).toBe(true);
  });

  it("nome só com espaços e dados vazios → false (não grava lixo)", () => {
    expect(
      hasMinimalDraftData({
        manualParticipants: [{ nome: "   " }],
        participants: [{ full_name: "" }],
        dados: { valor_total: "  " },
      }),
    ).toBe(false);
  });

  it("nenhum participante mas algum dado plano preenchido → true", () => {
    expect(
      hasMinimalDraftData({
        manualParticipants: [],
        participants: [],
        dados: { valor_total: "R$ 10.000,00" },
      }),
    ).toBe(true);
  });

  it("tudo vazio (só template escolhido) → false", () => {
    expect(hasMinimalDraftData({ manualParticipants: [], participants: [], dados: {} })).toBe(false);
  });
});

// (c) O rascunho persistente grava SÓ snapshot — não reconcilia participantes.
describe("payload de rascunho — só snapshot, sem projeção relacional", () => {
  it("buildDraftContractPayload grava dados + wizard_state e NÃO carrega linhas de contract_participants", () => {
    const payload = buildDraftContractPayload({
      nome: "Contrato X",
      currentStep: "parties-docs",
      templateId: "t1",
      dados: { comprador_nome: "João" },
      wizardState: { manualParticipants: [{ role: "comprador", nome: "João" }] },
      clausulasIds: [],
      conteudoFinal: "",
      compradorId: null,
      vendedorId: null,
      empresaId: null,
    });

    expect(payload.status).toBe("rascunho");
    expect(payload).toHaveProperty("dados");
    expect(payload).toHaveProperty("wizard_state");
    // Paridade com a Fase 1: reconciliação relacional é responsabilidade do
    // "Salvar Contrato" final, não do rascunho — nenhuma linha projetada aqui.
    expect(payload).not.toHaveProperty("participants");
    expect(payload).not.toHaveProperty("contract_participants");
  });
});
