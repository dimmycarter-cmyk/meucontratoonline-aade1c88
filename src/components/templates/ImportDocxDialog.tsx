import { useState, useRef, useMemo } from "react";
import DOMPurify from "dompurify";
import {
  Upload, FileText, AlertTriangle, Shield, Check, X, Loader2, ChevronRight, ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useTemplates } from "@/hooks/useTemplates";
import { supabase } from "@/integrations/supabase/client";
import { resolveAmbiguousLabels, extractVariables, type ResolvedLabel } from "@/lib/placeholder";

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

interface MappingDecision {
  /** "" = ignorar (não substituir) */
  targetKey: string;
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

export default function ImportDocxDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const { createTemplate, isCreating } = useTemplates();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isUploading, setIsUploading] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResponse | null>(null);
  const [resolved, setResolved] = useState<ResolvedLabel[]>([]);
  const [mapping, setMapping] = useState<Record<number, MappingDecision>>({});
  const [piiAcknowledged, setPiiAcknowledged] = useState(false);
  const [form, setForm] = useState({ nome: "", descricao: "", tipo: "Compra e Venda" });

  const reset = () => {
    setStep(1);
    setIsUploading(false);
    setParseResult(null);
    setResolved([]);
    setMapping({});
    setPiiAcknowledged(false);
    setForm({ nome: "", descricao: "", tipo: "Compra e Venda" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  // ----------------------------------------------------------------
  // Step 1 — Upload
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

      // Sugere mapeamento via heurística client-side
      const resolvedList = resolveAmbiguousLabels(result.text, result.ambiguousLabels);
      const initialMapping: Record<number, MappingDecision> = {};
      resolvedList.forEach((r, i) => {
        initialMapping[i] = { targetKey: r.suggestedKey };
      });

      setParseResult(result);
      setResolved(resolvedList);
      setMapping(initialMapping);

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
  // Step 4 — Conteúdo final (substitui labels conforme mapeamento)
  // ----------------------------------------------------------------
  const finalHtml = useMemo(() => {
    if (!parseResult) return "";

    let html = parseResult.html;
    // Aplica mapeamento de labels ambíguos. Para evitar substituir múltiplas
    // ocorrências erroneamente, percorre `resolved` em ordem reversa (mais
    // alto occurrenceIndex primeiro) usando split-and-join controlado.
    const grouped = new Map<string, ResolvedLabel[]>();
    resolved.forEach((r) => {
      const arr = grouped.get(r.raw) ?? [];
      arr.push(r);
      grouped.set(r.raw, arr);
    });

    for (const [raw, items] of grouped.entries()) {
      const escapedRaw = raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(escapedRaw, "g");
      let n = 0;
      html = html.replace(re, () => {
        const decision = mapping[resolved.findIndex((r) => r === items[n])];
        n++;
        if (!decision || !decision.targetKey) return raw; // mantém original
        return `{{${decision.targetKey}}}`;
      });
    }

    return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  }, [parseResult, resolved, mapping]);

  const sanitizedRawPreview = useMemo(
    () => (parseResult ? DOMPurify.sanitize(parseResult.html, { USE_PROFILES: { html: true } }) : ""),
    [parseResult]
  );

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
    const variaveis = extractVariables(finalHtml);

    try {
      await createTemplate({
        nome,
        descricao: form.descricao,
        tipo: form.tipo,
        conteudo: finalHtml,
        variaveis,
      });
      toast({ title: "Modelo importado", description: `${variaveis.length} variáveis detectadas.` });
      handleClose(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao salvar.";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    }
  };

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar modelo de .docx — Passo {step} de 4
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Envie um arquivo .docx para extrairmos o conteúdo e detectarmos placeholders."}
            {step === 2 && "Revise o mapeamento dos placeholders genéricos detectados."}
            {step === 3 && "Verificação de dados pessoais (PII) no conteúdo importado."}
            {step === 4 && "Preview final e nomeação do modelo."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-[320px]">
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
                        <span>Placeholders já mapeados: <strong>{parseResult.knownPlaceholders.length}</strong></span>
                        <span>Labels ambíguos: <strong>{parseResult.ambiguousLabels.length}</strong></span>
                        <span>Marcadores PII detectados: <strong>{parseResult.piiMatches.length}</strong></span>
                        <span>Tamanho do texto: <strong>{parseResult.text.length} chars</strong></span>
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

          {/* ===================== Step 2 — Mapeamento ===================== */}
          {step === 2 && parseResult && (
            <div className="space-y-3">
              {resolved.length === 0 ? (
                <Alert>
                  <Check className="h-4 w-4" />
                  <AlertTitle>Nada a mapear</AlertTitle>
                  <AlertDescription>Nenhum label ambíguo foi encontrado no documento.</AlertDescription>
                </Alert>
              ) : (
                <ScrollArea className="h-[380px] pr-3">
                  <div className="space-y-3">
                    {resolved.map((r, idx) => {
                      const decision = mapping[idx] ?? { targetKey: r.suggestedKey };
                      return (
                        <div key={idx} className="rounded-lg border border-border p-3">
                          <div className="mb-2 flex items-center gap-2">
                            <code className="rounded bg-muted px-2 py-0.5 text-xs">{r.raw}</code>
                            <Badge
                              variant={r.confidence === "high" ? "default" : "secondary"}
                              className="text-[10px]"
                            >
                              {r.confidence === "high" ? "Alta confiança" : "Baixa confiança"}
                            </Badge>
                            <span className="ml-auto text-[10px] text-muted-foreground">
                              ocorrência #{r.occurrenceIndex + 1}
                            </span>
                          </div>
                          <p className="mb-2 text-xs text-muted-foreground italic">
                            …{r.context}…
                          </p>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs whitespace-nowrap">Mapear para:</Label>
                            <Select
                              value={decision.targetKey || "__ignore__"}
                              onValueChange={(v) =>
                                setMapping((m) => ({
                                  ...m,
                                  [idx]: { targetKey: v === "__ignore__" ? "" : v },
                                }))
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__ignore__">— Ignorar (manter original) —</SelectItem>
                                {r.suggestedKeys.map((k) => (
                                  <SelectItem key={k} value={k}>
                                    {`{{${k}}}`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
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
                  Variáveis detectadas: <strong>{extractVariables(finalHtml).length}</strong>
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
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
                (step === 3 && hasPII && !piiAcknowledged)
              }
              title={
                step === 3 && hasPII && !piiAcknowledged
                  ? "Marque a confirmação para prosseguir"
                  : undefined
              }
            >
              Próximo <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
          {step === 4 && (
            <Button onClick={handleConfirm} disabled={isCreating || !form.nome.trim()}>
              {isCreating ? (<><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Salvando…</>) : (<><Check className="mr-1 h-4 w-4" /> Criar modelo</>)}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
