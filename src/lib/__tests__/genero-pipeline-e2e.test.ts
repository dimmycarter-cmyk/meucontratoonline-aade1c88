/**
 * E2E do gênero pela cadeia REAL (não monta byRole à mão):
 *   manualParticipants → buildParticipantsByRole → enrichParticipantsWithAgreementL1
 *   → buildAgreementVarsL2 → expandEachBlocks/replacePlaceholders → titulo concordado
 *
 * Trava o caminho de 1 vendedor (o que o smoke test de 2 pessoas NÃO pegava, pois
 * plural masculino é o default de qualquer grupo não-100%-F).
 */
import { describe, it, expect } from "vitest";
import {
  enrichParticipantsWithAgreementL1,
  buildAgreementVarsL2,
} from "../agreement";
import { normalizeGenero } from "../genero";
import {
  expandEachBlocks,
  preprocessTemplate,
  replacePlaceholders,
} from "../placeholder";
import { buildParticipantsByRole } from "../auto-fill-dados";
import {
  emptyParticipant,
  type ManualParticipantData,
} from "@/components/contract/manual-participant";

const TPL = "<strong>{{vendedores_titulo}}:</strong> {{#each vendedores}}{{nome}}{{/each}}";

function mk(
  role: ManualParticipantData["role"],
  nome: string,
  extra: Partial<ManualParticipantData> = {}
): ManualParticipantData {
  return { ...emptyParticipant(role), nome, ...extra };
}

/** Pipeline real de geração (igual NovoContrato.buildFinalContent). */
function render(participants: ManualParticipantData[]): string {
  const byRole = buildParticipantsByRole(participants);
  const enriched = enrichParticipantsWithAgreementL1(byRole);
  const allVars = buildAgreementVarsL2(byRole);
  const s1 = expandEachBlocks(TPL, enriched);
  const s2 = preprocessTemplate(s1, allVars);
  return replacePlaceholders(s2, allVars);
}

describe("genero e2e — caminho de 1 vendedor (cadeia real do wizard)", () => {
  it("1 vendedor M → PROMITENTE VENDEDOR (masculino)", () => {
    const out = render([mk("vendedor", "João Silva", { genero: "M" })]);
    expect(out).toContain("<strong>PROMITENTE VENDEDOR:</strong>");
    expect(out).not.toContain("VENDEDORA");
  });

  it("1 vendedor F → PROMITENTE VENDEDORA (feminino)", () => {
    const out = render([mk("vendedor", "Maria Antônia", { genero: "F" })]);
    expect(out).toContain("<strong>PROMITENTE VENDEDORA:</strong>");
  });

  it("plural M+F → PROMITENTES VENDEDORES (regra do misto, mantido)", () => {
    const out = render([
      mk("vendedor", "João", { genero: "M" }),
      mk("vendedor", "Maria", { genero: "F" }),
    ]);
    expect(out).toContain("<strong>PROMITENTES VENDEDORES:</strong>");
  });
});

describe("genero e2e — gênero vindo de contato (essência do fillFromContact)", () => {
  // fillFromContact faz: participant.genero = normalizeGenero(contact.genero).
  // Este teste prova que o gênero do contato (mesmo legado free-text) é
  // normalizado e USADO no render — que é o valor que o Select também exibe.
  it("contato legado 'Feminino' → normaliza p/ F → render VENDEDORA", () => {
    const generoDoContato = normalizeGenero("Feminino"); // legado free-text
    expect(generoDoContato).toBe("F");
    const out = render([mk("vendedor", "Maria Antônia", { genero: generoDoContato })]);
    expect(out).toContain("<strong>PROMITENTE VENDEDORA:</strong>");
  });

  it("contato 'Masculino' → normaliza p/ M → render VENDEDOR", () => {
    const generoDoContato = normalizeGenero("Masculino");
    expect(generoDoContato).toBe("M");
    const out = render([mk("vendedor", "João Silva", { genero: generoDoContato })]);
    expect(out).toContain("<strong>PROMITENTE VENDEDOR:</strong>");
    expect(out).not.toContain("VENDEDORA");
  });
});
