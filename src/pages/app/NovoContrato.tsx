import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import RichTextEditor from "@/components/RichTextEditor";
import ContractPrintView from "@/components/ContractPrintView";
import { useToast } from "@/hooks/use-toast";
import ContractModeSelector from "@/components/contract/ContractModeSelector";
import ParticipantManager from "@/components/contract/ParticipantManager";
import type { Participant, ParticipantRole } from "@/components/contract/ParticipantCard";
import type { DocType, UploadedDoc } from "@/components/contract/DocumentUploader";
import ExtractionProgress from "@/components/contract/ExtractionProgress";
import ExtractedDataReview from "@/components/contract/ExtractedDataReview";
import { useDocumentExtraction } from "@/hooks/useDocumentExtraction";

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

const STORAGE_KEY = "novo-contrato-draft";

function loadDraft() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveDraft(data: Record<string, any>) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore quota errors
  }
}

function clearDraft() {
  sessionStorage.removeItem(STORAGE_KEY);
}

const NovoContrato = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { templates, isLoading: loadingTemplates, createTemplate, isCreating: isCreatingTemplate } = useTemplates();
  const { contacts, isLoading: loadingContacts } = useContacts();
  const { companies, isLoading: loadingCompanies } = useCompanies();
  const { clauses, isLoading: loadingClauses } = useClauses();
  const { createContract, isCreating } = useContracts();
  const { profile } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);

  // Load draft on mount
  const draft = useRef(loadDraft());

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
  const [searchContacts, setSearchContacts] = useState("");
  const [searchCompanies, setSearchCompanies] = useState("");
  const [checkedDocs, setCheckedDocs] = useState<string[]>(draft.current?.checkedDocs ?? []);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(draft.current?.uploadedFiles ?? []);
  const [isUploading, setIsUploading] = useState(false);

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
  } = useDocumentExtraction();

  // AI sub-step inside "review-data": extraction → review → data
  const [aiReviewSubStep, setAiReviewSubStep] = useState<"extraction" | "review" | "data">(draft.current?.aiReviewSubStep ?? "extraction");

  // Persist state to sessionStorage
  useEffect(() => {
    saveDraft({
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
      checkedDocs,
      uploadedFiles,
      participants: participants.map(p => ({
        ...p,
        documents: p.documents.map(d => ({ ...d, file: null })),
      })),
      aiReviewSubStep,
    });
  }, [
    flowMode, currentStepIndex, selectedTemplateId, dados, selectedClauseIds,
    conteudoFinal, nomeContrato, compradorId, vendedorId, empresaId,
    checkedDocs, uploadedFiles, participants, aiReviewSubStep,
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

  // Auto-fill dados from selected contacts/company (manual mode)
  const autoFillDados = useCallback(() => {
    const filled: Record<string, string> = { ...dados };
    if (comprador) {
      if (comprador.nome) filled.comprador_nome = comprador.nome;
      if (comprador.cpf) filled.comprador_cpf = comprador.cpf;
      if (comprador.rg) filled.comprador_rg = comprador.rg;
      if (comprador.orgao_expedidor) filled.comprador_orgao_expedidor = comprador.orgao_expedidor;
      if (comprador.profissao) filled.comprador_profissao = comprador.profissao;
      if (comprador.nacionalidade) filled.comprador_nacionalidade = comprador.nacionalidade;
      if (comprador.estado_civil) filled.comprador_estado_civil = comprador.estado_civil;
      if (comprador.email) filled.comprador_email = comprador.email;
      if (comprador.whatsapp) filled.comprador_whatsapp = comprador.whatsapp;
      const endComprador = [comprador.rua, comprador.numero, comprador.complemento, comprador.bairro, comprador.cidade, comprador.estado, comprador.cep].filter(Boolean).join(", ");
      if (endComprador) filled.comprador_endereco = endComprador;
    }
    if (vendedor) {
      if (vendedor.nome) filled.vendedor_nome = vendedor.nome;
      if (vendedor.cpf) filled.vendedor_cpf = vendedor.cpf;
      if (vendedor.rg) filled.vendedor_rg = vendedor.rg;
      if (vendedor.orgao_expedidor) filled.vendedor_orgao_expedidor = vendedor.orgao_expedidor;
      if (vendedor.profissao) filled.vendedor_profissao = vendedor.profissao;
      if (vendedor.nacionalidade) filled.vendedor_nacionalidade = vendedor.nacionalidade;
      if (vendedor.estado_civil) filled.vendedor_estado_civil = vendedor.estado_civil;
      if (vendedor.email) filled.vendedor_email = vendedor.email;
      if (vendedor.whatsapp) filled.vendedor_whatsapp = vendedor.whatsapp;
      const endVendedor = [vendedor.rua, vendedor.numero, vendedor.complemento, vendedor.bairro, vendedor.cidade, vendedor.estado, vendedor.cep].filter(Boolean).join(", ");
      if (endVendedor) filled.vendedor_endereco = endVendedor;
    }
    if (empresa) {
      if (empresa.nome_fantasia) filled.empresa_nome = empresa.nome_fantasia;
      if (empresa.cnpj) filled.empresa_cnpj = empresa.cnpj;
      const endEmpresa = [empresa.rua, empresa.numero, empresa.complemento, empresa.bairro, empresa.cidade, empresa.estado, empresa.cep].filter(Boolean).join(", ");
      if (endEmpresa) filled.empresa_endereco = endEmpresa;
    }
    setDados(filled);
  }, [comprador, vendedor, empresa, dados]);

  // Build final content
  const buildFinalContent = useCallback(() => {
    let content = selectedTemplate?.conteudo || "";
    Object.entries(dados).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      content = content.replace(regex, value || `{{${key}}}`);
    });
    TEMPLATE_VARIABLES.forEach((v) => {
      const regex = new RegExp(`\\{\\{${v.key}\\}\\}`, "g");
      if (!dados[v.key]) {
        content = content.replace(regex, `{{${v.key}}}`);
      }
    });
    setConteudoFinal(content);
  }, [selectedTemplate, dados]);

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

  const handleNext = () => {
    const stepId = currentStep?.id;

    // Manual: auto-fill when leaving parties-docs
    if (flowMode === "manual" && stepId === "parties-docs") {
      autoFillDados();
    }

    // Before editor, build final content
    if (stepId === "data-clauses" || (flowMode === "ai" && stepId === "review-data")) {
      buildFinalContent();
    }

    // AI: trigger extraction when moving from participants
    if (flowMode === "ai" && stepId === "participants") {
      extractAll(participants);
      setAiReviewSubStep("extraction");
    }

    // AI: handle sub-steps within review-data
    if (flowMode === "ai" && stepId === "review-data") {
      if (aiReviewSubStep === "extraction" && !isProcessing) {
        setAiReviewSubStep("review");
        return;
      }
      if (aiReviewSubStep === "review") {
        const aiDados = mapToDados();
        setDados((prev) => ({ ...prev, ...aiDados }));
        setAiReviewSubStep("data");
        return;
      }
      // If data sub-step, proceed to next wizard step
    }

    setCurrentStepIndex((s) => Math.min(s + 1, steps.length - 1));
  };

  const handleBack = () => {
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
        const filePath = `${profile.tenant_id}/${Date.now()}-${file.name}`;
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
      case "parties-docs": return !!compradorId && !!vendedorId;
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

  const handleSave = async () => {
    try {
      let fullContent = conteudoFinal;
      if (selectedClauses.length > 0) {
        fullContent += "\n\n<h2>CLÁUSULAS</h2>\n";
        selectedClauses.forEach((c, i) => {
          fullContent += `\n<h3>CLÁUSULA ${i + 1}ª — ${c.titulo.toUpperCase()}</h3>\n${c.conteudo}\n`;
        });
      }

      const contract = await createContract({
        nome: nomeContrato || `Contrato - ${comprador?.nome || participants.find((p) => p.role === "comprador")?.full_name || ""}`,
        template_id: selectedTemplateId,
        comprador_id: compradorId,
        vendedor_id: vendedorId,
        empresa_id: empresaId,
        dados: dados as any,
        conteudo_final: fullContent,
        clausulas_ids: selectedClauseIds as any,
        status: "pronto",
        valor_total: dados.valor_total ? parseFloat(dados.valor_total.replace(/[^\d.,]/g, "").replace(",", ".")) : null,
        valor_sinal: dados.valor_sinal ? parseFloat(dados.valor_sinal.replace(/[^\d.,]/g, "").replace(",", ".")) : null,
        valor_financiamento: dados.valor_financiamento ? parseFloat(dados.valor_financiamento.replace(/[^\d.,]/g, "").replace(",", ".")) : null,
      });

      if (uploadedFiles.length > 0 && contract?.id && profile?.tenant_id) {
        for (const file of uploadedFiles) {
          await supabase.from("contract_documents").insert({
            contract_id: contract.id,
            tenant_id: profile.tenant_id,
            file_name: file.name,
            file_path: file.path,
            file_size: file.size,
            mime_type: file.mime_type,
          } as any);
        }
      }

      clearDraft();
      navigate("/app/contratos");
    } catch (e) {
      // error handled by hook
    }
  };

  const handlePrint = () => window.print();

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
        setSelectedTemplateId(created.id);
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
                    onValueChange={(val) => setSelectedTemplateId(val)}
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
              onUpdateField={updateField}
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
                            onChange={(e) => setDados((prev) => ({ ...prev, [v.key]: e.target.value }))}
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

      {/* ==================== MANUAL: PARTIES & DOCS (Step 2) ==================== */}
      {currentStep?.id === "parties-docs" && flowMode === "manual" && (
        <div className="space-y-8">
          {/* Parties section */}
          <div className="space-y-6">
            <h2 className="font-display text-lg font-semibold text-foreground">Selecione as partes</h2>
            
            {/* Comprador */}
            <div>
              <Label className="mb-2 block text-sm font-medium">Comprador *</Label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar contato..." className="pl-10" value={searchContacts} onChange={(e) => setSearchContacts(e.target.value)} />
              </div>
              <div className="grid gap-2 max-h-48 overflow-y-auto sm:grid-cols-2">
                {filteredContacts.map((c) => (
                  <Card key={c.id} className={`cursor-pointer p-3 transition-all hover:shadow-card ${compradorId === c.id ? "ring-2 ring-primary bg-primary/5" : ""}`} onClick={() => setCompradorId(c.id)}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{c.nome}</p>
                        <p className="text-xs text-muted-foreground">{c.cpf || c.email || "—"}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              {contacts.length === 0 && !loadingContacts && (
                <p className="text-xs text-muted-foreground mt-2">Nenhum contato cadastrado. <Button variant="link" className="p-0 h-auto text-xs" onClick={() => navigate("/app/contatos")}>Criar contato</Button></p>
              )}
            </div>

            {/* Vendedor */}
            <div>
              <Label className="mb-2 block text-sm font-medium">Vendedor *</Label>
              <div className="grid gap-2 max-h-48 overflow-y-auto sm:grid-cols-2">
                {contacts.filter((c) => c.id !== compradorId).map((c) => (
                  <Card key={c.id} className={`cursor-pointer p-3 transition-all hover:shadow-card ${vendedorId === c.id ? "ring-2 ring-primary bg-primary/5" : ""}`} onClick={() => setVendedorId(c.id)}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{c.nome}</p>
                        <p className="text-xs text-muted-foreground">{c.cpf || c.email || "—"}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Empresa */}
            <div>
              <Label className="mb-2 block text-sm font-medium">Empresa Intermediadora (opcional)</Label>
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

          {/* Documents section */}
          <div className="space-y-6">
            <h2 className="font-display text-lg font-semibold text-foreground">Documentos</h2>
            <p className="text-sm text-muted-foreground">Envie os documentos necessários e confirme o checklist.</p>

            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm"><Upload className="h-4 w-4" /> Upload de Documentos</CardTitle>
              </CardHeader>
              <CardContent>
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 transition-colors hover:border-primary hover:bg-muted/50">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Clique para enviar arquivos</span>
                  <span className="text-xs text-muted-foreground">PDF, JPG, PNG (máx 20MB)</span>
                  <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                </label>
                {isUploading && <p className="mt-2 text-xs text-muted-foreground">Enviando...</p>}
                {uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {uploadedFiles.map((file) => (
                      <div key={file.path} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <File className="h-4 w-4 text-primary" />
                          <span className="text-sm text-foreground">{file.name}</span>
                          <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(0)} KB)</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveFile(file.path)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Checklist de Documentos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {documentChecklist.map((doc) => (
                    <label key={doc} className="flex items-center gap-3 cursor-pointer">
                      <Checkbox
                        checked={checkedDocs.includes(doc)}
                        onCheckedChange={(checked) => {
                          setCheckedDocs((prev) => checked ? [...prev, doc] : prev.filter((d) => d !== doc));
                        }}
                      />
                      <span className="text-sm text-foreground">{doc}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
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
                          onChange={(e) => setDados((prev) => ({ ...prev, [v.key]: e.target.value }))}
                          placeholder={v.label}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
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
        <div className="space-y-6">
          <h2 className="font-display text-lg font-semibold text-foreground">Editor do Contrato</h2>
          <p className="text-sm text-muted-foreground">Revise e ajuste o conteúdo final do contrato.</p>
          <RichTextEditor content={conteudoFinal} onChange={setConteudoFinal} placeholder="Conteúdo do contrato..." />
          
          {selectedClauses.length > 0 && (
            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Cláusulas selecionadas ({selectedClauses.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {selectedClauses.map((c, i) => (
                    <div key={c.id} className="rounded-md border border-border p-3">
                      <p className="text-xs font-semibold text-foreground">Cláusula {i + 1}ª — {c.titulo}</p>
                      <div className="mt-1 text-xs text-muted-foreground" dangerouslySetInnerHTML={{ __html: c.conteudo }} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="shadow-card">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Modelo</p>
                <p className="text-sm font-medium text-foreground">{selectedTemplate?.nome || "—"}</p>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Comprador</p>
                <p className="text-sm font-medium text-foreground">
                  {comprador?.nome || participants.find((p) => p.role === "comprador")?.full_name || "—"}
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Vendedor</p>
                <p className="text-sm font-medium text-foreground">
                  {vendedor?.nome || participants.find((p) => p.role === "vendedor")?.full_name || "—"}
                </p>
              </CardContent>
            </Card>
          </div>

          {empresa && (
            <Card className="shadow-card">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Empresa</p>
                <p className="text-sm font-medium text-foreground">{empresa.nome_fantasia}</p>
              </CardContent>
            </Card>
          )}

          {/* Preview */}
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Preview do Contrato</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none rounded-md border border-border p-4 text-foreground" dangerouslySetInnerHTML={{ __html: conteudoFinal }} />
              {selectedClauses.length > 0 && (
                <div className="mt-4 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Cláusulas ({selectedClauses.length})</h3>
                  {selectedClauses.map((c, i) => (
                    <div key={c.id} className="rounded-md border border-border p-3">
                      <p className="text-xs font-semibold">Cláusula {i + 1}ª — {c.titulo}</p>
                      <div className="mt-1 text-xs text-muted-foreground" dangerouslySetInnerHTML={{ __html: c.conteudo }} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={isCreating} className="gap-2">
              <Check className="h-4 w-4" />
              {isCreating ? "Salvando..." : "Salvar Contrato"}
            </Button>
            <Button variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Exportar PDF
            </Button>
          </div>
        </div>
      )}

      {/* Navigation */}
      {currentStep?.id !== "editor-finish" && currentStep?.id !== "selection" && (
        <div className="mt-6 flex justify-between">
          <Button variant="outline" onClick={handleBack}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
          </Button>
          <Button disabled={!canProceed()} onClick={handleNext}>
            {currentStep?.id === "review-data" && aiReviewSubStep !== "data" ? "Próximo" : "Próximo"}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Back button on editor-finish */}
      {currentStep?.id === "editor-finish" && (
        <div className="mt-6">
          <Button variant="outline" onClick={handleBack}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
          </Button>
        </div>
      )}

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
        nome={nomeContrato || `Contrato - ${comprador?.nome || participants.find((p) => p.role === "comprador")?.full_name || ""}`}
        conteudo={conteudoFinal}
        clausulas={selectedClauses.map((c) => ({ titulo: c.titulo, conteudo: c.conteudo }))}
      />
    </div>
  );
};

export default NovoContrato;
