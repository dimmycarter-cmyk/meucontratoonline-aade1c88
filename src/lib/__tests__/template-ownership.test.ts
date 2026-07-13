import { describe, it, expect } from "vitest";
import {
  resolveTemplateOwnership,
  type TemplateOwnershipInput,
  type TemplateOwnership,
} from "@/lib/template-ownership";

/**
 * Invariante do CHECK `contract_templates_tenant_or_global`:
 *   (is_global=true AND tenant_id IS NULL) OR (is_global=false AND tenant_id IS NOT NULL)
 */
const satisfiesCheck = (o: TemplateOwnership): boolean =>
  (o.is_global && o.tenant_id === null) || (!o.is_global && o.tenant_id !== null);

describe("resolveTemplateOwnership", () => {
  it("super admin SEM impersonação → global sem tenant", () => {
    const input: TemplateOwnershipInput = {
      isSuperAdmin: true,
      impersonatedTenantId: null,
      profileTenantId: "t-sa", // preenchido: NÃO deve vazar para o payload
    };
    expect(resolveTemplateOwnership(input)).toEqual({ tenant_id: null, is_global: true });
  });

  it("super admin COM impersonação → tenant impersonado, não-global", () => {
    const input: TemplateOwnershipInput = {
      isSuperAdmin: true,
      impersonatedTenantId: "t-abc",
      profileTenantId: "t-sa",
    };
    expect(resolveTemplateOwnership(input)).toEqual({ tenant_id: "t-abc", is_global: false });
  });

  it("usuário comum → seu tenant, não-global", () => {
    const input: TemplateOwnershipInput = {
      isSuperAdmin: false,
      impersonatedTenantId: null,
      profileTenantId: "t-user",
    };
    expect(resolveTemplateOwnership(input)).toEqual({ tenant_id: "t-user", is_global: false });
  });

  it("super admin sem tenant no profile e sem impersonação → global sem tenant (não quebra)", () => {
    const input: TemplateOwnershipInput = {
      isSuperAdmin: true,
      impersonatedTenantId: null,
      profileTenantId: null,
    };
    expect(resolveTemplateOwnership(input)).toEqual({ tenant_id: null, is_global: true });
  });

  it("impersonação vence mesmo com profileTenantId preenchido", () => {
    const input: TemplateOwnershipInput = {
      isSuperAdmin: true,
      impersonatedTenantId: "t-imp",
      profileTenantId: "t-sa",
    };
    const out = resolveTemplateOwnership(input);
    expect(out.tenant_id).toBe("t-imp");
    expect(out.is_global).toBe(false);
  });

  it.each<[string, TemplateOwnershipInput]>([
    ["super admin sem impersonação", { isSuperAdmin: true, impersonatedTenantId: null, profileTenantId: "t-sa" }],
    ["super admin com impersonação", { isSuperAdmin: true, impersonatedTenantId: "t-abc", profileTenantId: "t-sa" }],
    ["usuário comum", { isSuperAdmin: false, impersonatedTenantId: null, profileTenantId: "t-user" }],
  ])("cenário canônico %s satisfaz o CHECK do banco", (_label, input) => {
    expect(satisfiesCheck(resolveTemplateOwnership(input))).toBe(true);
  });

  it("payload íntegro: spread {...template, ...ownership} preserva campos e adiciona só tenant_id + is_global", () => {
    const template = {
      nome: "Modelo - Compra e Venda",
      descricao: "desc",
      tipo: "Compra e Venda",
      conteudo: "<p>{{comprador_nome}}</p>",
      variaveis: ["comprador_nome"],
    };
    const ownership = resolveTemplateOwnership({
      isSuperAdmin: false,
      impersonatedTenantId: null,
      profileTenantId: "t-user",
    });
    const insertData = { ...template, ...ownership };

    expect(insertData).toEqual({
      nome: "Modelo - Compra e Venda",
      descricao: "desc",
      tipo: "Compra e Venda",
      conteudo: "<p>{{comprador_nome}}</p>",
      variaveis: ["comprador_nome"],
      tenant_id: "t-user",
      is_global: false,
    });
  });
});
