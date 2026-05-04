import { useState, useCallback } from "react";
import { Trash2, User, ChevronDown, ChevronUp, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { maskCPF, maskPhone, maskCEP } from "@/lib/masks";
import { cpfSchema } from "@/lib/validators";
import { useCepLookup } from "@/hooks/useCepLookup";
import type { Contact } from "@/hooks/useContacts";
import type { ParticipantRole } from "./ParticipantCard";

const ROLE_LABELS: Record<ParticipantRole, string> = {
  vendedor: "Vendedor",
  comprador: "Comprador",
  conjuge: "Cônjuge",
  anuente: "Anuente",
  fiador: "Fiador",
  testemunha: "Testemunha",
  procurador: "Procurador",
  interveniente: "Interveniente",
  outro: "Outro",
};

export interface ManualParticipantData {
  id: string;
  role: ParticipantRole;
  nome: string;
  cpf: string;
  rg: string;
  orgao_expedidor: string;
  profissao: string;
  whatsapp: string;
  email: string;
  nacionalidade: string;
  estado_civil: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  contact_id: string | null;
  // Leva 2 — campos extras
  oab?: string;
  regime_bens?: string;
  genero?: string;
  data_nascimento?: string;
  banco?: string;
  agencia?: string;
  conta?: string;
  pix?: string;
  /** Marca esse cônjuge para também aparecer como anuente_* (sem duplicar cadastro). */
  also_anuente?: boolean;
  /** Vínculo opcional ao participante "principal" (comprador/vendedor) — usado para cônjuges. */
  linked_to_id?: string | null;
}

export const emptyParticipant = (role: ParticipantRole): ManualParticipantData => ({
  id: crypto.randomUUID(),
  role,
  nome: "",
  cpf: "",
  rg: "",
  orgao_expedidor: "",
  profissao: "",
  whatsapp: "",
  email: "",
  nacionalidade: "Brasileiro(a)",
  estado_civil: "",
  cep: "",
  rua: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  contact_id: null,
  oab: "",
  regime_bens: "",
  genero: "",
  data_nascimento: "",
  banco: "",
  agencia: "",
  conta: "",
  pix: "",
  also_anuente: false,
  linked_to_id: null,
});

interface ManualParticipantCardProps {
  participant: ManualParticipantData;
  index: number;
  onUpdate: (data: ManualParticipantData) => void;
  onRemove: () => void;
  contacts: Contact[];
}

const ManualParticipantCard = ({
  participant,
  index,
  onUpdate,
  onRemove,
  contacts,
}: ManualParticipantCardProps) => {
  const [expanded, setExpanded] = useState(true);
  const [contactSearch, setContactSearch] = useState("");
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [cpfError, setCpfError] = useState("");

  const updateField = (field: keyof ManualParticipantData, value: string | boolean) => {
    onUpdate({ ...participant, [field]: value as never });
  };

  const isLawyer = /advogad/i.test(participant.profissao || "");
  const isMarried = /casad|uni[ãa]o\s+est[áa]vel/i.test(participant.estado_civil || "");
  const showBankBlock = participant.role === "vendedor" || participant.role === "procurador";

  const onCepResult = useCallback(
    (data: { rua: string; bairro: string; cidade: string; estado: string }) => {
      onUpdate({ ...participant, rua: data.rua, bairro: data.bairro, cidade: data.cidade, estado: data.estado });
    },
    [participant, onUpdate]
  );
  const { lookup: lookupCep } = useCepLookup(onCepResult);

  const fillFromContact = (contact: Contact) => {
    onUpdate({
      ...participant,
      contact_id: contact.id,
      nome: contact.nome || "",
      cpf: contact.cpf || "",
      rg: contact.rg || "",
      orgao_expedidor: contact.orgao_expedidor || "",
      profissao: contact.profissao || "",
      whatsapp: contact.whatsapp || "",
      email: contact.email || "",
      nacionalidade: contact.nacionalidade || "Brasileiro(a)",
      estado_civil: contact.estado_civil || "",
      cep: contact.cep || "",
      rua: contact.rua || "",
      numero: contact.numero || "",
      complemento: contact.complemento || "",
      bairro: contact.bairro || "",
      cidade: contact.cidade || "",
      estado: contact.estado || "",
    });
    setShowContactPicker(false);
  };

  const filteredContacts = contacts.filter(
    (c) =>
      c.nome.toLowerCase().includes(contactSearch.toLowerCase()) ||
      (c.cpf && c.cpf.includes(contactSearch))
  );

  return (
    <Card className="shadow-card">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <User className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-medium text-primary">
              {ROLE_LABELS[participant.role]} {index + 1}
            </span>
            <p className="text-sm font-medium text-foreground truncate">
              {participant.nome || "Sem nome"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Popover open={showContactPicker} onOpenChange={setShowContactPicker}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                  <Search className="h-3 w-3" /> Buscar contato
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-2" align="end">
                <Input
                  placeholder="Buscar por nome ou CPF..."
                  className="h-8 text-xs mb-2"
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                />
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filteredContacts.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-2 text-center">Nenhum contato encontrado</p>
                  ) : (
                    filteredContacts.map((c) => (
                      <button
                        key={c.id}
                        className="w-full text-left rounded-md px-2 py-1.5 hover:bg-muted transition-colors"
                        onClick={() => fillFromContact(c)}
                      >
                        <p className="text-xs font-medium text-foreground">{c.nome}</p>
                        <p className="text-[10px] text-muted-foreground">{c.cpf || c.email || "—"}</p>
                      </button>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onRemove}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Form fields */}
        {expanded && (
          <div className="space-y-4 pt-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Nome completo *</Label>
                <Input
                  value={participant.nome}
                  onChange={(e) => updateField("nome", e.target.value)}
                  placeholder="Nome completo"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">CPF</Label>
                <Input
                  value={participant.cpf}
                  onChange={(e) => updateField("cpf", maskCPF(e.target.value))}
                  onBlur={(e) => {
                    if (!e.target.value) { setCpfError(""); return; }
                    const result = cpfSchema.safeParse(e.target.value);
                    setCpfError(result.success ? "" : result.error.issues[0].message);
                  }}
                  placeholder="000.000.000-00"
                  className="h-8 text-sm"
                />
                {cpfError && <p className="text-xs text-destructive">{cpfError}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">RG</Label>
                <Input
                  value={participant.rg}
                  onChange={(e) => updateField("rg", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Órgão Expedidor</Label>
                <Input
                  value={participant.orgao_expedidor}
                  onChange={(e) => updateField("orgao_expedidor", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Profissão</Label>
                <Input
                  value={participant.profissao}
                  onChange={(e) => updateField("profissao", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              {isLawyer && (
                <div className="space-y-1">
                  <Label className="text-xs">OAB</Label>
                  <Input
                    value={participant.oab || ""}
                    onChange={(e) => updateField("oab", e.target.value)}
                    placeholder="Ex.: OAB/MG 123.456"
                    className="h-8 text-sm"
                  />
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-xs">WhatsApp</Label>
                <Input
                  value={participant.whatsapp}
                  onChange={(e) => updateField("whatsapp", maskPhone(e.target.value))}
                  placeholder="(31) 99999-5858"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">E-mail</Label>
                <Input
                  type="email"
                  value={participant.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nacionalidade</Label>
                <Input
                  value={participant.nacionalidade}
                  onChange={(e) => updateField("nacionalidade", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Estado Civil</Label>
                <Select
                  value={participant.estado_civil || ""}
                  onValueChange={(v) => updateField("estado_civil", v)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem>
                    <SelectItem value="Casado(a)">Casado(a)</SelectItem>
                    <SelectItem value="União Estável">União Estável</SelectItem>
                    <SelectItem value="Divorciado(a)">Divorciado(a)</SelectItem>
                    <SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem>
                    <SelectItem value="Separado(a)">Separado(a)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isMarried && (
                <div className="space-y-1">
                  <Label className="text-xs">Regime de Bens</Label>
                  <Select
                    value={participant.regime_bens || ""}
                    onValueChange={(v) => updateField("regime_bens", v)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Comunhão Parcial de Bens">Comunhão Parcial de Bens</SelectItem>
                      <SelectItem value="Comunhão Universal de Bens">Comunhão Universal de Bens</SelectItem>
                      <SelectItem value="Separação Total de Bens">Separação Total de Bens</SelectItem>
                      <SelectItem value="Separação Obrigatória de Bens">Separação Obrigatória de Bens</SelectItem>
                      <SelectItem value="Participação Final nos Aquestos">Participação Final nos Aquestos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <h4 className="text-xs font-semibold text-foreground pt-1">Endereço</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">CEP</Label>
                <Input
                  value={participant.cep}
                  onChange={(e) => {
                    const masked = maskCEP(e.target.value);
                    updateField("cep", masked);
                    lookupCep(masked);
                  }}
                  placeholder="00000-000"
                  className="h-8 text-sm"
                />
              </div>
              <div />
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Rua / Avenida</Label>
                <Input
                  value={participant.rua}
                  onChange={(e) => updateField("rua", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Número</Label>
                <Input
                  value={participant.numero}
                  onChange={(e) => updateField("numero", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Complemento</Label>
                <Input
                  value={participant.complemento}
                  onChange={(e) => updateField("complemento", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Bairro</Label>
                <Input
                  value={participant.bairro}
                  onChange={(e) => updateField("bairro", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cidade</Label>
                <Input
                  value={participant.cidade}
                  onChange={(e) => updateField("cidade", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">UF</Label>
                <Input
                  value={participant.estado}
                  onChange={(e) => updateField("estado", e.target.value)}
                  maxLength={2}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {showBankBlock && (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 px-2 -mx-2"
                  >
                    <ChevronDown className="h-3 w-3" />
                    Dados Bancários (opcional)
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Banco</Label>
                      <Input
                        value={participant.banco || ""}
                        onChange={(e) => updateField("banco", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Agência</Label>
                      <Input
                        value={participant.agencia || ""}
                        onChange={(e) => updateField("agencia", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Conta</Label>
                      <Input
                        value={participant.conta || ""}
                        onChange={(e) => updateField("conta", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Chave PIX</Label>
                      <Input
                        value={participant.pix || ""}
                        onChange={(e) => updateField("pix", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export { ROLE_LABELS as MANUAL_ROLE_LABELS };
export default ManualParticipantCard;
