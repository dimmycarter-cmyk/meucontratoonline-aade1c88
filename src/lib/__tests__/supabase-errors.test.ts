import { describe, it, expect } from "vitest";
import { parseSupabaseError } from "@/lib/supabase-errors";

describe("parseSupabaseError", () => {
  it("mapeia violação de CHECK (23514) para mensagem PT-BR amigável, sem vazar detalhe técnico", () => {
    const pgError = {
      code: "23514",
      message:
        'new row for relation "contract_templates" violates check constraint "contract_templates_tenant_or_global"',
    };
    const out = parseSupabaseError(pgError);
    expect(out).toBe("Não foi possível salvar: dados inconsistentes para este tipo de registro.");
    // não vaza o texto técnico do Postgres
    expect(out.toLowerCase()).not.toContain("check constraint");
    expect(out.toLowerCase()).not.toContain("violates");
  });

  it("mantém mapeamento de RLS/permissão (42501)", () => {
    expect(parseSupabaseError({ code: "42501", message: "permission denied" })).toBe(
      "Você não tem permissão para esta ação.",
    );
  });

  it("mantém mapeamento de campo obrigatório (23502)", () => {
    expect(parseSupabaseError({ code: "23502", message: "null value" })).toBe(
      "Campo obrigatório não preenchido.",
    );
  });
});
