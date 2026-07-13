/**
 * Catálogo unificado de importação — fonte única de verdade (Fase 1, E1).
 *
 * Consolida os 3 dicionários que viviam dessincronizados:
 *  1. LEGACY_BRACKET_MAP (placeholder.ts) — 171 pares label→chave, agora
 *     DERIVADO daqui via buildLegacyBracketMap();
 *  2. KNOWN_QUALIFIED_LABELS (edge function parse-docx-template) — subconjunto
 *     de 25 labels; a edge passa a consumir este módulo na sessão 1.2;
 *  3. genericLabelToFieldSuffix (placeholder.ts) — 15 labels genéricos, agora
 *     GENERIC_FIELD_SUFFIXES.
 *
 * COMPATIBILIDADE DENO (edge functions): este módulo é intencionalmente
 * dependency-free — zero imports, sem alias "@/", só dados e funções puras —
 * para ser importável pela edge function via caminho relativo com extensão
 * (ex: ../../../src/lib/import-catalog.ts). PREMISSA A VERIFICAR no primeiro
 * deploy da 1.2: o bundler eszip do `supabase functions deploy` resolve
 * imports relativos fora da pasta da função. Se recusar, plano B sem
 * retrabalho: cópia gerada por script no build, com teste-guard de igualdade
 * (mesma técnica do fixture legacy-bracket-map.fixture.ts).
 */

export type RoleCategory =
  | "comprador"
  | "vendedor"
  | "conjuge"
  | "anuente"
  | "procurador"
  | "testemunha"
  | "intermediadora"
  | "imovel"
  | "valores"
  | "empresa"
  | "geral";

export interface CatalogEntry {
  /** Chave canônica destino (snake_case), ex: "vendedor_cpf". */
  key: string;
  /** Label legado canônico em caixa alta, ex: "CPF DO(A) VENDEDOR(A)". */
  label: string;
  /** Grafias alternativas conhecidas que resolvem para a mesma chave. */
  aliases: string[];
  /** Papel/domínio da chave — usado para agrupar na UI de mapeamento (1.2). */
  category: RoleCategory;
}

/**
 * Catálogo integral: 131 chaves canônicas, 171 grafias (label + aliases).
 * Conteúdo gerado mecanicamente do LEGACY_BRACKET_MAP em vigor na main
 * aafa63a — o teste import-catalog.test.ts garante equivalência exata.
 */
export const IMPORT_CATALOG: CatalogEntry[] = [
  // ===== comprador =====
  { key: "comprador_nome", label: "NOME COMPLETO DO(A) COMPRADOR(A)", aliases: ["NOME COMPLETO DO COMPRADOR", "COMPRADOR", "PROMISSÁRIO(A) COMPRADOR(A)", "NOME COMPLETO DO(A) PROMISSÁRIO(A) COMPRADOR(A)"], category: "comprador" },
  { key: "comprador_cpf", label: "CPF DO(A) COMPRADOR(A)", aliases: ["CPF DO COMPRADOR"], category: "comprador" },
  { key: "comprador_rg", label: "RG DO(A) COMPRADOR(A)", aliases: ["RG DO COMPRADOR"], category: "comprador" },
  { key: "comprador_orgao_expedidor", label: "ÓRGÃO EXPEDIDOR (COMPRADOR)", aliases: [], category: "comprador" },
  { key: "comprador_profissao", label: "PROFISSÃO DO(A) COMPRADOR(A)", aliases: [], category: "comprador" },
  { key: "comprador_estado_civil", label: "ESTADO CIVIL DO(A) COMPRADOR(A)", aliases: [], category: "comprador" },
  { key: "comprador_nacionalidade", label: "NACIONALIDADE DO(A) COMPRADOR(A)", aliases: [], category: "comprador" },
  { key: "comprador_endereco", label: "ENDEREÇO DO(A) COMPRADOR(A)", aliases: [], category: "comprador" },
  { key: "comprador2_nome", label: "NOME COMPLETO DO(A) COMPRADOR(A) 2", aliases: ["NOME DO COMPRADOR 2"], category: "comprador" },
  { key: "comprador2_cpf", label: "CPF DO(A) COMPRADOR(A) 2", aliases: [], category: "comprador" },
  { key: "comprador2_rg", label: "RG DO(A) COMPRADOR(A) 2", aliases: [], category: "comprador" },
  { key: "comprador2_orgao_expedidor", label: "ÓRGÃO EXPEDIDOR (COMPRADOR 2)", aliases: [], category: "comprador" },
  { key: "comprador2_profissao", label: "PROFISSÃO DO(A) COMPRADOR(A) 2", aliases: [], category: "comprador" },
  { key: "comprador2_estado_civil", label: "ESTADO CIVIL DO(A) COMPRADOR(A) 2", aliases: [], category: "comprador" },
  { key: "comprador2_endereco", label: "ENDEREÇO DO(A) COMPRADOR(A) 2", aliases: [], category: "comprador" },

  // ===== vendedor =====
  { key: "vendedor_nome", label: "NOME COMPLETO DO(A) VENDEDOR(A)", aliases: ["NOME COMPLETO DO VENDEDOR", "PROMITENTE VENDEDOR(A)", "VENDEDOR", "NOME COMPLETO DO(A) PROMITENTE VENDEDOR(A)"], category: "vendedor" },
  { key: "vendedor_cpf", label: "CPF DO(A) VENDEDOR(A)", aliases: ["CPF DO VENDEDOR", "CPF"], category: "vendedor" },
  { key: "vendedor_rg", label: "RG DO(A) VENDEDOR(A)", aliases: ["RG DO VENDEDOR", "RG", "RG/ÓRGÃO EMISSOR"], category: "vendedor" },
  { key: "vendedor_orgao_expedidor", label: "ÓRGÃO EXPEDIDOR (VENDEDOR)", aliases: ["ÓRGÃO EXPEDIDOR DO VENDEDOR", "ÓRGÃO EMISSOR"], category: "vendedor" },
  { key: "vendedor_profissao", label: "PROFISSÃO DO(A) VENDEDOR(A)", aliases: ["PROFISSÃO"], category: "vendedor" },
  { key: "vendedor_estado_civil", label: "ESTADO CIVIL DO(A) VENDEDOR(A)", aliases: ["ESTADO CIVIL"], category: "vendedor" },
  { key: "vendedor_nacionalidade", label: "NACIONALIDADE DO(A) VENDEDOR(A)", aliases: ["NACIONALIDADE"], category: "vendedor" },
  { key: "vendedor_endereco", label: "ENDEREÇO DO(A) VENDEDOR(A)", aliases: ["ENDEREÇO COMPLETO", "ENDEREÇO"], category: "vendedor" },
  { key: "vendedor_email", label: "E-MAIL", aliases: ["EMAIL"], category: "vendedor" },
  { key: "vendedor_banco", label: "BANCO DO(A) VENDEDOR(A)", aliases: [], category: "vendedor" },
  { key: "vendedor_agencia", label: "AGÊNCIA DO(A) VENDEDOR(A)", aliases: [], category: "vendedor" },
  { key: "vendedor_conta", label: "CONTA DO(A) VENDEDOR(A)", aliases: [], category: "vendedor" },
  { key: "vendedor_pix", label: "PIX DO(A) VENDEDOR(A)", aliases: [], category: "vendedor" },
  { key: "vendedor2_nome", label: "NOME DO VENDEDOR 2", aliases: [], category: "vendedor" },
  { key: "vendedor2_cpf", label: "CPF DO VENDEDOR 2", aliases: [], category: "vendedor" },
  { key: "vendedor2_rg", label: "RG DO VENDEDOR 2", aliases: [], category: "vendedor" },
  { key: "vendedor2_profissao", label: "PROFISSÃO DO VENDEDOR 2", aliases: [], category: "vendedor" },
  { key: "vendedor2_estado_civil", label: "ESTADO CIVIL DO VENDEDOR 2", aliases: [], category: "vendedor" },
  { key: "vendedor2_endereco", label: "ENDEREÇO DO VENDEDOR 2", aliases: [], category: "vendedor" },
  { key: "vendedor2_banco", label: "BANCO DO VENDEDOR 2", aliases: [], category: "vendedor" },
  { key: "vendedor2_agencia", label: "AGÊNCIA DO VENDEDOR 2", aliases: [], category: "vendedor" },
  { key: "vendedor2_conta", label: "CONTA DO VENDEDOR 2", aliases: [], category: "vendedor" },
  { key: "vendedor2_pix", label: "PIX DO VENDEDOR 2", aliases: [], category: "vendedor" },
  { key: "vendedor3_nome", label: "NOME DO VENDEDOR 3", aliases: [], category: "vendedor" },
  { key: "vendedor3_cpf", label: "CPF DO VENDEDOR 3", aliases: [], category: "vendedor" },
  { key: "vendedor3_rg", label: "RG DO VENDEDOR 3", aliases: [], category: "vendedor" },
  { key: "vendedor3_endereco", label: "ENDEREÇO DO VENDEDOR 3", aliases: [], category: "vendedor" },
  { key: "vendedor4_nome", label: "NOME DO VENDEDOR 4", aliases: [], category: "vendedor" },
  { key: "vendedor4_cpf", label: "CPF DO VENDEDOR 4", aliases: [], category: "vendedor" },
  { key: "vendedor4_rg", label: "RG DO VENDEDOR 4", aliases: [], category: "vendedor" },
  { key: "vendedor4_endereco", label: "ENDEREÇO DO VENDEDOR 4", aliases: [], category: "vendedor" },
  { key: "vendedor5_nome", label: "NOME DO VENDEDOR 5", aliases: [], category: "vendedor" },
  { key: "vendedor5_cpf", label: "CPF DO VENDEDOR 5", aliases: [], category: "vendedor" },
  { key: "vendedor5_rg", label: "RG DO VENDEDOR 5", aliases: [], category: "vendedor" },
  { key: "vendedor5_profissao", label: "PROFISSÃO DO VENDEDOR 5", aliases: [], category: "vendedor" },
  { key: "vendedor5_estado_civil", label: "ESTADO CIVIL DO VENDEDOR 5", aliases: [], category: "vendedor" },
  { key: "vendedor5_endereco", label: "ENDEREÇO DO VENDEDOR 5", aliases: [], category: "vendedor" },
  { key: "vendedor5_banco", label: "BANCO DO VENDEDOR 5", aliases: [], category: "vendedor" },
  { key: "vendedor5_agencia", label: "AGÊNCIA DO VENDEDOR 5", aliases: [], category: "vendedor" },
  { key: "vendedor5_conta", label: "CONTA DO VENDEDOR 5", aliases: [], category: "vendedor" },
  { key: "vendedor5_pix", label: "PIX DO VENDEDOR 5", aliases: [], category: "vendedor" },

  // ===== conjuge =====
  { key: "conjuge_nome", label: "NOME DO(A) CÔNJUGE", aliases: [], category: "conjuge" },
  { key: "conjuge_cpf", label: "CPF DO(A) CÔNJUGE", aliases: [], category: "conjuge" },
  { key: "conjuge_rg", label: "RG DO(A) CÔNJUGE", aliases: [], category: "conjuge" },
  { key: "conjuge_profissao", label: "PROFISSÃO DO(A) CÔNJUGE", aliases: [], category: "conjuge" },
  { key: "conjuge2_nome", label: "NOME DO(A) CÔNJUGE 2", aliases: [], category: "conjuge" },
  { key: "conjuge2_cpf", label: "CPF DO(A) CÔNJUGE 2", aliases: [], category: "conjuge" },
  { key: "conjuge2_rg", label: "RG DO(A) CÔNJUGE 2", aliases: [], category: "conjuge" },

  // ===== anuente =====
  { key: "anuente_nome", label: "NOME DO(A) ANUENTE", aliases: [], category: "anuente" },
  { key: "anuente_cpf", label: "CPF DO(A) ANUENTE", aliases: [], category: "anuente" },
  { key: "anuente_rg", label: "RG DO(A) ANUENTE", aliases: [], category: "anuente" },
  { key: "anuente_endereco", label: "ENDEREÇO DO(A) ANUENTE", aliases: [], category: "anuente" },

  // ===== procurador =====
  { key: "procurador_nome", label: "NOME DO(A) PROCURADOR(A)", aliases: ["NOME COMPLETO DO(A) PROCURADOR(A)"], category: "procurador" },
  { key: "procurador_cpf", label: "CPF DO(A) PROCURADOR(A)", aliases: [], category: "procurador" },
  { key: "procurador_rg", label: "RG DO(A) PROCURADOR(A)", aliases: [], category: "procurador" },
  { key: "procurador_oab", label: "OAB DO(A) PROCURADOR(A)", aliases: ["OAB DO PROCURADOR"], category: "procurador" },
  { key: "procurador_profissao", label: "PROFISSÃO DO(A) PROCURADOR(A)", aliases: [], category: "procurador" },
  { key: "procurador_estado_civil", label: "ESTADO CIVIL DO(A) PROCURADOR(A)", aliases: [], category: "procurador" },
  { key: "procurador_nacionalidade", label: "NACIONALIDADE DO(A) PROCURADOR(A)", aliases: [], category: "procurador" },
  { key: "procurador_endereco", label: "ENDEREÇO DO(A) PROCURADOR(A)", aliases: [], category: "procurador" },
  { key: "procurador_outorgante", label: "OUTORGANTE", aliases: ["OUTORGANTE DA PROCURAÇÃO"], category: "procurador" },
  { key: "procurador_data_procuracao", label: "DATA DA PROCURAÇÃO", aliases: [], category: "procurador" },
  { key: "procurador_cartorio_procuracao", label: "CARTÓRIO DA PROCURAÇÃO", aliases: [], category: "procurador" },
  { key: "procurador_livro_procuracao", label: "LIVRO DA PROCURAÇÃO", aliases: [], category: "procurador" },
  { key: "procurador_folha_procuracao", label: "FOLHA DA PROCURAÇÃO", aliases: [], category: "procurador" },

  // ===== imovel =====
  { key: "imovel_descricao", label: "DESCRIÇÃO DO IMÓVEL", aliases: ["DESCRIÇÃO COMPLETA DO IMÓVEL"], category: "imovel" },
  { key: "imovel_tipo", label: "TIPO DO IMÓVEL", aliases: [], category: "imovel" },
  { key: "imovel_endereco", label: "ENDEREÇO DO IMÓVEL", aliases: [], category: "imovel" },
  { key: "imovel_matricula", label: "MATRÍCULA", aliases: ["MATRÍCULA DO IMÓVEL", "NÚMERO DA MATRÍCULA"], category: "imovel" },
  { key: "imovel_cartorio", label: "CARTÓRIO", aliases: [], category: "imovel" },
  { key: "imovel_area_privativa", label: "ÁREA PRIVATIVA", aliases: [], category: "imovel" },
  { key: "imovel_area_total", label: "ÁREA TOTAL", aliases: [], category: "imovel" },
  { key: "imovel_area_acessoria", label: "ÁREA ACESSÓRIA", aliases: [], category: "imovel" },
  { key: "imovel_vagas", label: "VAGAS DE GARAGEM", aliases: [], category: "imovel" },
  { key: "imovel_indice_cadastral", label: "INSCRIÇÃO/ÍNDICE CADASTRAL", aliases: ["ÍNDICE CADASTRAL"], category: "imovel" },
  { key: "imovel_inscricao_municipal", label: "INSCRIÇÃO MUNICIPAL", aliases: [], category: "imovel" },

  // ===== valores =====
  { key: "valor_total", label: "VALOR TOTAL", aliases: [], category: "valores" },
  { key: "valor_total_extenso", label: "VALOR TOTAL POR EXTENSO", aliases: [], category: "valores" },
  { key: "valor_sinal", label: "VALOR DO SINAL", aliases: [], category: "valores" },
  { key: "valor_remanescente", label: "VALOR REMANESCENTE", aliases: [], category: "valores" },
  { key: "valor_financiamento", label: "VALOR DO FINANCIAMENTO", aliases: [], category: "valores" },
  { key: "forma_pagamento", label: "FORMA DE PAGAMENTO", aliases: [], category: "valores" },
  { key: "banco_financiamento", label: "BANCO DO FINANCIAMENTO", aliases: [], category: "valores" },
  { key: "valor_vendedor_sinal", label: "VALOR PARA O VENDEDOR", aliases: [], category: "valores" },
  { key: "valor_corretagem", label: "VALOR DA CORRETAGEM", aliases: [], category: "valores" },
  { key: "prazo_posse_dias", label: "PRAZO DE POSSE", aliases: ["PRAZO DE POSSE EM DIAS"], category: "valores" },
  { key: "multa_atraso_diaria", label: "MULTA DIÁRIA POR ATRASO", aliases: ["MULTA POR ATRASO"], category: "valores" },

  // ===== empresa =====
  { key: "empresa_nome", label: "NOME DA AGÊNCIA", aliases: ["NOME DA IMOBILIÁRIA"], category: "empresa" },
  { key: "empresa_cnpj", label: "CNPJ DA IMOBILIÁRIA", aliases: ["CNPJ", "CPF/CNPJ"], category: "empresa" },
  { key: "empresa_creci", label: "CRECI DA IMOBILIÁRIA", aliases: [], category: "empresa" },
  { key: "empresa_endereco", label: "ENDEREÇO DA IMOBILIÁRIA", aliases: [], category: "empresa" },
  { key: "empresa_banco", label: "NOME DO BANCO", aliases: [], category: "empresa" },
  { key: "empresa_conta", label: "NÚMERO DA CONTA", aliases: [], category: "empresa" },
  { key: "empresa_agencia", label: "NÚMERO DA AGÊNCIA", aliases: [], category: "empresa" },

  // ===== intermediadora =====
  { key: "intermediadora1_nome", label: "NOME DA INTERMEDIADORA I", aliases: ["NOME DA INTERMEDIADORA 1"], category: "intermediadora" },
  { key: "intermediadora1_cnpj", label: "CNPJ/CPF 1", aliases: ["CNPJ/PIX 1", "CNPJ OU CHAVE PIX"], category: "intermediadora" },
  { key: "intermediadora2_nome", label: "NOME DA INTERMEDIADORA 2", aliases: [], category: "intermediadora" },
  { key: "intermediadora2_cnpj", label: "CNPJ/CPF 2", aliases: ["CNPJ/PIX 2"], category: "intermediadora" },
  { key: "intermediadora1_valor", label: "VALOR DA INTERMEDIADORA 1", aliases: [], category: "intermediadora" },
  { key: "intermediadora2_valor", label: "VALOR DA INTERMEDIADORA 2", aliases: [], category: "intermediadora" },

  // ===== testemunha =====
  { key: "testemunha1_nome", label: "NOME DA TESTEMUNHA 1", aliases: [], category: "testemunha" },
  { key: "testemunha1_cpf", label: "CPF DA TESTEMUNHA 1", aliases: [], category: "testemunha" },
  { key: "testemunha1_creci", label: "CRECI DA TESTEMUNHA 1", aliases: [], category: "testemunha" },
  { key: "testemunha1_email", label: "E-MAIL DA TESTEMUNHA 1", aliases: [], category: "testemunha" },
  { key: "testemunha2_nome", label: "NOME DA TESTEMUNHA 2", aliases: [], category: "testemunha" },
  { key: "testemunha2_cpf", label: "CPF DA TESTEMUNHA 2", aliases: [], category: "testemunha" },
  { key: "testemunha2_creci", label: "CRECI DA TESTEMUNHA 2", aliases: [], category: "testemunha" },
  { key: "testemunha2_email", label: "E-MAIL DA TESTEMUNHA 2", aliases: [], category: "testemunha" },

  // ===== geral =====
  { key: "cidade_uf", label: "CIDADE/UF", aliases: [], category: "geral" },
  { key: "cidade_contrato", label: "CIDADE DO CONTRATO", aliases: [], category: "geral" },
  { key: "foro", label: "FORO", aliases: [], category: "geral" },
  { key: "data_dia", label: "DIA", aliases: [], category: "geral" },
  { key: "data_mes", label: "MÊS", aliases: [], category: "geral" },
  { key: "data_ano", label: "ANO", aliases: [], category: "geral" },
  { key: "data_contrato", label: "DATA DO CONTRATO", aliases: [], category: "geral" },
  { key: "data_contrato_extenso", label: "DATA DO CONTRATO POR EXTENSO", aliases: [], category: "geral" },
];

/**
 * Labels genéricos (sem qualificação de papel) → sufixo canônico de campo.
 * Consolida o genericLabelToFieldSuffix de placeholder.ts (15 pares).
 * O papel (prefixo vendedor_/comprador_/...) vem do contexto — vide
 * import-detection.ts e resolveAmbiguousLabels.
 */
export const GENERIC_FIELD_SUFFIXES: Record<string, string> = {
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

/**
 * Palavras-chave que identificam o papel de um bloco/parágrafo do contrato.
 * Movido de placeholder.ts (era const interna de resolveAmbiguousLabels).
 */
export const ROLE_KEYWORDS: Array<{ role: string; rx: RegExp }> = [
  { role: "vendedor", rx: /\bvendedor(?:a|es|as)?\b/i },
  { role: "comprador", rx: /\bcomprador(?:a|es|as)?\b/i },
  { role: "procurador", rx: /\bprocurador(?:a|es|as)?\b/i },
  { role: "conjuge", rx: /\bc[ôo]njuges?\b/i },
  { role: "anuente", rx: /\banuentes?\b/i },
  { role: "testemunha", rx: /\btestemunhas?\b/i },
];

/** Ordem de fallback puro quando não há contexto: 1ª = vendedor, 2ª = comprador. */
export const ORDER_FALLBACK = ["vendedor", "comprador", "conjuge", "anuente"];

/**
 * Reconstrói o formato Record do LEGACY_BRACKET_MAP a partir do catálogo.
 * placeholder.ts exporta o resultado disto — o motor de render não muda.
 */
export function buildLegacyBracketMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const entry of IMPORT_CATALOG) {
    map[entry.label] = entry.key;
    for (const alias of entry.aliases) {
      map[alias] = entry.key;
    }
  }
  return map;
}
