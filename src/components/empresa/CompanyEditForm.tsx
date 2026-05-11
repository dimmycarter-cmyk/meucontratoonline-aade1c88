import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AddressForm, AddressData } from "@/components/ui/AddressForm";
import { maskCNPJ, maskPhone } from "@/lib/masks";
import { cnpjSchema } from "@/lib/validators";

/**
 * Shape do form da empresa — todos os campos editáveis em
 * Empresas.tsx (super_admin) e Configuracoes.tsx (imobiliária).
 */
export interface CompanyFormData {
  nome_fantasia: string;
  razao_social: string;
  cnpj: string;
  creci: string;
  whatsapp: string;
  email: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  banco: string;
  agencia: string;
  conta: string;
  pix: string;
}

export const emptyCompanyForm: CompanyFormData = {
  nome_fantasia: "",
  razao_social: "",
  cnpj: "",
  creci: "",
  whatsapp: "",
  email: "",
  cep: "",
  rua: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  banco: "",
  agencia: "",
  conta: "",
  pix: "",
};

export function companyToFormData(company: Record<string, unknown> | null | undefined): CompanyFormData {
  if (!company) return { ...emptyCompanyForm };
  const get = (key: string) => {
    const v = company[key];
    return v == null ? "" : String(v);
  };
  return {
    nome_fantasia: get("nome_fantasia"),
    razao_social: get("razao_social"),
    cnpj: get("cnpj"),
    creci: get("creci"),
    whatsapp: get("whatsapp"),
    email: get("email"),
    cep: get("cep"),
    rua: get("rua"),
    numero: get("numero"),
    complemento: get("complemento"),
    bairro: get("bairro"),
    cidade: get("cidade"),
    estado: get("estado"),
    banco: get("banco"),
    agencia: get("agencia"),
    conta: get("conta"),
    pix: get("pix"),
  };
}

interface CompanyEditFormProps {
  value: CompanyFormData;
  onChange: (next: CompanyFormData) => void;
  onSubmit: (data: CompanyFormData) => void | Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  /** Quando true, abre a seção bancária expandida no carregamento. */
  expandBancarioInicial?: boolean;
}

export function CompanyEditForm({
  value,
  onChange,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = "Salvar",
  expandBancarioInicial = false,
}: CompanyEditFormProps) {
  const [cnpjError, setCnpjError] = useState("");

  const updateField = (field: keyof CompanyFormData, v: string) => {
    onChange({ ...value, [field]: v });
  };

  const handleAddressChange = (field: keyof AddressData, v: string) => {
    onChange({ ...value, [field]: v } as CompanyFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(value);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>Nome Fantasia *</Label>
          <Input
            value={value.nome_fantasia}
            onChange={(e) => updateField("nome_fantasia", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Razão Social</Label>
          <Input
            value={value.razao_social}
            onChange={(e) => updateField("razao_social", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>CNPJ</Label>
          <Input
            value={value.cnpj}
            onChange={(e) => updateField("cnpj", maskCNPJ(e.target.value))}
            onBlur={(e) => {
              if (!e.target.value) {
                setCnpjError("");
                return;
              }
              const result = cnpjSchema.safeParse(e.target.value);
              setCnpjError(result.success ? "" : result.error.issues[0].message);
            }}
            placeholder="00.000.000/0001-00"
          />
          {cnpjError && <p className="text-xs text-destructive">{cnpjError}</p>}
        </div>
        <div className="space-y-2">
          <Label>CRECI</Label>
          <Input
            value={value.creci}
            onChange={(e) => updateField("creci", e.target.value)}
            placeholder="Ex.: CRECI-MG 12345-J"
          />
        </div>
        <div className="space-y-2">
          <Label>WhatsApp</Label>
          <Input
            value={value.whatsapp}
            onChange={(e) => updateField("whatsapp", maskPhone(e.target.value))}
            placeholder="(31) 99999-5858"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>E-mail</Label>
          <Input
            type="email"
            value={value.email}
            onChange={(e) => updateField("email", e.target.value)}
          />
        </div>
      </div>

      <h3 className="pt-2 text-sm font-semibold text-foreground">Endereço</h3>
      <AddressForm
        value={{
          cep: value.cep,
          rua: value.rua,
          numero: value.numero,
          complemento: value.complemento,
          bairro: value.bairro,
          cidade: value.cidade,
          estado: value.estado,
        }}
        onChange={handleAddressChange}
      />

      <Collapsible defaultOpen={expandBancarioInicial}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-mx-2 h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className="h-3.5 w-3.5" />
            Dados bancários (opcional, usados em contratos)
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Banco</Label>
              <Input
                value={value.banco}
                onChange={(e) => updateField("banco", e.target.value)}
                placeholder="Ex.: Itaú, Bradesco, Nubank..."
              />
            </div>
            <div className="space-y-2">
              <Label>Agência</Label>
              <Input
                value={value.agencia}
                onChange={(e) => updateField("agencia", e.target.value)}
                placeholder="0000"
              />
            </div>
            <div className="space-y-2">
              <Label>Conta</Label>
              <Input
                value={value.conta}
                onChange={(e) => updateField("conta", e.target.value)}
                placeholder="00000-0"
              />
            </div>
            <div className="space-y-2">
              <Label>Chave PIX</Label>
              <Input
                value={value.pix}
                onChange={(e) => updateField("pix", e.target.value)}
                placeholder="CPF/CNPJ, e-mail, telefone ou chave aleatória"
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
