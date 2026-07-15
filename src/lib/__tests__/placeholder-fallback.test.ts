/**
 * Tabela de fallback (2.2a) — três buckets nomeados.
 *
 * REGRA DA SESSÃO: teste sobre campo essencial vazio NUNCA asserta AUSÊNCIA.
 * Asserção negativa foi o que deixou o `(d)` de template-2-v2 passar liso
 * (o `<strong>` deixou de estar vazio por causa da lacuna, e o teste comemorou
 * pelo motivo errado). Todo teste de lacuna asserta PRESENÇA do span.
 */
import { describe, it, expect } from "vitest";
import { replacePlaceholders, getUnresolvedPlaceholders } from "../placeholder";
import { applyFallback, countLacunas, getFallbackStrategy } from "../placeholder-fallback";

const LACUNA = '<span class="lacuna">__________</span>';

describe("placeholder fallback — estratégia tabular", () => {
  describe("getFallbackStrategy — bucket BLANK_LINE_PATTERNS (essenciais)", () => {
    it("RG vira blank_line em qualquer slot (2.2a reverte a ajuste-12)", () => {
      // A ajuste-12 (Sprint 2) omitia RG vazio: "__________" parecia campo a
      // preencher. O diagnóstico estava certo — e virou REQUISITO: é campo a
      // preencher mesmo. O realce de tela (2.2b) resolve a objeção original.
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

  describe("getFallbackStrategy — PRECEDÊNCIA entre buckets", () => {
    it("OMIT_EXCEPTIONS vence BLANK_LINE_PATTERNS: data_nascimento casa ^data_ e ainda assim é omit", () => {
      // ⭐ Este teste prova a PRECEDÊNCIA, não só o resultado. `vendedor_data_nascimento`
      // casa `^data_`? Não — casa `(^|_)data_nascimento$`. Mas `data_nascimento`
      // BARE casa OS DOIS buckets; só a precedência estrutural decide.
      expect(getFallbackStrategy("data_nascimento")).toBe("omit");
      expect(getFallbackStrategy("vendedor_data_nascimento")).toBe("omit");
      expect(getFallbackStrategy("comprador_nascimento")).toBe("omit");
    });

    it("OMIT_EXCEPTIONS vence: *_titulo é andaime interno, nunca lacuna", () => {
      expect(getFallbackStrategy("clausula_titulo")).toBe("omit");
      expect(getFallbackStrategy("secao_titulo")).toBe("omit");
    });

    it("override por chave EXATA vence os dois buckets de padrão", () => {
      // imovel_area_total não casa nenhum padrão; os 7 overrides sobreviventes
      // seguem omit e servem de contrato verificável contra troca de default.
      expect(getFallbackStrategy("imovel_area_privativa")).toBe("omit");
      expect(getFallbackStrategy("imovel_area_total")).toBe("omit");
      expect(getFallbackStrategy("imovel_area_acessoria")).toBe("omit");
      expect(getFallbackStrategy("imovel_vagas")).toBe("omit");
      expect(getFallbackStrategy("imovel_cartorio")).toBe("omit");
      expect(getFallbackStrategy("imovel_inscricao_municipal")).toBe("omit");
      expect(getFallbackStrategy("imovel_indice_cadastral")).toBe("omit");
    });

    it("usa omit como default global", () => {
      expect(getFallbackStrategy("campo_arbitrario_nao_mapeado")).toBe("omit");
      expect(getFallbackStrategy("xyz")).toBe("omit");
      // Não-essenciais do participante seguem omit — o scaffold de e-mail (R3)
      // depende disso.
      expect(getFallbackStrategy("email")).toBe("omit");
      expect(getFallbackStrategy("profissao")).toBe("omit");
      expect(getFallbackStrategy("estado_civil")).toBe("omit");
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

  describe("replacePlaceholders — auto (default), campo NÃO essencial", () => {
    it("data de nascimento vazia SOME (cleanup colapsa espaço duplo)", () => {
      const out = replacePlaceholders("Data nasc: {{vendedor_data_nascimento}} fim", {}, {
        blankLineFormat: "html",
      });
      expect(out).toBe("Data nasc: fim");
      expect(countLacunas(out)).toBe(0);
    });

    it("título derivado vazio SOME", () => {
      const out = replacePlaceholders("<h3>{{clausula_titulo}}</h3>", {}, {
        blankLineFormat: "html",
      });
      expect(out).toBe("<h3></h3>");
      expect(countLacunas(out)).toBe(0);
    });

    it("campo arbitrário sem dado aplica omit (default)", () => {
      expect(replacePlaceholders("início {{campo_qualquer}} fim", {})).toBe("início fim");
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

    it("continua reportando data de nascimento vazia mesmo com omit", () => {
      const html = "Data: {{vendedor_data_nascimento}}";
      replacePlaceholders(html, {});
      expect(getUnresolvedPlaceholders(html, {})).toContain("{{vendedor_data_nascimento}}");
    });
  });
});
