import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import ManualParticipantCard, { type ManualParticipantData, emptyParticipant } from "./ManualParticipantCard";
import type { ParticipantRole } from "./ParticipantCard";
import type { Contact } from "@/hooks/useContacts";

const ROLE_LABELS: Record<ParticipantRole, string> = {
  comprador: "Comprador",
  vendedor: "Vendedor",
  conjuge: "Cônjuge",
  fiador: "Fiador",
  testemunha: "Testemunha",
  procurador: "Procurador",
  interveniente: "Interveniente",
  outro: "Outro",
};

// Smart ordering: Comprador → Cônjuge(s) → Vendedor → Cônjuge(s) → others
const ROLE_ORDER: ParticipantRole[] = [
  "comprador", "vendedor", "conjuge", "fiador", "testemunha", "procurador", "interveniente", "outro",
];

function emptyFirst(arr: ManualParticipantData[]): ManualParticipantData[] {
  return [...arr.filter((p) => !p.nome.trim()), ...arr.filter((p) => p.nome.trim())];
}

function smartSort(participants: ManualParticipantData[]): ManualParticipantData[] {
  const compradores = emptyFirst(participants.filter((p) => p.role === "comprador"));
  const vendedores = emptyFirst(participants.filter((p) => p.role === "vendedor"));
  const conjuges = participants.filter((p) => p.role === "conjuge");
  const others = emptyFirst(participants.filter(
    (p) => !["comprador", "vendedor", "conjuge"].includes(p.role)
  ));

  const halfConjuges = Math.ceil(conjuges.length / 2);
  const conjugesComprador = emptyFirst(conjuges.slice(0, compradores.length > 0 ? halfConjuges : 0));
  const conjugesVendedor = emptyFirst(conjuges.slice(compradores.length > 0 ? halfConjuges : 0));

  return [
    ...compradores,
    ...conjugesComprador,
    ...vendedores,
    ...conjugesVendedor,
    ...others,
  ];
}

interface ManualParticipantManagerProps {
  participants: ManualParticipantData[];
  onChange: (participants: ManualParticipantData[]) => void;
  contacts: Contact[];
}

const ManualParticipantManager = ({
  participants,
  onChange,
  contacts,
}: ManualParticipantManagerProps) => {
  const [newRole, setNewRole] = useState<ParticipantRole>("comprador");

  const handleAdd = () => {
    const updated = [emptyParticipant(newRole), ...participants];
    onChange(smartSort(updated));
  };

  const handleRemove = (id: string) => {
    onChange(participants.filter((p) => p.id !== id));
  };

  const handleUpdate = (id: string, data: ManualParticipantData) => {
    onChange(participants.map((p) => (p.id === id ? data : p)));
  };

  // Group by role for display with counters
  const roles = ROLE_ORDER;
  const grouped = roles
    .map((role) => ({
      role,
      items: participants.filter((p) => p.role === role),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-foreground">Participantes</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Adicione os participantes e preencha os dados de cada um. Você pode buscar contatos já cadastrados.
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
        <Button onClick={handleAdd} className="gap-1.5 h-9">
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </div>

      {/* Participant cards */}
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
              <h3 className="text-lg font-semibold text-foreground">
                {ROLE_LABELS[group.role]}
                <span className="ml-1.5 text-muted-foreground font-normal">({group.items.length})</span>
              </h3>
              {group.items.map((p, roleIndex) => (
                <ManualParticipantCard
                  key={p.id}
                  participant={p}
                  index={roleIndex}
                  onUpdate={(data) => handleUpdate(p.id, data)}
                  onRemove={() => handleRemove(p.id)}
                  contacts={contacts}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManualParticipantManager;
