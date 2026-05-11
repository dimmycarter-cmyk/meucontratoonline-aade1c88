/**
 * Snapshots dos 4 cenários canônicos do endereço (compra e venda imobiliária).
 *
 * Estes testes fixam visualmente como o endereço aparece no contrato, para
 * que qualquer alteração futura em `composeEnderecoCanonico` seja vista de
 * imediato no diff do snapshot. Servem também como documentação executável
 * do padrão para devs/IAs futuras.
 *
 * Para regenerar snapshots intencionalmente:
 *   ./node_modules/.bin/vitest run src/lib/__tests__/endereco-snapshot.test.ts -u
 */
import { describe, it, expect } from "vitest";
import { composeEnderecoCanonico, type EnderecoParts } from "../contract-formatters";

const cenarios: Record<string, EnderecoParts> = {
  "A — endereço completo (rua, número, complemento, bairro, cidade/UF, CEP)": {
    rua: "Avenida Brasil",
    numero: "1500",
    complemento: "Apto 302",
    bairro: "Centro",
    cidade: "Belo Horizonte",
    estado: "mg", // ⚠ minúsculo de propósito — função normaliza para MG
    cep: "30130000",
  },
  "B — sem complemento": {
    rua: "Rua das Flores",
    numero: "100",
    bairro: "Vila Nova",
    cidade: "Curitiba",
    estado: "PR",
    cep: "80000123",
  },
  "C — sem número (lote rural / endereço informal)": {
    rua: "Estrada do Sertão",
    bairro: "Zona Rural",
    cidade: "Diamantina",
    estado: "MG",
    cep: "39100000",
  },
  "D — campo faltando (sem bairro e sem CEP)": {
    rua: "Rua Augusta",
    numero: "2500",
    complemento: "Sala 12",
    cidade: "São Paulo",
    estado: "SP",
  },
};

describe("snapshot endereço canônico", () => {
  for (const [titulo, input] of Object.entries(cenarios)) {
    it(titulo, () => {
      expect(composeEnderecoCanonico(input)).toMatchSnapshot();
    });
  }
});
