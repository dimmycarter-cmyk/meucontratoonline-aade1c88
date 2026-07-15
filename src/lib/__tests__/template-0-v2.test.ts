/**
 * Cobertura do template [0] "Compra e Venda à Vista — Padrão" após a migração V2.
 *
 * Lê o conteudo REAL do payload.json e o renderiza pelo MESMO pipeline de
 * NovoContrato.tsx:
 *   buildParticipantsByRole -> enrichParticipantsWithAgreementL1 ->
 *   expandEachBlocks -> buildAgreementVarsL2 (+ flat) -> preprocess -> replace
 *
 * Valida: qualificação por {{#each}} com concordância PT-BR e endereço COMPOSTO,
 * condicionais {{#if}} (sinal, banco, intermediadoras, testemunha 2), títulos de
 * grupo {{*_titulo}}, e assinaturas flat — sem sobra de construto/placeholder.
 */
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import {
  enrichParticipantsWithAgreementL1,
  buildAgreementVarsL2,
} from "../agreement";
import {
  expandEachBlocks,
  preprocessTemplate,
  replacePlaceholders,
} from "../placeholder";
import { buildParticipantsByRole } from "../auto-fill-dados";
import {
  emptyParticipant,
  type ManualParticipantData,
} from "@/components/contract/manual-participant";

const PAYLOAD_PATH = "supabase/functions/seed-templates-leva1/payload.json";

function loadTemplate0(): string {
  const payload = JSON.parse(readFileSync(PAYLOAD_PATH, "utf8"));
  const t0 = payload.templates[0];
  expect(t0.nome).toContain("Compra e Venda à Vista");
  return t0.conteudo;
}

function mk(
  role: ManualParticipantData["role"],
  nome: string,
  extra: Partial<ManualParticipantData> = {}
): ManualParticipantData {
  return { ...emptyParticipant(role), nome, ...extra };
}

/** Vars globais não-participante mínimas usadas pelo corpo do [0]. */
function baseGlobals(): Record<string, string> {
  return {
    empresa_nome: "Imobiliária Alfa Ltda",
    empresa_cnpj: "12.345.678/0001-90",
    empresa_creci: "CRECI-MG 1234",
    empresa_endereco: "Av. Central, 1000",
    empresa_cidade: "Belo Horizonte",
    empresa_estado: "MG",
    empresa_cep: "30100-000",
    empresa_email: "contato@alfa.com",
    empresa_whatsapp: "(31) 90000-0000",
    imovel_descricao: "Apartamento 101",
    imovel_tipo: "Residencial",
    imovel_endereco: "Rua do Imóvel, 50",
    imovel_area_privativa: "70m²",
    imovel_area_total: "90m²",
    imovel_area_acessoria: "5m²",
    imovel_vagas: "1",
    imovel_matricula: "12345",
    imovel_cartorio: "1º RI de BH",
    imovel_inscricao_municipal: "INSC-1",
    imovel_indice_cadastral: "IDX-1",
    valor_total: "R$ 500.000,00",
    valor_total_extenso: "quinhentos mil reais",
    forma_pagamento: "transferência bancária",
    valor_corretagem: "R$ 30.000,00",
    prazo_posse_dias: "30",
    prazo_escritura: "60 dias",
    multa_atraso_diaria: "R$ 200,00",
    multa_rescisao: "10%",
    foro: "Belo Horizonte/MG",
    cidade_contrato: "Belo Horizonte",
    data_contrato_extenso: "8 de junho de 2026",
    testemunha1_nome: "Tânia Lima",
    testemunha1_cpf: "333.333.333-33",
  };
}

/**
 * Roda o pipeline completo de geração.
 * `blankLineFormat: "html"` espelha o que `renderContract` faz em produção
 * (2.2a) — sem isso o teste renderizaria underscores crus e deixaria de provar
 * o formato que a UI consome.
 */
function render(
  template: string,
  participants: ManualParticipantData[],
  globals: Record<string, string>
): string {
  const byRole = buildParticipantsByRole(participants);
  const enriched = enrichParticipantsWithAgreementL1(byRole);
  const allVars = { ...globals, ...buildAgreementVarsL2(byRole) };

  const step1 = expandEachBlocks(template, enriched, { blankLineFormat: "html" });
  const step2 = preprocessTemplate(step1, allVars);
  return replacePlaceholders(step2, allVars, { blankLineFormat: "html" });
}

/** Lacuna emitida por `blank_line` no formato html. */
const LACUNA = '<span class="lacuna">__________</span>';

/** Contagem exata de um padrão — N derivado da fixture à mão, nunca do motor. */
const countMatches = (s: string, re: RegExp): number => (s.match(re) || []).length;

describe("template [0] V2 — render ponta-a-ponta", () => {
  const TPL = loadTemplate0();

  it("não deixa construto V2 nem placeholder órfão após render", () => {
    const out = render(
      TPL,
      [
        mk("vendedor", "João Silva", {
          genero: "M",
          cpf: "11111111111",
          rg: "MG-1",
          orgao_expedidor: "SSP/MG",
          profissao: "engenheiro",
          email: "joao@x.com",
          rua: "Rua das Flores",
          numero: "10",
          bairro: "Centro",
          cidade: "Belo Horizonte",
          estado: "mg",
          cep: "30130000",
        }),
        mk("comprador", "Maria Souza", {
          genero: "F",
          cpf: "22222222222",
          rg: "MG-2",
          orgao_expedidor: "SSP/MG",
          profissao: "advogada",
          email: "maria@x.com",
          rua: "Rua B",
          numero: "20",
          bairro: "Savassi",
          cidade: "Belo Horizonte",
          estado: "mg",
          cep: "30140000",
        }),
      ],
      { ...baseGlobals(), vendedor_nome: "João Silva", comprador_nome: "Maria Souza" }
    );

    expect(out).not.toContain("{{#each");
    expect(out).not.toContain("{{/each}}");
    expect(out).not.toContain("{{#if");
    expect(out).not.toContain("{{/if}}");
    expect(out).not.toContain("{{");
  });

  it("qualificação: título de grupo + concordância N1 + endereço composto", () => {
    const out = render(
      TPL,
      [
        mk("vendedor", "João Silva", {
          genero: "M",
          cpf: "11111111111",
          rg: "MG-1",
          orgao_expedidor: "SSP/MG",
          profissao: "engenheiro",
          email: "joao@x.com",
          rua: "Rua das Flores",
          numero: "10",
          bairro: "Centro",
          cidade: "Belo Horizonte",
          estado: "mg",
          cep: "30130000",
        }),
        mk("comprador", "Maria Souza", { genero: "F", cpf: "22222222222" }),
      ],
      { ...baseGlobals(), vendedor_nome: "João Silva", comprador_nome: "Maria Souza" }
    );

    // Título de grupo (N2) — vendedor singular M, comprador singular F
    expect(out).toContain("<strong>PROMITENTE VENDEDOR:</strong>");
    expect(out).toContain("<strong>PROMISSARIA COMPRADORA:</strong>");
    // Concordância N1 individual
    expect(out).toContain("brasileiro, engenheiro, portador da Carteira");
    expect(out).toContain("inscrito no CPF sob o nº <strong>111.111.111-11</strong>");
    // Endereço COMPOSTO (não granular)
    expect(out).toContain("em Rua das Flores, nº 10, Bairro Centro, Belo Horizonte/MG, CEP 30130-000");
    // Fecho concordado
    expect(out).toContain("doravante denominado simplesmente <strong>PROMITENTE VENDEDOR</strong>");
    expect(out).toContain("doravante denominada simplesmente <strong>PROMISSARIA COMPRADORA</strong>");
    // Imobiliária permanece FIXA
    expect(out).toContain("Imobiliária Alfa Ltda");
  });

  it("2 vendedores: lista PT-BR com \" e \" + título plural", () => {
    const out = render(
      TPL,
      [
        mk("vendedor", "João Silva", {
          genero: "M",
          cpf: "11111111111",
          rua: "Rua A",
          numero: "10",
          bairro: "Centro",
          cidade: "Belo Horizonte",
          estado: "mg",
          cep: "30130000",
        }),
        mk("vendedor", "Ana Prado", {
          genero: "F",
          cpf: "33333333333",
          rua: "Rua B",
          numero: "20",
          bairro: "Savassi",
          cidade: "Belo Horizonte",
          estado: "mg",
          cep: "30140000",
        }),
        mk("comprador", "Maria Souza", { genero: "F", cpf: "22222222222" }),
      ],
      {
        ...baseGlobals(),
        vendedor_nome: "João Silva",
        vendedor2_nome: "Ana Prado",
        comprador_nome: "Maria Souza",
      }
    );

    // Misto M+F => plural masculino
    expect(out).toContain("<strong>PROMITENTES VENDEDORES:</strong>");
    // Lista PT-BR: os dois nomes unidos por " e " (cada um em <strong>)
    expect(out).toMatch(/João Silva<\/strong>[\s\S]*? e <strong>Ana Prado<\/strong>/);
    expect(out).toContain("doravante denominados");
    // Assinatura do 2º vendedor (flat {{#if vendedor2_nome}}) aparece
    expect(out).toContain("PROMITENTES VENDEDORES: Ana Prado");
  });

  it("condicionais OFF: sinal, intermediadoras e testemunha 2 somem", () => {
    const out = render(
      TPL,
      [
        mk("vendedor", "João Silva", { genero: "M", cpf: "11111111111" }),
        mk("comprador", "Maria Souza", { genero: "F", cpf: "22222222222" }),
      ],
      { ...baseGlobals(), vendedor_nome: "João Silva", comprador_nome: "Maria Souza" }
    );

    expect(out).not.toContain("A título de sinal");
    expect(out).not.toContain("Valor a receber do sinal");
    expect(out).not.toContain("Testemunha 2");
    // Testemunha 1 (fixa) permanece
    expect(out).toContain("Testemunha 1: Tânia Lima");
  });

  it("condicionais ON: sinal+banco, intermediadora 1 e testemunha 2 aparecem", () => {
    const out = render(
      TPL,
      [
        mk("vendedor", "João Silva", {
          genero: "M",
          cpf: "11111111111",
          banco: "Banco do Brasil",
          agencia: "1234",
          conta: "56789-0",
          pix: "joao@pix.com",
        }),
        mk("comprador", "Maria Souza", { genero: "F", cpf: "22222222222" }),
      ],
      {
        ...baseGlobals(),
        vendedor_nome: "João Silva",
        comprador_nome: "Maria Souza",
        vendedor_banco: "Banco do Brasil",
        vendedor_agencia: "1234",
        vendedor_conta: "56789-0",
        vendedor_pix: "joao@pix.com",
        valor_sinal: "R$ 50.000,00",
        valor_sinal_extenso: "cinquenta mil reais",
        intermediadora1_nome: "Corretor Beta",
        intermediadora1_cnpj: "98.765.432/0001-10",
        intermediadora1_banco: "Itaú",
        intermediadora1_agencia: "4321",
        intermediadora1_conta: "11111-1",
        intermediadora1_valor_sinal: "R$ 5.000,00",
        testemunha2_nome: "Tito Rocha",
        testemunha2_cpf: "444.444.444-44",
      }
    );

    expect(out).toContain("A título de sinal e princípio de pagamento, foi paga a quantia de R$ 50.000,00");
    expect(out).toContain("Banco Banco do Brasil, Agência 1234, Conta 56789-0, PIX joao@pix.com");
    expect(out).toContain("Corretor Beta");
    expect(out).toContain("Testemunha 2: Tito Rocha — CPF 444.444.444-44");
    // Intermediadora 2 (não fornecida) continua ausente
    expect(out).not.toContain("intermediadora2");
  });

  it("multi-participante: completo mantém RG/CPF/e-mail; vazio ganha LACUNA por item (2.2a)", () => {
    // O regression que {{#if}} global causaria: aqui um item tem dados e o
    // outro não. O fallback é POR-ITEM, então o completo NÃO pode perder a
    // vírgula nem o "-" do CPF, e o vazio TEM de exibir a lacuna (antes da
    // 2.2a o scaffold sumia inteiro e a ausência ficava invisível).
    const out = render(
      TPL,
      [
        mk("vendedor", "João Silva", {
          genero: "M",
          cpf: "11111111111",
          rg: "MG-1",
          orgao_expedidor: "SSP/MG",
          profissao: "engenheiro",
          email: "joao@x.com",
          rua: "Rua das Flores",
          numero: "10",
          bairro: "Centro",
          cidade: "Belo Horizonte",
          estado: "mg",
          cep: "30130000",
        }),
        mk("vendedor", "Carlos Vazio", {
          genero: "M",
          // SEM rg / orgao_expedidor / cpf / email — só nome + endereço.
          profissao: "corretor",
          rua: "Rua B",
          numero: "20",
          bairro: "Savassi",
          cidade: "Belo Horizonte",
          estado: "mg",
          cep: "30140000",
        }),
      ],
      {
        ...baseGlobals(),
        vendedor_nome: "João Silva",
        vendedor2_nome: "Carlos Vazio",
        comprador_nome: "Maria Souza",
      }
    );

    // Completo (João): CPF formatado + vírgula + o "-" interno do CPF preservados.
    expect(out).toContain("inscrito no CPF sob o nº <strong>111.111.111-11</strong>,");
    // Completo: hífen RG–órgão preservado.
    expect(out).toContain("<strong>MG-1</strong> - <strong>SSP/MG</strong>");
    // Completo: e-mail preservado.
    expect(out).toContain("endereço eletrônico: <strong>joao@x.com</strong>");

    // Vazio (Carlos) — PRESENÇA da lacuna. Antes da 2.2a estas três cláusulas
    // sumiam e o contrato saía sem sinal algum de que faltavam RG/órgão/CPF.
    expect(out).toContain(
      `Carteira de Identidade nº <strong>${LACUNA}</strong> - <strong>${LACUNA}</strong>`
    );
    expect(out).toContain(`inscrito no CPF sob o nº <strong>${LACUNA}</strong>`);

    // N à mão: só Carlos está sem RG/órgão/CPF (João tem tudo) → 1 de cada.
    expect(countMatches(out, /Carteira de Identidade nº <strong><span class="lacuna">/g)).toBe(1);
    expect(countMatches(out, /CPF sob o nº <strong><span class="lacuna">/g)).toBe(1);

    // R3 VIVA: e-mail não é essencial (A2) → Carlos perde o scaffold inteiro,
    // João mantém o seu. Ausência é a asserção correta — campo não-essencial.
    expect(out).not.toContain("endereço eletrônico: <strong></strong>");
    expect(countMatches(out, /endereço eletrônico:/g)).toBe(1); // só o de João

    // Endereços: ambos preenchidos → nenhuma lacuna de endereço.
    expect(countMatches(out, /domiciliad[oa] em <span class="lacuna">/g)).toBe(0);
  });

  it("não duplica prefixo monetário (BUG 2: nunca \"R$ R$\")", () => {
    const out = render(
      TPL,
      [
        mk("vendedor", "João Silva", { genero: "M", cpf: "11111111111" }),
        mk("comprador", "Maria Souza", { genero: "F", cpf: "22222222222" }),
      ],
      {
        ...baseGlobals(),
        vendedor_nome: "João Silva",
        comprador_nome: "Maria Souza",
        valor_sinal: "R$ 50.000,00",
        valor_sinal_extenso: "cinquenta mil reais",
      }
    );

    // valor_total/corretagem/sinal/multa já vêm com "R$ "; o template não pode
    // prefixar outro "R$" (tolerante a espaço comum ou NBSP entre eles).
    expect(out).not.toMatch(/R\$[\s ]*R\$/);
    expect(out).not.toContain("R$ R$");
  });

  it("não duplica prefixo \"Imóvel:\" (BUG 5)", () => {
    const out = render(
      TPL,
      [
        mk("vendedor", "João Silva", { genero: "M", cpf: "11111111111" }),
        mk("comprador", "Maria Souza", { genero: "F", cpf: "22222222222" }),
      ],
      {
        ...baseGlobals(),
        vendedor_nome: "João Silva",
        comprador_nome: "Maria Souza",
        // hábito comum de digitação: descrição já começa com "Imóvel:"
        imovel_descricao: "Imóvel: Apartamento 101",
      }
    );

    // O [0] não pode gerar "Imóvel: Imóvel:" (qualquer caixa/acento, NBSP ok).
    expect(out).not.toMatch(/im[óo]vel:[\s ]*im[óo]vel:/i);
  });
});
