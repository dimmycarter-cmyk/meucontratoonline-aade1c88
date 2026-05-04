import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AutosaveOptions {
  contratoId: string | null;
  dados: Record<string, unknown>;
  currentStep: string;
  enabled: boolean; // false quando status !== 'rascunho'
}

export function useWizardAutosave({
  contratoId,
  dados,
  currentStep,
  enabled,
}: AutosaveOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef<string>("");

  const save = useCallback(async () => {
    if (!contratoId || !enabled) return;
    const snapshot = JSON.stringify({ dados, currentStep });
    if (snapshot === lastSaved.current) return;

    try {
      const { error } = await supabase
        .from("contracts")
        .update({ dados: dados as any, current_step: currentStep })
        .eq("id", contratoId)
        .eq("status", "rascunho");
      if (!error) lastSaved.current = snapshot;
    } catch {
      if (import.meta.env.DEV) console.warn("[autosave] falhou:", contratoId);
    }
  }, [contratoId, dados, currentStep, enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(save, 3000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [dados, currentStep, save, enabled]);

  const saveNow = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    await save();
  }, [save]);

  return { saveNow };
}
