import { Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import DocumentUploader, { type UploadedDoc, type DocType } from "./DocumentUploader";

export type ParticipantRole = "comprador" | "vendedor" | "conjuge" | "anuente" | "fiador" | "testemunha" | "procurador" | "interveniente" | "outro";

export interface Participant {
  id: string;
  role: ParticipantRole;
  full_name: string;
  documents: UploadedDoc[];
}

const ROLE_LABELS: Record<ParticipantRole, string> = {
  comprador: "Comprador",
  vendedor: "Vendedor",
  conjuge: "Cônjuge",
  anuente: "Anuente",
  fiador: "Fiador",
  testemunha: "Testemunha",
  procurador: "Procurador",
  interveniente: "Interveniente",
  outro: "Outro",
};

interface ParticipantCardProps {
  participant: Participant;
  index: number;
  onUpdateName: (name: string) => void;
  onRemove: () => void;
  onUploadDocs: (files: File[], docType: DocType) => void;
  onRemoveDoc: (docIndex: number) => void;
  onChangeDocType: (docIndex: number, type: DocType) => void;
  isUploading?: boolean;
}

const ParticipantCard = ({
  participant,
  index,
  onUpdateName,
  onRemove,
  onUploadDocs,
  onRemoveDoc,
  onChangeDocType,
  isUploading,
}: ParticipantCardProps) => {
  return (
    <Card className="shadow-card">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <User className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-medium text-primary">
              {ROLE_LABELS[participant.role]} {index + 1}
            </span>
            <Input
              value={participant.full_name}
              onChange={(e) => onUpdateName(e.target.value)}
              placeholder="Nome do participante"
              className="mt-1 h-8 text-sm"
            />
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <DocumentUploader
          documents={participant.documents}
          onUpload={onUploadDocs}
          onRemove={onRemoveDoc}
          onChangeType={onChangeDocType}
          isUploading={isUploading}
        />
      </CardContent>
    </Card>
  );
};

export { ROLE_LABELS };
export default ParticipantCard;
