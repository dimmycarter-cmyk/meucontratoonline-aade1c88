/**
 * Detector de dados pessoais (PII) em textos de contrato.
 * Usado pelo importador .docx (Leva 3) para alertar quando o usuário
 * importa um contrato preenchido em vez de um modelo limpo.
 */

export type PIIKind =
  | "cpf"
  | "cnpj"
  | "rg"
  | "telefone"
  | "email"
  | "valor_monetario_extenso"
  | "endereco_cep"
  | "conta_bancaria"
  | "placeholder_informal";

export interface PIIMatch {
  kind: PIIKind;
  value: string;
  index: number;
  hint: string;
}

const PATTERNS: Array<{ kind: PIIKind; regex: RegExp; hint: string }> = [
  {
    kind: "cpf",
    regex: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g,
    hint: "CPF formatado encontrado — substitua por {{vendedor_cpf}} ou {{comprador_cpf}}.",
  },
  {
    kind: "cnpj",
    regex: /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g,
    hint: "CNPJ formatado encontrado — substitua por {{empresa_cnpj}} ou {{intermediadora1_cnpj}}.",
  },
  {
    kind: "rg",
    regex: /\b(?:SSP|PC|DETRAN|IFP|IIRGD)[-\s/][A-Z]{2}\b/g,
    hint: "Referência a órgão expedidor de RG (ex: SSP/MG) — provável dado real.",
  },
  {
    kind: "telefone",
    regex: /\(\d{2}\)\s*\d{4,5}-\d{4}/g,
    hint: "Telefone formatado (XX) XXXXX-XXXX — substitua por {{*_whatsapp}}.",
  },
  {
    kind: "email",
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    hint: "E-mail real — substitua por {{*_email}}.",
  },
  {
    kind: "valor_monetario_extenso",
    regex: /R\$\s*[\d.]+,\d{2}\s*\([^)]*(?:reais|centavos|mil|milh)[^)]*\)/gi,
    hint: "Valor monetário com extenso entre parênteses — substitua por {{valor_*}}.",
  },
  {
    kind: "endereco_cep",
    regex: /\b\d{5}-\d{3}\b/g,
    hint: "CEP encontrado — provável endereço residencial real. Substitua por {{*_endereco}}.",
  },
  {
    kind: "placeholder_informal",
    regex: /\.x\.x\.x(?:\.x+)?\.?/gi,
    hint: "Placeholder informal '.x.x.x.x' — substitua por placeholder canônico {{...}}.",
  },
];

const BANCO_KEYWORDS = [
  "banco do brasil", "bradesco", "itau", "itaú", "santander", "caixa econômica",
  "caixa econômica federal", "nubank", "inter", "sicoob", "sicredi", "safra",
  "bmg", "btg pactual", "original", "c6 bank",
];

export function detectPII(text: string): PIIMatch[] {
  if (!text) return [];
  const matches: PIIMatch[] = [];

  for (const { kind, regex, hint } of PATTERNS) {
    const re = new RegExp(regex.source, regex.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      matches.push({ kind, value: m[0], index: m.index, hint });
    }
  }

  const lower = text.toLowerCase();
  for (const banco of BANCO_KEYWORDS) {
    let pos = lower.indexOf(banco);
    while (pos !== -1) {
      const window = text.slice(pos, Math.min(pos + 200, text.length));
      if (/\b\d{4,6}-?\d?\b.*\b\d{4,8}-?\d?\b/.test(window)) {
        matches.push({
          kind: "conta_bancaria",
          value: text.slice(pos, pos + banco.length),
          index: pos,
          hint: `Banco "${banco}" próximo de números reais — substitua por {{*_banco}}, {{*_agencia}}, {{*_conta}}.`,
        });
      }
      pos = lower.indexOf(banco, pos + 1);
    }
  }

  return matches.sort((a, b) => a.index - b.index);
}

export function summarizePII(matches: PIIMatch[]): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const m of matches) {
    summary[m.kind] = (summary[m.kind] ?? 0) + 1;
  }
  return summary;
}

export function hasPIIBlockers(matches: PIIMatch[]): boolean {
  return matches.some((m) =>
    ["cpf", "cnpj", "email", "valor_monetario_extenso", "conta_bancaria"].includes(m.kind)
  );
}
