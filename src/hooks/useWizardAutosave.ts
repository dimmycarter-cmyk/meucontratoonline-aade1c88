import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AutosaveOptions {
  contratoId: string | null;
  /** `dados` PLANO (vendedor_*, …) — gravado no topo p/ leitores (Detalhe/lista). */
  dadosPlano: Record<string, unknown>;
  /** Snapshot completo do wizard — gravado em `wizard_state` p/ retomada lossless. */
  wizardState: Record<string, unknown>;
  currentStep: string;
  enabled: boolean; // false enquanto !hydrated ou status !== 'rascunho' (guard anti-clobber)
}

export function useWizardAutosave({
  contratoId,
  dadosPlano,
  wizardState,
  currentStep,
  enabled,
}: AutosaveOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef<string>("");

  const save = useCallback(async () => {
    if (!contratoId || !enabled) return;
    const snapshot = JSON.stringify({ dadosPlano, wizardState, currentStep });
    if (snapshot === lastSaved.current) return;

    try {
      const { error } = await supabase
        .from("contracts")
        .update({
          dados: dadosPlano as any,
          wizard_state: wizardState as any,
          current_step: currentStep,
        })
        .eq("id", contratoId)
        .eq("status", "rascunho");
      if (!error) lastSaved.current = snapshot;
    } catch {
      if (import.meta.env.DEV) console.warn("[autosave] falhou:", contratoId);
    }
  }, [contratoId, dadosPlano, wizardState, currentStep, enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(save, 3000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [dadosPlano, wizardState, currentStep, save, enabled]);

  const saveNow = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    await save();
  }, [save]);

  return { saveNow };
}
