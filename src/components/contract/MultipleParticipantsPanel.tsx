import { useMemo } from "react";
import { Plus, Heart, UserPlus, Link2, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import ManualParticipantCard, {
  type ManualParticipantData,
  emptyParticipant,
} from "./ManualParticipantCard";
import type { ParticipantRole } from "./ParticipantCard";
import type { Contact } from "@/hooks/useContacts";

interface Section {
  role: ParticipantRole;
  label: string;
  max: number;
  allowSpouse?: boolean;
  hideUnlessFlag?: string; // se setado, só renderiza quando flags[hideUnlessFlag] === true
}

const SECTIONS: Section[] = [
  { role: "comprador", label: "Comprador", max: 2, allowSpouse: true },
  { role: "vendedor", label: "Vendedor", max: 5, allowSpouse: true },
  { role: "anuente", label: "Anuente", max: 1 },
  { role: "procurador", label: "Procurador", max: 1, hideUnlessFlag: "tem_procurador" },
  { role: "fiador", label: "Fiador", max: 2 },
  { role: "testemunha", label: "Testemunha", max: 4 },
];

interface MultipleParticipantsPanelProps {
  participants: ManualParticipantData[];
  onChange: (participants: ManualParticipantData[]) => void;
  contacts: Contact[];
  /** Flags booleanas para blocos condicionais (ex: tem_procurador). Opcional. */
  flags?: Record<string, boolean>;
  onFlagChange?: (key: string, value: boolean) => void;
}

const MultipleParticipantsPanel = ({
  participants,
  onChange,
  contacts,
}: MultipleParticipantsPanelProps) => {
  // Spouses linked to a principal participant
  const spousesByPrincipal = useMemo(() => {
    const map = new Map<string, ManualParticipantData[]>();
    for (const p of participants) {
      if (p.role === "conjuge" && p.linked_to_id) {
        const list = map.get(p.linked_to_id) ?? [];
        list.push(p);
        map.set(p.linked_to_id, list);
      }
    }
    return map;
  }, [participants]);

  const updateOne = (id: string, data: ManualParticipantData) =>
    onChange(participants.map((p) => (p.id === id ? data : p)));

  const removeOne = (id: string) => {
    // Also remove spouses linked to this participant
    onChange(
      participants.filter((p) => p.id !== id && p.linked_to_id !== id)
    );
  };

  const addPrincipal = (role: ParticipantRole) =>
    onChange([...participants, emptyParticipant(role)]);

  const addSpouseFor = (principalId: string) => {
    const spouse = emptyParticipant("conjuge");
    spouse.linked_to_id = principalId;
    onChange([...participants, spouse]);
  };

  const toggleAnuenteFlag = (spouseId: string) => {
    onChange(
      participants.map((p) =>
        p.id === spouseId ? { ...p, also_anuente: !p.also_anuente } : p
      )
    );
  };

  // Returns array of spouses already marked as also_anuente (from any role)
  const spousesAsAnuente = participants.filter(
    (p) => p.role === "conjuge" && p.also_anuente
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-foreground">
          Participantes
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Adicione compradores, vendedores e demais partes. Cônjuges podem ser
          vinculados ao titular e, se desejado, marcados também como anuentes.
        </p>
      </div>

      {SECTIONS.map((section) => {
        const items = participants.filter((p) => p.role === section.role);
        const canAdd = items.length < section.max;
        return (
          <section key={section.role} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">
                {section.label}
                <span className="ml-1.5 text-sm text-muted-foreground font-normal">
                  ({items.length}/{section.max})
                </span>
              </h3>
              <div className="flex items-center gap-2">
                {section.role === "anuente" && spousesAsAnuente.length > 0 && (
                  <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <Link2 className="h-3 w-3" />
                    {spousesAsAnuente.length} cônjuge(s) também atuando como
                    anuente
                  </span>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addPrincipal(section.role)}
                  disabled={!canAdd}
                  className="gap-1 h-8"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar
                </Button>
              </div>
            </div>

            {items.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-4 text-center text-xs text-muted-foreground">
                  Nenhum {section.label.toLowerCase()} adicionado.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {items.map((p, idx) => {
                  const spouses = spousesByPrincipal.get(p.id) ?? [];
                  const canAddSpouse =
                    section.allowSpouse && spouses.length === 0;
                  return (
                    <div key={p.id} className="space-y-2">
                      <ManualParticipantCard
                        participant={p}
                        index={idx}
                        onUpdate={(data) => updateOne(p.id, data)}
                        onRemove={() => removeOne(p.id)}
                        contacts={contacts}
                      />
                      {section.allowSpouse && (
                        <div className="pl-4 flex flex-wrap gap-2">
                          {canAddSpouse && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs gap-1 text-primary"
                              onClick={() => addSpouseFor(p.id)}
                            >
                              <Heart className="h-3 w-3" />
                              Adicionar cônjuge
                            </Button>
                          )}
                        </div>
                      )}
                      {spouses.map((sp, sIdx) => (
                        <div key={sp.id} className="pl-4 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              Cônjuge de {section.label} {idx + 1}
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant={sp.also_anuente ? "default" : "outline"}
                              className="h-6 text-[10px] gap-1 px-2"
                              onClick={() => toggleAnuenteFlag(sp.id)}
                            >
                              <UserPlus className="h-3 w-3" />
                              {sp.also_anuente
                                ? "Atuando como anuente"
                                : "Usar como anuente"}
                            </Button>
                          </div>
                          <ManualParticipantCard
                            participant={sp}
                            index={sIdx}
                            onUpdate={(data) => updateOne(sp.id, data)}
                            onRemove={() => removeOne(sp.id)}
                            contacts={contacts}
                          />
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};

export default MultipleParticipantsPanel;
