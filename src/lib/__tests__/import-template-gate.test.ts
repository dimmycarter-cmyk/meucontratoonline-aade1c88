import { describe, it, expect } from "vitest";
import { resolveImportGate } from "@/lib/import-template-gate";

describe("resolveImportGate", () => {
  it("0 variáveis SEM confirmação → alerta visível e criação BLOQUEADA", () => {
    expect(resolveImportGate(0, false)).toEqual({
      showZeroVariablesWarning: true,
      createBlocked: true,
    });
  });

  it("0 variáveis COM confirmação → alerta visível e criação LIBERADA", () => {
    expect(resolveImportGate(0, true)).toEqual({
      showZeroVariablesWarning: true,
      createBlocked: false,
    });
  });

  it(">0 variáveis → fluxo normal: sem alerta e sem bloqueio, independente do checkbox", () => {
    expect(resolveImportGate(5, false)).toEqual({
      showZeroVariablesWarning: false,
      createBlocked: false,
    });
    // checkbox marcado com variáveis presentes não muda nada
    expect(resolveImportGate(5, true)).toEqual({
      showZeroVariablesWarning: false,
      createBlocked: false,
    });
  });

  it("uma única variável já libera o fluxo normal (fronteira 1)", () => {
    expect(resolveImportGate(1, false)).toEqual({
      showZeroVariablesWarning: false,
      createBlocked: false,
    });
  });

  it("contagem inválida (negativa/NaN) é tratada como 0 → bloqueia sem confirmação", () => {
    expect(resolveImportGate(-3, false).createBlocked).toBe(true);
    expect(resolveImportGate(Number.NaN, false).createBlocked).toBe(true);
    // e libera com confirmação
    expect(resolveImportGate(-3, true).createBlocked).toBe(false);
  });
});
