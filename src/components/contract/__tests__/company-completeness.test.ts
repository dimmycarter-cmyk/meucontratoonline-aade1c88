/**
 * D6 (2.2b, Bloco D) — contagem de campos da empresa que virarão lacuna.
 * Contagem exata, nunca toBeGreaterThan (regra da 2.2a).
 */
import { describe, it, expect } from "vitest";
import type { Company } from "@/hooks/useCompanies";
import {
  COMPANY_CONTRACT_FIELDS,
  missingCompanyFields,
} from "../company-completeness";

const FULL: Company = {
  id: "c1",
  tenant_id: "t1",
  nome_fantasia: "Imobiliária Alfa Ltda",
  razao_social: "Alfa Ltda",
  cnpj: "12.345.678/0001-90",
  creci: "CRECI-MG 1234",
  email: "contato@alfa.com",
  whatsapp: "(31) 90000-0000",
  pix: "pix@alfa.com",
  banco: "Banco Alfa",
  agencia: "0001",
  conta: "12345-6",
  cep: "30100-000",
  estado: "MG",
  cidade: "Belo Horizonte",
  bairro: "Centro",
  rua: "Av. Central",
  numero: "1000",
  complemento: null,
  logo_url: null,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

describe("missingCompanyFields (D6)", () => {
  it("cadastro completo → zero campos faltando", () => {
    expect(missingCompanyFields(FULL)).toHaveLength(0);
  });

  it("cadastro cru (só nome) → TODOS os campos de contrato faltando", () => {
    const cru: Company = {
      ...FULL,
      cnpj: null, creci: null, email: null, whatsapp: null, pix: null,
      banco: null, agencia: null, conta: null, cep: null, estado: null,
      cidade: null, bairro: null, rua: null, numero: null,
    };
    // N exato = tamanho da lista declarada (14) — se a lista crescer, o teste
    // acompanha por construção; o que ele trava é a semântica de "faltando".
    expect(missingCompanyFields(cru)).toHaveLength(COMPANY_CONTRACT_FIELDS.length);
    expect(COMPANY_CONTRACT_FIELDS).toHaveLength(14);
  });

  it("whitespace-only é VAZIO — mesma semântica do gate 3a", () => {
    const comEspacos: Company = { ...FULL, creci: " ", banco: "\t" };
    const missing = missingCompanyFields(comEspacos);
    expect(missing.map((f) => f.key)).toEqual(["creci", "banco"]);
  });

  it("empresa ausente → lista vazia (a causa é outra: nenhuma empresa selecionada)", () => {
    expect(missingCompanyFields(null)).toHaveLength(0);
    expect(missingCompanyFields(undefined)).toHaveLength(0);
  });
});
