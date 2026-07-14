/**
 * Merge campo-a-campo de dados do contrato no salvamento (Fase 2 / 2.1).
 *
 * Réplica PURA e testável dos STEPs 1 e 2 do handleSave legado
 * (NovoContrato.tsx): reconstrói os dados frescos a partir do estado do
 * wizard e aplica a regra de precedência AI vs manual.
 *
 * Semânticas preservadas do código original (intencionais, não "corrigir"):
 *  - Autofill manual roda CRU (enrich:false) e respeita dadosDirty via
 *    pickAutoFillFields — chaves editadas à mão não são sobrescritas.
 *  - Contatos legados (comprador/vendedor selecionados) sobrescrevem
 *    INCONDICIONALMENTE campo truthy por campo truthy — inclusive sobre
 *    chaves dirty (paridade com o comportamento de produção).
 *  - Endereços são canonicalizados AQUI (composeEnderecoCanonico) mesmo com
 *    enrichDados rodando depois: injectCompany usa setIfEmpty, então a versão
 *    crua bypassaria silenciosamente a canonicalização do endereço da empresa.
 *  - Precedência: mergedDados = { ...aiDados, ...freshDados } — manual vence.
 */
import type { ManualParticipantData } from "@/components/contract/manual-participant";
import type { CompanyData } from "./contract-enrichment";
import { composeEnderecoCanonico } from "./contract-formatters";
import { autoFillDadosFromParticipants } from "./auto-fill-dados";
import { pickAutoFillFields } from "./wizard-dirty";

/** Shape estrutural mínimo do contato legado selecionado no wizard. */
export interface ContactLike {
  nome?: string | null;
  cpf?: string | null;
  rg?: string | null;
  orgao_expedidor?: string | null;
  profissao?: string | null;
  nacionalidade?: string | null;
  estado_civil?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  genero?: string | null;
  rua?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
}

/** Participante do fluxo AI (shape estrutural mínimo). */
export interface AiParticipantLike {
  id: string;
  role: string;
  full_name?: string | null;
}

/** Item de extração AI (shape estrutural mínimo). */
export interface ExtractedDataLike {
  participantId: string;
  full_name?: string | null;
}

export interface MergeDadosInput {
  /** Estado `dados` do wizard (base do merge). */
  dados: Record<string, string>;
  /** Chaves editadas manualmente — puladas pelo autofill (Bug B / Épico 5). */
  dadosDirty: Set<string>;
  flowMode: "manual" | "ai";
  manualParticipants: ManualParticipantData[];
  comprador?: ContactLike | null;
  vendedor?: ContactLike | null;
  empresa?: CompanyData | null;
  /** Resultado de mapToDados() (extração AI) — perde para freshDados no merge. */
  aiDados: Record<string, string>;
  participants?: AiParticipantLike[];
  extractedData?: ExtractedDataLike[];
}

/** Preenche freshDados a partir de um contato legado — sobrescrita incondicional por campo truthy. */
function fillFromContact(
  freshDados: Record<string, string>,
  contact: ContactLike,
  prefix: "comprador" | "vendedor"
) {
  if (contact.nome) freshDados[`${prefix}_nome`] = contact.nome;
  if (contact.cpf) freshDados[`${prefix}_cpf`] = contact.cpf;
  if (contact.rg) freshDados[`${prefix}_rg`] = contact.rg;
  if (contact.orgao_expedidor) freshDados[`${prefix}_orgao_expedidor`] = contact.orgao_expedidor;
  if (contact.profissao) freshDados[`${prefix}_profissao`] = contact.profissao;
  if (contact.nacionalidade) freshDados[`${prefix}_nacionalidade`] = contact.nacionalidade;
  if (contact.estado_civil) freshDados[`${prefix}_estado_civil`] = contact.estado_civil;
  if (contact.email) freshDados[`${prefix}_email`] = contact.email;
  if (contact.whatsapp) freshDados[`${prefix}_whatsapp`] = contact.whatsapp;
  if (contact.genero) freshDados[`${prefix}_genero`] = contact.genero;
  const end = composeEnderecoCanonico({
    rua: contact.rua, numero: contact.numero, complemento: contact.complemento,
    bairro: contact.bairro, cidade: contact.cidade, estado: contact.estado, cep: contact.cep,
  });
  if (end) freshDados[`${prefix}_endereco`] = end;
}

/**
 * STEP 1 (freshDados) + STEP 2 (precedência AI vs manual) + fallback de nomes.
 * Função pura — não modifica os objetos de entrada.
 */
export function buildMergedDados(input: MergeDadosInput): Record<string, string> {
  const freshDados: Record<string, string> = { ...input.dados };

  // Fill from manualParticipants (manual flow) — cru + dirty-aware
  if (input.flowMode === "manual") {
    const autoFilled =
      input.manualParticipants.length > 0
        ? autoFillDadosFromParticipants(input.manualParticipants, { enrich: false })
        : {};
    Object.assign(freshDados, pickAutoFillFields(autoFilled, input.dadosDirty));
  }

  // Fill from selected contacts (legacy/backward compat)
  if (input.comprador) fillFromContact(freshDados, input.comprador, "comprador");
  if (input.vendedor) fillFromContact(freshDados, input.vendedor, "vendedor");
  if (input.empresa) {
    if (input.empresa.nome_fantasia) freshDados.empresa_nome = input.empresa.nome_fantasia;
    if (input.empresa.cnpj) freshDados.empresa_cnpj = input.empresa.cnpj;
    const endE = composeEnderecoCanonico({
      rua: input.empresa.rua, numero: input.empresa.numero, complemento: input.empresa.complemento,
      bairro: input.empresa.bairro, cidade: input.empresa.cidade, estado: input.empresa.estado,
      cep: input.empresa.cep,
    });
    if (endE) freshDados.empresa_endereco = endE;
  }

  // Merge with AI extracted data — manual/wizard vence
  const mergedDados = { ...input.aiDados, ...freshDados };

  // Fallback de nomes a partir dos participantes (AI flow)
  if (input.flowMode === "ai" && (input.participants?.length ?? 0) > 0) {
    for (const p of input.participants!) {
      const nameKey = `${p.role}_nome`;
      if (!mergedDados[nameKey] && p.full_name) {
        mergedDados[nameKey] = p.full_name;
      }
      const pData = input.extractedData?.find((ed) => ed.participantId === p.id);
      if (pData?.full_name && !mergedDados[nameKey]) {
        mergedDados[nameKey] = pData.full_name;
      }
    }
  }
  // Fallback de nomes para o fluxo manual
  if (input.flowMode === "manual") {
    const firstComprador = input.manualParticipants.find((p) => p.role === "comprador");
    const firstVendedor = input.manualParticipants.find((p) => p.role === "vendedor");
    if (!mergedDados.comprador_nome && firstComprador) mergedDados.comprador_nome = firstComprador.nome;
    if (!mergedDados.vendedor_nome && firstVendedor) mergedDados.vendedor_nome = firstVendedor.nome;
  }

  return mergedDados;
}
