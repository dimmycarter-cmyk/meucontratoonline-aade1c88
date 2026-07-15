/**
 * Backlog #5 — migração do template [2] "Compra e Venda — 2 Vendedores e Anuente"
 * de endereço GRANULAR → COMPOSTO ({{c_domiciliado}} em {{endereco}}) nos 3 blocos
 * {{#each}} (vendedores, anuentes, compradores). ([1]/[3]/[4] = backlog #8.)
 *
 * Prova: endereço composto (cheio/parcial) e o caráter PER-ITEM (um cheio + um
 * vazio no mesmo render).
 *
 * ⚠ ATUALIZADO NA 2.2a. Este arquivo e template-0-v2 são os ÚNICOS testes que
 * exercitam `renderEachItem` pelo caminho REAL com campo vazio — os unitários de
 * suppress-empty-scaffold chamam a função direto e não provam nada sobre
 * produção. Por isso (c)/(d)/(e) foram REESCRITOS, não deletados: deletá-los
 * deixaria o Item 4 (fallback intra-each, o coração da 2.2a) sem cobertura pelo
 * caminho real — trocar a mentira pelo silêncio.
 *
 * R4 ("domiciliado em" pendurado) e 4.D (RG/CPF) foram APOSENTADAS: esses campos
 * agora deixam LACUNA. Os asserts afirmam PRESENÇA do span — asserção negativa
 * foi exatamente o que deixou o (d) antigo passar verde pelo motivo errado.
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

/**
 * Pipeline completo de geração (idêntico a NovoContrato/template-0-v2).
 * `blankLineFormat: "html"` nos dois passes espelha o que `renderContract` faz
 * em produção (2.2a) — sem isso, o teste renderizaria underscores crus e
 * deixaria de provar o formato que a UI consome.
 */
function render(
  template: string,
  participants: ManualParticipantData[],
  globals: Record<string, string> = {}
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

  it("(c) endereço todo-vazio: 'domiciliado em' PERMANECE com lacuna (R4 aposentada)", () => {
    // RG/CPF/email PREENCHIDOS, ninguém com endereço → isola o endereço.
    // Antes da 2.2a a R4 removia o tail inteiro e o endereço sumia em silêncio.
    // Agora o tail fica e a ausência é VISÍVEL — endereço é essencial (A2).
    const out = render(TPL, [
      mk("vendedor", "João Silva", { genero: "M", cpf: "11111111111", rg: "MG-1", orgao_expedidor: "SSP/MG", profissao: "engenheiro", email: "joao@x.com" }),
      mk("comprador", "Maria Souza", { genero: "F", cpf: "22222222222", rg: "MG-2", orgao_expedidor: "SSP/MG", email: "maria@x.com" }),
    ]);

    // PRESENÇA: os dois participantes mantêm o tail, cada um com sua lacuna.
    expect(out).toContain(`domiciliado em ${LACUNA}`);   // João (M)
    expect(out).toContain(`domiciliada em ${LACUNA}`);   // Maria (F)
    // N=2 à mão: 1 vendedor + 1 comprador, ambos sem endereço. O bloco
    // {{#each anuentes}} rende vazio (sem anuente na fixture).
    expect(countMatches(out, /domiciliad[oa] em <span class="lacuna">/g)).toBe(2);
    // E-mail preenchido segue intacto.
    expect(out).toContain("<strong>joao@x.com</strong>");
  });

  it("(d) RG/CPF vazios viram LACUNA no [2] (2.2a); e-mail vazio segue suprimido (R3)", () => {
    const out = render(TPL, [
      mk("vendedor", "João Silva", { genero: "M", profissao: "corretor", estado_civil: "solteiro", ...FULL_ADDR }),
      mk("comprador", "Maria Souza", { genero: "F", cpf: "22222222222" }),
    ]);

    // PRESENÇA — João sem RG nem órgão: a cláusula NÃO some mais, ganha 2 lacunas.
    expect(out).toContain(
      `Carteira de Identidade nº <strong>${LACUNA}</strong> - <strong>${LACUNA}</strong>`
    );
    // PRESENÇA — João sem CPF: a sub-cláusula NÃO some mais.
    expect(out).toContain(`inscrito no CPF sob o nº <strong>${LACUNA}</strong>`);

    // N à mão: João e Maria estão ambos sem RG/órgão → 2 pares.
    expect(countMatches(out, /Carteira de Identidade nº <strong><span class="lacuna">/g)).toBe(2);
    // Só João está sem CPF (Maria tem) → 1 lacuna de CPF.
    expect(countMatches(out, /CPF sob o nº <strong><span class="lacuna">/g)).toBe(1);
    // Maria tem CPF → valor real, sem lacuna. Prova que o preenchido não regride.
    expect(out).toContain("<strong>222.222.222-22</strong>");

    // R3 VIVA: e-mail não é essencial (A2) → segue `omit` → scaffold inteiro sai.
    // Ausência é a asserção CORRETA aqui — o campo não é essencial.
    expect(out).not.toContain("endereço eletrônico");

    // Endereço cheio do vendedor segue presente (composto), sem lacuna.
    expect(out).toContain("domiciliado em Rua das Flores, nº 10, Bairro Centro, Belo Horizonte/MG, CEP 30130-000");
  });

  it("(e) per-item: 2 vendedores, um cheio + um vazio → o vazio ganha lacuna, o cheio não", () => {
    const out = render(TPL, [
      mk("vendedor", "João Silva", { genero: "M", cpf: "11111111111", rg: "MG-1", orgao_expedidor: "SSP/MG", email: "joao@x.com", ...FULL_ADDR }),
      mk("vendedor", "Carlos Vazio", { genero: "M", cpf: "55555555555", rg: "MG-9", orgao_expedidor: "SSP/MG", email: "carlos@x.com" }),
      mk("comprador", "Maria Souza", { genero: "F", cpf: "22222222222" }),
    ]);

    // Cheio mantém o endereço composto…
    expect(out).toContain("domiciliado em Rua das Flores, nº 10, Bairro Centro, Belo Horizonte/MG, CEP 30130-000");
    // …e o vazio agora PRESERVA o tail com lacuna, per-item.
    expect(out).toContain(`domiciliado em ${LACUNA}`);
    // N=2 à mão: Carlos (vendedor sem endereço) + Maria (compradora sem endereço).
    expect(countMatches(out, /domiciliad[oa] em <span class="lacuna">/g)).toBe(2);
    // N=3 à mão: 3 tails no total (João cheio + Carlos lacuna + Maria lacuna).
    expect(countMatches(out, /domiciliad[oa] em/g)).toBe(3);
    // O vazio segue aparecendo com seus campos preenchidos.
    expect(out).toContain("<strong>carlos@x.com</strong>");
  });
});
