/**
 * Motor unificado de placeholders
 * Suporta: {{key}}, {{ key }}, [LABEL LEGADO], [label]
 *
 * O dicionário LEGACY_BRACKET_MAP normaliza labels em colchetes (legado .docx)
 * para chaves canônicas em snake_case. Aliases entre chaves canônicas
 * (ex: empresa_* ↔ imobiliaria_*) são resolvidos pelo enrichDados.
 */

import { applyFallback, getFallbackStrategy, type FallbackStrategy } from "./placeholder-fallback";
import { cleanOrphanPunctuation } from "./text-cleanup";

export const LEGACY_BRACKET_MAP: Record<string, string> = {
  // ===== Comprador (índice padrão) =====
  "NOME COMPLETO DO(A) COMPRADOR(A)": "comprador_nome",
  "NOME COMPLETO DO COMPRADOR": "comprador_nome",
  "COMPRADOR": "comprador_nome",
  "PROMISSÁRIO(A) COMPRADOR(A)": "comprador_nome",
  "CPF DO(A) COMPRADOR(A)": "comprador_cpf",
  "CPF DO COMPRADOR": "comprador_cpf",
  "RG DO(A) COMPRADOR(A)": "comprador_rg",
  "RG DO COMPRADOR": "comprador_rg",
  "ÓRGÃO EXPEDIDOR (COMPRADOR)": "comprador_orgao_expedidor",
  "PROFISSÃO DO(A) COMPRADOR(A)": "comprador_profissao",
  "ESTADO CIVIL DO(A) COMPRADOR(A)": "comprador_estado_civil",
  "NACIONALIDADE DO(A) COMPRADOR(A)": "comprador_nacionalidade",
  "ENDEREÇO DO(A) COMPRADOR(A)": "comprador_endereco",

  // ===== Comprador 2 =====
  "NOME COMPLETO DO(A) COMPRADOR(A) 2": "comprador2_nome",
  "NOME DO COMPRADOR 2": "comprador2_nome",
  "CPF DO(A) COMPRADOR(A) 2": "comprador2_cpf",
  "RG DO(A) COMPRADOR(A) 2": "comprador2_rg",
  "ÓRGÃO EXPEDIDOR (COMPRADOR 2)": "comprador2_orgao_expedidor",
  "PROFISSÃO DO(A) COMPRADOR(A) 2": "comprador2_profissao",
  "ESTADO CIVIL DO(A) COMPRADOR(A) 2": "comprador2_estado_civil",
  "ENDEREÇO DO(A) COMPRADOR(A) 2": "comprador2_endereco",

  // ===== Vendedor (índice padrão) =====
  "NOME COMPLETO DO(A) VENDEDOR(A)": "vendedor_nome",
  "NOME COMPLETO DO VENDEDOR": "vendedor_nome",
  "PROMITENTE VENDEDOR(A)": "vendedor_nome",
  "VENDEDOR": "vendedor_nome",
  "CPF DO(A) VENDEDOR(A)": "vendedor_cpf",
  "CPF DO VENDEDOR": "vendedor_cpf",
  "RG DO(A) VENDEDOR(A)": "vendedor_rg",
  "RG DO VENDEDOR": "vendedor_rg",
  "ÓRGÃO EXPEDIDOR (VENDEDOR)": "vendedor_orgao_expedidor",
  "ÓRGÃO EXPEDIDOR DO VENDEDOR": "vendedor_orgao_expedidor",
  "PROFISSÃO DO(A) VENDEDOR(A)": "vendedor_profissao",
  "ESTADO CIVIL DO(A) VENDEDOR(A)": "vendedor_estado_civil",
  "NACIONALIDADE DO(A) VENDEDOR(A)": "vendedor_nacionalidade",
  "ENDEREÇO DO(A) VENDEDOR(A)": "vendedor_endereco",
  "BANCO DO(A) VENDEDOR(A)": "vendedor_banco",
  "AGÊNCIA DO(A) VENDEDOR(A)": "vendedor_agencia",
  "CONTA DO(A) VENDEDOR(A)": "vendedor_conta",
  "PIX DO(A) VENDEDOR(A)": "vendedor_pix",

  // ===== Vendedores 2..4 =====
  "NOME DO VENDEDOR 2": "vendedor2_nome",
  "CPF DO VENDEDOR 2": "vendedor2_cpf",
  "RG DO VENDEDOR 2": "vendedor2_rg",
  "PROFISSÃO DO VENDEDOR 2": "vendedor2_profissao",
  "ESTADO CIVIL DO VENDEDOR 2": "vendedor2_estado_civil",
  "ENDEREÇO DO VENDEDOR 2": "vendedor2_endereco",
  "BANCO DO VENDEDOR 2": "vendedor2_banco",
  "AGÊNCIA DO VENDEDOR 2": "vendedor2_agencia",
  "CONTA DO VENDEDOR 2": "vendedor2_conta",
  "PIX DO VENDEDOR 2": "vendedor2_pix",

  "NOME DO VENDEDOR 3": "vendedor3_nome",
  "CPF DO VENDEDOR 3": "vendedor3_cpf",
  "RG DO VENDEDOR 3": "vendedor3_rg",
  "ENDEREÇO DO VENDEDOR 3": "vendedor3_endereco",

  "NOME DO VENDEDOR 4": "vendedor4_nome",
  "CPF DO VENDEDOR 4": "vendedor4_cpf",
  "RG DO VENDEDOR 4": "vendedor4_rg",
  "ENDEREÇO DO VENDEDOR 4": "vendedor4_endereco",

  "NOME DO VENDEDOR 5": "vendedor5_nome",
  "CPF DO VENDEDOR 5": "vendedor5_cpf",
  "RG DO VENDEDOR 5": "vendedor5_rg",
  "PROFISSÃO DO VENDEDOR 5": "vendedor5_profissao",
  "ESTADO CIVIL DO VENDEDOR 5": "vendedor5_estado_civil",
  "ENDEREÇO DO VENDEDOR 5": "vendedor5_endereco",
  "BANCO DO VENDEDOR 5": "vendedor5_banco",
  "AGÊNCIA DO VENDEDOR 5": "vendedor5_agencia",
  "CONTA DO VENDEDOR 5": "vendedor5_conta",
  "PIX DO VENDEDOR 5": "vendedor5_pix",

  // ===== Cônjuge =====
  "NOME DO(A) CÔNJUGE": "conjuge_nome",
  "CPF DO(A) CÔNJUGE": "conjuge_cpf",
  "RG DO(A) CÔNJUGE": "conjuge_rg",
  "PROFISSÃO DO(A) CÔNJUGE": "conjuge_profissao",
  "NOME DO(A) CÔNJUGE 2": "conjuge2_nome",
  "CPF DO(A) CÔNJUGE 2": "conjuge2_cpf",
  "RG DO(A) CÔNJUGE 2": "conjuge2_rg",

  // ===== Anuente =====
  "NOME DO(A) ANUENTE": "anuente_nome",
  "CPF DO(A) ANUENTE": "anuente_cpf",
  "RG DO(A) ANUENTE": "anuente_rg",
  "ENDEREÇO DO(A) ANUENTE": "anuente_endereco",

  // ===== Procurador (T6) =====
  "NOME DO(A) PROCURADOR(A)": "procurador_nome",
  "NOME COMPLETO DO(A) PROCURADOR(A)": "procurador_nome",
  "CPF DO(A) PROCURADOR(A)": "procurador_cpf",
  "RG DO(A) PROCURADOR(A)": "procurador_rg",
  "OAB DO(A) PROCURADOR(A)": "procurador_oab",
  "OAB DO PROCURADOR": "procurador_oab",
  "PROFISSÃO DO(A) PROCURADOR(A)": "procurador_profissao",
  "ESTADO CIVIL DO(A) PROCURADOR(A)": "procurador_estado_civil",
  "NACIONALIDADE DO(A) PROCURADOR(A)": "procurador_nacionalidade",
  "ENDEREÇO DO(A) PROCURADOR(A)": "procurador_endereco",
  "OUTORGANTE": "procurador_outorgante",
  "OUTORGANTE DA PROCURAÇÃO": "procurador_outorgante",
  "DATA DA PROCURAÇÃO": "procurador_data_procuracao",
  "CARTÓRIO DA PROCURAÇÃO": "procurador_cartorio_procuracao",
  "LIVRO DA PROCURAÇÃO": "procurador_livro_procuracao",
  "FOLHA DA PROCURAÇÃO": "procurador_folha_procuracao",

  // ===== Genéricos sem qualificação (HEURÍSTICA BEST-EFFORT) =====
  // Labels minúsculos sem qualificação ([nacionalidade], [profissão], [cpf], etc.)
  // são resolvidos por heurística de ordem de aparição no template — vide
  // resolveAmbiguousLabels() (a ser implementado na Leva 2 do importador .docx).
  // Limitação conhecida: a heurística é best-effort. Templates importados pela
  // Leva 3 (.docx) DEVEM usar labels qualificados explícitos (ex: "CPF DO VENDEDOR 2")
  // — o importador alerta o usuário quando detecta labels genéricos sem qualificação.
  // Os mapeamentos abaixo servem APENAS como fallback (1ª ocorrência = vendedor).
  "CPF": "vendedor_cpf",
  "RG": "vendedor_rg",
  "RG/ÓRGÃO EMISSOR": "vendedor_rg",
  "ÓRGÃO EMISSOR": "vendedor_orgao_expedidor",
  "E-MAIL": "vendedor_email",
  "EMAIL": "vendedor_email",
  "ENDEREÇO COMPLETO": "vendedor_endereco",
  "ENDEREÇO": "vendedor_endereco",
  "NACIONALIDADE": "vendedor_nacionalidade",
  "ESTADO CIVIL": "vendedor_estado_civil",
  "PROFISSÃO": "vendedor_profissao",

  // Variantes de assinatura (rodapé do contrato)
  "NOME COMPLETO DO(A) PROMITENTE VENDEDOR(A)": "vendedor_nome",
  "NOME COMPLETO DO(A) PROMISSÁRIO(A) COMPRADOR(A)": "comprador_nome",

  // ===== Imóvel =====
  "DESCRIÇÃO DO IMÓVEL": "imovel_descricao",
  "DESCRIÇÃO COMPLETA DO IMÓVEL": "imovel_descricao",
  "TIPO DO IMÓVEL": "imovel_tipo",
  "ENDEREÇO DO IMÓVEL": "imovel_endereco",
  "MATRÍCULA": "imovel_matricula",
  "MATRÍCULA DO IMÓVEL": "imovel_matricula",
  "NÚMERO DA MATRÍCULA": "imovel_matricula",
  "CARTÓRIO": "imovel_cartorio",
  "ÁREA PRIVATIVA": "imovel_area_privativa",
  "ÁREA TOTAL": "imovel_area_total",
  "ÁREA ACESSÓRIA": "imovel_area_acessoria",
  "VAGAS DE GARAGEM": "imovel_vagas",
  "INSCRIÇÃO/ÍNDICE CADASTRAL": "imovel_indice_cadastral",
  "ÍNDICE CADASTRAL": "imovel_indice_cadastral",
  "INSCRIÇÃO MUNICIPAL": "imovel_inscricao_municipal",

  // ===== Financeiro =====
  "VALOR TOTAL": "valor_total",
  "VALOR TOTAL POR EXTENSO": "valor_total_extenso",
  "VALOR DO SINAL": "valor_sinal",
  "VALOR REMANESCENTE": "valor_remanescente",
  "VALOR DO FINANCIAMENTO": "valor_financiamento",
  "FORMA DE PAGAMENTO": "forma_pagamento",
  "BANCO DO FINANCIAMENTO": "banco_financiamento",
  "VALOR PARA O VENDEDOR": "valor_vendedor_sinal",
  "VALOR DA CORRETAGEM": "valor_corretagem",
  "PRAZO DE POSSE": "prazo_posse_dias",
  "PRAZO DE POSSE EM DIAS": "prazo_posse_dias",
  "MULTA DIÁRIA POR ATRASO": "multa_atraso_diaria",
  "MULTA POR ATRASO": "multa_atraso_diaria",

  // ===== Imobiliária / Empresa =====
  "NOME DA AGÊNCIA": "empresa_nome",
  "NOME DA IMOBILIÁRIA": "empresa_nome",
  "CNPJ DA IMOBILIÁRIA": "empresa_cnpj",
  "CRECI DA IMOBILIÁRIA": "empresa_creci",
  "ENDEREÇO DA IMOBILIÁRIA": "empresa_endereco",
  "NOME DO BANCO": "empresa_banco",
  "NÚMERO DA CONTA": "empresa_conta",
  "NÚMERO DA AGÊNCIA": "empresa_agencia",
  "CNPJ": "empresa_cnpj",
  "CPF/CNPJ": "empresa_cnpj",

  // ===== Intermediadoras =====
  "NOME DA INTERMEDIADORA I": "intermediadora1_nome",
  "NOME DA INTERMEDIADORA 1": "intermediadora1_nome",
  "CNPJ/CPF 1": "intermediadora1_cnpj",
  "CNPJ/PIX 1": "intermediadora1_cnpj",
  "NOME DA INTERMEDIADORA 2": "intermediadora2_nome",
  "CNPJ/CPF 2": "intermediadora2_cnpj",
  "CNPJ/PIX 2": "intermediadora2_cnpj",
  "CNPJ OU CHAVE PIX": "intermediadora1_cnpj",
  "VALOR DA INTERMEDIADORA 1": "intermediadora1_valor",
  "VALOR DA INTERMEDIADORA 2": "intermediadora2_valor",

  // ===== Testemunhas =====
  "NOME DA TESTEMUNHA 1": "testemunha1_nome",
  "CPF DA TESTEMUNHA 1": "testemunha1_cpf",
  "CRECI DA TESTEMUNHA 1": "testemunha1_creci",
  "E-MAIL DA TESTEMUNHA 1": "testemunha1_email",
  "NOME DA TESTEMUNHA 2": "testemunha2_nome",
  "CPF DA TESTEMUNHA 2": "testemunha2_cpf",
  "CRECI DA TESTEMUNHA 2": "testemunha2_creci",
  "E-MAIL DA TESTEMUNHA 2": "testemunha2_email",

  // ===== Contrato / Local =====
  "CIDADE/UF": "cidade_uf",
  "CIDADE DO CONTRATO": "cidade_contrato",
  "FORO": "foro",
  "DIA": "data_dia",
  "MÊS": "data_mes",
  "ANO": "data_ano",
  "DATA DO CONTRATO": "data_contrato",
  "DATA DO CONTRATO POR EXTENSO": "data_contrato_extenso",
};

/**
 * Remove blocos condicionais {{#if FLAG}}…{{/if}} cuja FLAG não esteja
 * truthy em `vars` (truthy = "true" case-insensitive).
 *
 * Quando a flag é truthy: as tags são removidas, o conteúdo interno permanece.
 * Quando é falsy/ausente: o bloco inteiro é removido (incluindo conteúdo).
 *
 * Falsy = "" | "false" | "0" | "no" | "não"  (case-insensitive, trim).
 * Qualquer outro valor preenchido é truthy — isso permite usar tanto flags
 * boolean ("true"/"false") quanto blocos condicionados à presença de um
 * campo (ex: {{#if procurador_oab}}…{{/if}} fica visível só se o OAB existir).
 *
 * Suporta blocos aninhados via execução iterativa até estabilizar — o
 * padrão non-greedy `[\s\S]*?` casa o `{{/if}}` mais próximo, então a cada
 * iteração resolvemos os blocos mais internos primeiro.
 *
 * IMPORTANTE: deve ser chamado ANTES de `replacePlaceholders` e
 * `getUnresolvedPlaceholders` — caso contrário, placeholders dentro de
 * blocos desativados serão erroneamente listados como pendentes.
 */
export function stripConditionalBlocks(
  text: string,
  vars: Record<string, string>
): string {
  if (!text) return text;
  const isTruthy = (key: string) => {
    const v = (vars[key] ?? "").toString().trim().toLowerCase();
    if (v === "" || v === "false" || v === "0" || v === "no" || v === "não") return false;
    return true;
  };

  // Parser balanceado: a cada iteração, encontra o bloco MAIS INTERNO
  // (último `{{#if X}}` antes do primeiro `{{/if}}` que o segue) e o resolve.
  // Isso evita que o regex non-greedy case `{{/if}}` interno como fim do externo.
  const openRe = /\{\{#if\s+([\w]+)\}\}/g;
  const closeStr = "{{/if}}";

  let curr = text;
  let safety = 0;
  while (safety < 50) {
    safety++;
    const closeIdx = curr.indexOf(closeStr);
    if (closeIdx === -1) break;

    // Encontra o último `{{#if ...}}` antes desse `{{/if}}`
    openRe.lastIndex = 0;
    let lastOpen: { idx: number; len: number; flag: string } | null = null;
    let m: RegExpExecArray | null;
    while ((m = openRe.exec(curr)) !== null) {
      if (m.index >= closeIdx) break;
      lastOpen = { idx: m.index, len: m[0].length, flag: m[1] };
    }
    if (!lastOpen) break; // `{{/if}}` órfão — para evitar loop, sai

    const innerStart = lastOpen.idx + lastOpen.len;
    const inner = curr.slice(innerStart, closeIdx);
    const replacement = isTruthy(lastOpen.flag) ? inner : "";
    curr = curr.slice(0, lastOpen.idx) + replacement + curr.slice(closeIdx + closeStr.length);
  }
  return curr;
}

/**
 * Helper de conveniência: pré-processa o template (resolve condicionais)
 * para que tanto `replacePlaceholders` quanto `getUnresolvedPlaceholders`
 * recebam exatamente o mesmo texto base e não divirjam.
 */
export function preprocessTemplate(
  text: string,
  vars: Record<string, string>
): string {
  return stripConditionalBlocks(text, vars);
}

export interface ReplaceOptions {
  /**
   * Estratégia aplicada quando o placeholder não tem dado correspondente.
   * Default: `"auto"` — consulta `getFallbackStrategy(key)` para decidir
   * (`blank_line` para RG/órgão, `omit` para datas de nascimento, etc.).
   * Use `"keep_literal"` para preservar o `{{key}}` no resultado (debug
   * ou preview que sinaliza pendências ao usuário).
   */
  fallback?: "auto" | FallbackStrategy;
}

export function replacePlaceholders(
  text: string,
  vars: Record<string, string>,
  options: ReplaceOptions = {}
): string {
  if (!text) return text;
  const fallbackMode = options.fallback ?? "auto";
  const resolveFallback = (key: string, rawMatch: string): string => {
    const strategy: FallbackStrategy =
      fallbackMode === "auto" ? getFallbackStrategy(key) : fallbackMode;
    return applyFallback(strategy, rawMatch);
  };

  let result = text;

  // 1. Substituir {{key}} e {{ key }}
  result = result.replace(/\{\{\s*([\w]+)\s*\}\}/g, (_match, key) => {
    if (vars[key] !== undefined && vars[key] !== "") return vars[key];
    return resolveFallback(key, _match);
  });

  // 2. Substituir [LABEL LEGADO]
  result = result.replace(/\[([^\]]+)\]/g, (_match, label) => {
    const normalized = label.trim().toUpperCase();
    const canonicalKey = LEGACY_BRACKET_MAP[normalized];
    if (canonicalKey && vars[canonicalKey] !== undefined && vars[canonicalKey] !== "") {
      return vars[canonicalKey];
    }
    const directKey = label.trim().toLowerCase().replace(/[\s/()]+/g, "_");
    if (vars[directKey] !== undefined && vars[directKey] !== "") {
      return vars[directKey];
    }
    // Sem dado: aplica fallback usando a chave canônica (se houver)
    // ou a chave derivada do próprio label.
    const fallbackKey = canonicalKey || directKey;
    return resolveFallback(fallbackKey, _match);
  });

  // 3. Limpa pontuação órfã deixada por placeholders omitidos
  // (ex.: "João, , portador(a)" → "João, portador(a)"). Aplicado apenas
  // sobre o resultado da substituição, não sobre o template puro.
  result = cleanOrphanPunctuation(result);

  return result;
}

export function extractVariables(text: string): string[] {
  const vars = new Set<string>();
  const curlyMatches = text.matchAll(/\{\{\s*([\w]+)\s*\}\}/g);
  for (const m of curlyMatches) vars.add(m[1]);
  const bracketMatches = text.matchAll(/\[([^\]]+)\]/g);
  for (const m of bracketMatches) {
    const key = LEGACY_BRACKET_MAP[m[1].trim().toUpperCase()];
    if (key) vars.add(key);
  }
  return [...vars];
}

export function getUnresolvedPlaceholders(
  text: string,
  vars: Record<string, string>
): string[] {
  const unresolved: string[] = [];
  const curlyMatches = text.matchAll(/\{\{\s*([\w]+)\s*\}\}/g);
  for (const m of curlyMatches) {
    if (!vars[m[1]] || vars[m[1]].trim() === "") {
      unresolved.push(`{{${m[1]}}}`);
    }
  }
  const bracketMatches = text.matchAll(/\[([^\]]+)\]/g);
  for (const m of bracketMatches) {
    const label = m[1].trim();
    if (/^(art\.?|lei|inc(iso)?|§|par[áa]grafo)\b/i.test(label)) continue;
    if (/^\d+([.,]\d+)?$/.test(label)) continue;
    const key = LEGACY_BRACKET_MAP[label.toUpperCase()];
    if (!key || !vars[key] || vars[key].trim() === "") {
      unresolved.push(`[${label}]`);
    }
  }
  return [...new Set(unresolved)];
}

// ============================================================================
// resolveAmbiguousLabels — heurística do importador .docx (Leva 3 / G.2)
// ============================================================================

/**
 * Label genérico em colchetes detectado no .docx importado, sem qualificação
 * explícita do papel (ex: "[CPF]" em vez de "[CPF DO VENDEDOR]").
 */
export interface AmbiguousLabel {
  /** ex: "[CPF]" */
  raw: string;
  /** Posição da n-ésima ocorrência DESSE label específico no texto (0-indexada). */
  occurrenceIndex: number;
  /** Snippet ~80 chars antes + ~30 depois, para inspeção heurística. */
  context: string;
}

export interface ResolvedLabel extends AmbiguousLabel {
  /** Melhor sugestão (vendedor_cpf, comprador_cpf, etc.) ou string vazia se nada conhecido. */
  suggestedKey: string;
  /** Lista ranqueada de candidatos (até 4). Vazia quando o label é desconhecido. */
  suggestedKeys: string[];
  /** "high" = contexto local explícito · "medium" = ordem com fallback razoável · "low" = pura ordem. */
  confidence: "high" | "medium" | "low";
}

const ROLE_KEYWORDS: Array<{ role: string; rx: RegExp }> = [
  { role: "vendedor", rx: /\bvendedor(?:a|es|as)?\b/i },
  { role: "comprador", rx: /\bcomprador(?:a|es|as)?\b/i },
  { role: "procurador", rx: /\bprocurador(?:a|es|as)?\b/i },
  { role: "conjuge", rx: /\bc[ôo]njuges?\b/i },
  { role: "anuente", rx: /\banuentes?\b/i },
  { role: "testemunha", rx: /\btestemunhas?\b/i },
];

/** Ordem de fallback puro quando não há contexto: 1ª = vendedor, 2ª = comprador, 3ª = cônjuge. */
const ORDER_FALLBACK = ["vendedor", "comprador", "conjuge", "anuente"];

/**
 * Mapeia o label genérico (sem qualificação) ao sufixo canônico.
 * Ex: "CPF" → "cpf", "RG" → "rg", "PROFISSÃO" → "profissao".
 * Retorna null se o label não é reconhecido como campo genérico.
 */
function genericLabelToFieldSuffix(rawLabel: string): string | null {
  const upper = rawLabel.replace(/^\[|\]$/g, "").trim().toUpperCase();
  const map: Record<string, string> = {
    "CPF": "cpf",
    "RG": "rg",
    "RG/ÓRGÃO EMISSOR": "rg",
    "ÓRGÃO EMISSOR": "orgao_expedidor",
    "ÓRGÃO EXPEDIDOR": "orgao_expedidor",
    "NOME": "nome",
    "NOME COMPLETO": "nome",
    "ENDEREÇO": "endereco",
    "ENDEREÇO COMPLETO": "endereco",
    "NACIONALIDADE": "nacionalidade",
    "ESTADO CIVIL": "estado_civil",
    "PROFISSÃO": "profissao",
    "E-MAIL": "email",
    "EMAIL": "email",
    "TELEFONE": "telefone",
  };
  return map[upper] ?? null;
}

/**
 * Heurística que sugere a chave canônica para labels genéricos detectados
 * pelo importador .docx.
 *
 * 1. Se o contexto local contém uma palavra-chave de papel (vendedor, comprador,
 *    procurador, etc.), gera `<role>_<suffix>` com confidence "high".
 * 2. Caso contrário, usa ORDER_FALLBACK pela `occurrenceIndex` (low).
 * 3. Sempre retorna até 4 candidatos ranqueados.
 *
 * Labels não reconhecidos como genéricos (ex: "[FOO]") retornam suggestedKeys: [].
 */
export function resolveAmbiguousLabels(
  _text: string,
  ambiguousLabels: AmbiguousLabel[]
): ResolvedLabel[] {
  return ambiguousLabels.map((al) => {
    const suffix = genericLabelToFieldSuffix(al.raw);
    if (!suffix) {
      return {
        ...al,
        suggestedKey: "",
        suggestedKeys: [],
        confidence: "low" as const,
      };
    }

    // 1. Contexto explícito
    const ctx = al.context || "";
    for (const { role, rx } of ROLE_KEYWORDS) {
      if (rx.test(ctx)) {
        const primary = `${role}_${suffix}`;
        // Adiciona até 3 outros candidatos (ordem padrão) para override
        const others = ORDER_FALLBACK
          .filter((r) => r !== role)
          .slice(0, 3)
          .map((r) => `${r}_${suffix}`);
        return {
          ...al,
          suggestedKey: primary,
          suggestedKeys: [primary, ...others],
          confidence: "high" as const,
        };
      }
    }

    // 2. Fallback por ordem de aparição
    const idx = Math.max(0, al.occurrenceIndex);
    const role = ORDER_FALLBACK[Math.min(idx, ORDER_FALLBACK.length - 1)];
    const primary = `${role}_${suffix}`;
    const others = ORDER_FALLBACK
      .filter((r) => r !== role)
      .slice(0, 3)
      .map((r) => `${r}_${suffix}`);
    return {
      ...al,
      suggestedKey: primary,
      suggestedKeys: [primary, ...others],
      confidence: "low" as const,
    };
  });
}

