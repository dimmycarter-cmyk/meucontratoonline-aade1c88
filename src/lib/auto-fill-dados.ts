/**
 * Função pura que mapeia uma lista de ManualParticipantData (+ company)
 * para o objeto `dados` (Record<string,string>) usado pelos placeholders.
 *
 * Indexação por role:
 *   - comprador, comprador2
 *   - vendedor, vendedor2 ... vendedor5
 *   - conjuge, conjuge2 (ordem de cadastro)
 *   - anuente
 *
 * Regras adicionais:
 *   - Cônjuge com `also_anuente: true` também é mapeado para anuente_*
 *     (sem duplicar — a flag não consome um slot extra).
 *   - Vendedor recebe campos bancários (banco, agencia, conta, pix).
 *   - Profissão "advogad…" expõe oab_* (vendedor_oab, comprador_oab, etc.).
 *   - Estado civil casado/união expõe regime_bens_*.
 *
 * Após o mapeamento, chama `enrichDados` para aplicar formatters, aliases,
 * derivados (extenso, data) e injeção dos dados da empresa.
 */
import type { ManualParticipantData } from "@/components/contract/manual-participant";
import type { ParticipantRole } from "@/components/contract/ParticipantCard";
import { enrichDados, type CompanyData } from "./contract-enrichment";
import { composeEnderecoCanonico, formatCPF, isValidCep } from "./contract-formatters";

const SLOT_LIMITS: Partial<Record<ParticipantRole, number>> = {
  comprador: 2,
  vendedor: 5,
  conjuge: 2,
  anuente: 1,
  procurador: 1,
};

function prefixForIndex(role: ParticipantRole, index: number): string {
  // index 0 = sem sufixo; 1+ = sufixo numérico (vendedor2, comprador2, ...)
  return index === 0 ? role : `${role}${index + 1}`;
}

function applyParticipantFields(
  dados: Record<string, string>,
  prefix: string,
  p: ManualParticipantData,
  opts: { includeBank?: boolean } = {}
) {
  const set = (suffix: string, v: string | undefined | null) => {
    if (v && String(v).trim() !== "") dados[`${prefix}_${suffix}`] = String(v);
  };
  set("nome", p.nome);
  set("cpf", p.cpf);
  set("rg", p.rg);
  set("orgao_expedidor", p.orgao_expedidor);
  set("profissao", p.profissao);
  set("nacionalidade", p.nacionalidade);
  set("estado_civil", p.estado_civil);
  set("email", p.email);
  set("whatsapp", p.whatsapp);
  set("genero", p.genero);
  set("data_nascimento", p.data_nascimento);

  // Endereço composto — formato canônico unificado (mesmo da empresa).
  if (p.cep && !isValidCep(p.cep)) {
    // eslint-disable-next-line no-console
    console.warn(
      `[auto-fill-dados] CEP malformado em ${prefix}: "${p.cep}". ` +
        `Esperados 8 dígitos. Será emitido no contrato como digitado.`
    );
  }
  const endereco = composeEnderecoCanonico({
    rua: p.rua,
    numero: p.numero,
    complemento: p.complemento,
    bairro: p.bairro,
    cidade: p.cidade,
    estado: p.estado,
    cep: p.cep,
  });
  if (endereco) dados[`${prefix}_endereco`] = endereco;

  // Campos condicionais
  if (p.profissao && /advogad/i.test(p.profissao) && p.oab) {
    dados[`${prefix}_oab`] = p.oab;
  }
  if (p.estado_civil && /(casad|uni[aã]o)/i.test(p.estado_civil) && p.regime_bens) {
    dados[`${prefix}_regime_bens`] = p.regime_bens;
  }

  // Dados bancários (vendedores e procuradores podem usar)
  if (opts.includeBank) {
    set("banco", p.banco);
    set("agencia", p.agencia);
    set("conta", p.conta);
    set("pix", p.pix);
  }
}

export interface AutoFillOptions {
  company?: CompanyData | null;
  cidadeContrato?: string;
  /** Dados já existentes que devem ser preservados quando vazio no participante. */
  baseDados?: Record<string, string>;
  /**
   * Quando false, retorna o mapeamento indexado CRU (sem enrichDados / sem
   * injeção de empresa). Use na UI para não congelar empresa_* nem derivados no
   * payload persistido — `contracts.dados` é round-tripped em inputs editáveis
   * na retomada de rascunho (setDados(snap.dados)), onde valores formatados ou
   * derivados ficariam stale/dessincronizados. Default true — preserva os
   * callers/testes existentes que esperam o objeto já enriquecido.
   */
  enrich?: boolean;
}

export function autoFillDadosFromParticipants(
  participants: ManualParticipantData[],
  options: AutoFillOptions = {}
): Record<string, string> {
  const dados: Record<string, string> = { ...(options.baseDados ?? {}) };

  // Agrupa por role respeitando ordem de cadastro
  const byRole = new Map<ParticipantRole, ManualParticipantData[]>();
  for (const p of participants) {
    if (!p.nome || !p.nome.trim()) continue; // pula vazios
    const arr = byRole.get(p.role) ?? [];
    arr.push(p);
    byRole.set(p.role, arr);
  }

  for (const [role, list] of byRole.entries()) {
    const limit = SLOT_LIMITS[role] ?? list.length;
    const slice = list.slice(0, limit);
    slice.forEach((p, idx) => {
      const prefix = prefixForIndex(role, idx);
      const includeBank = role === "vendedor" || role === "procurador";
      applyParticipantFields(dados, prefix, p, { includeBank });

      // Cônjuge marcado como also_anuente preenche anuente_*
      if (role === "conjuge" && p.also_anuente) {
        applyParticipantFields(dados, "anuente", p);
      }
    });
  }

  // enrich:false → mapeamento cru, sem injeção de empresa nem derivados.
  if (options.enrich === false) return dados;

  return enrichDados(dados, {
    company: options.company ?? null,
    cidadeContrato: options.cidadeContrato,
  });
}

/**
 * Mapeia o papel singular (ParticipantRole) para a chave PLURAL usada nos
 * blocos {{#each <papel>}} do template. Só os papéis com renderização
 * dinâmica suportada hoje. Papéis fora deste mapa são ignorados pelo loop.
 */
const ROLE_PLURAL: Partial<Record<ParticipantRole, string>> = {
  vendedor: "vendedores",
  comprador: "compradores",
  anuente: "anuentes",
  fiador: "fiadores",
  testemunha: "testemunhas",
};

const asStr = (v: string | undefined | null): string => (v == null ? "" : String(v));

/**
 * Converte um participante no registro de campos consumido por
 * `expandEachBlocks` dentro de um {{#each}}. Campos vêm já formatados
 * (CPF mascarado, endereço composto canonicamente) e SEMPRE presentes —
 * mesmo vazios — para que o renderer do bloco limpe pontuação órfã.
 */
function participantToEachItem(p: ManualParticipantData): Record<string, string> {
  return {
    nome: asStr(p.nome),
    cpf: formatCPF(p.cpf),
    rg: asStr(p.rg),
    orgao_expedidor: asStr(p.orgao_expedidor),
    profissao: asStr(p.profissao),
    estado_civil: asStr(p.estado_civil),
    nacionalidade: asStr(p.nacionalidade),
    email: asStr(p.email),
    whatsapp: asStr(p.whatsapp),
    genero: asStr(p.genero),
    data_nascimento: asStr(p.data_nascimento),
    oab: asStr(p.oab),
    regime_bens: asStr(p.regime_bens),
    banco: asStr(p.banco),
    agencia: asStr(p.agencia),
    conta: asStr(p.conta),
    pix: asStr(p.pix),
    endereco: composeEnderecoCanonico({
      rua: p.rua,
      numero: p.numero,
      complemento: p.complemento,
      bairro: p.bairro,
      cidade: p.cidade,
      estado: p.estado,
      cep: p.cep,
    }),
  };
}

/**
 * Agrupa `manualParticipants` por papel PLURAL para alimentar os blocos
 * {{#each <papel>}} no render. Lê o ARRAY direto (fonte única), na ordem
 * de cadastro, pulando quem não tem nome. É o equivalente dinâmico do
 * mapeamento por chaves planas de `autoFillDadosFromParticipants` — mas
 * sem o limite de slots fixos (N partes por papel).
 */
export function buildParticipantsByRole(
  participants: ManualParticipantData[]
): Record<string, Array<Record<string, string>>> {
  const byRole: Record<string, Array<Record<string, string>>> = {};
  for (const p of participants) {
    if (!p.nome || !p.nome.trim()) continue; // pula vazios
    const plural = ROLE_PLURAL[p.role];
    if (!plural) continue; // papel sem suporte a {{#each}} ainda
    (byRole[plural] ??= []).push(participantToEachItem(p));
  }
  return byRole;
}
