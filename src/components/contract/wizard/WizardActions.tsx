import { ChevronLeft, ChevronRight } from "lucide-react";
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
}

/**
 * Barra inferior de navegação do wizard de Novo Contrato.
 * Extraído de NovoContrato.tsx (Lote F.2 — Leva 3).
 */
export default function WizardActions({
  showNavigation,
  showBackOnly,
  canProceed,
  blockReason,
  onBack,
  onNext,
}: WizardActionsProps) {
  if (showNavigation) {
    return (
      <div className="mt-6 flex items-center justify-between gap-4">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
        </Button>
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
      <div className="mt-6">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
        </Button>
      </div>
    );
  }

  return null;
}
