import { describe, it, expect } from "vitest";
import {
  IMPORT_CATALOG,
  GENERIC_FIELD_SUFFIXES,
  ROLE_KEYWORDS,
  ORDER_FALLBACK,
  buildLegacyBracketMap,
  type RoleCategory,
} from "../import-catalog";
import { LEGACY_BRACKET_MAP } from "../placeholder";
import { FROZEN_LEGACY_BRACKET_MAP } from "./fixtures/legacy-bracket-map.fixture";

const VALID_CATEGORIES: RoleCategory[] = [
  "comprador", "vendedor", "conjuge", "anuente", "procurador",
  "testemunha", "intermediadora", "imovel", "valores", "empresa", "geral",
];

describe("buildLegacyBracketMap — guarda anti-regressão da consolidação E1", () => {
  it("reproduz o LEGACY_BRACKET_MAP congelado da main aafa63a, chave a chave", () => {
    // toEqual é bidirecional: par perdido OU par extra OU valor alterado quebra aqui.
    expect(buildLegacyBracketMap()).toEqual(FROZEN_LEGACY_BRACKET_MAP);
  });

  it("mantém a contagem exata: 171 pares literais, 131 chaves canônicas distintas", () => {
    const map = buildLegacyBracketMap();
    expect(Object.keys(map)).toHaveLength(171);
    expect(new Set(Object.values(map)).size).toBe(131);
  });

  it("é a fonte do LEGACY_BRACKET_MAP exportado por placeholder.ts (sem 4º dicionário)", () => {
    expect(LEGACY_BRACKET_MAP).toEqual(FROZEN_LEGACY_BRACKET_MAP);
  });
});

describe("IMPORT_CATALOG — invariantes estruturais", () => {
  it("não tem label/alias duplicado entre entries (lookup determinístico)", () => {
    const seen = new Set<string>();
    for (const entry of IMPORT_CATALOG) {
      for (const label of [entry.label, ...entry.aliases]) {
        expect(seen.has(label), `label duplicado: "${label}"`).toBe(false);
        seen.add(label);
      }
    }
    expect(seen.size).toBe(171);
  });

  it("não tem chave canônica duplicada entre entries", () => {
    const keys = IMPORT_CATALOG.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("toda entry tem categoria válida e coerente com o prefixo da chave", () => {
    for (const entry of IMPORT_CATALOG) {
      expect(VALID_CATEGORIES).toContain(entry.category);
    }
    // Amostras de coerência papel ↔ prefixo
    const byKey = new Map(IMPORT_CATALOG.map((e) => [e.key, e.category]));
    expect(byKey.get("vendedor3_cpf")).toBe("vendedor");
    expect(byKey.get("comprador2_endereco")).toBe("comprador");
    expect(byKey.get("intermediadora1_cnpj")).toBe("intermediadora");
    expect(byKey.get("imovel_matricula")).toBe("imovel");
    expect(byKey.get("valor_total")).toBe("valores");
    expect(byKey.get("empresa_cnpj")).toBe("empresa");
    expect(byKey.get("data_contrato")).toBe("geral");
  });
});

describe("GENERIC_FIELD_SUFFIXES — consolidação do genericLabelToFieldSuffix", () => {
  it("congela os 15 pares do dicionário genérico original", () => {
    expect(GENERIC_FIELD_SUFFIXES).toEqual({
      "CPF": "cpf",
      "RG": "rg",
      "RG/ÓRGÃO EMISSOR": "rg",
      "ÓRGÃO EMISSOR": "orgao_expedidor",
      "ÓRGÃO EXPEDIDOR": "orgao_expedidor",
      "NOME": "nome",
      "NOME COMPLETO": "nome",
      "ENDEREÇO": "endereco",
      "ENDEREÇO COMPLETO": "endereco",
      "NACIONALIDADE": "nacionalidade",
      "ESTADO CIVIL": "estado_civil",
      "PROFISSÃO": "profissao",
      "E-MAIL": "email",
      "EMAIL": "email",
      "TELEFONE": "telefone",
    });
  });
});

describe("ROLE_KEYWORDS / ORDER_FALLBACK — consolidação do contexto de papel", () => {
  it("cobre os 6 papéis originais com regex insensível a gênero/plural", () => {
    const roles = ROLE_KEYWORDS.map((r) => r.role);
    expect(roles).toEqual(["vendedor", "comprador", "procurador", "conjuge", "anuente", "testemunha"]);
    const vendedorRx = ROLE_KEYWORDS[0].rx;
    expect(vendedorRx.test("PROMITENTE VENDEDORA")).toBe(true);
    expect(vendedorRx.test("os vendedores")).toBe(true);
    expect(vendedorRx.test("revendedor")).toBe(false);
  });

  it("mantém a ordem de fallback original (1ª=vendedor, 2ª=comprador)", () => {
    expect(ORDER_FALLBACK).toEqual(["vendedor", "comprador", "conjuge", "anuente"]);
  });
});
