/**
 * D6 (2.2b, Bloco D) — completude do cadastro da empresa para fins de contrato.
 *
 * Com o default invertido (Commit 2), cada campo empresa_* vazio vira lacuna
 * no documento (~11 no template do seed com cadastro cru). O alerta do wizard
 * aponta a CAUSA (cadastro incompleto em /app/configuracoes) em vez de deixar
 * o corretor descobrir o SINTOMA no confirm de impressão.
 *
 * Camada de componente por decisão do Bloco D (src/lib congelado): é regra de
 * UI sobre o shape de Company, não lógica do motor.
 */
import type { Company } from "@/hooks/useCompanies";

/** Campos da empresa que o render consome via empresa_* (enrichment injeta). */
export const COMPANY_CONTRACT_FIELDS: ReadonlyArray<{ key: keyof Company; label: string }> = [
  { key: "cnpj", label: "CNPJ" },
  { key: "creci", label: "CRECI" },
  { key: "email", label: "E-mail" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "rua", label: "Rua" },
  { key: "numero", label: "Número" },
  { key: "bairro", label: "Bairro" },
  { key: "cidade", label: "Cidade" },
  { key: "estado", label: "Estado" },
  { key: "cep", label: "CEP" },
  { key: "banco", label: "Banco" },
  { key: "agencia", label: "Agência" },
  { key: "conta", label: "Conta" },
  { key: "pix", label: "Chave PIX" },
];

/** Campos do contrato ainda vazios no cadastro da empresa (whitespace = vazio,
 *  mesma semântica do gate 3a). Empresa ausente → lista vazia (outro alerta). */
export function missingCompanyFields(
  company: Company | null | undefined
): Array<{ key: keyof Company; label: string }> {
  if (!company) return [];
  return COMPANY_CONTRACT_FIELDS.filter(({ key }) => {
    const v = company[key];
    return v === null || v === undefined || String(v).trim() === "";
  });
}
