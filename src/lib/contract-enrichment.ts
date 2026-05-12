/**
 * Enriquecimento universal de dados de contrato.
 * - Resolve aliases bidirecionais (sem sobrescrever quem já existe)
 * - Injeta dados da empresa (tenant) automaticamente
 * - Aplica formatters em campos detectáveis
 * - Gera derivados (valor_total_extenso, data_contrato_extenso etc.)
 */
import {
  formatBRL,
  formatCPF,
  formatCNPJ,
  formatCEP,
  formatTelefone,
  formatDataCurta,
  formatDataExtenso,
  valorPorExtenso,
  composeEnderecoCanonico,
  decomposeData,
  isValidCep,
} from "./contract-formatters";
import { LEGACY_BRACKET_MAP } from "./placeholder";

/**
 * Aliases bidirecionais entre placeholders.
 * Cada par compartilha o mesmo valor — se uma chave estiver preenchida e a
 * outra vazia, a vazia recebe o valor. Não sobrescreve quando ambas existem.
 */
export const PLACEHOLDER_ALIASES: Array<[string, string]> = [
  // Imobiliária / Empresa (canônico = empresa_*)
  ["empresa_nome", "imobiliaria_nome"],
  ["empresa_cnpj", "imobiliaria_cnpj"],
  ["empresa_creci", "imobiliaria_creci"],
  ["empresa_endereco", "imobiliaria_endereco"],
  ["empresa_email", "imobiliaria_email"],
  ["empresa_whatsapp", "imobiliaria_whatsapp"],
  ["empresa_logo_url", "imobiliaria_logo_url"],
  ["empresa_cidade", "imobiliaria_cidade"],
  ["empresa_estado", "imobiliaria_estado"],

  // Vendedor — RG e telefone
  ["vendedor_rg_orgao", "vendedor_orgao_expedidor"],
  ["vendedor_telefone", "vendedor_whatsapp"],

  // Contrato
  ["contrato_cidade", "cidade_contrato"],
  ["contrato_foro", "foro"],

  // Empresa do tenant ↔ Intermediadora 1 (Sprint 2, ajuste-12 / BUG 3):
  // A imobiliária do tenant tipicamente é a 1ª intermediadora do contrato.
  // Os aliases são bidirecionais com setIfEmpty, então preenchimento manual
  // de qualquer um dos lados é preservado. A 2ª intermediadora permanece
  // como entidade independente (não aliased) — quando opcional, o template
  // deve envolver em {{#if intermediadora2_nome}}…{{/if}}.
  ["empresa_nome", "intermediadora1_nome"],
  ["empresa_cnpj", "intermediadora1_cnpj"],
  ["empresa_banco", "intermediadora1_banco"],
  ["empresa_agencia", "intermediadora1_agencia"],
  ["empresa_conta", "intermediadora1_conta"],
  ["empresa_pix", "intermediadora1_pix"],
];

export interface CompanyData {
  nome_fantasia?: string | null;
  razao_social?: string | null;
  cnpj?: string | null;
  creci?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  logo_url?: string | null;
  rua?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  banco?: string | null;
  agencia?: string | null;
  conta?: string | null;
  pix?: string | null;
}

export interface EnrichOptions {
  company?: CompanyData | null;
  /** Cidade usada na data por extenso, se aplicável. */
  cidadeContrato?: string;
}

/** Avisa quando o CEP está preenchido mas não tem 8 dígitos válidos. */
function warnIfInvalidCep(context: string, cep: string | null | undefined) {
  if (cep && !isValidCep(cep)) {
    // eslint-disable-next-line no-console
    console.warn(
      `[contract-enrichment] CEP malformado em ${context}: "${cep}". ` +
        `Esperados 8 dígitos. Será emitido no contrato como digitado.`
    );
  }
}

/** Injeta empresa_* a partir do registro da company do tenant, sem sobrescrever valores manuais. */
function injectCompany(dados: Record<string, string>, company: CompanyData) {
  const setIfEmpty = (k: string, v: string | null | undefined) => {
    if (v === null || v === undefined || v === "") return;
    if (!dados[k] || dados[k].trim() === "") dados[k] = String(v);
  };
  setIfEmpty("empresa_nome", company.nome_fantasia);
  setIfEmpty("empresa_razao_social", company.razao_social);
  setIfEmpty("empresa_cnpj", company.cnpj ? formatCNPJ(company.cnpj) : "");
  setIfEmpty("empresa_creci", company.creci);
  setIfEmpty("empresa_email", company.email);
  setIfEmpty("empresa_whatsapp", company.whatsapp ? formatTelefone(company.whatsapp) : "");
  setIfEmpty("empresa_logo_url", company.logo_url);
  setIfEmpty("empresa_cidade", company.cidade);
  setIfEmpty("empresa_estado", company.estado);
  setIfEmpty("empresa_cep", company.cep ? formatCEP(company.cep) : "");
  setIfEmpty("empresa_banco", company.banco);
  setIfEmpty("empresa_agencia", company.agencia);
  setIfEmpty("empresa_conta", company.conta);
  setIfEmpty("empresa_pix", company.pix);
  warnIfInvalidCep("empresa", company.cep);
  setIfEmpty("empresa_endereco", composeEnderecoCanonico(company));
}

/** Resolve aliases bidirecionalmente — chave vazia recebe o valor da preenchida. */
function resolveAliases(dados: Record<string, string>) {
  for (const [a, b] of PLACEHOLDER_ALIASES) {
    const va = dados[a];
    const vb = dados[b];
    const aHas = va !== undefined && va !== "";
    const bHas = vb !== undefined && vb !== "";
    if (aHas && !bHas) dados[b] = va;
    else if (bHas && !aHas) dados[a] = vb;
  }
}

/** Aplica formatters em chaves cujo nome indica o tipo do campo. */
function applyFormatters(dados: Record<string, string>) {
  for (const key of Object.keys(dados)) {
    const v = dados[key];
    if (!v) continue;
    if (/(_cpf)$/i.test(key)) dados[key] = formatCPF(v);
    else if (/(_cnpj)$/i.test(key)) dados[key] = formatCNPJ(v);
    else if (/(_cep)$/i.test(key)) dados[key] = formatCEP(v);
    else if (/(_whatsapp|_telefone)$/i.test(key)) dados[key] = formatTelefone(v);
    else if (/^valor_/i.test(key) && !/_extenso$/i.test(key)) {
      // só formata se for número puro
      const cleaned = v.replace(/[^\d,.-]/g, "");
      if (cleaned && /^[\d.,-]+$/.test(v.trim())) dados[key] = formatBRL(v);
    }
  }
}

/** Gera derivados como *_extenso e data_contrato_extenso. */
function generateDerived(dados: Record<string, string>, opts: EnrichOptions) {
  // Valores por extenso para todos os valor_* (exceto os que já são *_extenso)
  for (const key of Object.keys(dados)) {
    if (/^valor_/i.test(key) && !/_extenso$/i.test(key)) {
      const extKey = `${key}_extenso`;
      if (!dados[extKey] || dados[extKey] === "") {
        const ext = valorPorExtenso(dados[key]);
        if (ext) dados[extKey] = ext;
      }
    }
  }

  // Data do contrato
  if (dados["data_contrato"]) {
    if (!dados["data_contrato_curta"]) {
      dados["data_contrato_curta"] = formatDataCurta(dados["data_contrato"]);
    }
    if (!dados["data_contrato_extenso"]) {
      const cidade = dados["cidade_contrato"] || dados["contrato_cidade"] || opts.cidadeContrato;
      dados["data_contrato_extenso"] = formatDataExtenso(dados["data_contrato"], cidade);
    }
    // Partes individuais — para templates que usam {{data_dia}},
    // {{data_mes}}, {{data_ano}} separadamente (padrão jurídico
    // PT-BR comum em .docx importados). Sprint 2 ajuste-12 / BUG 6.
    const partes = decomposeData(dados["data_contrato"]);
    if (partes) {
      if (!dados["data_dia"]) dados["data_dia"] = partes.dia;
      if (!dados["data_mes"]) dados["data_mes"] = partes.mes;
      if (!dados["data_ano"]) dados["data_ano"] = partes.ano;
    }
  }
}

/**
 * Aplica todo o pipeline de enriquecimento sobre uma cópia de `dados`.
 * Função pura — não modifica o objeto original.
 */
export function enrichDados(
  dados: Record<string, string>,
  options: EnrichOptions = {}
): Record<string, string> {
  const out: Record<string, string> = { ...dados };
  if (options.company) injectCompany(out, options.company);
  applyFormatters(out);
  resolveAliases(out);
  generateDerived(out, options);
  // Aliases novamente após derivados, para propagar para o lado correspondente
  resolveAliases(out);
  return out;
}

export interface UnresolvedPlaceholder {
  raw: string;
  type: "curly" | "bracket";
  key: string;
}

/**
 * Detecta placeholders ainda não resolvidos no HTML/texto:
 *  - `{{key}}` quando `dados[key]` está ausente/vazio
 *  - `[LABEL]` quando o label não está mapeado em LEGACY_BRACKET_MAP
 *    ou quando o mapeamento aponta para uma chave vazia em `dados`.
 *
 * Ignora `[...]` que são apenas referências a artigos/leis (heurística:
 * contém "art.", dígitos isolados, "Lei nº").
 */
export function validateUnresolvedPlaceholders(
  text: string,
  dados: Record<string, string>
): UnresolvedPlaceholder[] {
  if (!text) return [];
  const out: UnresolvedPlaceholder[] = [];
  const seen = new Set<string>();

  const curly = text.matchAll(/\{\{\s*([\w]+)\s*\}\}/g);
  for (const m of curly) {
    const key = m[1];
    if (dados[key] && dados[key].trim() !== "") continue;
    const raw = `{{${key}}}`;
    if (seen.has(raw)) continue;
    seen.add(raw);
    out.push({ raw, type: "curly", key });
  }

  const bracket = text.matchAll(/\[([^\]]+)\]/g);
  for (const m of bracket) {
    const label = m[1].trim();
    // Heurística: ignorar referências legais
    if (/^(art\.?|lei|inc(iso)?|§|par[áa]grafo)\b/i.test(label)) continue;
    if (/^\d+([.,]\d+)?$/.test(label)) continue;

    const normalized = label.toUpperCase();
    const canonical = LEGACY_BRACKET_MAP[normalized];
    if (canonical && dados[canonical] && dados[canonical].trim() !== "") continue;

    const raw = `[${label}]`;
    if (seen.has(raw)) continue;
    seen.add(raw);
    out.push({ raw, type: "bracket", key: canonical || label });
  }

  return out;
}
