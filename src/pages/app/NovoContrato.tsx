import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useWizardAutosave } from "@/hooks/useWizardAutosave";
import {
  FileText, ChevronRight, ChevronLeft, CheckCircle2, Search, User, Building2,
  ClipboardList, Database, BookOpen, Edit3, Check, Printer, Upload, X, File, Sparkles, Users, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useTemplates, ContractTemplate } from "@/hooks/useTemplates";
import { useContacts, Contact } from "@/hooks/useContacts";
import { useCompanies, Company } from "@/hooks/useCompanies";
import { useClauses, Clause } from "@/hooks/useClauses";
import { useContracts } from "@/hooks/useContracts";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { TEMPLATE_VARIABLES, getVariablesByCategory } from "@/lib/template-variables";
import { replacePlaceholders, getUnresolvedPlaceholders, preprocessTemplate } from "@/lib/placeholder";
import { enrichDados } from "@/lib/contract-enrichment";
import { composeEnderecoCanonico } from "@/lib/contract-formatters";
import { logAction } from "@/lib/audit";
import {
  shouldRebuildConteudo,
  shouldRunExtractAll,
  shouldResetDirtyOnTemplateChange,
  pickAutoFillFields,
  diffKeys,
} from "@/lib/wizard-dirty";
import RichTextEditor from "@/components/RichTextEditor";
import ContractPrintView from "@/components/ContractPrintView";
import { useToast } from "@/hooks/use-toast";
import ContractModeSelector from "@/components/contract/ContractModeSelector";
import ParticipantManager from "@/components/contract/ParticipantManager";
import type { Participant, ParticipantRole } from "@/components/contract/ParticipantCard";
import type { DocType, UploadedDoc } from "@/components/contract/DocumentUploader";
import MultipleParticipantsPanel from "@/components/contract/MultipleParticipantsPanel";
import FixedDataFields from "@/components/contract/FixedDataFields";
import ParcelasManager from "@/components/contract/ParcelasManager";
import UnresolvedPlaceholdersDialog, { parseUnresolvedStrings } from "@/components/contract/UnresolvedPlaceholdersDialog";
import WizardStepEditor from "@/components/contract/wizard/WizardStepEditor";
import WizardActions from "@/components/contract/wizard/WizardActions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import type { ManualParticipantData } from "@/components/contract/ManualParticipantCard";
import { emptyParticipant } from "@/components/contract/ManualParticipantCard";
import ExtractionProgress from "@/components/contract/ExtractionProgress";
import ExtractedDataReview from "@/components/contract/ExtractedDataReview";
import { useDocumentExtraction } from "@/hooks/useDocumentExtraction";
import SaveDraftModal from "@/components/contract/SaveDraftModal";

type UploadedFile = {
  name: string;
  path: string;
  size: number;
  mime_type: string;
};

type FlowMode = "ai" | "manual" | null;

// Simplified steps: 4 for each mode
const manualSteps = [
  { id: "selection", label: "Seleção", icon: FileText },
  { id: "parties-docs", label: "Partes & Docs", icon: User },
  { id: "data-clauses", label: "Dados & Cláusulas", icon: Database },
  { id: "editor-finish", label: "Editor & Finalizar", icon: Edit3 },
];

const aiSteps = [
  { id: "selection", label: "Seleção", icon: FileText },
  { id: "participants", label: "Participantes", icon: Users },
  { id: "review-data", label: "Revisão & Dados", icon: Sparkles },
  { id: "editor-finish", label: "Editor & Finalizar", icon: Edit3 },
];

// Before mode is selected, show just step 1
const initialSteps = [
  { id: "selection", label: "Seleção", icon: FileText },
];

const documentChecklist = [
  "RG e CPF do Comprador",
  "RG e CPF do Vendedor",
  "Certidão de Matrícula Atualizada",
  "Certidão Negativa de Débitos (IPTU)",
  "Certidão de Ônus Reais",
  "Comprovante de Estado Civil",
  "Comprovante de Residência",
  "Certidão Negativa de Protestos",
];

const STORAGE_KEY_PREFIX = "novo-contrato-draft:v2";
const OLD_STORAGE_KEY = "novo-contrato-draft";

// Mapeia o id do step interno do wizard para o valor aceito pelo CHECK do banco.
function mapStepIdToCurrentStep(stepId: string | undefined): string {
  if (!stepId) return "template";
  if (stepId === "selection") return "template";
  return stepId;
}

function getDraftKey(tenantId?: string, userId?: string) {
  if (tenantId && userId) return `${STORAGE_KEY_PREFIX}:${tenantId}:${userId}`;
  return STORAGE_KEY_PREFIX;
}

function loadDraft(tenantId?: string, userId?: string) {
  try {
    const key = getDraftKey(tenantId, userId);
    // Try localStorage first
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);

    // Migrate from old sessionStorage key
    const oldRaw = sessionStorage.getItem(OLD_STORAGE_KEY);
    if (oldRaw) {
      const parsed = JSON.parse(oldRaw);
      localStorage.setItem(key, oldRaw);
      sessionStorage.removeItem(OLD_STORAGE_KEY);
      return parsed;
    }

    return null;
  } catch (e) {
    console.warn("[NovoContrato] Erro ao carregar rascunho:", e);
    return null;
  }
}

function saveDraft(data: Record<string, any>, tenantId?: string, userId?: string) {
  try {
    const key = getDraftKey(tenantId, userId);
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn("[NovoContrato] Erro ao salvar rascunho:", e);
    return false;
  }
  return true;
}

function clearDraft(tenantId?: string, userId?: string) {
  localStorage.removeItem(getDraftKey(tenantId, userId));
  // Also clean up old key if present
  sessionStorage.removeItem(OLD_STORAGE_KEY);
}

const NovoContrato = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { templates, isLoading: loadingTemplates, createTemplate, isCreating: isCreatingTemplate } = useTemplates();
  const { contacts, isLoading: loadingContacts } = useContacts();
  const { companies, isLoading: loadingCompanies } = useCompanies();
  const { clauses, isLoading: loadingClauses } = useClauses();
  const { createContract, isCreating } = useContracts();
  const { profile, user } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);

  // Load draft on mount (scoped to tenant+user)
  const draft = useRef(loadDraft(profile?.tenant_id, user?.id));

  // Flow state
  const [flowMode, setFlowMode] = useState<FlowMode>(draft.current?.flowMode ?? null);
  const [currentStepIndex, setCurrentStepIndex] = useState(draft.current?.currentStepIndex ?? 0);

  // Common state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(draft.current?.selectedTemplateId ?? null);
  const [dados, setDados] = useState<Record<string, string>>(draft.current?.dados ?? {});
  const [selectedClauseIds, setSelectedClauseIds] = useState<string[]>(draft.current?.selectedClauseIds ?? []);
  const [conteudoFinal, setConteudoFinal] = useState(draft.current?.conteudoFinal ?? "");
  const [nomeContrato, setNomeContrato] = useState(draft.current?.nomeContrato ?? "");

  // Inline template creation dialog
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateType, setNewTemplateType] = useState("Compra e Venda");
  const [newTemplateDesc, setNewTemplateDesc] = useState("");

  // Manual flow state
  const [compradorId, setCompradorId] = useState<string | null>(draft.current?.compradorId ?? null);
  const [vendedorId, setVendedorId] = useState<string | null>(draft.current?.vendedorId ?? null);
  const [empresaId, setEmpresaId] = useState<string | null>(draft.current?.empresaId ?? null);
  const [compradorNome, setCompradorNome] = useState(draft.current?.compradorNome ?? "");
  const [vendedorNome, setVendedorNome] = useState(draft.current?.vendedorNome ?? "");
  const [searchContacts, setSearchContacts] = useState("");
  const [searchCompanies, setSearchCompanies] = useState("");
  const [checkedDocs, setCheckedDocs] = useState<string[]>(draft.current?.checkedDocs ?? []);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(draft.current?.uploadedFiles ?? []);
  const [isUploading, setIsUploading] = useState(false);
  const [manualParticipants, setManualParticipants] = useState<ManualParticipantData[]>(draft.current?.manualParticipants ?? []);

  // AI flow state
  const [participants, setParticipants] = useState<Participant[]>(draft.current?.participants ?? []);
  const [uploadingParticipantIndex, setUploadingParticipantIndex] = useState<number | null>(null);
  const {
    uploadDocument,
    extractAll,
    isProcessing,
    progress,
    currentMessage,
    extractedData,
    updateField,
    mapToDados,
  } = useDocumentExtraction(draft.current?.extractedData ?? undefined);

  // AI sub-step inside "review-data": extraction → review → data
  const [aiReviewSubStep, setAiReviewSubStep] = useState<"extraction" | "review" | "data">(draft.current?.aiReviewSubStep ?? "extraction");

  // ===== Dirty flags (Épico 5) — protegem edições manuais contra rebuilds em handleNext =====
  // Foundation: estado declarado e persistido; guards ligados nos Commits 2-4.
  const [conteudoFinalDirty, setConteudoFinalDirty] = useState<boolean>(draft.current?.conteudoFinalDirty ?? false);
  const [dadosDirty, setDadosDirty] = useState<Set<string>>(
    () => new Set<string>(Array.isArray(draft.current?.dadosDirty) ? draft.current.dadosDirty : [])
  );
  const [aiReviewDirty, setAiReviewDirty] = useState<boolean>(draft.current?.aiReviewDirty ?? false);

  // Unresolved placeholders dialog — hard block apenas em Exportar PDF (Leva 3: soft removido)
  const [unresolvedDialogOpen, setUnresolvedDialogOpen] = useState(false);

  // ===== Autosave + Retomada por :id =====
  const { id: contratoIdParam } = useParams<{ id?: string }>();
  const [loadedContract, setLoadedContract] = useState<any>(null);

  const autosavePayload = useMemo(
    () => ({
      flowMode,
      currentStepIndex,
      selectedTemplateId,
      dados,
      selectedClauseIds,
      conteudoFinal,
      nomeContrato,
      compradorId,
      vendedorId,
      empresaId,
      compradorNome,
      vendedorNome,
      checkedDocs,
      manualParticipants,
      participants,
      aiReviewSubStep,
      conteudoFinalDirty,
      dadosDirty: Array.from(dadosDirty),
      aiReviewDirty,
    }),
    [
      flowMode, currentStepIndex, selectedTemplateId, dados, selectedClauseIds,
      conteudoFinal, nomeContrato, compradorId, vendedorId, empresaId,
      compradorNome, vendedorNome, checkedDocs, manualParticipants, participants,
      aiReviewSubStep,
      conteudoFinalDirty, dadosDirty, aiReviewDirty,
    ]
  );

  const stepsForAutosave = flowMode === "ai" ? aiSteps : flowMode === "manual" ? manualSteps : initialSteps;
  const { saveNow } = useWizardAutosave({
    contratoId: contratoIdParam ?? null,
    dados: autosavePayload,
    currentStep: mapStepIdToCurrentStep(stepsForAutosave[currentStepIndex]?.id),
    enabled: !!contratoIdParam && loadedContract?.status === "rascunho",
  });

  useEffect(() => {
    if (!contratoIdParam) return;
    (async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("id", contratoIdParam)
        .eq("status", "rascunho")
        .maybeSingle();

      if (error || !data) {
        toast({ title: "Rascunho não encontrado", variant: "destructive" });
        navigate("/app/contratos");
        return;
      }

      setLoadedContract(data);
      const snap = (data.dados ?? {}) as Record<string, any>;
      if (snap.flowMode) setFlowMode(snap.flowMode);
      if (typeof snap.currentStepIndex === "number") setCurrentStepIndex(snap.currentStepIndex);
      if (snap.selectedTemplateId) setSelectedTemplateId(snap.selectedTemplateId);
      if (snap.dados) setDados(snap.dados);
      if (snap.selectedClauseIds) setSelectedClauseIds(snap.selectedClauseIds);
      if (snap.conteudoFinal) setConteudoFinal(snap.conteudoFinal);
      if (snap.nomeContrato) setNomeContrato(snap.nomeContrato);
      if (snap.compradorId) setCompradorId(snap.compradorId);
      if (snap.vendedorId) setVendedorId(snap.vendedorId);
      if (snap.empresaId) setEmpresaId(snap.empresaId);
      if (snap.compradorNome) setCompradorNome(snap.compradorNome);
      if (snap.vendedorNome) setVendedorNome(snap.vendedorNome);
      if (snap.checkedDocs) setCheckedDocs(snap.checkedDocs);
      if (snap.manualParticipants) setManualParticipants(snap.manualParticipants);
      if (snap.participants) setParticipants(snap.participants);
      if (snap.aiReviewSubStep) setAiReviewSubStep(snap.aiReviewSubStep);
      if (typeof snap.conteudoFinalDirty === "boolean") setConteudoFinalDirty(snap.conteudoFinalDirty);
      if (Array.isArray(snap.dadosDirty)) setDadosDirty(new Set(snap.dadosDirty));
      if (typeof snap.aiReviewDirty === "boolean") setAiReviewDirty(snap.aiReviewDirty);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contratoIdParam]);

  // Build draft payload
  const buildDraftPayload = useCallback(() => ({
    flowMode,
    currentStepIndex,
    selectedTemplateId,
    dados,
    selectedClauseIds,
    conteudoFinal,
    nomeContrato,
    compradorId,
    compradorNome,
    vendedorNome,
    vendedorId,
    empresaId,
    checkedDocs,
    uploadedFiles,
    participants: participants.map(p => ({
      ...p,
      documents: p.documents.map(d => ({ ...d, file: null })),
    })),
    aiReviewSubStep,
    extractedData,
    manualParticipants,
    conteudoFinalDirty,
    dadosDirty: Array.from(dadosDirty),
    aiReviewDirty,
  }), [
    flowMode, currentStepIndex, selectedTemplateId, dados, selectedClauseIds,
    conteudoFinal, nomeContrato, compradorId, vendedorId, empresaId,
    compradorNome, vendedorNome,
    checkedDocs, uploadedFiles, participants, aiReviewSubStep, extractedData,
    manualParticipants,
    conteudoFinalDirty, dadosDirty, aiReviewDirty,
  ]);

  // Persist state to localStorage with debounce
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftPayloadRef = useRef(buildDraftPayload());

  useEffect(() => {
    draftPayloadRef.current = buildDraftPayload();

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      const ok = saveDraft(draftPayloadRef.current, profile?.tenant_id, user?.id);
      if (!ok) {
        toast({ title: "Aviso", description: "Não foi possível salvar rascunho localmente.", variant: "destructive" });
      }
    }, 400);

    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [buildDraftPayload, profile?.tenant_id, user?.id]);

  // Flush draft on tab hide / page unload
  useEffect(() => {
    const flush = () => {
      try {
        saveDraft(draftPayloadRef.current, profile?.tenant_id, user?.id);
      } catch { /* best-effort */ }
    };
    const onVisChange = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", onVisChange);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisChange);
      window.removeEventListener("pagehide", flush);
    };
  }, [profile?.tenant_id, user?.id]);

  // ===== Salvar como Rascunho ao sair =====
  // Cálculo defensivo de isDirty (try/catch para não quebrar render)
  const isDirty = useMemo(() => {
    try {
      return (
        flowMode !== null ||
        !!selectedTemplateId ||
        (dados && Object.keys(dados).length > 0) ||
        (Array.isArray(selectedClauseIds) && selectedClauseIds.length > 0) ||
        (typeof conteudoFinal === "string" && conteudoFinal.trim().length > 0) ||
        (typeof nomeContrato === "string" && nomeContrato.trim().length > 0) ||
        (Array.isArray(manualParticipants) && manualParticipants.length > 0) ||
        (Array.isArray(participants) && participants.length > 0) ||
        (Array.isArray(uploadedFiles) && uploadedFiles.length > 0)
      );
    } catch (err) {
      console.warn("[NovoContrato] Erro ao calcular isDirty:", err);
      return false;
    }
  }, [
    flowMode, selectedTemplateId, dados, selectedClauseIds, conteudoFinal,
    nomeContrato, manualParticipants, participants, uploadedFiles,
  ]);

  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const allowExitRef = useRef(false);
  const pendingNavRef = useRef<string | number | null>(null);

  // Aviso nativo ao fechar/recarregar a aba
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && !allowExitRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  // Intercepta cliques em links internos (sidebar/menu) quando o form está sujo.
  // Substitui useBlocker (não suportado em <BrowserRouter> legacy).
  useEffect(() => {
    if (!isDirty) return;
    const onClickCapture = (e: MouseEvent) => {
      if (allowExitRef.current) return;
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#") || anchor.target === "_blank") return;
      // Mesmo destino, ignora
      if (href === window.location.pathname) return;
      e.preventDefault();
      e.stopPropagation();
      pendingNavRef.current = href;
      setDraftModalOpen(true);
    };
    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, [isDirty]);

  const proceedPendingNav = useCallback(() => {
    const dest = pendingNavRef.current;
    pendingNavRef.current = null;
    if (typeof dest === "string") navigate(dest);
    else if (typeof dest === "number") navigate(dest);
  }, [navigate]);

  const handleDiscardDraft = useCallback(() => {
    setDraftModalOpen(false);
    allowExitRef.current = true;
    clearDraft(profile?.tenant_id, user?.id);
    if (pendingNavRef.current !== null) {
      proceedPendingNav();
    } else {
      navigate(-1);
    }
  }, [profile?.tenant_id, user?.id, navigate, proceedPendingNav]);

  const handleSaveDraftFromModal = useCallback(async (contractName: string) => {
    if (!profile?.tenant_id) {
      toast({ title: "Erro", description: "Tenant não identificado.", variant: "destructive" });
      return;
    }
    setIsSavingDraft(true);
    try {
      await createContract({
        nome: contractName,
        status: "rascunho",
        current_step: mapStepIdToCurrentStep(steps[currentStepIndex]?.id),
        template_id: selectedTemplateId ?? null,
        dados,
        clausulas_ids: selectedClauseIds,
        conteudo_final: conteudoFinal || "",
        comprador_id: compradorId ?? null,
        vendedor_id: vendedorId ?? null,
        empresa_id: empresaId ?? null,
      } as any);

      // Limpa o autosave local ANTES de navegar
      clearDraft(profile.tenant_id, user?.id);
      setNomeContrato(contractName);
      setDraftModalOpen(false);
      allowExitRef.current = true;

      if (pendingNavRef.current !== null) {
        proceedPendingNav();
      } else {
        navigate("/app/contratos");
      }
    } catch (e: any) {
      console.error("[NovoContrato] Erro ao salvar rascunho:", e);
      toast({
        title: "Erro ao salvar rascunho",
        description: e?.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsSavingDraft(false);
    }
  }, [
    profile?.tenant_id, user?.id, createContract, selectedTemplateId, dados,
    selectedClauseIds, conteudoFinal, compradorId, vendedorId, empresaId,
    proceedPendingNav, navigate, toast,
  ]);

  const steps = flowMode === "ai" ? aiSteps : flowMode === "manual" ? manualSteps : initialSteps;
  const currentStep = steps[currentStepIndex];

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const comprador = contacts.find((c) => c.id === compradorId);
  const vendedor = contacts.find((c) => c.id === vendedorId);
  const empresa = companies.find((c) => c.id === empresaId);
  const selectedClauses = clauses.filter((c) => selectedClauseIds.includes(c.id));
  const activeTemplates = templates.filter((t) => t.status !== "arquivado");

  const filteredContacts = contacts.filter((c) =>
    c.nome.toLowerCase().includes(searchContacts.toLowerCase())
  );
  const filteredCompanies = companies.filter((c) =>
    c.nome_fantasia.toLowerCase().includes(searchCompanies.toLowerCase())
  );

  // Auto-fill dados from manualParticipants and company (manual mode).
  // Pattern: coleta candidatos → filtra dirty → merge sobre prev.
  // Bug B (Épico 5): chaves marcadas como editadas pelo usuário em dadosDirty
  // são puladas pelo pickAutoFillFields, preservando o trabalho manual.
  const autoFillDados = useCallback(() => {
    const candidates: Record<string, string> = {};
    const add = (key: string, value: string | undefined | null) => {
      if (value && String(value).trim()) candidates[key] = String(value);
    };

    for (const mp of manualParticipants) {
      const prefix = mp.role + "_";
      add(prefix + "nome", mp.nome);
      add(prefix + "cpf", mp.cpf);
      add(prefix + "rg", mp.rg);
      add(prefix + "orgao_expedidor", mp.orgao_expedidor);
      add(prefix + "profissao", mp.profissao);
      add(prefix + "nacionalidade", mp.nacionalidade);
      add(prefix + "estado_civil", mp.estado_civil);
      add(prefix + "email", mp.email);
      add(prefix + "whatsapp", mp.whatsapp);
      const endParts = [mp.rua, mp.numero, mp.complemento, mp.bairro, mp.cidade, mp.estado, mp.cep].filter(Boolean).join(", ");
      add(prefix + "endereco", endParts);
    }

    // Legacy: also fill from selected contacts (backward compat)
    if (comprador) {
      add("comprador_nome", comprador.nome);
      add("comprador_cpf", comprador.cpf);
      add("comprador_rg", comprador.rg);
      add("comprador_orgao_expedidor", comprador.orgao_expedidor);
      add("comprador_profissao", comprador.profissao);
      add("comprador_nacionalidade", comprador.nacionalidade);
      add("comprador_estado_civil", comprador.estado_civil);
      add("comprador_email", comprador.email);
      add("comprador_whatsapp", comprador.whatsapp);
      const endComprador = [comprador.rua, comprador.numero, comprador.complemento, comprador.bairro, comprador.cidade, comprador.estado, comprador.cep].filter(Boolean).join(", ");
      add("comprador_endereco", endComprador);
    }
    if (vendedor) {
      add("vendedor_nome", vendedor.nome);
      add("vendedor_cpf", vendedor.cpf);
      add("vendedor_rg", vendedor.rg);
      add("vendedor_orgao_expedidor", vendedor.orgao_expedidor);
      add("vendedor_profissao", vendedor.profissao);
      add("vendedor_nacionalidade", vendedor.nacionalidade);
      add("vendedor_estado_civil", vendedor.estado_civil);
      add("vendedor_email", vendedor.email);
      add("vendedor_whatsapp", vendedor.whatsapp);
      const endVendedor = [vendedor.rua, vendedor.numero, vendedor.complemento, vendedor.bairro, vendedor.cidade, vendedor.estado, vendedor.cep].filter(Boolean).join(", ");
      add("vendedor_endereco", endVendedor);
    }
    if (empresa) {
      add("empresa_nome", empresa.nome_fantasia);
      add("empresa_cnpj", empresa.cnpj);
      const endEmpresa = [empresa.rua, empresa.numero, empresa.complemento, empresa.bairro, empresa.cidade, empresa.estado, empresa.cep].filter(Boolean).join(", ");
      add("empresa_endereco", endEmpresa);
    }

    setDados((prev) => ({ ...prev, ...pickAutoFillFields(candidates, dadosDirty) }));
  }, [comprador, vendedor, empresa, manualParticipants, dadosDirty]);

  // Build final content
  // Aplica enrichDados antes de preprocessTemplate/replacePlaceholders para que
  // empresa_* (banco/pix/cnpj/endereço canônico), data_contrato_extenso,
  // valor_*_extenso, aliases e formatadores universais (CPF/CNPJ/CEP)
  // sejam resolvidos uniformemente — princípio "preview = save".
  const buildFinalContent = useCallback(() => {
    const raw = selectedTemplate?.conteudo || "";
    const enrichedDados = enrichDados(dados, { company: empresa ?? null });
    const processed = preprocessTemplate(raw, enrichedDados);
    setConteudoFinal(replacePlaceholders(processed, enrichedDados));
  }, [selectedTemplate, dados, empresa]);

  // === Wrappers para dirty flags do Épico 5 (Bug A — TipTap) ===
  // Marca conteudoFinal como editado manualmente pelo usuário (TipTap).
  const handleConteudoChange = useCallback((html: string) => {
    setConteudoFinal(html);
    setConteudoFinalDirty(true);
  }, []);

  // Quando o usuário troca de template, a "base" mudou — reset de dirty.
  const handleTemplateChange = useCallback((nextId: string | null) => {
    if (shouldResetDirtyOnTemplateChange(selectedTemplateId, nextId)) {
      setConteudoFinalDirty(false);
    }
    setSelectedTemplateId(nextId);
  }, [selectedTemplateId]);

  // === Wrapper para dirty flag do Épico 5 (Bug B — dados editados) ===
  // Aceita o mesmo signature de setDados (valor direto ou updater function).
  // Calcula diff entre prev e next e marca as chaves alteradas como dirty.
  const handleDadoChange = useCallback(
    (next: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => {
      setDados((prev) => {
        const nextValue = typeof next === "function" ? next(prev) : next;
        const changed = diffKeys(prev, nextValue);
        if (changed.length > 0) {
          setDadosDirty((dirtyPrev) => {
            const dirtyNext = new Set(dirtyPrev);
            for (const k of changed) dirtyNext.add(k);
            return dirtyNext;
          });
        }
        return nextValue;
      });
    },
    []
  );

  // === Wrapper para dirty flag do Épico 5 (Bug C — revisão IA editada) ===
  // Marca aiReviewDirty quando o usuário corrige um campo extraído, para que
  // handleNext não re-dispare extractAll e descarte a revisão manual.
  const handleAiReviewChange = useCallback(
    (participantId: string, fieldKey: string, value: string) => {
      setAiReviewDirty(true);
      updateField(participantId, fieldKey, value);
    },
    [updateField]
  );

  // AI flow: add participant
  const handleAddParticipant = (role: ParticipantRole) => {
    setParticipants((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role, full_name: "", documents: [] },
    ]);
  };

  const handleRemoveParticipant = (index: number) => {
    setParticipants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateParticipantName = (index: number, name: string) => {
    setParticipants((prev) => prev.map((p, i) => (i === index ? { ...p, full_name: name } : p)));
  };

  const handleUploadDocs = async (participantIndex: number, files: File[], docType: DocType) => {
    setUploadingParticipantIndex(participantIndex);
    const participant = participants[participantIndex];

    for (const file of files) {
      const uploaded = await uploadDocument(participant.id, file, docType);
      if (uploaded) {
        setParticipants((prev) =>
          prev.map((p, i) =>
            i === participantIndex ? { ...p, documents: [...p.documents, uploaded] } : p
          )
        );
      }
    }
    setUploadingParticipantIndex(null);
  };

  const handleRemoveDoc = (participantIndex: number, docIndex: number) => {
    setParticipants((prev) =>
      prev.map((p, i) =>
        i === participantIndex
          ? { ...p, documents: p.documents.filter((_, di) => di !== docIndex) }
          : p
      )
    );
  };

  const handleChangeDocType = (participantIndex: number, docIndex: number, type: DocType) => {
    setParticipants((prev) =>
      prev.map((p, i) =>
        i === participantIndex
          ? {
              ...p,
              documents: p.documents.map((d, di) =>
                di === docIndex ? { ...d, document_type: type } : d
              ),
            }
          : p
      )
    );
  };

  // Handle mode selection (step 1 → step 2)
  const handleModeSelect = (mode: "ai" | "manual") => {
    setFlowMode(mode);
    setCurrentStepIndex(1); // Move to step 2 (index 1) of the mode-specific steps
  };

  const handleNext = async () => {
    if (contratoIdParam) await saveNow();
    // NÃO validar placeholders aqui — só em handlePrintClick (hard block PDF).
    // Navegação entre etapas do wizard deve ser sempre livre.
    const stepId = currentStep?.id;

    // Manual: auto-fill when leaving parties-docs
    if (flowMode === "manual" && stepId === "parties-docs") {
      autoFillDados();
    }

    // Before editor, build final content (apenas se conteúdo ainda não foi editado).
    if (stepId === "data-clauses" || (flowMode === "ai" && stepId === "review-data")) {
      if (shouldRebuildConteudo(conteudoFinalDirty)) {
        buildFinalContent();
      }
    }

    // AI: trigger extraction when moving from participants
    if (flowMode === "ai" && stepId === "participants") {
      // Bug C: só reextrai se o usuário ainda não revisou/editou os dados da IA.
      if (shouldRunExtractAll(aiReviewDirty)) {
        extractAll(participants);
      }
      setAiReviewSubStep("extraction");
    }

    // AI: handle sub-steps within review-data
    if (flowMode === "ai" && stepId === "review-data") {
      if (aiReviewSubStep === "extraction" && !isProcessing) {
        setAiReviewSubStep("review");
        return;
      }
      if (aiReviewSubStep === "review") {
        // collect: dados mapeados da extração da IA
        const aiDados = mapToDados();
        // filter: remove chaves que o usuário editou manualmente (dadosDirty)
        const aiDadosSafe = pickAutoFillFields(aiDados, dadosDirty);
        // merge: aplica só o que não pisa em edição manual
        if (Object.keys(aiDadosSafe).length > 0) {
          setDados((prev) => ({ ...prev, ...aiDadosSafe }));
        }
        setAiReviewSubStep("data");
        return;
      }
      // If data sub-step, proceed to next wizard step
    }

    setCurrentStepIndex((s) => Math.min(s + 1, steps.length - 1));
  };

  const handleBack = async () => {
    if (contratoIdParam) await saveNow();
    const stepId = currentStep?.id;

    // AI: handle sub-steps going back
    if (flowMode === "ai" && stepId === "review-data") {
      if (aiReviewSubStep === "data") {
        setAiReviewSubStep("review");
        return;
      }
      if (aiReviewSubStep === "review") {
        setAiReviewSubStep("extraction");
        return;
      }
    }

    if (currentStepIndex === 1 && flowMode) {
      // Going back to selection step
      setFlowMode(null);
      setCurrentStepIndex(0);
      return;
    }
    setCurrentStepIndex((s) => Math.max(s - 1, 0));
  };

  // Manual file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !profile?.tenant_id) return;
    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const safeName = file.name
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9._-]/g, "_");
        const filePath = `${profile.tenant_id}/${Date.now()}-${safeName}`;
        const { error } = await supabase.storage.from("contract-documents").upload(filePath, file);
        if (error) {
          toast({ title: "Erro ao enviar arquivo", description: error.message, variant: "destructive" });
          continue;
        }
        setUploadedFiles((prev) => [...prev, { name: file.name, path: filePath, size: file.size, mime_type: file.type }]);
      }
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveFile = async (filePath: string) => {
    await supabase.storage.from("contract-documents").remove([filePath]);
    setUploadedFiles((prev) => prev.filter((f) => f.path !== filePath));
  };

  const canProceed = () => {
    const stepId = currentStep?.id;
    switch (stepId) {
      case "selection": return !!selectedTemplateId && !!flowMode;
      case "parties-docs": {
        const hasComprador = manualParticipants.some((p) => p.role === "comprador" && p.nome.trim());
        const hasVendedor = manualParticipants.some((p) => p.role === "vendedor" && p.nome.trim());
        return hasComprador && hasVendedor;
      }
      case "participants": {
        const hasComprador = participants.some((p) => p.role === "comprador" && p.full_name.trim());
        const hasVendedor = participants.some((p) => p.role === "vendedor" && p.full_name.trim());
        const hasDocs = participants.some((p) => p.documents.length > 0);
        return hasComprador && hasVendedor && hasDocs;
      }
      case "review-data": {
        if (aiReviewSubStep === "extraction") return !isProcessing;
        return true;
      }
      default: return true;
    }
  };

  const getBlockReason = (): string | null => {
    const stepId = currentStep?.id;
    switch (stepId) {
      case "selection":
        if (!selectedTemplateId) return "Selecione um modelo de contrato.";
        if (!flowMode) return "Escolha como deseja preencher (manual ou IA).";
        return null;
      case "parties-docs": {
        const hasComprador = manualParticipants.some((p) => p.role === "comprador" && p.nome.trim());
        const hasVendedor = manualParticipants.some((p) => p.role === "vendedor" && p.nome.trim());
        const faltam: string[] = [];
        if (!hasComprador) faltam.push("nome do comprador");
        if (!hasVendedor) faltam.push("nome do vendedor");
        return faltam.length ? `Preencha o ${faltam.join(" e o ")} para continuar.` : null;
      }
      case "participants": {
        const hasComprador = participants.some((p) => p.role === "comprador" && p.full_name.trim());
        const hasVendedor = participants.some((p) => p.role === "vendedor" && p.full_name.trim());
        const hasDocs = participants.some((p) => p.documents.length > 0);
        const faltam: string[] = [];
        if (!hasComprador) faltam.push("um comprador");
        if (!hasVendedor) faltam.push("um vendedor");
        if (!hasDocs) faltam.push("ao menos um documento");
        return faltam.length ? `Adicione ${faltam.join(", ")}.` : null;
      }
      case "review-data":
        if (aiReviewSubStep === "extraction" && isProcessing) return "Aguarde a extração concluir.";
        return null;
      default:
        return null;
    }
  };

  const handleSave = async () => {
    try {
      // === STEP 1: Build complete dados by re-running autoFill logic inline ===
      const freshDados: Record<string, string> = { ...dados };

      // Fill from manualParticipants (manual flow)
      if (flowMode === "manual") {
        for (const mp of manualParticipants) {
          const prefix = mp.role + "_";
          if (mp.nome) freshDados[prefix + "nome"] = mp.nome;
          if (mp.cpf) freshDados[prefix + "cpf"] = mp.cpf;
          if (mp.rg) freshDados[prefix + "rg"] = mp.rg;
          if (mp.orgao_expedidor) freshDados[prefix + "orgao_expedidor"] = mp.orgao_expedidor;
          if (mp.profissao) freshDados[prefix + "profissao"] = mp.profissao;
          if (mp.nacionalidade) freshDados[prefix + "nacionalidade"] = mp.nacionalidade;
          if (mp.estado_civil) freshDados[prefix + "estado_civil"] = mp.estado_civil;
          if (mp.email) freshDados[prefix + "email"] = mp.email;
          if (mp.whatsapp) freshDados[prefix + "whatsapp"] = mp.whatsapp;
          const endParts = composeEnderecoCanonico({
            rua: mp.rua, numero: mp.numero, complemento: mp.complemento,
            bairro: mp.bairro, cidade: mp.cidade, estado: mp.estado, cep: mp.cep,
          });
          if (endParts) freshDados[prefix + "endereco"] = endParts;
        }
      }

      // Fill from selected contacts (legacy/backward compat)
      if (comprador) {
        if (comprador.nome) freshDados.comprador_nome = comprador.nome;
        if (comprador.cpf) freshDados.comprador_cpf = comprador.cpf;
        if (comprador.rg) freshDados.comprador_rg = comprador.rg;
        if (comprador.orgao_expedidor) freshDados.comprador_orgao_expedidor = comprador.orgao_expedidor;
        if (comprador.profissao) freshDados.comprador_profissao = comprador.profissao;
        if (comprador.nacionalidade) freshDados.comprador_nacionalidade = comprador.nacionalidade;
        if (comprador.estado_civil) freshDados.comprador_estado_civil = comprador.estado_civil;
        if (comprador.email) freshDados.comprador_email = comprador.email;
        if (comprador.whatsapp) freshDados.comprador_whatsapp = comprador.whatsapp;
        const endC = composeEnderecoCanonico({
          rua: comprador.rua, numero: comprador.numero, complemento: comprador.complemento,
          bairro: comprador.bairro, cidade: comprador.cidade, estado: comprador.estado, cep: comprador.cep,
        });
        if (endC) freshDados.comprador_endereco = endC;
      }
      if (vendedor) {
        if (vendedor.nome) freshDados.vendedor_nome = vendedor.nome;
        if (vendedor.cpf) freshDados.vendedor_cpf = vendedor.cpf;
        if (vendedor.rg) freshDados.vendedor_rg = vendedor.rg;
        if (vendedor.orgao_expedidor) freshDados.vendedor_orgao_expedidor = vendedor.orgao_expedidor;
        if (vendedor.profissao) freshDados.vendedor_profissao = vendedor.profissao;
        if (vendedor.nacionalidade) freshDados.vendedor_nacionalidade = vendedor.nacionalidade;
        if (vendedor.estado_civil) freshDados.vendedor_estado_civil = vendedor.estado_civil;
        if (vendedor.email) freshDados.vendedor_email = vendedor.email;
        if (vendedor.whatsapp) freshDados.vendedor_whatsapp = vendedor.whatsapp;
        const endV = composeEnderecoCanonico({
          rua: vendedor.rua, numero: vendedor.numero, complemento: vendedor.complemento,
          bairro: vendedor.bairro, cidade: vendedor.cidade, estado: vendedor.estado, cep: vendedor.cep,
        });
        if (endV) freshDados.vendedor_endereco = endV;
      }
      if (empresa) {
        if (empresa.nome_fantasia) freshDados.empresa_nome = empresa.nome_fantasia;
        if (empresa.cnpj) freshDados.empresa_cnpj = empresa.cnpj;
        // Necessário canonicalizar AQUI mesmo (mesmo com enrichDados rodando depois):
        // injectCompany usa setIfEmpty, então se l.836 deixasse a versão crua, o
        // composeEnderecoCanonico interno do injectCompany seria silenciosamente
        // bypassed para o endereço da empresa.
        const endE = composeEnderecoCanonico({
          rua: empresa.rua, numero: empresa.numero, complemento: empresa.complemento,
          bairro: empresa.bairro, cidade: empresa.cidade, estado: empresa.estado, cep: empresa.cep,
        });
        if (endE) freshDados.empresa_endereco = endE;
      }

      // === STEP 2: Merge with AI extracted data ===
      const latestAiDados = mapToDados();
      const mergedDados = { ...latestAiDados, ...freshDados };

      // Add fallback names from participants (AI flow)
      if (flowMode === "ai" && participants.length > 0) {
        for (const p of participants) {
          const nameKey = `${p.role}_nome`;
          if (!mergedDados[nameKey] && p.full_name) {
            mergedDados[nameKey] = p.full_name;
          }
          const pData = extractedData.find((ed) => ed.participantId === p.id);
          if (pData?.full_name && !mergedDados[nameKey]) {
            mergedDados[nameKey] = pData.full_name;
          }
        }
      }
      // Add fallback names for manual flow
      if (flowMode === "manual") {
        const firstComprador = manualParticipants.find((p) => p.role === "comprador");
        const firstVendedor = manualParticipants.find((p) => p.role === "vendedor");
        if (!mergedDados.comprador_nome && firstComprador) mergedDados.comprador_nome = firstComprador.nome;
        if (!mergedDados.vendedor_nome && firstVendedor) mergedDados.vendedor_nome = firstVendedor.nome;
      }

      // Warn if dados is essentially empty
      const filledKeys = Object.entries(mergedDados).filter(([_, v]) => v && String(v).trim());
      if (filledKeys.length < 2) {
        toast({ title: "Atenção", description: "O contrato será salvo com poucos dados preenchidos.", variant: "default" });
      }

      // (replaceVars removido — agora usa replacePlaceholders de @/lib/placeholder)

      // Build HTML summary fallback from dados when no template content exists
      const buildSummaryHtml = (d: Record<string, string>): string => {
        const sections: { title: string; prefix: string }[] = [
          { title: "COMPRADOR", prefix: "comprador_" },
          { title: "VENDEDOR", prefix: "vendedor_" },
          { title: "IMÓVEL", prefix: "imovel_" },
          { title: "VALORES", prefix: "valor_" },
          { title: "EMPRESA", prefix: "empresa_" },
        ];
        let html = "<h2>RESUMO DO CONTRATO</h2>\n";
        for (const sec of sections) {
          const fields = Object.entries(d).filter(([k, v]) => k.startsWith(sec.prefix) && v && String(v).trim());
          if (fields.length === 0) continue;
          html += `<h3>${sec.title}</h3>\n<ul>\n`;
          for (const [key, value] of fields) {
            const label = key.replace(sec.prefix, "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
            html += `<li><strong>${label}:</strong> ${value}</li>\n`;
          }
          html += "</ul>\n";
        }
        return html;
      };

      // Always recalculate conteudo_final with latest data
      // Aplica enrichDados antes de substituir: garante data_contrato_extenso,
      // valor_*_extenso, injeção de empresa_* (banco/pix/cnpj/endereço canônico),
      // aliases e formatadores universais (CPF/CNPJ/CEP) — pipeline canônico.
      // mergedDados (cru) continua sendo o que vai para contracts.dados; apenas
      // a renderização do conteudo_final usa a versão enriquecida.
      const enrichedMergedDados = enrichDados(mergedDados, { company: empresa ?? null });

      let fullContent = "";
      const templateBase = selectedTemplate?.conteudo || "";
      const editorContent = conteudoFinal || "";

      if (editorContent) {
        const processed = preprocessTemplate(editorContent, enrichedMergedDados);
        fullContent = replacePlaceholders(processed, enrichedMergedDados);
      } else if (templateBase) {
        const processed = preprocessTemplate(templateBase, enrichedMergedDados);
        fullContent = replacePlaceholders(processed, enrichedMergedDados);
      }

      // Aviso de placeholders não resolvidos (já roda sobre conteúdo pré-processado).
      // Não bloqueia o salvamento — o contrato é gravado como rascunho mesmo com pendências.
      // Usa enrichedMergedDados para evitar falsos positivos em campos derivados.
      const unresolved = getUnresolvedPlaceholders(fullContent, enrichedMergedDados);
      if (unresolved.length > 0) {
        toast({
          title: "Salvo como rascunho",
          description: `${unresolved.length} campo(s) ainda sem dados: ${unresolved.slice(0, 3).join(", ")}${unresolved.length > 3 ? "..." : ""}. Você pode completar depois.`,
          variant: "default",
        });
      }

      // Fallback: se conteúdo vazio mas há dados, gerar resumo
      if (!fullContent.trim() && filledKeys.length > 0) {
        fullContent = buildSummaryHtml(mergedDados);
      }

      // Debug log
      console.log("[NovoContrato] handleSave debug:", {
        mergedDados,
        fullContentLength: fullContent.length,
        participantsCount: participants.length,
        extractedDataCount: extractedData.length,
        filledKeysCount: filledKeys.length,
      });

      if (selectedClauses.length > 0) {
        fullContent += "\n\n<h2>CLÁUSULAS</h2>\n";
        selectedClauses.forEach((c, i) => {
          fullContent += `\n<h3>CLÁUSULA ${i + 1}ª — ${c.titulo.toUpperCase()}</h3>\n${c.conteudo}\n`;
        });
      }

      const contractName = nomeContrato || `Contrato - ${mergedDados.comprador_nome || comprador?.nome || compradorNome || participants.find((p) => p.role === "comprador")?.full_name || manualParticipants.find((p) => p.role === "comprador")?.nome || "Novo"}`;
      const contract = await createContract({
        nome: contractName,
        template_id: selectedTemplateId,
        comprador_id: compradorId,
        vendedor_id: vendedorId,
        empresa_id: empresaId,
        dados: mergedDados as any,
        conteudo_final: fullContent,
        clausulas_ids: selectedClauseIds as any,
        status: "rascunho",
        current_step: "concluido",
        valor_total: mergedDados.valor_total ? parseFloat(mergedDados.valor_total.replace(/[^\d.,]/g, "").replace(",", ".")) : null,
        valor_sinal: mergedDados.valor_sinal ? parseFloat(mergedDados.valor_sinal.replace(/[^\d.,]/g, "").replace(",", ".")) : null,
        valor_financiamento: mergedDados.valor_financiamento ? parseFloat(mergedDados.valor_financiamento.replace(/[^\d.,]/g, "").replace(",", ".")) : null,
      } as any);

      if (!contract?.id) {
        toast({ title: "Erro", description: "Não foi possível criar o contrato.", variant: "destructive" });
        return;
      }

      // Save participants for BOTH AI and manual flows
      if (profile?.tenant_id) {
        // Reverse mapping: dados key → participant field
        const DADOS_TO_PARTICIPANT: Record<string, string> = {
          cpf: "cpf", rg: "rg", orgao_expedidor: "issuing_agency",
          profissao: "profession", nacionalidade: "nationality",
          estado_civil: "marital_status", email: "email", whatsapp: "whatsapp",
        };
        const addrMap: Record<string, string> = {
          endereco_rua: "address_street", endereco_numero: "address_number",
          endereco_complemento: "address_complement", endereco_bairro: "address_neighborhood",
          endereco_cidade: "address_city", endereco_estado: "address_state",
          endereco_cep: "address_zipcode",
        };

        if (flowMode === "ai" && participants.length > 0) {
          // AI flow: save each participant with extracted + form data
          for (const p of participants) {
            const pData = extractedData.find((ed) => ed.participantId === p.id);
            const fieldMap: Record<string, string> = {};
            pData?.fields.forEach((f) => { fieldMap[f.key] = f.value; });

            const prefix = p.role + "_";
            Object.entries(DADOS_TO_PARTICIPANT).forEach(([dadosSuffix, participantField]) => {
              const dadosKey = prefix + dadosSuffix;
              if (mergedDados[dadosKey] && !fieldMap[participantField]) {
                fieldMap[participantField] = mergedDados[dadosKey];
              }
            });
            Object.entries(addrMap).forEach(([dadosSuffix, participantField]) => {
              const dadosKey = prefix + dadosSuffix;
              if (mergedDados[dadosKey] && !fieldMap[participantField]) {
                fieldMap[participantField] = mergedDados[dadosKey];
              }
            });

            const { error: partError } = await supabase.from("contract_participants").insert({
              contract_id: contract.id,
              tenant_id: profile.tenant_id,
              role: p.role,
              full_name: pData?.full_name || p.full_name || mergedDados[prefix + "nome"] || "",
              cpf: fieldMap.cpf || null,
              rg: fieldMap.rg || null,
              issuing_agency: fieldMap.issuing_agency || null,
              profession: fieldMap.profession || null,
              nationality: fieldMap.nationality || null,
              marital_status: fieldMap.marital_status || null,
              email: fieldMap.email || null,
              whatsapp: fieldMap.whatsapp || null,
              address_street: fieldMap.address_street || null,
              address_number: fieldMap.address_number || null,
              address_complement: fieldMap.address_complement || null,
              address_neighborhood: fieldMap.address_neighborhood || null,
              address_city: fieldMap.address_city || null,
              address_state: fieldMap.address_state || null,
              address_zipcode: fieldMap.address_zipcode || null,
            } as any);

            if (partError) {
              console.error("[NovoContrato] Erro ao salvar participante:", partError);
              toast({ title: "Erro ao salvar participante", description: partError.message, variant: "destructive" });
            } else {
              logAction({
                tenantId: profile.tenant_id,
                action: "participant.created",
                entityType: "participant",
                metadata: { contract_id: contract.id, role: p.role, source: "ai" },
              });
            }
          }
        } else if (flowMode === "manual") {
          // Manual flow: create participants from manualParticipants state
          for (const mp of manualParticipants) {
            if (!mp.nome.trim()) continue;

            const { error: partError } = await supabase.from("contract_participants").insert({
              contract_id: contract.id,
              tenant_id: profile.tenant_id,
              role: mp.role,
              full_name: mp.nome,
              cpf: mp.cpf || null,
              rg: mp.rg || null,
              issuing_agency: mp.orgao_expedidor || null,
              profession: mp.profissao || null,
              nationality: mp.nacionalidade || null,
              marital_status: mp.estado_civil || null,
              email: mp.email || null,
              whatsapp: mp.whatsapp || null,
              address_street: mp.rua || null,
              address_number: mp.numero || null,
              address_complement: mp.complemento || null,
              address_neighborhood: mp.bairro || null,
              address_city: mp.cidade || null,
              address_state: mp.estado || null,
              address_zipcode: mp.cep || null,
            } as any);

            if (partError) {
              console.error("[NovoContrato] Erro ao salvar participante manual:", partError);
              toast({ title: "Erro ao salvar participante", description: partError.message, variant: "destructive" });
            } else {
              logAction({
                tenantId: profile.tenant_id,
                action: "participant.created",
                entityType: "participant",
                metadata: { contract_id: contract.id, role: mp.role, source: "manual" },
              });
            }
          }

          // Persistência silenciosa no histórico de contatos (tabela `contacts`).
          // Para cada participante manual sem contact_id vinculado e com CPF,
          // grava como contato do tenant se ainda não existir (dedupe por CPF).
          // Falhas são engolidas — não interromper o fluxo do wizard.
          try {
            const existingCpfs = new Set(
              contacts.map((c) => (c.cpf || "").replace(/\D/g, "")).filter(Boolean)
            );
            for (const mp of manualParticipants) {
              if (!mp.nome.trim() || mp.contact_id) continue;
              const cpfDigits = (mp.cpf || "").replace(/\D/g, "");
              if (!cpfDigits || existingCpfs.has(cpfDigits)) continue;
              existingCpfs.add(cpfDigits);
              await supabase.from("contacts").insert({
                tenant_id: profile.tenant_id,
                nome: mp.nome,
                cpf: mp.cpf || null,
                rg: mp.rg || null,
                orgao_expedidor: mp.orgao_expedidor || null,
                profissao: mp.profissao || null,
                nacionalidade: mp.nacionalidade || null,
                estado_civil: mp.estado_civil || null,
                email: mp.email || null,
                whatsapp: mp.whatsapp || null,
                cep: mp.cep || null,
                rua: mp.rua || null,
                numero: mp.numero || null,
                complemento: mp.complemento || null,
                bairro: mp.bairro || null,
                cidade: mp.cidade || null,
                estado: mp.estado || null,
              } as any);
            }
          } catch (e) {
            console.warn("[NovoContrato] Falha silenciosa ao gravar histórico de contatos:", e);
          }
        }
      }

      if (uploadedFiles.length > 0 && profile?.tenant_id) {
        for (const file of uploadedFiles) {
          const { error: docError } = await supabase.from("contract_documents").insert({
            contract_id: contract.id,
            tenant_id: profile.tenant_id,
            file_name: file.name,
            file_path: file.path,
            file_size: file.size,
            mime_type: file.mime_type,
          } as any);

          if (docError) {
            console.error("[NovoContrato] Erro ao salvar documento:", docError);
            toast({ title: "Erro ao salvar documento", description: docError.message, variant: "destructive" });
          }
        }
      }

      clearDraft(profile?.tenant_id, user?.id);
      allowExitRef.current = true;
      navigate("/app/contratos");
    } catch (e: any) {
      console.error("[NovoContrato] Erro ao salvar contrato:", e);
      toast({ title: "Erro ao salvar contrato", description: e?.message || "Erro desconhecido", variant: "destructive" });
    }
  };

  const handlePrint = () => window.print();

  // Lote D: Salvar nunca bloqueia — grava como rascunho mesmo com pendências.
  // O hard block fica restrito ao Exportar PDF (handlePrintClick).
  const handleSaveClick = () => {
    void handleSave();
  };

  const handlePrintClick = () => {
    if (liveUnresolved.length > 0) {
      setUnresolvedDialogOpen(true);
      return;
    }
    handlePrint();
  };


  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) return;
    try {
      const created = await createTemplate({
        nome: newTemplateName,
        tipo: newTemplateType,
        descricao: newTemplateDesc || null,
        status: "ativo",
        conteudo: "",
        variaveis: [],
      });
      if (created?.id) {
        handleTemplateChange(created.id);
      }
      setShowCreateTemplate(false);
      setNewTemplateName("");
      setNewTemplateType("Compra e Venda");
      setNewTemplateDesc("");
    } catch (e) {
      // handled by hook
    }
  };

  const templateVars = useMemo(() => {
    if (!selectedTemplate?.variaveis) return TEMPLATE_VARIABLES;
    const varKeys = selectedTemplate.variaveis as string[];
    if (!varKeys.length) return TEMPLATE_VARIABLES;
    return TEMPLATE_VARIABLES.filter((v) => varKeys.includes(v.key));
  }, [selectedTemplate]);

  const templateVarsGrouped = useMemo(() => {
    const g: Record<string, typeof TEMPLATE_VARIABLES> = {};
    templateVars.forEach((v) => {
      if (!g[v.category]) g[v.category] = [];
      g[v.category].push(v);
    });
    return g;
  }, [templateVars]);

  // Live unresolved placeholders (Lote D)
  const liveUnresolved = useMemo(() => {
    if (!conteudoFinal) return [];
    // conteudoFinal já vem de buildFinalContent (preprocessado), mas reaplicar
    // o preprocess é idempotente e protege contra edição manual no editor.
    const processed = preprocessTemplate(conteudoFinal, dados);
    return parseUnresolvedStrings(getUnresolvedPlaceholders(processed, dados));
  }, [conteudoFinal, dados]);


  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-foreground">Novo Contrato</h1>
        <p className="text-sm text-muted-foreground">Siga as etapas para gerar seu contrato</p>
      </div>

      {/* Steps indicator */}
      <div className="mb-8 flex items-center gap-2 overflow-x-auto pb-2">
        {steps.map((step, i) => (
          <div key={step.id + i} className="flex items-center">
            <div
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                currentStepIndex === i
                  ? "bg-primary text-primary-foreground"
                  : currentStepIndex > i
                  ? "bg-success/10 text-success"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {currentStepIndex > i ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <step.icon className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">{step.label}</span>
            </div>
            {i < steps.length - 1 && <ChevronRight className="mx-1 h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* ==================== STEP 1: SELECTION (Template + Mode) ==================== */}
      {currentStep?.id === "selection" && (
        <div className="space-y-8">
          {/* Template Selection */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-5 w-5 text-primary" />
                Selecione ou crie um contrato
              </CardTitle>
              <CardDescription>
                Escolha o modelo de contrato para iniciar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="mb-1.5 block text-sm font-medium">Contrato *</Label>
                <div className="flex gap-2">
                  <Select
                    value={selectedTemplateId || ""}
                    onValueChange={(val) => handleTemplateChange(val)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione um modelo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingTemplates ? (
                        <SelectItem value="__loading" disabled>Carregando...</SelectItem>
                      ) : activeTemplates.length === 0 ? (
                        <SelectItem value="__empty" disabled>Nenhum modelo disponível</SelectItem>
                      ) : (
                        activeTemplates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            <div className="flex items-center gap-2">
                              <span>{t.nome}</span>
                              <span className="text-xs text-muted-foreground">({t.tipo})</span>
                              {t.status === "rascunho" && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Rascunho</span>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowCreateTemplate(true)}
                    title="Criar novo modelo"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {selectedTemplate && (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
                  <FileText className="h-4 w-4 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{selectedTemplate.nome}</p>
                    <p className="text-xs text-muted-foreground">{selectedTemplate.descricao || selectedTemplate.tipo}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <Badge variant="secondary" className="text-xs">{selectedTemplate.tipo}</Badge>
                    <Badge variant="secondary" className="text-xs">
                      {(selectedTemplate.variaveis as string[])?.length || 0} variáveis
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mode Selection (only if template is selected) */}
          {selectedTemplateId && (
            <ContractModeSelector onSelect={handleModeSelect} />
          )}
        </div>
      )}

      {/* ==================== AI: PARTICIPANTS (Step 2) ==================== */}
      {currentStep?.id === "participants" && flowMode === "ai" && (
        <ParticipantManager
          participants={participants}
          onAdd={handleAddParticipant}
          onRemove={handleRemoveParticipant}
          onUpdateName={handleUpdateParticipantName}
          onUploadDocs={handleUploadDocs}
          onRemoveDoc={handleRemoveDoc}
          onChangeDocType={handleChangeDocType}
          uploadingIndex={uploadingParticipantIndex}
        />
      )}

      {/* ==================== AI: REVIEW & DATA (Step 3 with sub-steps) ==================== */}
      {currentStep?.id === "review-data" && flowMode === "ai" && (
        <div className="space-y-6">
          {/* Sub-step indicator */}
          <div className="flex items-center gap-2 text-xs">
            {[
              { key: "extraction", label: "Extração IA" },
              { key: "review", label: "Revisão" },
              { key: "data", label: "Dados" },
            ].map((sub, i) => (
              <div key={sub.key} className="flex items-center">
                <span
                  className={`rounded-full px-2.5 py-1 font-medium ${
                    aiReviewSubStep === sub.key
                      ? "bg-primary/10 text-primary"
                      : (["extraction", "review", "data"].indexOf(aiReviewSubStep) > i)
                      ? "text-success"
                      : "text-muted-foreground"
                  }`}
                >
                  {sub.label}
                </span>
                {i < 2 && <ChevronRight className="mx-1 h-3 w-3 text-muted-foreground" />}
              </div>
            ))}
          </div>

          {aiReviewSubStep === "extraction" && (
            <ExtractionProgress
              participants={participants}
              isProcessing={isProcessing}
              progress={progress}
              currentMessage={currentMessage}
            />
          )}

          {aiReviewSubStep === "review" && (
            <ExtractedDataReview
              participantsData={extractedData}
              onUpdateField={handleAiReviewChange}
            />
          )}

          {aiReviewSubStep === "data" && (
            <div className="space-y-6">
              <h2 className="font-display text-lg font-semibold text-foreground">Dados do Contrato</h2>
              <p className="text-sm text-muted-foreground">
                Dados pré-preenchidos pela IA. Ajuste conforme necessário.
              </p>

              <div>
                <Label className="mb-1 text-sm font-medium">Nome do Contrato</Label>
                <Input value={nomeContrato} onChange={(e) => setNomeContrato(e.target.value)} placeholder="Ex: Compra e Venda - Apt 302" />
              </div>

              {Object.entries(templateVarsGrouped).map(([category, vars]) => (
                <Card key={category} className="shadow-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-foreground">{category}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {vars.map((v) => (
                        <div key={v.key}>
                          <Label className="mb-1 text-xs text-muted-foreground">{v.label}</Label>
                          <Input
                            value={dados[v.key] || ""}
                            onChange={(e) => handleDadoChange((prev) => ({ ...prev, [v.key]: e.target.value }))}
                            placeholder={v.label}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================== MANUAL: PARTIES (Step 2) ==================== */}
      {currentStep?.id === "parties-docs" && flowMode === "manual" && (
        <div className="space-y-8">
          <MultipleParticipantsPanel
            participants={manualParticipants}
            onChange={setManualParticipants}
            contacts={contacts}
            flags={{ tem_procurador: dados.tem_procurador === "true" }}
            onFlagChange={(key, value) =>
              handleDadoChange((prev) => ({ ...prev, [key]: value ? "true" : "false" }))
            }
          />

          {/* Empresa */}
          <div className="space-y-4">
            <h2 className="font-display text-lg font-semibold text-foreground">Empresa Intermediadora (opcional)</h2>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar empresa..." className="pl-10" value={searchCompanies} onChange={(e) => setSearchCompanies(e.target.value)} />
            </div>
            <div className="grid gap-2 max-h-48 overflow-y-auto sm:grid-cols-2">
              {filteredCompanies.map((c) => (
                <Card key={c.id} className={`cursor-pointer p-3 transition-all hover:shadow-card ${empresaId === c.id ? "ring-2 ring-primary bg-primary/5" : ""}`} onClick={() => setEmpresaId(empresaId === c.id ? null : c.id)}>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.nome_fantasia}</p>
                      <p className="text-xs text-muted-foreground">{c.cnpj || "—"}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== MANUAL: DATA & CLAUSES (Step 3) ==================== */}
      {currentStep?.id === "data-clauses" && flowMode === "manual" && (
        <div className="space-y-8">
          {/* Data section */}
          <div className="space-y-6">
            <h2 className="font-display text-lg font-semibold text-foreground">Preencha os Dados</h2>
            <p className="text-sm text-muted-foreground">
              Campos preenchidos automaticamente com dados das partes selecionadas. Ajuste conforme necessário.
            </p>

            <div>
              <Label className="mb-1 text-sm font-medium">Nome do Contrato</Label>
              <Input value={nomeContrato} onChange={(e) => setNomeContrato(e.target.value)} placeholder="Ex: Compra e Venda - Apt 302" />
            </div>

            <FixedDataFields
              dados={dados}
              onChange={handleDadoChange}
              manualParticipants={manualParticipants}
            />

            <ParcelasManager dados={dados} onChange={handleDadoChange} />
          </div>

          {/* Clauses section */}
          <div className="space-y-4">
            <h2 className="font-display text-lg font-semibold text-foreground">Selecione as Cláusulas</h2>
            <p className="text-sm text-muted-foreground">Escolha as cláusulas que farão parte deste contrato.</p>
            {loadingClauses ? (
              <p className="text-sm text-muted-foreground">Carregando cláusulas...</p>
            ) : clauses.filter((c) => c.ativa).length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">Nenhuma cláusula ativa. Crie cláusulas primeiro.</p>
                  <Button variant="outline" className="mt-4" onClick={() => navigate("/app/clausulas")}>Ir para Cláusulas</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {clauses.filter((c) => c.ativa).map((clause) => (
                  <Card key={clause.id} className={`shadow-card transition-all ${selectedClauseIds.includes(clause.id) ? "ring-2 ring-primary" : ""}`}>
                    <CardContent className="p-4">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <Checkbox
                          className="mt-0.5"
                          checked={selectedClauseIds.includes(clause.id)}
                          onCheckedChange={(checked) => {
                            setSelectedClauseIds((prev) => checked ? [...prev, clause.id] : prev.filter((id) => id !== clause.id));
                          }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground">{clause.titulo}</p>
                            <Badge variant="secondary" className="text-xs">{clause.categoria}</Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{clause.conteudo.replace(/<[^>]*>/g, "").slice(0, 150)}...</p>
                        </div>
                      </label>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== SHARED: EDITOR & FINALIZE (Step 4) ==================== */}
      {currentStep?.id === "editor-finish" && (
        <WizardStepEditor
          conteudoFinal={conteudoFinal}
          onConteudoChange={handleConteudoChange}
          liveUnresolved={liveUnresolved}
          onShowPendencias={() => setUnresolvedDialogOpen(true)}
          selectedClauses={selectedClauses}
          selectedTemplateName={selectedTemplate?.nome}
          compradorNome={
            comprador?.nome ||
            participants.find((p) => p.role === "comprador")?.full_name ||
            manualParticipants.find((p) => p.role === "comprador")?.nome ||
            ""
          }
          vendedorNome={
            vendedor?.nome ||
            participants.find((p) => p.role === "vendedor")?.full_name ||
            manualParticipants.find((p) => p.role === "vendedor")?.nome ||
            ""
          }
          empresaNome={empresa?.nome_fantasia}
          isSaving={isCreating}
          onSaveClick={handleSaveClick}
          onPrintClick={handlePrintClick}
        />
      )}

      <WizardActions
        showNavigation={currentStep?.id !== "editor-finish" && currentStep?.id !== "selection"}
        showBackOnly={currentStep?.id === "editor-finish"}
        canProceed={canProceed()}
        blockReason={getBlockReason()}
        onBack={handleBack}
        onNext={handleNext}
      />

      {/* Inline Create Template Dialog */}
      <Dialog open={showCreateTemplate} onOpenChange={setShowCreateTemplate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar novo modelo</DialogTitle>
            <DialogDescription>
              Crie um modelo de contrato rapidamente. Você poderá editar o conteúdo depois.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="mb-1 text-sm">Nome do modelo *</Label>
              <Input
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="Ex: Compra e Venda com Financiamento"
              />
            </div>
            <div>
              <Label className="mb-1 text-sm">Tipo</Label>
              <Select value={newTemplateType} onValueChange={setNewTemplateType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Compra e Venda">Compra e Venda</SelectItem>
                  <SelectItem value="Locação">Locação</SelectItem>
                  <SelectItem value="Permuta">Permuta</SelectItem>
                  <SelectItem value="Cessão de Direitos">Cessão de Direitos</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 text-sm">Descrição (opcional)</Label>
              <Textarea
                value={newTemplateDesc}
                onChange={(e) => setNewTemplateDesc(e.target.value)}
                placeholder="Breve descrição do modelo..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateTemplate(false)}>Cancelar</Button>
            <Button onClick={handleCreateTemplate} disabled={!newTemplateName.trim() || isCreatingTemplate}>
              {isCreatingTemplate ? "Criando..." : "Criar e selecionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print View */}
      <ContractPrintView
        ref={printRef}
        nome={nomeContrato || `Contrato - ${comprador?.nome || participants.find((p) => p.role === "comprador")?.full_name || manualParticipants.find((p) => p.role === "comprador")?.nome || ""}`}
        conteudo={conteudoFinal}
        clausulas={selectedClauses.map((c) => ({ titulo: c.titulo, conteudo: c.conteudo }))}
      />

      {/* Hard block para Exportar PDF */}
      <UnresolvedPlaceholdersDialog
        open={unresolvedDialogOpen}
        onOpenChange={setUnresolvedDialogOpen}
        unresolved={liveUnresolved}
        onGoBack={() => setUnresolvedDialogOpen(false)}
      />

      {/* Modal de Salvar Rascunho ao sair com formulário sujo */}
      <SaveDraftModal
        open={draftModalOpen}
        initialName={nomeContrato}
        isSaving={isSavingDraft}
        onSaveDraft={handleSaveDraftFromModal}
        onDiscard={handleDiscardDraft}
      />
    </div>
  );
};

export default NovoContrato;
