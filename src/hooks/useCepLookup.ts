import { useCallback, useRef } from "react";

interface CepResult {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export const useCepLookup = (
  onResult: (data: { rua: string; bairro: string; cidade: string; estado: string }) => void
) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lookup = useCallback(
    (cep: string) => {
      const digits = cep.replace(/\D/g, "");
      if (digits.length !== 8) return;

      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
          const data: CepResult = await res.json();
          if (!data.erro) {
            onResult({
              rua: data.logradouro || "",
              bairro: data.bairro || "",
              cidade: data.localidade || "",
              estado: data.uf || "",
            });
          }
        } catch {
          // silently fail
        }
      }, 500);
    },
    [onResult]
  );

  return { lookup };
};
