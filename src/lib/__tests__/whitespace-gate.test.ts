/**
 * Gate de whitespace (2.2b, Commit 3a) — `hasValue` é a fonte única da
 * semântica vazio-vs-cheio do motor E do detector.
 *
 * Motivo (probe C2 do Commit 3): `email=" "` passava o check `!== ""` do
 * motor, rendia `<strong> </strong>` e (1) mantinha a R3 alcançável,
 * (2) BYPASSAVA a inversão do Commit 2 em campo essencial — `rg=" "` não
 * virava valor legível nem lacuna, silêncio que a Regra de Ouro proíbe —
 * e (3) divergia do detector, que sempre trimou.
 *
 * REGRA DA 2.2a (mantida): PRESENÇA do span + contagem exata hardcoded.
 * Nunca ausência, nunca toBeGreaterThan.
 */
import { describe, it, expect } from "vitest";
import {
  expandEachBlocks,
  replacePlaceholders,
  getUnresolvedPlaceholders,
} from "../placeholder";
import { countLacunas } from "../placeholder-fallback";
import { buildParticipantsByRole } from "../auto-fill-dados";
import { emptyParticipant, type ManualParticipantData } from "@/components/contract/manual-participant";

const LACUNA = '<span class="lacuna">__________</span>';

function mk(
  role: ManualParticipantData["role"],
  nome: string,
  extra: Partial<ManualParticipantData> = {}
): ManualParticipantData {
  return { ...emptyParticipant(role), nome, ...extra };
}

describe("gate de whitespace — valor whitespace-only é VAZIO", () => {
  it("intra-each: rg=' ' e email=' ' viram LACUNA (era o bypass da inversão)", () => {
    const tpl =
      "{{#each vendedores}}RG <strong>{{rg}}</strong>, e-mail: <strong>{{email}}</strong>, fim{{/each}}";
    const byRole = buildParticipantsByRole([
      mk("vendedor", "João Silva", { rg: " ", email: " " }),
    ]);
    const out = expandEachBlocks(tpl, byRole, { blankLineFormat: "html" });
    expect(out).toBe(
      `RG <strong>${LACUNA}</strong>, e-mail: <strong>${LACUNA}</strong>, fim`
    );
    expect(countLacunas(out)).toBe(2);
  });

  it("passe flat (curly): vendedor_rg=' ' vira LACUNA", () => {
    const out = replacePlaceholders(
      "RG {{vendedor_rg}}.",
      { vendedor_rg: " " },
      { blankLineFormat: "html" }
    );
    expect(out).toBe(`RG ${LACUNA}.`);
    expect(countLacunas(out)).toBe(1);
  });

  it("passe flat (bracket): canonicalKey e directKey whitespace viram LACUNA", () => {
    // [CPF] resolve via LEGACY_BRACKET_MAP para vendedor_cpf; [campo livre]
    // cai na directKey campo_livre — os dois sítios do passo 2 gateados.
    const out = replacePlaceholders(
      "CPF [CPF] e extra [campo livre].",
      { vendedor_cpf: " ", campo_livre: "\t" },
      { blankLineFormat: "html" }
    );
    expect(out).toBe(`CPF ${LACUNA} e extra ${LACUNA}.`);
    expect(countLacunas(out)).toBe(2);
  });

  it("motor↔detector ALINHADOS: o campo que o detector acusa é o mesmo que vira lacuna", () => {
    // Antes do gate: o detector (que sempre trimou) acusava {{vendedor_rg}}
    // como pendente enquanto o motor emitia " " como valor — dois veredictos
    // sobre o mesmo campo. Agora: pendente NO detector E lacuna NO motor.
    const html = "RG {{vendedor_rg}}.";
    const vars = { vendedor_rg: " " };
    expect(getUnresolvedPlaceholders(html, vars)).toContain("{{vendedor_rg}}");
    const out = replacePlaceholders(html, vars, { blankLineFormat: "html" });
    expect(countLacunas(out)).toBe(1);
  });

  it("ESCOPO: o gate decide o CHECK, não trima o VALOR emitido", () => {
    // " João " é CHEIO (tem conteúdo após trim) → sai como veio. O colapso
    // do espaço duplo é do cleanOrphanPunctuation pré-existente, não do gate.
    const out = replacePlaceholders(
      "Nome: {{vendedor_nome}}.",
      { vendedor_nome: " João " },
      { blankLineFormat: "html" }
    );
    expect(out).toBe("Nome: João .");
    expect(countLacunas(out)).toBe(0);
  });
});
