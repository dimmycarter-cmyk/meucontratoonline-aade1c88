import { describe, it, expect } from "vitest";
import {
  shouldRebuildConteudo,
  shouldResetDirtyOnTemplateChange,
} from "../wizard-dirty";

describe("Bug A — TipTap dirty flag guard", () => {
  describe("shouldRebuildConteudo", () => {
    it("Cenário 1: ida sem edit → buildFinalContent roda (flag false)", () => {
      expect(shouldRebuildConteudo(false)).toBe(true);
    });

    it("Cenário 2: ida-volta-ida com edit → preserva edit (flag true)", () => {
      expect(shouldRebuildConteudo(true)).toBe(false);
    });
  });

  describe("shouldResetDirtyOnTemplateChange", () => {
    it("Cenário 3: troca de template (id diferente) → reset dirty", () => {
      expect(shouldResetDirtyOnTemplateChange("template-A", "template-B")).toBe(true);
    });

    it("mesmo template selecionado novamente → não reseta", () => {
      expect(shouldResetDirtyOnTemplateChange("template-A", "template-A")).toBe(false);
    });

    it("template inicial (null) escolhido pela primeira vez → reseta", () => {
      expect(shouldResetDirtyOnTemplateChange(null, "template-A")).toBe(true);
    });

    it("null → null (hidratação sem template) não reseta", () => {
      expect(shouldResetDirtyOnTemplateChange(null, null)).toBe(false);
    });
  });
});
