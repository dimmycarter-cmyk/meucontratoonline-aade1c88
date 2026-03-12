import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import ParticipantCard, { type Participant, type ParticipantRole, ROLE_LABELS } from "./ParticipantCard";
import type { DocType } from "./DocumentUploader";

interface ParticipantManagerProps {
  participants: Participant[];
  onAdd: (role: ParticipantRole) => void;
  onRemove: (index: number) => void;
  onUpdateName: (index: number, name: string) => void;
  onUploadDocs: (participantIndex: number, files: File[], docType: DocType) => void;
  onRemoveDoc: (participantIndex: number, docIndex: number) => void;
  onChangeDocType: (participantIndex: number, docIndex: number, type: DocType) => void;
  uploadingIndex?: number | null;
}

const ParticipantManager = ({
  participants,
  onAdd,
  onRemove,
  onUpdateName,
  onUploadDocs,
  onRemoveDoc,
  onChangeDocType,
  uploadingIndex,
}: ParticipantManagerProps) => {
  const [newRole, setNewRole] = useState<ParticipantRole>("comprador");

  // Group participants by role
  const roles = Object.keys(ROLE_LABELS) as ParticipantRole[];
  const grouped = roles
    .map((role) => ({
      role,
      items: participants
        .map((p, i) => ({ ...p, originalIndex: i }))
        .filter((p) => p.role === role),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-foreground">Participantes e Documentos</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Adicione os participantes e anexe os documentos de cada um para extração automática
        </p>
      </div>

      {/* Add participant */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo de participante</label>
          <Select value={newRole} onValueChange={(v) => setNewRole(v as ParticipantRole)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => onAdd(newRole)} className="gap-1.5 h-9">
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </div>

      {/* Participant cards grouped by role */}
      {grouped.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Adicione pelo menos um comprador e um vendedor para continuar
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => (
            <div key={group.role} className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                {ROLE_LABELS[group.role]}
                <span className="ml-1.5 text-muted-foreground font-normal">({group.items.length})</span>
              </h3>
              {group.items.map((p, roleIndex) => (
                <ParticipantCard
                  key={p.id}
                  participant={p}
                  index={roleIndex}
                  onUpdateName={(name) => onUpdateName(p.originalIndex, name)}
                  onRemove={() => onRemove(p.originalIndex)}
                  onUploadDocs={(files, docType) => onUploadDocs(p.originalIndex, files, docType)}
                  onRemoveDoc={(docIndex) => onRemoveDoc(p.originalIndex, docIndex)}
                  onChangeDocType={(docIndex, type) => onChangeDocType(p.originalIndex, docIndex, type)}
                  isUploading={uploadingIndex === p.originalIndex}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ParticipantManager;
