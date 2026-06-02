import { describe, it, expect } from "vitest";
import { shouldRunExtractAll, pickAutoFillFields } from "../wizard-dirty";

describe("Bug C — extractAll dirty flag guard", () => {
  describe("shouldRunExtractAll", () => {
    it("Cenário 1: revisão NÃO editada (aiReviewDirty=false) → extractAll roda", () => {
      expect(shouldRunExtractAll(false)).toBe(true);
    });

    it("Cenário 2: revisão editada (aiReviewDirty=true) → extractAll pula", () => {
      expect(shouldRunExtractAll(true)).toBe(false);
    });

    it("Edge: é o complemento exato da flag (dirty muda estado)", () => {
      // garante a invariante !dirty para ambos os estados
      const states = [false, true];
      for (const dirty of states) {
        expect(shouldRunExtractAll(dirty)).toBe(!dirty);
      }
    });
  });

  describe("Cenário 3: AI merge respeita dadosDirty (via pickAutoFillFields)", () => {
    it("nenhum campo editado → merge AI aplica tudo", () => {
      const aiDados = { comprador_nome: "Ana", comprador_cpf: "111" };
      expect(pickAutoFillFields(aiDados, new Set())).toEqual(aiDados);
    });

    it("campo editado manualmente → merge AI NÃO sobrescreve esse campo", () => {
      const aiDados = { comprador_nome: "Ana (IA)", comprador_cpf: "111" };
      // usuário já editou comprador_nome à mão → deve ser preservado (filtrado do merge)
      const safe = pickAutoFillFields(aiDados, new Set(["comprador_nome"]));
      expect(safe).toEqual({ comprador_cpf: "111" });
      expect(safe.comprador_nome).toBeUndefined();
    });

    it("todos os campos editados → merge AI vira no-op (objeto vazio)", () => {
      const aiDados = { comprador_nome: "Ana", comprador_cpf: "111" };
      const safe = pickAutoFillFields(
        aiDados,
        new Set(["comprador_nome", "comprador_cpf"])
      );
      expect(safe).toEqual({});
      expect(Object.keys(safe).length).toBe(0);
    });

    it("Edge: extração vazia + dirty → merge continua vazio (não quebra)", () => {
      expect(pickAutoFillFields({}, new Set(["comprador_nome"]))).toEqual({});
    });

    it("Edge: dirty de outro campo não afeta os campos da IA", () => {
      const aiDados = { comprador_nome: "Ana" };
      // dirty marca um campo que a IA nem trouxe → nada é filtrado
      expect(pickAutoFillFields(aiDados, new Set(["vendedor_cpf"]))).toEqual(aiDados);
    });
  });
});
