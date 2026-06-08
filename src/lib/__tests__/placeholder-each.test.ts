import { describe, it, expect } from "vitest";
import { expandEachBlocks } from "../placeholder";
import { buildParticipantsByRole } from "../auto-fill-dados";
import { emptyParticipant, type ManualParticipantData } from "@/components/contract/manual-participant";

function mk(
  role: ManualParticipantData["role"],
  nome: string,
  extra: Partial<ManualParticipantData> = {}
): ManualParticipantData {
  return { ...emptyParticipant(role), nome, ...extra };
}

describe("expandEachBlocks — concordância PT-BR", () => {
  const TPL = "{{#each vendedores}}{{nome}}{{/each}}";

  it("1 participante: sem separador", () => {
    const byRole = buildParticipantsByRole([mk("vendedor", "Alice")]);
    expect(expandEachBlocks(TPL, byRole)).toBe("Alice");
  });

  it('2 participantes: une com " e "', () => {
    const byRole = buildParticipantsByRole([
      mk("vendedor", "Alice"),
      mk("vendedor", "Bruno"),
    ]);
    expect(expandEachBlocks(TPL, byRole)).toBe("Alice e Bruno");
  });

  it('3 participantes: "A, B e C"', () => {
    const byRole = buildParticipantsByRole([
      mk("vendedor", "Alice"),
      mk("vendedor", "Bruno"),
      mk("vendedor", "Carla"),
    ]);
    expect(expandEachBlocks(TPL, byRole)).toBe("Alice, Bruno e Carla");
  });

  it("0 participantes: bloco rende vazio", () => {
    const byRole = buildParticipantsByRole([mk("comprador", "Ana")]); // sem vendedores
    expect(expandEachBlocks(TPL, byRole)).toBe("");
  });

  it("0 participantes com texto ao redor: só o bloco some", () => {
    const tpl = "VENDEDORES: {{#each vendedores}}{{nome}}{{/each}}.";
    expect(expandEachBlocks(tpl, {})).toBe("VENDEDORES: .");
  });
});

describe("expandEachBlocks — separador configurável", () => {
  const TPL = "{{#each vendedores}}{{nome}}{{/each}}";

  it('lastSeparator "; e " (estilo serial jurídico)', () => {
    const byRole = buildParticipantsByRole([
      mk("vendedor", "Alice"),
      mk("vendedor", "Bruno"),
      mk("vendedor", "Carla"),
    ]);
    expect(expandEachBlocks(TPL, byRole, { lastSeparator: "; e " })).toBe(
      "Alice, Bruno; e Carla"
    );
  });

  it("separator customizado entre itens não-finais", () => {
    const byRole = buildParticipantsByRole([
      mk("vendedor", "Alice"),
      mk("vendedor", "Bruno"),
      mk("vendedor", "Carla"),
    ]);
    expect(expandEachBlocks(TPL, byRole, { separator: "; " })).toBe(
      "Alice; Bruno e Carla"
    );
  });
});

describe("expandEachBlocks — campos por participante", () => {
  it("cada item usa os dados do SEU participante (CPF mascarado, endereço composto)", () => {
    const tpl =
      "{{#each vendedores}}{{nome}} (CPF {{cpf}}), residente em {{endereco}}{{/each}}";
    const byRole = buildParticipantsByRole([
      mk("vendedor", "Alice Costa", {
        cpf: "11111111111",
        rua: "Rua A",
        numero: "10",
        bairro: "Centro",
        cidade: "Belo Horizonte",
        estado: "mg",
        cep: "30130000",
      }),
      mk("vendedor", "Bruno Lima", {
        cpf: "22222222222",
        rua: "Rua B",
        numero: "20",
        bairro: "Savassi",
        cidade: "Belo Horizonte",
        estado: "mg",
        cep: "30140000",
      }),
    ]);
    expect(expandEachBlocks(tpl, byRole)).toBe(
      "Alice Costa (CPF 111.111.111-11), residente em Rua A, nº 10, Bairro Centro, Belo Horizonte/MG, CEP 30130-000" +
        " e " +
        "Bruno Lima (CPF 222.222.222-22), residente em Rua B, nº 20, Bairro Savassi, Belo Horizonte/MG, CEP 30140-000"
    );
  });

  it("campo vazio do participante limpa pontuação órfã no meio", () => {
    const tpl = "{{#each vendedores}}{{nome}}, {{profissao}}, CPF {{cpf}}{{/each}}";
    const byRole = buildParticipantsByRole([
      mk("vendedor", "Alice", { cpf: "11111111111" }), // profissao vazia
    ]);
    expect(expandEachBlocks(tpl, byRole)).toBe("Alice, CPF 111.111.111-11");
  });

  it("placeholders compartilhados (não-participante) ficam intactos para o passe externo", () => {
    const tpl = "{{#each vendedores}}{{nome}} — total {{valor_total}}{{/each}}";
    const byRole = buildParticipantsByRole([mk("vendedor", "Alice")]);
    expect(expandEachBlocks(tpl, byRole)).toBe("Alice — total {{valor_total}}");
  });
});

describe("expandEachBlocks — múltiplos papéis e blocos", () => {
  it("expande blocos de papéis distintos no mesmo template", () => {
    const tpl =
      "V: {{#each vendedores}}{{nome}}{{/each}} | C: {{#each compradores}}{{nome}}{{/each}}";
    const byRole = buildParticipantsByRole([
      mk("vendedor", "Alice"),
      mk("vendedor", "Bruno"),
      mk("comprador", "Carla"),
    ]);
    expect(expandEachBlocks(tpl, byRole)).toBe("V: Alice e Bruno | C: Carla");
  });

  it("testemunhas e fiadores também são suportados", () => {
    const tpl =
      "{{#each fiadores}}{{nome}}{{/each}} :: {{#each testemunhas}}{{nome}}{{/each}}";
    const byRole = buildParticipantsByRole([
      mk("fiador", "Fábio"),
      mk("testemunha", "Tânia"),
      mk("testemunha", "Tito"),
    ]);
    expect(expandEachBlocks(tpl, byRole)).toBe("Fábio :: Tânia e Tito");
  });
});
