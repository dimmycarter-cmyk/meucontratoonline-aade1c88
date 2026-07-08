/**
 * Lógica pura de SAVE de contrato/rascunho — sem React, sem Supabase, sem `any`.
 *
 * Motivação (bug duplicata): os dois handlers de save em NovoContrato
 * (`handleSaveDraftFromModal` e `handleSave`) chamavam `createContract` (INSERT)
 * incondicionalmente, ignorando o `:id` da retomada → cada save criava uma LINHA
 * nova (ex.: 0018 ao lado de 0016). Além disso, `handleSave` não gravava
 * `wizard_state` (criava plano-legado).
 *
 * Este módulo concentra as decisões puras:
 *  - `resolveSaveMode`     — INSERT (novo) vs UPDATE (retomada por :id).
 *  - `buildDraftContractPayload` / `buildFinalContractPayload` — payloads que
 *    SEMPRE incluem `wizard_state` (snapshot) + `dados` plano.
 *  - `buildParticipantRows` — projeta participantes (AI/manual) para linhas da
 *    tabela relacional `contract_participants`.
 *  - `diffParticipants`    — reconcilia existentes × desejados por (role, ordinal):
 *      • toUpdate (id preservado → NÃO cascateia `participant_documents` OCR)
 *      • toInsert (desejados a mais)
 *      • toDelete (existentes a mais) — ⚠️ FASE 2: aplicar via RPC transacional
 *        (`reconcile_contract_participants`), NUNCA com DELETE client-side, pois
 *        `participant_documents`/`extracted_document_data` têm ON DELETE CASCADE
 *        (perda irreversível de OCR). Na Fase 1 o handler ignora `toDelete`
 *        (órfão temporário tolerado).
 */

export type SaveMode = "insert" | "update";

/** Retomada por :id → UPDATE na linha; sem :id → INSERT nova. */
export function resolveSaveMode(contratoId: string | null | undefined): SaveMode {
  return contratoId ? "update" : "insert";
}

/**
 * Id efetivo do rascunho para o botão persistente / modal:
 *  - `routeId`        — retomada por rota `/contratos/:id` (Fase 1).
 *  - `createdDraftId` — id capturado do 1º INSERT nesta sessão (ref na tela).
 *
 * REQUISITO DE IDEMPOTÊNCIA: sem `createdDraftId`, o 2º clique num contrato
 * NOVO (sem :id) faria outro INSERT → rascunho duplicado (bug da Fase 1).
 * A rota vence a ref (retomada é a fonte canônica).
 */
export function effectiveDraftId(
  routeId: string | null | undefined,
  createdDraftId: string | null | undefined,
): string | null {
  return routeId ?? createdDraftId ?? null;
}

/** Modo de save do rascunho considerando rota + id capturado do 1º INSERT. */
export function resolveDraftSaveMode(
  routeId: string | null | undefined,
  createdDraftId: string | null | undefined,
): SaveMode {
  return resolveSaveMode(effectiveDraftId(routeId, createdDraftId));
}

// ===== Habilitação do "Salvar Rascunho" persistente (anti-lixo) =====

/**
 * "Dado mínimo" para não gravar rascunho-lixo no banco: pelo menos UM
 * participante com nome real (manual ou IA) OU algum valor plano preenchido.
 */
export function hasMinimalDraftData(input: {
  manualParticipants?: Array<{ nome?: string }>;
  participants?: Array<{ full_name?: string }>;
  dados?: Record<string, string>;
}): boolean {
  const manualNamed = (input.manualParticipants ?? []).some((p) => p?.nome?.trim());
  const aiNamed = (input.participants ?? []).some((p) => p?.full_name?.trim());
  const anyDado = Object.values(input.dados ?? {}).some(
    (v) => typeof v === "string" && v.trim().length > 0,
  );
  return !!(manualNamed || aiNamed || anyDado);
}

export interface CanSaveDraftInput {
  hasTenant: boolean;
  currentStepIndex: number;
  selectedTemplateId: string | null;
  hasMinimalData: boolean;
  isDirty: boolean;
  isSavingDraft: boolean;
}

/**
 * Regra de habilitação do botão persistente. Só habilita a partir da 2ª etapa
 * (index >= 1, já há um modelo escolhido), com tenant, dado mínimo, form sujo e
 * sem save em voo. Pura → testável isoladamente.
 */
export function canSaveDraft(i: CanSaveDraftInput): boolean {
  return (
    i.hasTenant &&
    i.currentStepIndex >= 1 &&
    !!i.selectedTemplateId &&
    i.hasMinimalData &&
    i.isDirty &&
    !i.isSavingDraft
  );
}

// ===== Payloads de contrato (sempre com wizard_state) =====

export interface DraftPayloadInput {
  nome: string;
  currentStep: string;
  templateId: string | null;
  dados: Record<string, string>;
  wizardState: Record<string, unknown>;
  clausulasIds: string[];
  conteudoFinal: string;
  compradorId: string | null;
  vendedorId: string | null;
  empresaId: string | null;
}

/** Payload do "Salvar Rascunho" (modal). `dados` plano + `wizard_state` snapshot. */
export function buildDraftContractPayload(input: DraftPayloadInput): Record<string, unknown> {
  return {
    nome: input.nome,
    status: "rascunho",
    current_step: input.currentStep,
    template_id: input.templateId,
    dados: input.dados,
    wizard_state: input.wizardState,
    clausulas_ids: input.clausulasIds,
    conteudo_final: input.conteudoFinal,
    comprador_id: input.compradorId,
    vendedor_id: input.vendedorId,
    empresa_id: input.empresaId,
  };
}

export interface FinalPayloadInput {
  nome: string;
  templateId: string | null;
  compradorId: string | null;
  vendedorId: string | null;
  empresaId: string | null;
  dados: Record<string, string>;
  wizardState: Record<string, unknown>;
  conteudoFinal: string;
  clausulasIds: string[];
}

/** "BRL string" → number | null (ex.: "R$ 1.234,56" → 1234.56). */
function parseValor(v: string | undefined): number | null {
  if (!v) return null;
  const n = parseFloat(v.replace(/[^\d.,]/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Payload do `handleSave` (botão principal). Inclui `wizard_state` (faltava). */
export function buildFinalContractPayload(input: FinalPayloadInput): Record<string, unknown> {
  return {
    nome: input.nome,
    template_id: input.templateId,
    comprador_id: input.compradorId,
    vendedor_id: input.vendedorId,
    empresa_id: input.empresaId,
    dados: input.dados,
    wizard_state: input.wizardState,
    conteudo_final: input.conteudoFinal,
    clausulas_ids: input.clausulasIds,
    status: "rascunho",
    current_step: "concluido",
    valor_total: parseValor(input.dados.valor_total),
    valor_sinal: parseValor(input.dados.valor_sinal),
    valor_financiamento: parseValor(input.dados.valor_financiamento),
  };
}

// ===== Projeção de participantes para a tabela relacional =====

/** Linha de `contract_participants` (sem `contract_id`/`tenant_id`, anexados na escrita). */
export interface ParticipantRow {
  role: string;
  full_name: string;
  cpf: string | null;
  rg: string | null;
  issuing_agency: string | null;
  profession: string | null;
  nationality: string | null;
  marital_status: string | null;
  email: string | null;
  whatsapp: string | null;
  gender: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zipcode: string | null;
}

// Tipos estruturais mínimos (evita acoplar a tipos de componente; sem `any`).
interface AiParticipantLike {
  id: string;
  role: string;
  full_name?: string;
}
interface ExtractedLike {
  participantId: string;
  full_name?: string;
  fields?: { key: string; value: string }[];
}
interface ManualLike {
  role: string;
  nome: string;
  cpf?: string;
  rg?: string;
  orgao_expedidor?: string;
  profissao?: string;
  nacionalidade?: string;
  estado_civil?: string;
  email?: string;
  whatsapp?: string;
  genero?: string;
  rua?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
}

const DADOS_TO_PARTICIPANT: Record<string, string> = {
  cpf: "cpf", rg: "rg", orgao_expedidor: "issuing_agency",
  profissao: "profession", nacionalidade: "nationality",
  estado_civil: "marital_status", email: "email", whatsapp: "whatsapp",
  genero: "gender",
};
const ADDR_MAP: Record<string, string> = {
  endereco_rua: "address_street", endereco_numero: "address_number",
  endereco_complemento: "address_complement", endereco_bairro: "address_neighborhood",
  endereco_cidade: "address_city", endereco_estado: "address_state",
  endereco_cep: "address_zipcode",
};

const orNull = (v: string | undefined): string | null => (v ? v : null);

/** Caminho IA: combina extração (fieldMap) + fallback de `mergedDados`. */
function aiRow(
  p: AiParticipantLike,
  mergedDados: Record<string, string>,
  extractedData: ExtractedLike[]
): ParticipantRow {
  const pData = extractedData.find((ed) => ed.participantId === p.id);
  const fieldMap: Record<string, string> = {};
  pData?.fields?.forEach((f) => { fieldMap[f.key] = f.value; });

  const prefix = p.role + "_";
  for (const [suffix, field] of Object.entries(DADOS_TO_PARTICIPANT)) {
    const key = prefix + suffix;
    if (mergedDados[key] && !fieldMap[field]) fieldMap[field] = mergedDados[key];
  }
  for (const [suffix, field] of Object.entries(ADDR_MAP)) {
    const key = prefix + suffix;
    if (mergedDados[key] && !fieldMap[field]) fieldMap[field] = mergedDados[key];
  }

  return {
    role: p.role,
    full_name: pData?.full_name || p.full_name || mergedDados[prefix + "nome"] || "",
    cpf: orNull(fieldMap.cpf),
    rg: orNull(fieldMap.rg),
    issuing_agency: orNull(fieldMap.issuing_agency),
    profession: orNull(fieldMap.profession),
    nationality: orNull(fieldMap.nationality),
    marital_status: orNull(fieldMap.marital_status),
    email: orNull(fieldMap.email),
    whatsapp: orNull(fieldMap.whatsapp),
    gender: orNull(fieldMap.gender),
    address_street: orNull(fieldMap.address_street),
    address_number: orNull(fieldMap.address_number),
    address_complement: orNull(fieldMap.address_complement),
    address_neighborhood: orNull(fieldMap.address_neighborhood),
    address_city: orNull(fieldMap.address_city),
    address_state: orNull(fieldMap.address_state),
    address_zipcode: orNull(fieldMap.address_zipcode),
  };
}

/** Caminho manual: direto dos campos do participante. */
function manualRow(mp: ManualLike): ParticipantRow {
  return {
    role: mp.role,
    full_name: mp.nome,
    cpf: orNull(mp.cpf),
    rg: orNull(mp.rg),
    issuing_agency: orNull(mp.orgao_expedidor),
    profession: orNull(mp.profissao),
    nationality: orNull(mp.nacionalidade),
    marital_status: orNull(mp.estado_civil),
    email: orNull(mp.email),
    whatsapp: orNull(mp.whatsapp),
    gender: orNull(mp.genero),
    address_street: orNull(mp.rua),
    address_number: orNull(mp.numero),
    address_complement: orNull(mp.complemento),
    address_neighborhood: orNull(mp.bairro),
    address_city: orNull(mp.cidade),
    address_state: orNull(mp.estado),
    address_zipcode: orNull(mp.cep),
  };
}

/** Projeta os participantes do fluxo ativo para linhas de `contract_participants`. */
export function buildParticipantRows(input: {
  flowMode: string | null;
  participants: AiParticipantLike[];
  manualParticipants: ManualLike[];
  mergedDados: Record<string, string>;
  extractedData: ExtractedLike[];
}): ParticipantRow[] {
  if (input.flowMode === "ai") {
    return input.participants.map((p) => aiRow(p, input.mergedDados, input.extractedData));
  }
  if (input.flowMode === "manual") {
    return input.manualParticipants
      .filter((mp) => mp.nome && mp.nome.trim())
      .map(manualRow);
  }
  return [];
}

// ===== Reconcile (puro) =====

export interface ExistingParticipant {
  id: string;
  role: string;
}

export interface ParticipantDiff {
  toUpdate: { id: string; fields: ParticipantRow }[];
  toInsert: ParticipantRow[];
  /** ⚠️ FASE 2 (RPC transacional). Na Fase 1 o handler NÃO aplica. */
  toDelete: string[];
}

/**
 * Reconcilia existentes × desejados por (role, ordinal de cadastro):
 *  - posições pareadas → UPDATE in-place (id preservado → OCR intacto);
 *  - desejados a mais  → INSERT;
 *  - existentes a mais → toDelete (Fase 2).
 * `existing` deve vir em ordem estável (ex.: `.order("created_at")`).
 */
export function diffParticipants(
  existing: ExistingParticipant[],
  desired: ParticipantRow[]
): ParticipantDiff {
  const idsByRole = new Map<string, string[]>();
  for (const e of existing) {
    const arr = idsByRole.get(e.role) ?? [];
    arr.push(e.id);
    idsByRole.set(e.role, arr);
  }
  const rowsByRole = new Map<string, ParticipantRow[]>();
  for (const d of desired) {
    const arr = rowsByRole.get(d.role) ?? [];
    arr.push(d);
    rowsByRole.set(d.role, arr);
  }

  const toUpdate: ParticipantDiff["toUpdate"] = [];
  const toInsert: ParticipantRow[] = [];
  const toDelete: string[] = [];

  const roles = new Set<string>([...idsByRole.keys(), ...rowsByRole.keys()]);
  for (const role of roles) {
    const ids = idsByRole.get(role) ?? [];
    const rows = rowsByRole.get(role) ?? [];
    const paired = Math.min(ids.length, rows.length);
    for (let i = 0; i < paired; i++) toUpdate.push({ id: ids[i], fields: rows[i] });
    for (let i = paired; i < rows.length; i++) toInsert.push(rows[i]);
    for (let i = paired; i < ids.length; i++) toDelete.push(ids[i]);
  }
  return { toUpdate, toInsert, toDelete };
}
