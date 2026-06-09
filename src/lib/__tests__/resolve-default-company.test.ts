import { describe, it, expect } from "vitest";
import { resolveDefaultCompanyId } from "../resolve-default-company";

const one = [{ id: "c1" }];
const two = [{ id: "c1" }, { id: "c2" }];

describe("resolveDefaultCompanyId", () => {
  it("1 company, sem toque, sem empresa, carregado → retorna o id", () => {
    expect(resolveDefaultCompanyId(one, null, false, false)).toBe("c1");
  });

  it("0 companies → null", () => {
    expect(resolveDefaultCompanyId([], null, false, false)).toBeNull();
  });

  it("2+ companies → null (ambíguo sem coluna padrão)", () => {
    expect(resolveDefaultCompanyId(two, null, false, false)).toBeNull();
  });

  it("já tem empresaId → null (respeita seleção/rascunho)", () => {
    expect(resolveDefaultCompanyId(one, "c1", false, false)).toBeNull();
    // mesmo que o id atual nem esteja na lista, não age
    expect(resolveDefaultCompanyId(one, "outro", false, false)).toBeNull();
  });

  it("touched → null (respeita deseleção/seleção manual)", () => {
    expect(resolveDefaultCompanyId(one, null, true, false)).toBeNull();
  });

  it("loading → null (espera carregar)", () => {
    expect(resolveDefaultCompanyId(one, null, false, true)).toBeNull();
  });

  it("currentEmpresaId undefined é tratado como ausente", () => {
    expect(resolveDefaultCompanyId(one, undefined, false, false)).toBe("c1");
  });
});
