import { useState, useRef, useMemo } from "react";
import DOMPurify from "dompurify";
import {
  Upload, FileText, AlertTriangle, Shield, Check, X, Loader2, ChevronRight, ChevronLeft, Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useTemplates } from "@/hooks/useTemplates";
import { supabase } from "@/integrations/supabase/client";
import { extractVariables } from "@/lib/placeholder";
import { detectTemplateFields, type MatchConfidence, type DetectionSyntax } from "@/lib/import-detection";
import {
  buildMappingRows, indexRepeatableRoles, summarizeMapping, canAdvanceMapping,
  ignoreAllPending, applyMappingToHtml, buildImportMetadata, type MappingRow,
} from "@/lib/import-mapping";
import { TEMPLATE_VARIABLES } from "@/lib/template-variables";
import { resolveImportGate } from "@/lib/import-template-gate";

const TIPOS = ["Compra e Venda", "Locação", "Proposta", "Intermediação", "Outro"];
const MAX_FILE_BYTES = 5 * 1024 * 1024;

interface ParseResponse {
  html: string;
  text: string;
  detectedLabels: Array<{ raw: string; occurrenceIndex: number; context: string }>;
  knownPlaceholders: string[];
  ambiguousLabels: Array<{ raw: string; occurrenceIndex: number; context: string }>;
  piiMatches: Array<{ kind: string; value: string; index: number; hint: string }>;
  warnings: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PII_LABELS: Record<string, string> = {
  cpf: "CPF",
  cnpj: "CNPJ",
  telefone: "Telefone",
  email: "E-mail",
  endereco_cep: "CEP / endereço",
  valor_monetario_extenso: "Valor monetário",
};

const SYNTAX_LABELS: Record<DetectionSyntax, string> = {
  curly: "{{ }}",
  bracket: "[ ]",
  underscore: "____",
};

const CONFIDENCE_LABELS: Record<MatchConfidence, string> = {
  exact: "Exata",
  high: "Alta",
  medium: "Média",
  none: "Sem sugestão",
};

const CONFIDENCE_VARIANTS: Record<MatchConfidence, "default" | "secondary" | "outline"> = {
  exact: "default",
  high: "default",
  medium: "secondary",
  none: "outline",
};

/** Catálogo completo agrupado por categoria para o Select (fallback manual). */
const CATALOG_GROUPS: Array<{ category: string; keys: string[] }> = (() => {
  const byCategory = new Map<string, string[]>();
  for (const v of TEMPLATE_VARIABLES) {
    const arr = byCategory.get(v.category) ?? [];
    arr.push(v.key);
    byCategory.set(v.category, arr);
  }
  return [...byCategory.entries()].map(([category, keys]) => ({ category, keys }));
})();

export default function ImportDocxDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const { createTemplate, isCreating } = useTemplates();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isUploading, setIsUploading] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResponse | null>(null);
  const [rows, setRows] = useState<MappingRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [bulkIgnoreOpen, setBulkIgnoreOpen] = useState(false);
  const [piiAcknowledged, setPiiAcknowledged] = useState(false);
  const [zeroVarsAck, setZeroVarsAck] = useState(false);
  const [form, setForm] = useState({ nome: "", descricao: "", tipo: "Compra e Venda" });

  const reset = () => {
    setStep(1);
    setIsUploading(false);
    setParseResult(null);
    setRows([]);
    setFileName("");
    setBulkIgnoreOpen(false);
    setPiiAcknowledged(false);
    setZeroVarsAck(false);
    setForm({ nome: "", descricao: "", tipo: "Compra e Venda" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  // ----------------------------------------------------------------
  // Step 1 — Upload + detecção unificada (client-side, motor da 1.1)
  // ----------------------------------------------------------------
  const handleFileSelected = async (file: File) => {
    if (!/\.docx$/i.test(file.name)) {
      toast({ title: "Arquivo inválido", description: "Apenas arquivos .docx são aceitos.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast({ title: "Arquivo muito grande", description: "Limite de 5 MB.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const { data, error } = await supabase.functions.invoke("parse-docx-template", {
        body: formData,
      });

      if (error) throw error;
      const result = data as ParseResponse;

      // Motor unificado ({{curly}} + [brackets] + underscores) + indexação
      // por paridade (testemunha/procurador). Nada é descartado: toda
      // detecção vira linha da tela de mapeamento.
      const detections = indexRepeatableRoles(detectTemplateFields(result.html, result.text));
      setParseResult(result);
      setRows(buildMappingRows(detections));
      setFileName(file.name);

      // Pré-preenche nome do template a partir do filename
      const baseName = file.name.replace(/\.docx$/i, "").trim();
      setForm((f) => ({ ...f, nome: baseName }));
    } catch (err) {
      console.error("[ImportDocx] erro:", err);
      const msg = err instanceof Error ? err.message : "Falha ao processar o arquivo.";
      toast({ title: "Erro na importação", description: msg, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  // ----------------------------------------------------------------
  // Estado derivado do mapeamento
  // ----------------------------------------------------------------
  const summary = useMemo(() => summarizeMapping(rows), [rows]);
  const mappingResolved = useMemo(() => canAdvanceMapping(rows), [rows]);

  const detectionStats = useMemo(() => {
    const bySyntax: Record<DetectionSyntax, number> = { curly: 0, bracket: 0, underscore: 0 };
    for (const row of rows) bySyntax[row.detection.syntax]++;
    return bySyntax;
  }, [rows]);

  const setRowDecision = (idx: number, value: string) => {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        if (value === "__ignore__") return { ...row, action: "ignore" as const, targetKey: "" };
        return { ...row, action: "map" as const, targetKey: value };
      })
    );
  };

  // ----------------------------------------------------------------
  // Step 4 — Conteúdo final (aplica o mapeamento aprovado no HTML)
  // ----------------------------------------------------------------
  const finalHtml = useMemo(() => {
    if (!parseResult) return "";
    const html = applyMappingToHtml(parseResult.html, rows);
    return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  }, [parseResult, rows]);

  const sanitizedRawPreview = useMemo(
    () => (parseResult ? DOMPurify.sanitize(parseResult.html, { USE_PROFILES: { html: true } }) : ""),
    [parseResult]
  );

  // Variáveis do conteúdo final e o gate de "0 variáveis" (Fase 0 — item 3).
  const variaveisFinais = useMemo(() => extractVariables(finalHtml), [finalHtml]);
  const importGate = resolveImportGate(variaveisFinais.length, zeroVarsAck);

  // ----------------------------------------------------------------
  // Step 3 — PII
  // ----------------------------------------------------------------
  const piiSummary = useMemo(() => {
    if (!parseResult) return [];
    const counts: Record<string, number> = {};
    for (const m of parseResult.piiMatches) {
      counts[m.kind] = (counts[m.kind] ?? 0) + 1;
    }
    return Object.entries(counts).map(([kind, count]) => ({ kind, count }));
  }, [parseResult]);

  const hasPII = piiSummary.length > 0;

  // ----------------------------------------------------------------
  // Confirmar / criar template
  // ----------------------------------------------------------------
  const handleConfirm = async () => {
    if (!form.nome.trim()) {
      toast({ title: "Nome obrigatório", description: "Informe um nome para o modelo.", variant: "destructive" });
      return;
    }
    const nome = form.nome.startsWith("Modelo - ") ? form.nome.trim() : `Modelo - ${form.nome.trim()}`;
    const variaveis = variaveisFinais;

    // Gate de "0 variáveis": criação bloqueada até confirmação explícita.
    if (importGate.createBlocked) {
      toast({
        title: "Confirmação necessária",
        description: "Marque a confirmação para criar um modelo sem variáveis.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createTemplate({
        nome,
        descricao: form.descricao,
        tipo: form.tipo,
        conteudo: finalHtml,
        variaveis,
        // Mapeamento aplicado — auditoria e re-import (1.2, item 4).
        import_metadata: buildImportMetadata({
          filename: fileName,
          importedAt: new Date().toISOString(),
          rows,
        }),
      });
      if (variaveis.length === 0) {
        toast({
          title: "Modelo criado sem variáveis",
          description: "Nenhum campo preenchível foi detectado — este modelo não substituirá dados.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Modelo importado", description: `${variaveis.length} variáveis detectadas.` });
      }
      handleClose(false);
    } catch (err) {
      // O toast de erro amigável (PT-BR) já é emitido pelo onError de useTemplates.
      // Aqui só registramos o detalhe técnico no console — sem toast duplicado.
      console.error("[ImportDocx] falha ao criar modelo:", err);
    }
  };

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar modelo de .docx — Passo {step} de 4
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Envie um arquivo .docx para extrairmos o conteúdo e detectarmos os campos."}
            {step === 2 && "Revise o destino de TODOS os campos detectados ({{chave}}, [rótulo] e lacunas ______)."}
            {step === 3 && "Verificação de dados pessoais (PII) no conteúdo importado."}
            {step === 4 && "Preview final e nomeação do modelo."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-[320px] flex-1 overflow-y-auto pr-1">
          {/* ===================== Step 1 — Upload ===================== */}
          {step === 1 && (
            <div className="space-y-4">
              {!parseResult ? (
                <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
                  <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="mb-3 text-sm text-muted-foreground">
                    Selecione um arquivo .docx (até 5 MB).
                  </p>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".docx"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleFileSelected(f);
                    }}
                    disabled={isUploading}
                  />
                  {isUploading && (
                    <div className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processando…
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Alert>
                    <Check className="h-4 w-4" />
                    <AlertTitle>Arquivo processado</AlertTitle>
                    <AlertDescription>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <span>Campos detectados: <strong>{rows.length}</strong></span>
                        <span>
                          Chaves {"{{ }}"}: <strong>{detectionStats.curly}</strong> · Rótulos [ ]:{" "}
                          <strong>{detectionStats.bracket}</strong> · Lacunas ____:{" "}
                          <strong>{detectionStats.underscore}</strong>
                        </span>
                        <span>Com sugestão automática: <strong>{summary.mapped}</strong></span>
                        <span>Marcadores PII detectados: <strong>{parseResult.piiMatches.length}</strong></span>
                      </div>
                    </AlertDescription>
                  </Alert>

                  {parseResult.warnings.length > 0 && (
                    <Alert className="border-warning/50 bg-warning/10">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      <AlertTitle className="text-warning">Limitações da conversão</AlertTitle>
                      <AlertDescription>
                        <ul className="mt-2 list-disc pl-5 text-xs space-y-1">
                          {parseResult.warnings.map((w, i) => (<li key={i}>{w}</li>))}
                        </ul>
                        <p className="mt-2 text-xs">
                          Tabelas com células mescladas e imagens são descartadas. Revise o preview no passo 4 antes de confirmar.
                        </p>
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </div>
          )}

          {/* ===================== Step 2 — Tela de mapeamento ===================== */}
          {step === 2 && parseResult && (
            <div className="space-y-3">
              {rows.length === 0 ? (
                <Alert>
                  <Check className="h-4 w-4" />
                  <AlertTitle>Nada a mapear</AlertTitle>
                  <AlertDescription>Nenhum campo foi detectado no documento.</AlertDescription>
                </Alert>
              ) : (
                <ScrollArea className="h-[340px] pr-3">
                  <div className="space-y-3">
                    {rows.map((row, idx) => {
                      const { detection } = row;
                      return (
                        <div
                          key={`${detection.raw}-${detection.occurrenceIndex}-${idx}`}
                          className="rounded-lg border border-border p-3"
                        >
                          <div className="mb-2 flex items-center gap-2">
                            <Badge variant="outline" className="shrink-0 font-mono text-[10px]">
                              {SYNTAX_LABELS[detection.syntax]}
                            </Badge>
                            <code className="max-w-[280px] truncate rounded bg-muted px-2 py-0.5 text-xs">
                              {detection.raw}
                            </code>
                            <Badge variant={CONFIDENCE_VARIANTS[detection.confidence]} className="text-[10px]">
                              {CONFIDENCE_LABELS[detection.confidence]}
                            </Badge>
                            <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                              ocorrência #{detection.occurrenceIndex + 1}
                            </span>
                          </div>
                          <p className="mb-2 text-xs text-muted-foreground italic">
                            …{detection.context}…
                          </p>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs whitespace-nowrap">Destino:</Label>
                            {/* Sempre controlado: "" (linha em revisão) exibe o placeholder. */}
                            <Select
                              value={
                                row.action === "map"
                                  ? row.targetKey
                                  : row.action === "ignore"
                                    ? "__ignore__"
                                    : ""
                              }
                              onValueChange={(v) => setRowDecision(idx, v)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Selecionar destino…" />
                              </SelectTrigger>
                              <SelectContent>
                                {detection.candidates.length > 0 && (
                                  <SelectGroup>
                                    <SelectLabel className="text-[10px]">Sugestões</SelectLabel>
                                    {detection.candidates.map((k) => (
                                      <SelectItem key={k} value={k}>
                                        {`{{${k}}}`}
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                )}
                                <SelectItem value="__ignore__">— Ignorar (manter original) —</SelectItem>
                                {CATALOG_GROUPS.map((group) => {
                                  const keys = group.keys.filter((k) => !detection.candidates.includes(k));
                                  if (keys.length === 0) return null;
                                  return (
                                    <SelectGroup key={group.category}>
                                      <SelectLabel className="text-[10px]">{group.category}</SelectLabel>
                                      {keys.map((k) => (
                                        <SelectItem key={k} value={k}>
                                          {`{{${k}}}`}
                                        </SelectItem>
                                      ))}
                                    </SelectGroup>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}

              {rows.length > 0 && (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">{summary.mapped}</strong> mapeados ·{" "}
                    <strong className={summary.toReview > 0 ? "text-warning" : "text-foreground"}>
                      {summary.toReview}
                    </strong>{" "}
                    a revisar · <strong className="text-foreground">{summary.ignored}</strong> ignorados
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={summary.toReview === 0}
                    onClick={() => setBulkIgnoreOpen(true)}
                  >
                    <Ban className="mr-1 h-3 w-3" />
                    Ignorar todos os restantes ({summary.toReview})
                  </Button>
                </div>
              )}

              <AlertDialog open={bulkIgnoreOpen} onOpenChange={setBulkIgnoreOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Ignorar {summary.toReview} {summary.toReview === 1 ? "campo restante" : "campos restantes"}?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Os campos ignorados permanecerão como texto original no modelo e não serão
                      preenchidos automaticamente ao gerar contratos. Esta ação afeta apenas os{" "}
                      {summary.toReview} {summary.toReview === 1 ? "campo pendente" : "campos pendentes"} de
                      revisão — os já mapeados não mudam.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Voltar e revisar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        setRows((prev) => ignoreAllPending(prev));
                        setBulkIgnoreOpen(false);
                      }}
                    >
                      Ignorar {summary.toReview === 1 ? "campo" : "campos"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {/* ===================== Step 3 — PII ===================== */}
          {step === 3 && parseResult && (
            <div className="space-y-4">
              {!hasPII ? (
                <Alert>
                  <Shield className="h-4 w-4 text-success" />
                  <AlertTitle>Nenhum dado pessoal detectado</AlertTitle>
                  <AlertDescription>O documento aparenta ser um modelo limpo. Pode prosseguir.</AlertDescription>
                </Alert>
              ) : (
                <>
                  <Alert className="border-destructive/50 bg-destructive/10">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <AlertTitle className="text-destructive">
                      Dados pessoais reais detectados
                    </AlertTitle>
                    <AlertDescription>
                      O documento contém o que aparenta ser PII. Modelos devem ter apenas placeholders, não dados reais.
                    </AlertDescription>
                  </Alert>

                  <div className="rounded-lg border border-border p-3">
                    <p className="mb-2 text-xs font-semibold text-foreground">Resumo:</p>
                    <ul className="space-y-1 text-xs">
                      {piiSummary.map(({ kind, count }) => (
                        <li key={kind} className="flex justify-between">
                          <span>{PII_LABELS[kind] ?? kind}</span>
                          <Badge variant="destructive">{count}</Badge>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <ScrollArea className="h-[140px] rounded-lg border border-border p-3">
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {parseResult.piiMatches.slice(0, 30).map((m, i) => (
                        <li key={i}>
                          <code className="font-mono">{m.value}</code>
                          <span className="ml-2">— {m.hint}</span>
                        </li>
                      ))}
                      {parseResult.piiMatches.length > 30 && (
                        <li className="italic">
                          … e mais {parseResult.piiMatches.length - 30} ocorrências.
                        </li>
                      )}
                    </ul>
                  </ScrollArea>

                  <div className="flex items-start gap-2 rounded-lg border border-warning/50 bg-warning/10 p-3">
                    <Checkbox
                      id="pii-ack"
                      checked={piiAcknowledged}
                      onCheckedChange={(v) => setPiiAcknowledged(v === true)}
                    />
                    <Label htmlFor="pii-ack" className="text-xs leading-relaxed">
                      Confirmo que revisei o documento e removi ou anonimizei todos os dados pessoais reais antes de salvar como modelo.
                    </Label>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ===================== Step 4 — Confirmar ===================== */}
          {step === 4 && parseResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nome do modelo *</Label>
                  <Input
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    maxLength={120}
                    placeholder="Ex: Compra e venda padrão"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Descrição</Label>
                <Textarea
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  rows={2}
                  maxLength={500}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Preview do conteúdo final (HTML sanitizado)</Label>
                <ScrollArea className="h-[220px] rounded-lg border border-border p-3">
                  <div
                    className="prose prose-sm max-w-none text-foreground"
                    dangerouslySetInnerHTML={{ __html: finalHtml || sanitizedRawPreview }}
                  />
                </ScrollArea>
                <p className="text-[10px] text-muted-foreground">
                  Variáveis detectadas: <strong>{variaveisFinais.length}</strong>
                </p>
              </div>

              {/* Gate de "0 variáveis" (Fase 0 — item 3) */}
              {importGate.showZeroVariablesWarning && (
                <Alert className="border-destructive/50 bg-destructive/10">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <AlertTitle className="text-destructive">Nenhuma variável detectada</AlertTitle>
                  <AlertDescription>
                    <p className="text-xs">
                      Este modelo não terá campos preenchíveis: ao gerar um contrato, nada será
                      substituído automaticamente. O importador reconhece três formatos de campo:
                    </p>
                    <ul className="mt-2 list-disc pl-5 text-xs space-y-1">
                      <li><code className="rounded bg-muted px-1">{"{{campo}}"}</code> — chave moderna em snake_case.</li>
                      <li><code className="rounded bg-muted px-1">[RÓTULO DO CAMPO]</code> — rótulo entre colchetes (com sugestão automática).</li>
                      <li><code className="rounded bg-muted px-1">______</code> — lacuna de underscores (3 ou mais).</li>
                    </ul>
                    <p className="mt-2 text-xs">
                      Nenhum campo foi mapeado neste documento. Revise o passo 2 ou continue por sua conta e risco.
                    </p>
                    <div className="mt-3 flex items-start gap-2 rounded-lg border border-warning/50 bg-warning/10 p-2">
                      <Checkbox
                        id="zero-vars-ack"
                        checked={zeroVarsAck}
                        onCheckedChange={(v) => setZeroVarsAck(v === true)}
                      />
                      <Label htmlFor="zero-vars-ack" className="text-xs leading-relaxed">
                        Entendo que este modelo não tem campos preenchíveis e quero criá-lo mesmo assim.
                      </Label>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 shrink-0">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3 | 4)} disabled={isCreating}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="ghost" onClick={() => handleClose(false)} disabled={isCreating}>
            <X className="mr-1 h-4 w-4" /> Cancelar
          </Button>
          {step < 4 && (
            <Button
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3 | 4)}
              disabled={
                (step === 1 && !parseResult) ||
                (step === 2 && !mappingResolved) ||
                (step === 3 && hasPII && !piiAcknowledged)
              }
              title={
                step === 2 && !mappingResolved
                  ? `Resolva os ${summary.toReview} campos pendentes de revisão (ou use "Ignorar todos os restantes")`
                  : step === 3 && hasPII && !piiAcknowledged
                    ? "Marque a confirmação para prosseguir"
                    : undefined
              }
            >
              Próximo <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
          {step === 4 && (
            <Button
              onClick={handleConfirm}
              disabled={isCreating || !form.nome.trim() || importGate.createBlocked}
              title={importGate.createBlocked ? "Marque a confirmação para criar um modelo sem variáveis" : undefined}
            >
              {isCreating ? (<><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Salvando…</>) : (<><Check className="mr-1 h-4 w-4" /> Criar modelo</>)}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
