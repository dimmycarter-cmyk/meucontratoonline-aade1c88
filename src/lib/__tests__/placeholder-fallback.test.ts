/**
 * Tabela de fallback (2.2b, Commit 2) — default INVERTIDO para blank_line.
 *
 * REGRA DE OURO (decisão de produto, 2.2b): nenhum campo pode sumir do
 * documento sem estar numa lista explícita e justificada. omit é exceção
 * fechada (SYSTEM_DERIVED_FIELDS, derivada de AGREEMENT_TOKEN_SUFFIXES) —
 * todo o resto é lacuna.
 *
 * REGRA DA SESSÃO (2.2a, mantida): teste sobre campo vazio que vira lacuna
 * NUNCA asserta AUSÊNCIA. Asserção negativa foi o que deixou o `(d)` de
 * template-2-v2 passar liso (o `<strong>` deixou de estar vazio por causa da
 * lacuna, e o teste comemorou pelo motivo errado). Todo teste de lacuna
 * asserta PRESENÇA do span, com contagem exata hardcoded.
 */
import { describe, it, expect } from "vitest";
import { replacePlaceholders, getUnresolvedPlaceholders } from "../placeholder";
import {
  applyFallback,
  countLacunas,
  getFallbackStrategy,
  PLACEHOLDER_FALLBACK_STRATEGY,
  SYSTEM_DERIVED_FIELDS,
} from "../placeholder-fallback";
import { AGREEMENT_TOKEN_SUFFIXES } from "../agreement";

const LACUNA = '<span class="lacuna">__________</span>';

describe("placeholder fallback — estratégia tabular", () => {
  describe("getFallbackStrategy — DEFAULT blank_line (essenciais seguem lacuna)", () => {
    it("RG vira blank_line em qualquer slot (2.2a reverte a ajuste-12; 2.2b via default)", () => {
      // A ajuste-12 (Sprint 2) omitia RG vazio: "__________" parecia campo a
      // preencher. O diagnóstico estava certo — e virou REQUISITO: é campo a
      // preencher mesmo. O realce de tela (2.2b) resolve a objeção original.
      // Desde o Commit 2 estes campos caem no DEFAULT (a tabela A2 foi
      // aposentada) — as asserções são as mesmas, a rota é o default.
      expect(getFallbackStrategy("vendedor_rg")).toBe("blank_line");
      expect(getFallbackStrategy("comprador_rg")).toBe("blank_line");
      expect(getFallbackStrategy("vendedor2_rg")).toBe("blank_line");
      expect(getFallbackStrategy("conjuge_rg")).toBe("blank_line");
      expect(getFallbackStrategy("anuente_rg")).toBe("blank_line");
    });

    it("órgão expedidor vira blank_line em qualquer slot", () => {
      expect(getFallbackStrategy("vendedor_orgao_expedidor")).toBe("blank_line");
      expect(getFallbackStrategy("comprador3_orgao_expedidor")).toBe("blank_line");
    });

    it("identidade e qualificação: nome, cpf, cnpj, endereco, logradouro", () => {
      expect(getFallbackStrategy("vendedor_nome")).toBe("blank_line");
      expect(getFallbackStrategy("comprador2_cpf")).toBe("blank_line");
      expect(getFallbackStrategy("empresa_cnpj")).toBe("blank_line");
      expect(getFallbackStrategy("vendedor_endereco")).toBe("blank_line");
      expect(getFallbackStrategy("imovel_logradouro")).toBe("blank_line");
    });

    it("CHAVES BARE do {{#each}} casam a MESMA tabela (Item 4 — sem lista paralela)", () => {
      // A alternativa `^` de (^|_)cpf$ é o que faz a lacuna alcançar a
      // qualificação das partes — 100% intra-each nos templates reais.
      expect(getFallbackStrategy("cpf")).toBe("blank_line");
      expect(getFallbackStrategy("rg")).toBe("blank_line");
      expect(getFallbackStrategy("orgao_expedidor")).toBe("blank_line");
      expect(getFallbackStrategy("endereco")).toBe("blank_line");
      expect(getFallbackStrategy("nome")).toBe("blank_line");
    });

    it("valores e datas, incluindo os *_extenso derivados", () => {
      expect(getFallbackStrategy("valor_total")).toBe("blank_line");
      expect(getFallbackStrategy("valor_corretagem")).toBe("blank_line");
      expect(getFallbackStrategy("data_contrato")).toBe("blank_line");
      // Decisão 2.2a: derivado que compõe FRASE VISÍVEL segue o campo-pai.
      // Com omit, "R$ 350.000,00 ()" — parêntese órfão, defeito NOVO.
      expect(getFallbackStrategy("valor_total_extenso")).toBe("blank_line");
      expect(getFallbackStrategy("data_contrato_extenso")).toBe("blank_line");
    });

    it("imovel_matricula migrou para blank_line (flip 2.2a)", () => {
      expect(getFallbackStrategy("imovel_matricula")).toBe("blank_line");
    });
  });

  describe("getFallbackStrategy — SYSTEM_DERIVED_FIELDS (exceção fechada ao default)", () => {
    it("tokens N2 são omit — e a lista DERIVA de AGREEMENT_TOKEN_SUFFIXES, não de grafia local", () => {
      // Consome a fonte única do 1.5: sufixo novo na constante tem de virar
      // omit aqui SEM tocar neste teste nem na tabela.
      for (const suffix of AGREEMENT_TOKEN_SUFFIXES) {
        expect(getFallbackStrategy(`vendedores_${suffix}`)).toBe("omit");
        expect(getFallbackStrategy(`anuentes_${suffix}`)).toBe("omit");
      }
      expect(SYSTEM_DERIVED_FIELDS).toHaveLength(AGREEMENT_TOKEN_SUFFIXES.length);
    });

    it("colateral deliberado do sufixo: *_titulo de andaime de template segue omit", () => {
      expect(getFallbackStrategy("clausula_titulo")).toBe("omit");
      expect(getFallbackStrategy("secao_titulo")).toBe("omit");
    });

    it("o padrão exige o underscore: 'titulo' BARE não é system-derived → lacuna", () => {
      // Fail-loud: chave bare que o sistema NÃO injeta é campo de template —
      // sumir em silêncio esconderia o erro.
      expect(getFallbackStrategy("titulo")).toBe("blank_line");
      expect(getFallbackStrategy("artigo")).toBe("blank_line");
      expect(getFallbackStrategy("denominado")).toBe("blank_line");
    });
  });

  describe("getFallbackStrategy — INVERSÃO do default (2.2b, Commit 2)", () => {
    it("data_nascimento virou LACUNA: é campo pedido ao usuário (ManualParticipantCard), não derivado", () => {
      // FLIP (a) da 2.2b: a exceção nomeada de data_nascimento saiu junto com
      // o bucket de exceções da 2.2a. Template que queira ocultá-la usa {{#if}}.
      expect(getFallbackStrategy("data_nascimento")).toBe("blank_line");
      expect(getFallbackStrategy("vendedor_data_nascimento")).toBe("blank_line");
      expect(getFallbackStrategy("comprador_nascimento")).toBe("blank_line");
    });

    it("A5: os 7 overrides de imóvel (Sprint 2 / BUG 7) foram REVERTIDOS — viram lacuna", () => {
      // São campos pedidos ao usuário; ausentes, ninguém pode decidir por ele
      // que não importavam. Reversão formal registrada no commit da 2.2b.
      expect(getFallbackStrategy("imovel_area_privativa")).toBe("blank_line");
      expect(getFallbackStrategy("imovel_area_total")).toBe("blank_line");
      expect(getFallbackStrategy("imovel_area_acessoria")).toBe("blank_line");
      expect(getFallbackStrategy("imovel_vagas")).toBe("blank_line");
      expect(getFallbackStrategy("imovel_cartorio")).toBe("blank_line");
      expect(getFallbackStrategy("imovel_inscricao_municipal")).toBe("blank_line");
      expect(getFallbackStrategy("imovel_indice_cadastral")).toBe("blank_line");
    });

    it("A7: o bucket de chave exata está VAZIO — entrada nova exige justificativa escrita", () => {
      // Guard estrutural: se alguém ressuscitar um override sem atualizar este
      // teste (e sem justificar no comentário da linha), quebra aqui.
      expect(Object.keys(PLACEHOLDER_FALLBACK_STRATEGY)).toHaveLength(0);
    });

    it("usa blank_line como default global — inclusive campos que eram omit por omissão", () => {
      expect(getFallbackStrategy("campo_arbitrario_nao_mapeado")).toBe("blank_line");
      expect(getFallbackStrategy("xyz")).toBe("blank_line");
      // Qualificação do participante: pedida ao usuário → lacuna. (O scaffold
      // de e-mail R3 tornou-se inalcançável no pipeline — destino no Commit 3.)
      expect(getFallbackStrategy("email")).toBe("blank_line");
      expect(getFallbackStrategy("profissao")).toBe("blank_line");
      expect(getFallbackStrategy("estado_civil")).toBe("blank_line");
    });

    it("A6: empresa_creci vira lacuna — simetria com empresa_cnpj (fecha o scaffold assimétrico)", () => {
      // Pós-2.2a o cabeçalho saía "CNPJ: __________ — CRECI: " (assimétrico).
      expect(getFallbackStrategy("empresa_creci")).toBe("blank_line");
      expect(getFallbackStrategy("empresa_cnpj")).toBe("blank_line");
    });
  });

  describe("applyFallback — formato text × html", () => {
    it('blank_line default ("text") produz underscores crus', () => {
      expect(applyFallback("blank_line", "{{vendedor_rg}}")).toBe("__________");
      expect(applyFallback("blank_line", "{{vendedor_rg}}")).toMatch(/^_+$/);
    });

    it('blank_line "html" produz o span da lacuna', () => {
      expect(applyFallback("blank_line", "{{vendedor_rg}}", "html")).toBe(LACUNA);
    });

    it("omit produz string vazia nos DOIS formatos (não há divergência)", () => {
      expect(applyFallback("omit", "{{x}}")).toBe("");
      expect(applyFallback("omit", "{{x}}", "html")).toBe("");
    });

    it("keep_literal preserva o placeholder original nos dois formatos", () => {
      expect(applyFallback("keep_literal", "{{vendedor_rg}}")).toBe("{{vendedor_rg}}");
      expect(applyFallback("keep_literal", "{{vendedor_rg}}", "html")).toBe("{{vendedor_rg}}");
    });
  });

  describe("countLacunas", () => {
    it("conta span cujo conteúdo é SÓ underscores", () => {
      expect(countLacunas(LACUNA)).toBe(1);
      expect(countLacunas(`${LACUNA} texto ${LACUNA}`)).toBe(2);
    });

    it("NÃO conta span preenchido — o corretor completou a lacuna no editor", () => {
      // Sem isto, o confirm de impressão (2.2b) acusaria pendência em campo cheio.
      expect(countLacunas('<span class="lacuna">João Silva</span>')).toBe(0);
      expect(countLacunas(`${LACUNA}<span class="lacuna">Maria</span>`)).toBe(1);
    });

    it("tolera round-trip do editor: classe extra, aspas simples, whitespace", () => {
      expect(countLacunas('<span class="foo lacuna bar">__________</span>')).toBe(1);
      expect(countLacunas("<span class='lacuna'>__________</span>")).toBe(1);
      expect(countLacunas('<span class="lacuna">\n__________</span>')).toBe(1);
    });

    it("html vazio/ausente → 0", () => {
      expect(countLacunas("")).toBe(0);
      expect(countLacunas(null as unknown as string)).toBe(0);
    });
  });

  describe("replacePlaceholders — auto (default), campo essencial", () => {
    it("RG vazio deixa LACUNA visível (formato html)", () => {
      const html = "portador(a) do RG nº {{vendedor_rg}}, inscrito(a) no CPF.";
      const out = replacePlaceholders(html, {}, { blankLineFormat: "html" });
      expect(out).toContain(`RG nº ${LACUNA}`);
      expect(out).toContain("inscrito(a) no CPF");
    });

    it("RG vazio deixa underscores crus quando o formato é o default text", () => {
      const out = replacePlaceholders("RG nº {{vendedor_rg}}.", {});
      expect(out).toContain("RG nº __________");
      expect(out).not.toContain("<span");
    });

    it("órgão expedidor vazio deixa lacuna em frase real", () => {
      const html = "RG {{vendedor_rg}} {{vendedor_orgao_expedidor}}, inscrito.";
      const out = replacePlaceholders(html, {}, { blankLineFormat: "html" });
      expect(out).toBe(`RG ${LACUNA} ${LACUNA}, inscrito.`);
    });

    it("preserva o valor quando o dado existe — fallback não é invocada", () => {
      const html = "RG {{vendedor_rg}} {{vendedor_orgao_expedidor}}";
      const out = replacePlaceholders(
        html,
        { vendedor_rg: "12.345.678", vendedor_orgao_expedidor: "SSP/MG" },
        { blankLineFormat: "html" }
      );
      expect(out).toBe("RG 12.345.678 SSP/MG");
      expect(countLacunas(out)).toBe(0);
    });
  });

  describe("replacePlaceholders — auto (default), campo não derivado pelo sistema", () => {
    it("data de nascimento vazia deixa LACUNA (flip 2.2b — campo pedido ao usuário)", () => {
      const out = replacePlaceholders("Data nasc: {{vendedor_data_nascimento}} fim", {}, {
        blankLineFormat: "html",
      });
      expect(out).toBe(`Data nasc: ${LACUNA} fim`);
      expect(countLacunas(out)).toBe(1);
    });

    it("título derivado vazio SOME (system-derived: única rota de omit restante)", () => {
      const out = replacePlaceholders("<h3>{{clausula_titulo}}</h3>", {}, {
        blankLineFormat: "html",
      });
      expect(out).toBe("<h3></h3>");
      expect(countLacunas(out)).toBe(0);
    });

    it("campo arbitrário sem dado deixa lacuna (default invertido, formato text)", () => {
      expect(replacePlaceholders("início {{campo_qualquer}} fim", {})).toBe(
        "início __________ fim"
      );
    });
  });

  describe("replacePlaceholders — fallback override", () => {
    it("keep_literal preserva todos os placeholders sem dado", () => {
      const html = "RG {{vendedor_rg}} e data {{vendedor_data_nascimento}}";
      const out = replacePlaceholders(html, {}, { fallback: "keep_literal" });
      expect(out).toContain("{{vendedor_rg}}");
      expect(out).toContain("{{vendedor_data_nascimento}}");
    });

    it("blank_line forçado vale para tudo, mesmo data de nascimento", () => {
      const out = replacePlaceholders("Data: {{vendedor_data_nascimento}}", {}, {
        fallback: "blank_line",
      });
      expect(out).toMatch(/Data: _+/);
    });

    it("omit forçado vale para tudo, mesmo RG", () => {
      const out = replacePlaceholders("RG: {{vendedor_rg}}.", {}, { fallback: "omit" });
      expect(out).toBe("RG: .");
    });
  });

  describe("getUnresolvedPlaceholders — validação independente do fallback", () => {
    it("campo com blank_line CONTINUA contando como pendência (campo FLAT)", () => {
      // A lacuna é sinalização visual; não desliga a detecção. Vale para campo
      // plano: o token sobrevive até getUnresolvedPlaceholders. Intra-each NÃO
      // conta — ver ASSIMETRIA em render-contract.ts.
      const html = "RG {{vendedor_rg}}";
      replacePlaceholders(html, {}, { blankLineFormat: "html" });
      expect(getUnresolvedPlaceholders(html, {})).toContain("{{vendedor_rg}}");
    });

    it("continua reportando data de nascimento vazia — detecção independe da estratégia", () => {
      const html = "Data: {{vendedor_data_nascimento}}";
      replacePlaceholders(html, {});
      expect(getUnresolvedPlaceholders(html, {})).toContain("{{vendedor_data_nascimento}}");
    });
  });
});
