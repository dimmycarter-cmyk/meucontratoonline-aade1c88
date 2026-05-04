import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { maskCEP } from "@/lib/masks";
import { useCepLookup } from "@/hooks/useCepLookup";

export interface AddressData {
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
}

interface AddressFormProps {
  value: AddressData;
  onChange: (field: keyof AddressData, value: string) => void;
  disabled?: boolean;
}

export function AddressForm({ value, onChange, disabled }: AddressFormProps) {
  const onCepResult = useCallback(
    (data: { rua: string; bairro: string; cidade: string; estado: string }) => {
      onChange("rua", data.rua);
      onChange("bairro", data.bairro);
      onChange("cidade", data.cidade);
      onChange("estado", data.estado);
    },
    [onChange]
  );
  const { lookup } = useCepLookup(onCepResult);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label>CEP</Label>
        <Input
          value={value.cep}
          onChange={(e) => {
            const masked = maskCEP(e.target.value);
            onChange("cep", masked);
            lookup(masked);
          }}
          placeholder="00000-000"
          disabled={disabled}
        />
      </div>
      <div />
      <div className="space-y-2 sm:col-span-2">
        <Label>Rua / Avenida</Label>
        <Input value={value.rua} onChange={(e) => onChange("rua", e.target.value)} disabled={disabled} />
      </div>
      <div className="space-y-2">
        <Label>Número</Label>
        <Input value={value.numero} onChange={(e) => onChange("numero", e.target.value)} disabled={disabled} />
      </div>
      <div className="space-y-2">
        <Label>Complemento</Label>
        <Input value={value.complemento} onChange={(e) => onChange("complemento", e.target.value)} disabled={disabled} />
      </div>
      <div className="space-y-2">
        <Label>Bairro</Label>
        <Input value={value.bairro} onChange={(e) => onChange("bairro", e.target.value)} disabled={disabled} />
      </div>
      <div className="space-y-2">
        <Label>Cidade</Label>
        <Input value={value.cidade} onChange={(e) => onChange("cidade", e.target.value)} disabled={disabled} />
      </div>
      <div className="space-y-2">
        <Label>UF</Label>
        <Input
          value={value.estado}
          onChange={(e) => onChange("estado", e.target.value)}
          maxLength={2}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
