/**
 * Pipeline ÚNICO de render de contrato (Fase 2 / sessão 2.1).
 *
 * Encapsula a sequência canônica que estava triplicada em
 * NovoContrato.tsx (preview e save) e ContratoDetalhe.tsx:
 *
 *   enrichDados → buildParticipantsByRole → agreement L1/L2
 *   → expandEachBlocks → preprocessTemplate → replacePlaceholders
 *
 * Composição PURA sobre o motor existente — nenhuma lógica de
 * placeholder.ts / contract-enrichment.ts / agreement.ts é alterada.
 *
 * `unresolved` é calculado sobre o texto PRÉ-replace (pós each + enrich +
 * preprocess): é o único ponto onde os tokens ainda existem — depois do
 * replace todo placeholder vira valor ou fallback (omit/blank_line) e a
 * detecção ficaria cega. Usar os dados enriquecidos aqui elimina os
 * falsos positivos em derivados (data_contrato_extenso, aliases, empresa_*).
 *
 * ⚠ ASSIMETRIA DELIBERADA de `unresolved` (2.2a) — POR CONSTRUÇÃO, NÃO BUG:
 *
 *   - campo PLANO vazio ({{valor_total}}) → sobrevive a expandEachBlocks e a
 *     preprocessTemplate, chega cru em getUnresolvedPlaceholders → CONTA;
 *   - campo INTRA-EACH vazio ({{cpf}} de um vendedor) → já foi resolvido lá
 *     dentro por renderEachItem (linha `expandEachBlocks` abaixo, que roda
 *     ANTES) → o token não existe mais → NÃO CONTA.
 *
 * Consertar isso exigiria detectar pendência antes do each, duplicando a
 * tabela de fallback. Em vez disso, a lacuna é a evidência: quem precisa da
 * contagem TOTAL de campos em branco deve somar
 * `unresolved.length + countLacunas(html)`. É o que o confirm de impressão
 * da 2.2b consome — só tokens não bastam, e é justamente o caso central
 * (qualificação das partes é 100% intra-each nos templates reais [0] e [2]).
 */
import type { ManualParticipantData } from "@/components/contract/manual-participant";
import {
  expandEachBlocks,
  preprocessTemplate,
  replacePlaceholders,
  getUnresolvedPlaceholders,
  type EachOptions,
} from "./placeholder";
import { countLacunas } from "./placeholder-fallback";
import { enrichDados, type CompanyData } from "./contract-enrichment";
import { buildParticipantsByRole } from "./auto-fill-dados";
import {
  enrichParticipantsWithAgreementL1,
  buildAgreementVarsL2,
} from "./agreement";

/**
 * Re-export: quem consome `renderContract` precisa da contagem de lacunas
 * para fechar a conta de campos em branco (ver ASSIMETRIA no topo). Evita que
 * a UI importe de dois módulos para responder a uma pergunta só.
 */
export { countLacunas };

/** Subconjunto de cláusula necessário para anexação ao HTML final. */
export interface RenderClause {
  titulo: string;
  conteudo: string;
}

export interface RenderContractOptions {
  /** Empresa do tenant — injetada via enrichDados (empresa_*, banco/pix, endereço canônico). */
  company?: CompanyData | null;
  /** Cláusulas anexadas ao final do HTML (formato idêntico ao handleSave legado). */
  appendClauses?: RenderClause[];
  /** Pass-through para expandEachBlocks (separadores de conjunção). */
  eachOptions?: EachOptions;
}

export interface RenderContractResult {
  /** Corpo renderizado + bloco de cláusulas (quando appendClauses). */
  html: string;
  /** Corpo renderizado SEM cláusulas — para o fallback de resumo do save. */
  body: string;
  /** Placeholders sem dado, detectados no texto pré-replace. */
  unresolved: string[];
  /** Dados pós enrichDados + agreement L2 — exatamente o que o replace consumiu. */
  dadosCompletos: Record<string, string>;
}

export function renderContract(
  template: string,
  dados: Record<string, string>,
  participants: ManualParticipantData[],
  opts: RenderContractOptions = {}
): RenderContractResult {
  const enriched = enrichDados(dados, { company: opts.company ?? null });
  const byRole = buildParticipantsByRole(participants);
  const byRoleWithAgreement = enrichParticipantsWithAgreementL1(byRole);
  const dadosCompletos = { ...enriched, ...buildAgreementVarsL2(byRole) };

  // blankLineFormat "html" nos DOIS passes: os 3 consumidores de produto
  // (preview e save do wizard, Detalhe) renderizam HTML. O default "text" do
  // engine cru fica intacto para chamadores diretos e testes de unidade.
  const expanded = expandEachBlocks(template ?? "", byRoleWithAgreement, {
    ...opts.eachOptions,
    blankLineFormat: "html",
  });
  const processed = preprocessTemplate(expanded, dadosCompletos);
  const unresolved = getUnresolvedPlaceholders(processed, dadosCompletos);
  const body = replacePlaceholders(processed, dadosCompletos, { blankLineFormat: "html" });

  const html = opts.appendClauses?.length
    ? appendClausesHtml(body, opts.appendClauses)
    : body;

  return { html, body, unresolved, dadosCompletos };
}

/**
 * Anexa o bloco de cláusulas ao HTML — byte-idêntico ao formato do
 * handleSave legado (NovoContrato). Sem cláusulas ⇒ retorna o HTML intacto.
 */
export function appendClausesHtml(html: string, clauses: RenderClause[]): string {
  if (!clauses || clauses.length === 0) return html;
  let out = html + "\n\n<h2>CLÁUSULAS</h2>\n";
  clauses.forEach((c, i) => {
    out += `\n<h3>CLÁUSULA ${i + 1}ª — ${c.titulo.toUpperCase()}</h3>\n${c.conteudo}\n`;
  });
  return out;
}

/**
 * Resumo HTML de fallback quando não há template nem conteúdo do editor,
 * mas há dados preenchidos — movido as-is do handleSave (NovoContrato).
 */
export function buildSummaryHtml(d: Record<string, string>): string {
  const sections: { title: string; prefix: string }[] = [
    { title: "COMPRADOR", prefix: "comprador_" },
    { title: "VENDEDOR", prefix: "vendedor_" },
    { title: "IMÓVEL", prefix: "imovel_" },
    { title: "VALORES", prefix: "valor_" },
    { title: "EMPRESA", prefix: "empresa_" },
  ];
  let html = "<h2>RESUMO DO CONTRATO</h2>\n";
  for (const sec of sections) {
    const fields = Object.entries(d).filter(([k, v]) => k.startsWith(sec.prefix) && v && String(v).trim());
    if (fields.length === 0) continue;
    html += `<h3>${sec.title}</h3>\n<ul>\n`;
    for (const [key, value] of fields) {
      const label = key.replace(sec.prefix, "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      html += `<li><strong>${label}:</strong> ${value}</li>\n`;
    }
    html += "</ul>\n";
  }
  return html;
}
