/**
 * Teste de PARIDADE (Fase 2 / 2.1): prova que renderContract() reproduz
 * BYTE A BYTE a saída do caminho de preview legado (buildFinalContent,
 * NovoContrato.tsx:686-699) para os templates REAIS das fixtures
 * (payload.json: [0] "Compra e Venda à Vista" e [2] "2 Vendedores e Anuente").
 *
 * A sequência legada é reimplementada AQUI como referência congelada —
 * se renderContract divergir dela em 1 byte, o teste quebra.
 */
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { renderContract } from "../render-contract";
import { enrichDados, type CompanyData } from "../contract-enrichment";
import { enrichParticipantsWithAgreementL1, buildAgreementVarsL2 } from "../agreement";
import { expandEachBlocks, preprocessTemplate, replacePlaceholders } from "../placeholder";
import { buildParticipantsByRole } from "../auto-fill-dados";
import { emptyParticipant, type ManualParticipantData } from "@/components/contract/manual-participant";

const PAYLOAD_PATH = "supabase/functions/seed-templates-leva1/payload.json";

function loadTemplate(index: 0 | 2, nomeContains: string): string {
  const payload = JSON.parse(readFileSync(PAYLOAD_PATH, "utf8"));
  const t = payload.templates[index];
  expect(t.nome).toContain(nomeContains);
  return t.conteudo;
}

/**
 * Referência: sequência EXATA de buildFinalContent (NovoContrato.tsx:686-699)
 * antes da unificação. Não alterar — é o padrão-ouro da paridade.
 */
function legacyPreviewRender(
  raw: string,
  dados: Record<string, string>,
  manualParticipants: ManualParticipantData[],
  empresa: CompanyData | null
): string {
  const enrichedDados = enrichDados(dados, { company: empresa ?? null });
  const byRole = buildParticipantsByRole(manualParticipants);
  const byRoleWithAgreement = enrichParticipantsWithAgreementL1(byRole);
  const dadosWithAgreement = { ...enrichedDados, ...buildAgreementVarsL2(byRole) };
  const expanded = expandEachBlocks(raw, byRoleWithAgreement);
  const processed = preprocessTemplate(expanded, dadosWithAgreement);
  return replacePlaceholders(processed, dadosWithAgreement);
}

function mk(
  role: ManualParticipantData["role"],
  nome: string,
  extra: Partial<ManualParticipantData> = {}
): ManualParticipantData {
  return { ...emptyParticipant(role), nome, ...extra };
}

/** Cenário realista: 2 vendedores (M+F), 1 anuente, 1 comprador, 2 testemunhas. */
const PARTICIPANTS: ManualParticipantData[] = [
  mk("vendedor", "João Silva", {
    genero: "M", cpf: "11111111111", rg: "MG-1", orgao_expedidor: "SSP/MG",
    profissao: "engenheiro", estado_civil: "casado", email: "joao@x.com",
    rua: "Rua das Flores", numero: "10", bairro: "Centro",
    cidade: "Belo Horizonte", estado: "mg", cep: "30130000",
  }),
  mk("vendedor", "Mayara Dias", {
    genero: "F", cpf: "44444444444", profissao: "arquiteta", estado_civil: "solteira",
    rua: "Rua C", numero: "33", cidade: "Contagem", estado: "MG",
  }),
  mk("anuente", "Cristiano Souza", { genero: "M", cpf: "55555555555" }),
  mk("comprador", "Maria Souza", {
    genero: "F", cpf: "22222222222", rg: "MG-2", orgao_expedidor: "SSP/MG",
    profissao: "advogada", estado_civil: "divorciada", email: "maria@x.com",
    rua: "Rua B", numero: "20", bairro: "Savassi",
    cidade: "Belo Horizonte", estado: "MG", cep: "30140000",
  }),
  mk("testemunha", "Tânia Lima", { cpf: "33333333333" }),
  mk("testemunha", "Rui Alves", { cpf: "66666666666" }),
];

const EMPRESA: CompanyData = {
  nome_fantasia: "Imobiliária Alfa Ltda",
  razao_social: "Alfa Negócios Imobiliários Ltda",
  cnpj: "12345678000190",
  creci: "CRECI-MG 1234",
  email: "contato@alfa.com",
  whatsapp: "31900000000",
  rua: "Av. Central", numero: "1000", bairro: "Centro",
  cidade: "Belo Horizonte", estado: "MG", cep: "30100000",
  banco: "Banco Alfa", agencia: "0001", conta: "12345-6", pix: "pix@alfa.com",
};

/** Globais parcialmente preenchidos DE PROPÓSITO — a paridade deve valer
 *  também com campos faltando (fallbacks omit/blank_line ativados). */
const DADOS: Record<string, string> = {
  imovel_descricao: "Apartamento 101",
  imovel_endereco: "Rua do Imóvel, 50",
  imovel_matricula: "12345",
  valor_total: "500000",
  valor_sinal: "50000",
  forma_pagamento: "transferência bancária",
  prazo_escritura: "60 dias",
  foro: "Belo Horizonte/MG",
  cidade_contrato: "Belo Horizonte",
  data_contrato: "2026-07-14",
};

describe("paridade renderContract × preview legado (byte a byte)", () => {
  it.each([
    { idx: 0 as const, nome: "Compra e Venda à Vista" },
    { idx: 2 as const, nome: "2 Vendedores e Anuente" },
  ])("template [$idx] $nome", ({ idx, nome }) => {
    const template = loadTemplate(idx, nome);

    const expected = legacyPreviewRender(template, DADOS, PARTICIPANTS, EMPRESA);
    const actual = renderContract(template, DADOS, PARTICIPANTS, { company: EMPRESA }).html;

    expect(actual).toBe(expected);
    expect(actual.length).toBeGreaterThan(1000); // sanidade: renderizou de verdade
  });

  it("paridade também sem empresa e sem participantes (caminho mínimo)", () => {
    const template = loadTemplate(0, "Compra e Venda à Vista");
    const expected = legacyPreviewRender(template, DADOS, [], null);
    const actual = renderContract(template, DADOS, [], {}).html;
    expect(actual).toBe(expected);
  });
});
