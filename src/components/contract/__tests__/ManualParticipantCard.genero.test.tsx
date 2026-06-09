/**
 * Prova de UI: ao puxar um contato (fillFromContact), o gênero do contato é
 * normalizado e gravado no participante — que é EXATAMENTE o valor ao qual o
 * Select de gênero está vinculado (`value={participant.genero || ""}`). Logo,
 * "popula o Select visivelmente" == participant.genero recebe o valor normalizado.
 *
 * Dispara o fill pelo dropdown de sugestões do campo Nome (botões HTML simples,
 * sem Radix). O card é CONTROLADO pela prop `participant`, então usamos um harness
 * com estado real (igual ao MultipleParticipantsPanel) para o nome digitado
 * re-renderizar e abrir as sugestões.
 */
import { useState } from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ManualParticipantCard from "../ManualParticipantCard";
import { emptyParticipant, type ManualParticipantData } from "../manual-participant";

function Harness({
  contato,
  onCapture,
}: {
  contato: any;
  onCapture: (p: ManualParticipantData) => void;
}) {
  const [p, setP] = useState<ManualParticipantData>(emptyParticipant("vendedor"));
  return (
    <ManualParticipantCard
      participant={p}
      index={0}
      onRemove={() => {}}
      contacts={[contato]}
      onUpdate={(arg) => {
        const next = typeof arg === "function" ? arg(p) : arg;
        setP(next);
        onCapture(next);
      }}
    />
  );
}

function pullContact(contato: any): ManualParticipantData {
  let last: ManualParticipantData | null = null;
  render(<Harness contato={contato} onCapture={(p) => { last = p; }} />);
  fireEvent.change(screen.getByPlaceholderText("Nome completo"), {
    target: { value: contato.nome.slice(0, 4) },
  });
  fireEvent.click(screen.getByText(contato.nome));
  return last!;
}

describe("ManualParticipantCard — fillFromContact popula o gênero (binding do Select)", () => {
  it("contato legado genero='Feminino' → participant.genero = 'F'", () => {
    const out = pullContact({ id: "k1", nome: "Maria Antônia", cpf: "", genero: "Feminino" });
    expect(out.nome).toBe("Maria Antônia");
    expect(out.genero).toBe("F"); // valor que o Select exibe e que vai pro render
  });

  it("contato genero='M' → participant.genero = 'M'", () => {
    const out = pullContact({ id: "k2", nome: "João Silva", cpf: "", genero: "M" });
    expect(out.genero).toBe("M");
  });

  it("contato sem gênero reconhecido → participant.genero = undefined (sem default oculto)", () => {
    const out = pullContact({ id: "k3", nome: "Alex Reis", cpf: "", genero: "Outro" });
    expect(out.genero).toBeUndefined();
  });
});
