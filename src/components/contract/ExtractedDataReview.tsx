import { CheckCircle2, AlertTriangle, Edit3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "./ParticipantCard";

export interface ExtractedField {
  key: string;
  label: string;
  value: string;
  confidence: number;
}

export interface ParticipantExtractedData {
  participantId: string;
  role: string;
  full_name: string;
  fields: ExtractedField[];
}

const FIELD_LABELS: Record<string, string> = {
  full_name: "Nome Completo",
  cpf: "CPF",
  rg: "RG",
  issuing_agency: "Órgão Expedidor",
  nationality: "Nacionalidade",
  marital_status: "Estado Civil",
  profession: "Profissão",
  gender: "Gênero",
  address_zipcode: "CEP",
  address_street: "Rua",
  address_number: "Número",
  address_complement: "Complemento",
  address_neighborhood: "Bairro",
  address_city: "Cidade",
  address_state: "UF",
  cnpj: "CNPJ",
  company_name: "Razão Social",
  trade_name: "Nome Fantasia",
  email: "E-mail",
  whatsapp: "WhatsApp",
};

interface ExtractedDataReviewProps {
  participantsData: ParticipantExtractedData[];
  onUpdateField: (participantId: string, fieldKey: string, value: string) => void;
}

const ConfidenceBadge = ({ confidence }: { confidence: number }) => {
  if (confidence >= 80) {
    return (
      <Badge variant="secondary" className="bg-success/10 text-success text-[10px] gap-1">
        <CheckCircle2 className="h-2.5 w-2.5" /> {confidence}%
      </Badge>
    );
  }
  if (confidence >= 50) {
    return (
      <Badge variant="secondary" className="bg-warning/10 text-warning text-[10px] gap-1">
        <AlertTriangle className="h-2.5 w-2.5" /> {confidence}%
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="bg-destructive/10 text-destructive text-[10px] gap-1">
      <AlertTriangle className="h-2.5 w-2.5" /> {confidence}%
    </Badge>
  );
};

const ExtractedDataReview = ({ participantsData, onUpdateField }: ExtractedDataReviewProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <Edit3 className="h-5 w-5 text-primary" />
          Revisão dos Dados Extraídos
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Revise os dados extraídos pela IA. Campos com baixa confiança estão destacados em amarelo. Edite qualquer campo antes de continuar.
        </p>
      </div>

      {participantsData.map((pd) => (
        <Card key={pd.participantId} className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <span className="text-primary font-semibold">
                {ROLE_LABELS[pd.role as keyof typeof ROLE_LABELS] || pd.role}
              </span>
              <span className="text-foreground">{pd.full_name || "—"}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {pd.fields.map((field) => (
                <div
                  key={field.key}
                  className={`rounded-lg p-2 ${
                    field.confidence < 50
                      ? "bg-destructive/5 border border-destructive/20"
                      : field.confidence < 80
                      ? "bg-warning/5 border border-warning/20"
                      : "bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs text-muted-foreground">
                      {FIELD_LABELS[field.key] || field.key}
                    </Label>
                    <ConfidenceBadge confidence={field.confidence} />
                  </div>
                  <Input
                    value={field.value}
                    onChange={(e) => onUpdateField(pd.participantId, field.key, e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              ))}
            </div>
            {pd.fields.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum dado extraído para este participante
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ExtractedDataReview;
