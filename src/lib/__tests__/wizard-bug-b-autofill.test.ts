import { describe, it, expect } from "vitest";
import {
  shouldAutoFillField,
  pickAutoFillFields,
  diffKeys,
} from "../wizard-dirty";

describe("Bug B — autoFillDados dirty flag guard", () => {
  describe("shouldAutoFillField", () => {
    it("Cenário 1: campo não editado → autoFill normal", () => {
      expect(shouldAutoFillField("comprador_endereco", new Set())).toBe(true);
    });

    it("Cenário 2: campo editado → autoFill pula", () => {
      expect(
        shouldAutoFillField("comprador_endereco", new Set(["comprador_endereco"]))
      ).toBe(false);
    });

    it("outro campo editado → este campo ainda autoFill", () => {
      expect(
        shouldAutoFillField("comprador_endereco", new Set(["vendedor_nome"]))
      ).toBe(true);
    });
  });

  describe("pickAutoFillFields", () => {
    it("Cenário 3: nenhum campo dirty → mantém todos os candidatos", () => {
      const candidates = { comprador_nome: "Ana", vendedor_nome: "Bruno" };
      expect(pickAutoFillFields(candidates, new Set())).toEqual(candidates);
    });

    it("um campo dirty → filtra apenas ele", () => {
      const candidates = {
        comprador_nome: "Ana",
        comprador_endereco: "Rua X",
        vendedor_nome: "Bruno",
      };
      const result = pickAutoFillFields(candidates, new Set(["comprador_endereco"]));
      expect(result).toEqual({ comprador_nome: "Ana", vendedor_nome: "Bruno" });
      expect(result.comprador_endereco).toBeUndefined();
    });

    it("múltiplos campos dirty → filtra todos", () => {
      const candidates = {
        comprador_nome: "Ana",
        comprador_endereco: "Rua X",
        vendedor_nome: "Bruno",
      };
      const result = pickAutoFillFields(
        candidates,
        new Set(["comprador_endereco", "vendedor_nome"])
      );
      expect(result).toEqual({ comprador_nome: "Ana" });
    });

    it("candidatos vazios + dirty → objeto vazio", () => {
      expect(pickAutoFillFields({}, new Set(["qualquer_coisa"]))).toEqual({});
    });
  });

  describe("diffKeys", () => {
    it("nenhuma mudança → array vazio", () => {
      expect(diffKeys({ a: "1", b: "2" }, { a: "1", b: "2" })).toEqual([]);
    });

    it("chave alterada → presente no diff", () => {
      expect(diffKeys({ a: "1", b: "2" }, { a: "1", b: "3" })).toEqual(["b"]);
    });

    it("chave adicionada → presente no diff", () => {
      expect(diffKeys({ a: "1" }, { a: "1", b: "novo" })).toEqual(["b"]);
    });

    it("chave removida → presente no diff", () => {
      expect(diffKeys({ a: "1", b: "2" }, { a: "1" })).toEqual(["b"]);
    });

    it("múltiplas mudanças combinadas", () => {
      const result = diffKeys(
        { a: "1", b: "2", c: "3" },
        { a: "1", b: "X", d: "novo" }
      );
      expect(result.sort()).toEqual(["b", "c", "d"]);
    });
  });
});
