import { describe, it, expect } from "vitest";
import { autoFillDadosFromParticipants } from "../auto-fill-dados";
import { emptyParticipant, type ManualParticipantData } from "@/components/contract/ManualParticipantCard";

function mk(role: ManualParticipantData["role"], nome: string, extra: Partial<ManualParticipantData> = {}): ManualParticipantData {
  return { ...emptyParticipant(role), nome, ...extra };
}

describe("autoFillDadosFromParticipants", () => {
  it("mapeia 1 vendedor e 1 comprador para chaves canônicas", () => {
    const out = autoFillDadosFromParticipants([
      mk("comprador", "Ana Souza", { cpf: "12345678909" }),
      mk("vendedor", "João Silva", { cpf: "98765432100", banco: "Itaú", agencia: "1234", conta: "56789-0" }),
    ]);

    expect(out.comprador_nome).toBe("Ana Souza");
    expect(out.comprador_cpf).toBe("123.456.789-09");
    expect(out.vendedor_nome).toBe("João Silva");
    expect(out.vendedor_cpf).toBe("987.654.321-00");
    expect(out.vendedor_banco).toBe("Itaú");
    expect(out.vendedor_agencia).toBe("1234");
    expect(out.vendedor_conta).toBe("56789-0");
    // sem comprador2
    expect(out.comprador2_nome).toBeUndefined();
  });

  it("mapeia 2 vendedores para vendedor_* e vendedor2_*", () => {
    const out = autoFillDadosFromParticipants([
      mk("vendedor", "Alice Costa", { cpf: "11111111111" }),
      mk("vendedor", "Bruno Lima", { cpf: "22222222222", pix: "bruno@pix.com" }),
      mk("comprador", "Carla Mendes"),
    ]);

    expect(out.vendedor_nome).toBe("Alice Costa");
    expect(out.vendedor_cpf).toBe("111.111.111-11");
    expect(out.vendedor2_nome).toBe("Bruno Lima");
    expect(out.vendedor2_cpf).toBe("222.222.222-22");
    expect(out.vendedor2_pix).toBe("bruno@pix.com");
    expect(out.comprador_nome).toBe("Carla Mendes");
  });

  it("propaga cônjuge marcado como anuente para anuente_*", () => {
    const out = autoFillDadosFromParticipants([
      mk("vendedor", "Pedro Alves", { estado_civil: "Casado", regime_bens: "Comunhão Parcial" }),
      mk("conjuge", "Maria Alves", {
        cpf: "33333333333",
        estado_civil: "Casado",
        also_anuente: true,
      }),
      mk("comprador", "Lucas Rocha"),
    ]);

    expect(out.vendedor_nome).toBe("Pedro Alves");
    expect(out.vendedor_regime_bens).toBe("Comunhão Parcial");
    expect(out.conjuge_nome).toBe("Maria Alves");
    expect(out.conjuge_cpf).toBe("333.333.333-33");
    // anuente preenchido com os dados do cônjuge sem virar duplicata visual
    expect(out.anuente_nome).toBe("Maria Alves");
    expect(out.anuente_cpf).toBe("333.333.333-33");
  });

  it("preserva baseDados existente quando participante não fornece valor", () => {
    const out = autoFillDadosFromParticipants(
      [mk("comprador", "Fulano")],
      { baseDados: { valor_total: "250000", imovel_endereco: "Rua X, 100" } }
    );
    expect(out.imovel_endereco).toBe("Rua X, 100");
    // enrichment formatou e gerou extenso
    expect(out.valor_total).toMatch(/R\$/);
    expect(out.valor_total_extenso).toMatch(/duzentos e cinquenta mil reais/i);
  });

  it("ignora participantes sem nome", () => {
    const out = autoFillDadosFromParticipants([
      mk("vendedor", ""),
      mk("vendedor", "Tem Nome"),
    ]);
    expect(out.vendedor_nome).toBe("Tem Nome");
    expect(out.vendedor2_nome).toBeUndefined();
  });
});
