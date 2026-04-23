/**
 * Motor unificado de placeholders
 * Suporta: {{key}}, {{ key }}, [LABEL LEGADO], [label]
 *
 * O dicionário LEGACY_BRACKET_MAP normaliza labels em colchetes (legado .docx)
 * para chaves canônicas em snake_case. Aliases entre chaves canônicas
 * (ex: empresa_* ↔ imobiliaria_*) são resolvidos pelo enrichDados.
 */

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
  const isTruthy = (key: string) =>
    (vars[key] ?? "").toString().trim().toLowerCase() === "true";

  const re = /\{\{#if\s+([\w]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  let prev = "";
  let curr = text;
  let safety = 0;
  while (prev !== curr && safety < 20) {
    prev = curr;
    curr = curr.replace(re, (_m, flag, body) => (isTruthy(flag) ? body : ""));
    safety++;
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

export function replacePlaceholders(
  text: string,
  vars: Record<string, string>
): string {
  if (!text) return text;
  let result = text;

  // 1. Substituir {{key}} e {{ key }}
  result = result.replace(/\{\{\s*([\w]+)\s*\}\}/g, (_match, key) => {
    return (vars[key] !== undefined && vars[key] !== "") ? vars[key] : _match;
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
    return _match;
  });

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
