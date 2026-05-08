import { Control, FieldValues, Path, UseFormSetValue, PathValue } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { maskCEP } from "@/lib/masks";
import { useCepLookup } from "@/hooks/useCepLookup";

export type AddressFieldKey =
  | "cep"
  | "rua"
  | "numero"
  | "complemento"
  | "bairro"
  | "cidade"
  | "estado";

interface AddressFormRHFProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  setValue: UseFormSetValue<TFieldValues>;
  fieldNames: Record<AddressFieldKey, Path<TFieldValues>>;
  disabled?: boolean;
  /** Mostra `*` no label. Defaults: todos true exceto `complemento`. */
  requiredFields?: Partial<Record<AddressFieldKey, boolean>>;
}

const DEFAULT_REQUIRED: Record<AddressFieldKey, boolean> = {
  cep: true,
  rua: true,
  numero: true,
  complemento: false,
  bairro: true,
  cidade: true,
  estado: true,
};

export function AddressFormRHF<TFieldValues extends FieldValues>({
  control,
  setValue,
  fieldNames,
  disabled,
  requiredFields,
}: AddressFormRHFProps<TFieldValues>) {
  const required = { ...DEFAULT_REQUIRED, ...(requiredFields ?? {}) };
  const star = (k: AddressFieldKey) => (required[k] ? " *" : "");

  const { lookup } = useCepLookup((data) => {
    setValue(fieldNames.rua, (data.rua ?? "") as PathValue<TFieldValues, Path<TFieldValues>>);
    setValue(fieldNames.bairro, (data.bairro ?? "") as PathValue<TFieldValues, Path<TFieldValues>>);
    setValue(fieldNames.cidade, (data.cidade ?? "") as PathValue<TFieldValues, Path<TFieldValues>>);
    setValue(fieldNames.estado, (data.estado ?? "") as PathValue<TFieldValues, Path<TFieldValues>>);
  });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        control={control}
        name={fieldNames.cep}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{`CEP${star("cep")}`}</FormLabel>
            <FormControl>
              <Input
                placeholder="00000-000"
                disabled={disabled}
                value={(field.value as string) ?? ""}
                onChange={(e) => {
                  const masked = maskCEP(e.target.value);
                  field.onChange(masked);
                  lookup(masked);
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div />

      <FormField
        control={control}
        name={fieldNames.rua}
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>{`Rua / Avenida${star("rua")}`}</FormLabel>
            <FormControl>
              <Input placeholder="Rua das Flores" disabled={disabled} {...field} value={(field.value as string) ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={fieldNames.numero}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{`Número${star("numero")}`}</FormLabel>
            <FormControl>
              <Input placeholder="123" disabled={disabled} {...field} value={(field.value as string) ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={fieldNames.complemento}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{`Complemento${star("complemento")}`}</FormLabel>
            <FormControl>
              <Input placeholder="Sala 01" disabled={disabled} {...field} value={(field.value as string) ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={fieldNames.bairro}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{`Bairro${star("bairro")}`}</FormLabel>
            <FormControl>
              <Input placeholder="Centro" disabled={disabled} {...field} value={(field.value as string) ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={fieldNames.cidade}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{`Cidade${star("cidade")}`}</FormLabel>
            <FormControl>
              <Input placeholder="Belo Horizonte" disabled={disabled} {...field} value={(field.value as string) ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={fieldNames.estado}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{`UF${star("estado")}`}</FormLabel>
            <FormControl>
              <Input placeholder="MG" maxLength={2} disabled={disabled} {...field} value={(field.value as string) ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
