import { ChevronLeft, ChevronRight, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WizardActionsProps {
  /** Mostra a barra "Voltar / Próximo" (passos intermediários). */
  showNavigation: boolean;
  /** Mostra apenas "Voltar" (passo final editor-finish). */
  showBackOnly: boolean;
  canProceed: boolean;
  blockReason: string | null;
  onBack: () => void;
  onNext: () => void;
  /** Habilitação do "Salvar Rascunho" persistente (regra anti-lixo). */
  canSaveDraft: boolean;
  /** Persiste o rascunho SEM navegar (permanece na etapa). */
  onSaveDraft: () => void;
  /** Save de rascunho em voo. */
  isSavingDraft: boolean;
  /** Geração/save final de contrato em voo (guarda de reentrância). */
  isCreating: boolean;
  isSaving: boolean;
}

/**
 * Barra inferior de navegação do wizard de Novo Contrato.
 * Extraído de NovoContrato.tsx (Lote F.2 — Leva 3).
 *
 * O botão "Salvar Rascunho" é persistente em toda etapa a partir da 2ª
 * (branches showNavigation e showBackOnly); oculto na seleção (branch null).
 */
export default function WizardActions({
  showNavigation,
  showBackOnly,
  canProceed,
  blockReason,
  onBack,
  onNext,
  canSaveDraft,
  onSaveDraft,
  isSavingDraft,
  isCreating,
  isSaving,
}: WizardActionsProps) {
  // Guarda de reentrância: não salva rascunho no meio de outra escrita.
  const draftDisabled = !canSaveDraft || isSavingDraft || isCreating || isSaving;
  const draftButton = (
    <Button variant="secondary" onClick={onSaveDraft} disabled={draftDisabled}>
      <Save className="mr-1 h-4 w-4" />
      {isSavingDraft ? "Salvando…" : "Salvar Rascunho"}
    </Button>
  );

  if (showNavigation) {
    return (
      <div className="mt-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onBack}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
          </Button>
          {draftButton}
        </div>
        <div className="flex items-center gap-3">
          {blockReason && (
            <span className="max-w-sm text-right text-xs text-muted-foreground">
              {blockReason}
            </span>
          )}
          <Button disabled={!canProceed} onClick={onNext} title={blockReason ?? undefined}>
            Próximo
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (showBackOnly) {
    return (
      <div className="mt-6 flex items-center gap-3">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
        </Button>
        {draftButton}
      </div>
    );
  }

  return null;
}
