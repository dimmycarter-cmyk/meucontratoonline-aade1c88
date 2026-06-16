/**
 * Persistência/retomada de RASCUNHO do wizard de contrato.
 *
 * Contrato de dados (decisão de arquitetura — opção C):
 *  - `contracts.dados` permanece SEMPRE plano (`vendedor_*`, `vendedor2_*`, …) —
 *    é o que os leitores consomem (ContratoDetalhe/ContractDataDisplay, lista,
 *    render de placeholders planos).
 *  - `contracts.wizard_state` (jsonb, NOVA coluna) guarda o SNAPSHOT completo do
 *    wizard (`wizardSnapshot`: flowMode, currentStepIndex, manualParticipants[],
 *    participants[], dados, dirty flags, …) — fonte lossless da retomada.
 *
 * A retomada (`selectHydration`) cobre TRÊS shapes, sem mishandle:
 *  1. `wizard_state` presente            → caminho canônico (lossless).
 *  2. `wizard_state` NULL + `dados` é snapshot (ex.: 18db1b7d, autosave legado que
 *     gravou o snapshot DENTRO de `dados`) → lê `dados` como snapshot (lossless).
 *  3. `wizard_state` NULL + `dados` plano (ex.: 96216482, Salvar Rascunho legado)
 *     → reconstrói best-effort do plano (LOSSY: endereço granular e documentos
 *     não revertem — ver `reconstructParticipantsFromPlano`).
 *
 * Funções puras — sem React, sem Supabase, sem `any`. Testáveis isoladamente.
 */
import type { ManualParticipantData } from "@/components/contract/manual-participant";
import { reconstructParticipantsFromPlano } from "./auto-fill-dados";

/** Bag JSON arbitrária (snapshot do wizard ou `dados` plano), sem `any`. */
export type JsonRecord = Record<string, unknown>;

/**
 * Subconjunto da linha `contracts` lido na retomada (read-only). `dados`/
 * `wizard_state` são `unknown` (a row do Supabase tipa `dados` como `Json`, que
 * inclui string) — narrowing interno é feito com type-guards, sem `any`. O index
 * signature aceita a row inteira do banco sem cast na fronteira.
 */
export interface ContractDraftRow {
  wizard_state?: unknown;
  dados?: unknown;
  template_id?: string | null;
  conteudo_final?: string | null;
  [key: string]: unknown;
}

/** Estado do wizard aplicável na retomada (subconjunto dos setters de NovoContrato). */
export interface WizardHydrationState {
  flowMode?: string | null;
  currentStepIndex?: number;
  selectedTemplateId?: string | null;
  dados?: Record<string, string>;
  selectedClauseIds?: string[];
  conteudoFinal?: string;
  nomeContrato?: string;
  compradorId?: string | null;
  vendedorId?: string | null;
  empresaId?: string | null;
  compradorNome?: string;
  vendedorNome?: string;
  checkedDocs?: string[];
  manualParticipants?: ManualParticipantData[];
  participants?: unknown[];
  aiReviewSubStep?: "extraction" | "review" | "data";
  conteudoFinalDirty?: boolean;
  dadosDirty?: string[];
  aiReviewDirty?: boolean;
}

export type HydrationSource = "wizard_state" | "legacy-snapshot" | "legacy-plano";

export interface HydrationResult {
  source: HydrationSource;
  state: WizardHydrationState;
  /** true só no legacy-plano: endereço granular/documentos podem precisar ser reinformados. */
  lossy: boolean;
}

/**
 * Marcadores que só existem no SNAPSHOT do wizard, NUNCA no `dados` plano
 * (cujas chaves são escalares prefixados: `vendedor_nome`, `comprador2_cpf`, …).
 * Propositalmente NÃO inclui `dados` (ambíguo) — usa chaves estruturais do wizard.
 */
const SNAPSHOT_MARKERS = [
  "flowMode",
  "currentStepIndex",
  "manualParticipants",
  "participants",
  "selectedClauseIds",
  "conteudoFinal",
] as const;

/** Heurística robusta: o objeto é um snapshot do wizard (vs. `dados` plano/vazio). */
export function isSnapshotShape(obj: unknown): obj is JsonRecord {
  if (!obj || typeof obj !== "object") return false;
  return SNAPSHOT_MARKERS.some((k) => k in (obj as JsonRecord));
}

// ===== Leitores tipados sobre a bag JSON (sem `any`) =====
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
const strList = (v: unknown): string[] | undefined =>
  Array.isArray(v) && v.every((x) => typeof x === "string") ? (v as string[]) : undefined;
const list = (v: unknown): unknown[] | undefined => (Array.isArray(v) ? v : undefined);
const flag = (v: unknown): boolean | undefined => (typeof v === "boolean" ? v : undefined);
const dadosBag = (v: unknown): Record<string, string> | undefined =>
  v && typeof v === "object" ? (v as Record<string, string>) : undefined;
const participantList = (v: unknown): ManualParticipantData[] | undefined =>
  Array.isArray(v) ? (v as ManualParticipantData[]) : undefined;
const aiSubStep = (v: unknown): WizardHydrationState["aiReviewSubStep"] =>
  v === "extraction" || v === "review" || v === "data" ? v : undefined;

/** Atribui `s[key] = value` só quando `value` é definido — mantém o shape enxuto. */
function put<K extends keyof WizardHydrationState>(
  s: WizardHydrationState,
  key: K,
  value: WizardHydrationState[K] | undefined
): void {
  if (value !== undefined) s[key] = value;
}

/** Mapeia um snapshot do wizard para o estado aplicável, só com chaves definidas. */
function fromSnapshot(snap: JsonRecord): WizardHydrationState {
  const s: WizardHydrationState = {};
  put(s, "flowMode", str(snap.flowMode));
  put(s, "currentStepIndex", typeof snap.currentStepIndex === "number" ? snap.currentStepIndex : undefined);
  put(s, "selectedTemplateId", str(snap.selectedTemplateId));
  put(s, "dados", dadosBag(snap.dados));
  put(s, "selectedClauseIds", strList(snap.selectedClauseIds));
  put(s, "conteudoFinal", str(snap.conteudoFinal));
  put(s, "nomeContrato", str(snap.nomeContrato));
  put(s, "compradorId", str(snap.compradorId));
  put(s, "vendedorId", str(snap.vendedorId));
  put(s, "empresaId", str(snap.empresaId));
  put(s, "compradorNome", str(snap.compradorNome));
  put(s, "vendedorNome", str(snap.vendedorNome));
  put(s, "checkedDocs", strList(snap.checkedDocs));
  put(s, "manualParticipants", participantList(snap.manualParticipants));
  put(s, "participants", list(snap.participants));
  put(s, "aiReviewSubStep", aiSubStep(snap.aiReviewSubStep));
  put(s, "conteudoFinalDirty", flag(snap.conteudoFinalDirty));
  put(s, "dadosDirty", strList(snap.dadosDirty));
  put(s, "aiReviewDirty", flag(snap.aiReviewDirty));
  return s;
}

/**
 * Decide como hidratar a partir de uma linha de `contracts` (read-only sobre a row).
 * Cobre os três shapes descritos no topo do arquivo.
 */
export function selectHydration(row: ContractDraftRow): HydrationResult {
  const ws = row?.wizard_state;
  if (ws && typeof ws === "object") {
    return { source: "wizard_state", state: fromSnapshot(ws as JsonRecord), lossy: false };
  }

  const dados: JsonRecord = (row?.dados ?? {}) as JsonRecord;
  if (isSnapshotShape(dados)) {
    // Snapshot legado gravado dentro de `dados` (ex.: 18db1b7d).
    return { source: "legacy-snapshot", state: fromSnapshot(dados), lossy: false };
  }

  // Plano legado (ex.: 96216482): reconstrói o que der do mapeamento indexado.
  const plano = dados as Record<string, string>;
  const state: WizardHydrationState = {
    dados: plano,
    manualParticipants: reconstructParticipantsFromPlano(plano),
  };
  put(state, "selectedTemplateId", str(row?.template_id ?? undefined));
  put(state, "conteudoFinal", str(row?.conteudo_final ?? undefined));
  return { source: "legacy-plano", state, lossy: true };
}

/**
 * Deriva o que cada writer de rascunho grava: `dados` plano no topo (leitores) +
 * o snapshot inteiro em `wizard_state`. Fonte única do invariante de escrita.
 */
export function buildContractDraftWrite(snapshot: JsonRecord): {
  dados: Record<string, string>;
  wizard_state: JsonRecord;
} {
  return { dados: dadosBag(snapshot?.dados) ?? {}, wizard_state: snapshot };
}

/**
 * Guard anti-clobber do autosave: só habilita DEPOIS da hidratação concluir, para
 * nunca sobrescrever uma linha válida (plano/snapshot) com estado vazio inicial.
 */
export function autosaveEnabled(p: {
  contratoId: string | null | undefined;
  status: string | undefined;
  hydrated: boolean;
}): boolean {
  return !!p.contratoId && p.status === "rascunho" && p.hydrated;
}
