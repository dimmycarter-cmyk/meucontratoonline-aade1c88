/**
 * Teste de PARIDADE (Fase 2 / 2.1): prova que renderContract() reproduz a saída
 * do caminho de preview legado (buildFinalContent, NovoContrato.tsx:686-699)
 * para os templates REAIS das fixtures (payload.json: [0] "Compra e Venda à
 * Vista" e [2] "2 Vendedores e Anuente").
 *
 * A sequência legada é reimplementada AQUI como referência CONGELADA —
 * se renderContract divergir dela, o teste quebra.
 *
 * ⚠ 2.2a — POR QUE `unwrap` E POR QUE A REFERÊNCIA NÃO RECEBE "html":
 *
 * renderContract passa `blankLineFormat: "html"`; a referência congelada não
 * conhece o parâmetro e emite `__________` cru. A divergência é DELIBERADA — a
 * 2.2a mudou a saída de propósito, e não se pode mudar a saída e ao mesmo tempo
 * provar que ela não mudou.
 *
 * A tentação seria passar "html" na referência também. Recusado: descongelar a
 * referência faz os dois lados driftarem JUNTOS e o teste passa a provar nada —
 * viraria `f(x) === f(x)`. Em vez disso, desembrulhamos o span no lado do
 * renderContract e exigimos igualdade byte a byte com a referência intacta.
 *
 * O que o teste prova então, e é forte: a ÚNICA divergência que a 2.2a
 * introduziu na sequência congelada é o wrapper do span. Todo o resto —
 * ordem das etapas (enrich → each → agreement → preprocess → replace), enrich,
 * concordância, condicionais — segue byte-idêntico.
 *
 * O `countLacunas(...).toBe(N)` com N HARDCODED é o guard anti-vacuidade: se
 * um campo flipar omit↔blank_line na tabela amanhã, N muda e o teste quebra.
 * N jamais é calculado pelo motor (seria circular) — foi derivado à mão
 * inspecionando cada lacuna do render real. Ver composição em cada caso.
 */
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { renderContract, countLacunas } from "../render-contract";
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

/**
 * Desembrulha `<span class="lacuna">___</span>` → `___`, revertendo a ÚNICA
 * diferença de formato entre renderContract ("html") e a referência congelada
 * ("text"). Não toca em mais nada.
 */
const unwrap = (html: string): string =>
  html.replace(/<span class="lacuna">(_+)<\/span>/g, "$1");

describe("paridade renderContract × preview legado (byte a byte)", () => {
  it.each([
    // N derivado à mão, inspecionando o render real (composição atualizada no
    // Commit 2 da 2.2b — default invertido para blank_line):
    //  [0] = 20 → os 7 da 2.2a (Mayara rg+orgao, valor_corretagem,
    //             vendedor_nome/comprador_nome planos, testemunha1 nome+cpf)
    //             + 13 do flip: e-mail da Mayara (1), imovel_tipo (1), os 7 de
    //             imóvel revertidos da ajuste-12 (áreas ×3, vagas, cartório,
    //             inscrição municipal, índice cadastral), prazo_posse_dias,
    //             multa_atraso_diaria, multa_rescisao,
    //             intermediadora1_valor_sinal (o alias de EMPRESA preenche
    //             nome/cnpj/banco, mas não o valor do repasse).
    //  [2] = 28 → os 13 da 2.2a (Mayara rg+orgao, 7 valor_*, 2 nomes de
    //             assinatura, testemunha1 nome+cpf)
    //             + 15 do flip: e-mail da Mayara (1), dados bancários planos do
    //             vendedor (banco/agencia/conta ×2 cada + pix = 7),
    //             imovel_cartorio/cidade/inscricao_municipal (3),
    //             prazo_escritura_dias, intermediadora1_valor_sinal,
    //             testemunha1_creci, testemunha1_email (4).
    { idx: 0 as const, nome: "Compra e Venda à Vista", lacunas: 20 },
    { idx: 2 as const, nome: "2 Vendedores e Anuente", lacunas: 28 },
  ])("template [$idx] $nome", ({ idx, nome, lacunas }) => {
    const template = loadTemplate(idx, nome);

    const expected = legacyPreviewRender(template, DADOS, PARTICIPANTS, EMPRESA);
    const actual = renderContract(template, DADOS, PARTICIPANTS, { company: EMPRESA }).html;

    // Guard anti-vacuidade: a fixture PRECISA exercitar lacunas, no número exato.
    expect(countLacunas(actual)).toBe(lacunas);
    // Fora o wrapper do span, byte-idêntico à sequência congelada.
    expect(unwrap(actual)).toBe(expected);
    expect(actual.length).toBeGreaterThan(1000); // sanidade: renderizou de verdade
  });

  it("paridade também sem empresa e sem participantes (caminho mínimo)", () => {
    const template = loadTemplate(0, "Compra e Venda à Vista");
    const expected = legacyPreviewRender(template, DADOS, [], null);
    const actual = renderContract(template, DADOS, [], {}).html;

    // N=29 à mão: os 11 da 2.2a (empresa_nome ×3 — o alias intermediadora1_nome
    // resolve para empresa_nome vazio —, empresa_cnpj ×2 — idem para o cnpj —,
    // empresa_endereco, valor_corretagem, 2 nomes de assinatura, testemunha1
    // nome+cpf) + 18 do flip: empresa_creci ×2, empresa_cidade/estado/cep/
    // email/whatsapp (5), imovel_tipo, os 7 de imóvel revertidos,
    // prazo_posse_dias, multa_atraso_diaria, multa_rescisao.
    expect(countLacunas(actual)).toBe(29);
    expect(unwrap(actual)).toBe(expected);
  });
});

describe("paridade CAMINHO FELIZ — fallback não é invocada", () => {
  /**
   * TODOS os campos que o template consome preenchidos. Com o default
   * invertido (2.2b), "essencial" deixou de ser um subconjunto: qualquer campo
   * vazio dispara `blank_line`. Zero lacuna ⇒ formato irrelevante ⇒
   * byte-idêntico SEM unwrap. É a paridade de verdade: prova que a inversão
   * não mexeu em nada no contrato completo — só sinaliza o que falta.
   */
  const DADOS_COMPLETOS: Record<string, string> = {
    ...DADOS,
    valor_corretagem: "30000",
    vendedor_nome: "João Silva",
    comprador_nome: "Maria Souza",
    testemunha1_nome: "Tânia Lima",
    testemunha1_cpf: "33333333333",
    // Flip 2.2b: os 13 campos que deixaram de ser omissíveis entram
    // preenchidos para reconquistar o zero-lacuna (a lista espelha a
    // composição do N=20 do teste de paridade acima, menos o e-mail da
    // Mayara, que é per-participante).
    imovel_tipo: "Residencial",
    imovel_area_privativa: "70m²",
    imovel_area_total: "90m²",
    imovel_area_acessoria: "5m²",
    imovel_vagas: "1",
    imovel_cartorio: "1º RI de BH",
    imovel_inscricao_municipal: "INSC-1",
    imovel_indice_cadastral: "IDX-1",
    prazo_posse_dias: "30",
    multa_atraso_diaria: "200",
    multa_rescisao: "10%",
    intermediadora1_valor_sinal: "5000",
  };

  /** Mayara ganha rg + órgão + e-mail — os únicos campos vazios entre os
   *  participantes que o [0] consome intra-each. */
  const PARTICIPANTS_COMPLETOS: ManualParticipantData[] = PARTICIPANTS.map((p) =>
    p.nome === "Mayara Dias"
      ? { ...p, rg: "MG-4", orgao_expedidor: "SSP/MG", email: "mayara@x.com" }
      : p
  );

  it("template [0] com todos os campos consumidos: zero lacuna e byte-idêntico sem unwrap", () => {
    const template = loadTemplate(0, "Compra e Venda à Vista");

    const expected = legacyPreviewRender(template, DADOS_COMPLETOS, PARTICIPANTS_COMPLETOS, EMPRESA);
    const actual = renderContract(template, DADOS_COMPLETOS, PARTICIPANTS_COMPLETOS, {
      company: EMPRESA,
    }).html;

    expect(countLacunas(actual)).toBe(0);
    expect(actual).toBe(expected); // sem unwrap — não há span algum para desembrulhar
    // Nenhum span de lacuna emitido. NÃO se pode assertar ausência de "____":
    // o template traz linhas de assinatura com underscores LITERAIS
    // ("______<br/>PROMITENTES VENDEDORES:") — que é justamente o padrão de
    // mercado que o blank_line imita.
    expect(actual).not.toContain('<span class="lacuna"');
    expect(actual.length).toBeGreaterThan(1000);
  });
});
