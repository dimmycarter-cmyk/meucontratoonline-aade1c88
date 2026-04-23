import { AlertTriangle, Check, Printer } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RichTextEditor from "@/components/RichTextEditor";
import type { UnresolvedItem } from "@/components/contract/UnresolvedPlaceholdersDialog";
import type { Clause } from "@/hooks/useClauses";

interface SummaryEntity {
  nome?: string | null;
}

interface WizardStepEditorProps {
  conteudoFinal: string;
  onConteudoChange: (html: string) => void;
  liveUnresolved: UnresolvedItem[];
  onShowPendencias: () => void;
  selectedClauses: Clause[];
  selectedTemplateName?: string;
  compradorNome?: string;
  vendedorNome?: string;
  empresaNome?: string;
  isSaving: boolean;
  onSaveClick: () => void;
  onPrintClick: () => void;
}

/**
 * Step 4 (editor-finish) do wizard de Novo Contrato.
 * Extraído de NovoContrato.tsx (Lote F.1 — Leva 3).
 *
 * Mantém comportamento original: alerta amarelo de pendências,
 * editor TipTap, lista de cláusulas, summary cards, preview e
 * botões Salvar / Exportar PDF.
 */
export default function WizardStepEditor({
  conteudoFinal,
  onConteudoChange,
  liveUnresolved,
  onShowPendencias,
  selectedClauses,
  selectedTemplateName,
  compradorNome,
  vendedorNome,
  empresaNome,
  isSaving,
  onSaveClick,
  onPrintClick,
}: WizardStepEditorProps) {
  return (
    <div className="space-y-6">
      <h2 className="font-display text-lg font-semibold text-foreground">Editor do Contrato</h2>
      <p className="text-sm text-muted-foreground">Revise e ajuste o conteúdo final do contrato.</p>

      {liveUnresolved.length > 0 && (
        <Alert className="border-warning/50 bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertTitle className="text-warning">
            {liveUnresolved.length} campo{liveUnresolved.length > 1 ? "s" : ""} sem dados
          </AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3">
            <span className="text-sm">
              Existem placeholders não resolvidos no contrato. A exportação para PDF está bloqueada até que sejam corrigidos.
            </span>
            <Button size="sm" variant="outline" onClick={onShowPendencias}>
              Ver pendências
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <RichTextEditor
        content={conteudoFinal}
        onChange={onConteudoChange}
        placeholder="Conteúdo do contrato..."
      />

      {selectedClauses.length > 0 && (
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Cláusulas selecionadas ({selectedClauses.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedClauses.map((c, i) => (
                <div key={c.id} className="rounded-md border border-border p-3">
                  <p className="text-xs font-semibold text-foreground">
                    Cláusula {i + 1}ª — {c.titulo}
                  </p>
                  <div
                    className="mt-1 text-xs text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: c.conteudo }}
                  />
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
            <p className="text-sm font-medium text-foreground">{selectedTemplateName || "—"}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Comprador</p>
            <p className="text-sm font-medium text-foreground">{compradorNome || "—"}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Vendedor</p>
            <p className="text-sm font-medium text-foreground">{vendedorNome || "—"}</p>
          </CardContent>
        </Card>
      </div>

      {empresaNome && (
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Empresa</p>
            <p className="text-sm font-medium text-foreground">{empresaNome}</p>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Preview do Contrato</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="prose prose-sm max-w-none rounded-md border border-border p-4 text-foreground"
            dangerouslySetInnerHTML={{ __html: conteudoFinal }}
          />
          {selectedClauses.length > 0 && (
            <div className="mt-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                Cláusulas ({selectedClauses.length})
              </h3>
              {selectedClauses.map((c, i) => (
                <div key={c.id} className="rounded-md border border-border p-3">
                  <p className="text-xs font-semibold">
                    Cláusula {i + 1}ª — {c.titulo}
                  </p>
                  <div
                    className="mt-1 text-xs text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: c.conteudo }}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={onSaveClick} disabled={isSaving} className="gap-2">
          <Check className="h-4 w-4" />
          {isSaving ? "Salvando..." : "Salvar Contrato"}
        </Button>
        <Button variant="outline" onClick={onPrintClick} className="gap-2">
          <Printer className="h-4 w-4" />
          Exportar PDF
        </Button>
      </div>
    </div>
  );
}
