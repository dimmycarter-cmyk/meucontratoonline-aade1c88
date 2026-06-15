/**
 * Backlog #5 — migração do template [2] "Compra e Venda — 2 Vendedores e Anuente"
 * de endereço GRANULAR → COMPOSTO ({{c_domiciliado}} em {{endereco}}) nos 3 blocos
 * {{#each}} (vendedores, anuentes, compradores). ([1]/[3]/[4] = backlog #8.)
 *
 * Prova: endereço composto (cheio/parcial), supressão R4 do tail "domiciliado em"
 * quando o endereço é todo-vazio, supressão 4.D (RG/CPF/email) ainda válida no [2],
 * e o caráter PER-ITEM (um cheio + um vazio no mesmo render).
 *
 * Lê o conteudo REAL (pós-migração) do payload e renderiza pelo pipeline de produção.
 */
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { enrichParticipantsWithAgreementL1, buildAgreementVarsL2 } from "../agreement";
import { expandEachBlocks, preprocessTemplate, replacePlaceholders } from "../placeholder";
import { buildParticipantsByRole } from "../auto-fill-dados";
import { emptyParticipant, type ManualParticipantData } from "@/components/contract/manual-participant";

const PAYLOAD_PATH = "supabase/functions/seed-templates-leva1/payload.json";

function loadTemplate2(): string {
  const payload = JSON.parse(readFileSync(PAYLOAD_PATH, "utf8"));
  const t2 = payload.templates[2];
  expect(t2.nome).toContain("2 Vendedores e Anuente");
  return t2.conteudo;
}

function mk(
  role: ManualParticipantData["role"],
  nome: string,
  extra: Partial<ManualParticipantData> = {}
): ManualParticipantData {
  return { ...emptyParticipant(role), nome, ...extra };
}

/** Pipeline completo de geração (idêntico a NovoContrato/template-0-v2). */
function render(
  template: string,
  participants: ManualParticipantData[],
  globals: Record<string, string> = {}
): string {
  const byRole = buildParticipantsByRole(participants);
  const enriched = enrichParticipantsWithAgreementL1(byRole);
  const allVars = { ...globals, ...buildAgreementVarsL2(byRole) };
  const step1 = expandEachBlocks(template, enriched);
  const step2 = preprocessTemplate(step1, allVars);
  return replacePlaceholders(step2, allVars);
}

/** Endereço completo reutilizável. */
const FULL_ADDR = {
  rua: "Rua das Flores",
  numero: "10",
  bairro: "Centro",
  cidade: "Belo Horizonte",
  estado: "mg",
  cep: "30130000",
};

describe("template [2] V2 — endereço migrado granular→composto", () => {
  const TPL = loadTemplate2();

  it("migração: nenhum placeholder granular de endereço sobra no template", () => {
    expect(TPL).not.toContain("{{endereco_rua}}");
    expect(TPL).not.toContain("{{endereco_bairro}}");
    expect(TPL).not.toContain("{{endereco_cidade}}");
    // 3 blocos migrados para a forma composta.
    expect(TPL.match(/\{\{c_domiciliado\}\} em \{\{endereco\}\}/g)?.length).toBe(3);
  });

  it("(a) cheio + (b) parcial + ANUENTE: endereço composto, sem scaffold granular", () => {
    const out = render(TPL, [
      mk("vendedor", "João Silva", { genero: "M", cpf: "11111111111", rg: "MG-1", orgao_expedidor: "SSP/MG", profissao: "engenheiro", email: "joao@x.com", ...FULL_ADDR }),
      mk("vendedor", "Ana Prado", { genero: "F", cpf: "33333333333", rua: "Rua Parcial", cidade: "Belo Horizonte", estado: "mg" }),
      mk("anuente", "Carlos Anuente", { genero: "M", cpf: "44444444444", rua: "Av. Anuente", numero: "500", bairro: "Lourdes", cidade: "Belo Horizonte", estado: "mg", cep: "30170000" }),
      mk("comprador", "Maria Souza", { genero: "F", cpf: "22222222222" }),
    ], { anuente_nome: "Carlos Anuente" }); // destrava o bloco {{#if anuente_nome}}

    // (a) cheio
    expect(out).toContain("domiciliado em Rua das Flores, nº 10, Bairro Centro, Belo Horizonte/MG, CEP 30130-000");
    // (b) parcial — composeEnderecoCanonico junta só não-vazios (s/n quando há rua sem número)
    expect(out).toContain("em Rua Parcial, s/n, Belo Horizonte/MG");
    // ANUENTE (3º bloco migrado) também rende composto — Carlos é M → "domiciliado"
    expect(out).toContain("domiciliado em Av. Anuente, nº 500, Bairro Lourdes, Belo Horizonte/MG, CEP 30170-000");
    // Nenhum resíduo de construto/placeholder de endereço
    expect(out).not.toContain("{{endereco");
    expect(out).not.toContain("na {{endereco_rua}}");
  });

  it("(c) endereço todo-vazio: sem 'domiciliado em' pendurado (R4)", () => {
    // RG/CPF/email PREENCHIDOS, ninguém com endereço → isola o R4 (vendedor + comprador).
    const out = render(TPL, [
      mk("vendedor", "João Silva", { genero: "M", cpf: "11111111111", rg: "MG-1", orgao_expedidor: "SSP/MG", profissao: "engenheiro", email: "joao@x.com" }),
      mk("comprador", "Maria Souza", { genero: "F", cpf: "22222222222", rg: "MG-2", orgao_expedidor: "SSP/MG", email: "maria@x.com" }),
    ]);

    expect(out).not.toMatch(/domiciliad[oa] em/); // cobre masculino e feminino
    // O fecho cola direto no e-mail: "…joao@x.com</strong>, doravante…"
    expect(out).toContain("<strong>joao@x.com</strong>, doravante");
  });

  it("(d) RG/CPF/email vazios continuam suprimidos no [2] (4.D)", () => {
    const out = render(TPL, [
      mk("vendedor", "João Silva", { genero: "M", profissao: "corretor", estado_civil: "solteiro", ...FULL_ADDR }),
      mk("comprador", "Maria Souza", { genero: "F", cpf: "22222222222" }),
    ]);

    expect(out).not.toMatch(/Carteira de Identidade nº <strong>\s*<\/strong>/);
    expect(out).not.toContain("CPF sob o nº <strong></strong>");
    expect(out).not.toContain("endereço eletrônico: <strong></strong>");
    // Endereço cheio do vendedor segue presente (composto)
    expect(out).toContain("domiciliado em Rua das Flores, nº 10, Bairro Centro, Belo Horizonte/MG, CEP 30130-000");
  });

  it("(e) per-item: 2 vendedores, um cheio + um vazio → só o cheio tem 'domiciliado em'", () => {
    const out = render(TPL, [
      mk("vendedor", "João Silva", { genero: "M", cpf: "11111111111", rg: "MG-1", orgao_expedidor: "SSP/MG", email: "joao@x.com", ...FULL_ADDR }),
      mk("vendedor", "Carlos Vazio", { genero: "M", cpf: "55555555555", rg: "MG-9", orgao_expedidor: "SSP/MG", email: "carlos@x.com" }),
      mk("comprador", "Maria Souza", { genero: "F", cpf: "22222222222" }),
    ]);

    // Cheio mantém o endereço composto…
    expect(out).toContain("domiciliado em Rua das Flores, nº 10, Bairro Centro, Belo Horizonte/MG, CEP 30130-000");
    // …e o vazio NÃO deixa tail: exatamente 1 ocorrência de "domiciliado em" no doc.
    expect((out.match(/domiciliad[oa] em/g) || []).length).toBe(1);
    // O vazio ainda aparece (mantém RG/CPF/email), só perdeu o endereço.
    expect(out).toContain("<strong>carlos@x.com</strong>");
  });
});
