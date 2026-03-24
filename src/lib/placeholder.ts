/**
 * Motor unificado de placeholders
 * Suporta: {{key}}, {{ key }}, [LABEL LEGADO], [label]
 */

export const LEGACY_BRACKET_MAP: Record<string, string> = {
  "NOME COMPLETO DO(A) COMPRADOR(A)": "comprador_nome",
  "NOME COMPLETO DO COMPRADOR": "comprador_nome",
  "COMPRADOR": "comprador_nome",
  "NOME COMPLETO DO(A) VENDEDOR(A)": "vendedor_nome",
  "NOME COMPLETO DO VENDEDOR": "vendedor_nome",
  "PROMITENTE VENDEDOR(A)": "vendedor_nome",
  "PROMISSÁRIO(A) COMPRADOR(A)": "comprador_nome",
  "VENDEDOR": "vendedor_nome",
  "CPF": "comprador_cpf",
  "RG": "comprador_rg",
  "RG/ÓRGÃO EMISSOR": "comprador_rg",
  "ÓRGÃO EMISSOR": "comprador_orgao_expedidor",
  "E-MAIL": "comprador_email",
  "EMAIL": "comprador_email",
  "ENDEREÇO COMPLETO": "comprador_endereco",
  "ENDEREÇO": "comprador_endereco",
  "DESCRIÇÃO DO IMÓVEL": "imovel_descricao",
  "ENDEREÇO DO IMÓVEL": "imovel_endereco",
  "MATRÍCULA": "imovel_matricula",
  "ÁREA PRIVATIVA": "imovel_area_privativa",
  "ÁREA TOTAL": "imovel_area_total",
  "ÁREA ACESSÓRIA": "imovel_area_acessoria",
  "VAGAS DE GARAGEM": "imovel_vagas",
  "INSCRIÇÃO/ÍNDICE CADASTRAL": "imovel_indice_cadastral",
  "ÍNDICE CADASTRAL": "imovel_indice_cadastral",
  "VALOR TOTAL": "valor_total",
  "VALOR DO SINAL": "valor_sinal",
  "VALOR REMANESCENTE": "valor_remanescente",
  "FORMA DE PAGAMENTO": "forma_pagamento",
  "NOME DA AGÊNCIA": "empresa_nome",
  "NOME DO BANCO": "empresa_banco",
  "NÚMERO DA CONTA": "empresa_conta",
  "NÚMERO DA AGÊNCIA": "empresa_agencia",
  "CNPJ": "empresa_cnpj",
  "CPF/CNPJ": "empresa_cnpj",
  "NOME DA INTERMEDIADORA I": "intermediadora1_nome",
  "CNPJ/CPF 1": "intermediadora1_cnpj",
  "NOME DA INTERMEDIADORA 2": "intermediadora2_nome",
  "CNPJ/CPF 2": "intermediadora2_cnpj",
  "CIDADE/UF": "cidade_uf",
  "DIA": "data_dia",
  "MÊS": "data_mes",
  "ANO": "data_ano",
};

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
    const key = LEGACY_BRACKET_MAP[m[1].trim().toUpperCase()];
    if (!key || !vars[key] || vars[key].trim() === "") {
      unresolved.push(`[${m[1]}]`);
    }
  }
  return [...new Set(unresolved)];
}
