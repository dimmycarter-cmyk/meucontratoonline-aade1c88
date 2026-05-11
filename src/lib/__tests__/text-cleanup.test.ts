import { describe, it, expect, vi } from "vitest";
import { cleanOrphanPunctuation } from "../text-cleanup";

describe("cleanOrphanPunctuation", () => {
  it("colapsa vírgulas duplas em uma só", () => {
    expect(cleanOrphanPunctuation("João, , portador(a)")).toBe(
      "João, portador(a)"
    );
  });

  it("colapsa vírgulas triplas/quádruplas em uma só", () => {
    expect(
      cleanOrphanPunctuation("João, , , , portador(a)")
    ).toBe("João, portador(a)");
  });

  it("remove vírgula antes de ponto final", () => {
    expect(cleanOrphanPunctuation("residente em SP, .")).toBe(
      "residente em SP."
    );
  });

  it("remove vírgula antes de ponto-vírgula, dois-pontos, !, ?", () => {
    expect(cleanOrphanPunctuation("X, ;")).toBe("X;");
    expect(cleanOrphanPunctuation("X, :")).toBe("X:");
    expect(cleanOrphanPunctuation("X, !")).toBe("X!");
    expect(cleanOrphanPunctuation("X, ?")).toBe("X?");
  });

  it("colapsa espaços múltiplos em um único espaço", () => {
    expect(cleanOrphanPunctuation("Rua A    com    espaços")).toBe(
      "Rua A com espaços"
    );
  });

  it("remove vírgula órfã logo após abertura de parêntese", () => {
    expect(cleanOrphanPunctuation("Texto (, item) fim")).toBe(
      "Texto (item) fim"
    );
  });

  it("remove vírgula órfã antes de fechar parêntese", () => {
    expect(cleanOrphanPunctuation("Texto (item ,) fim")).toBe(
      "Texto (item) fim"
    );
  });

  it("remove vírgula órfã antes de </tag> HTML", () => {
    expect(cleanOrphanPunctuation("<p>João, </p>")).toBe("<p>João</p>");
  });

  it("remove vírgula órfã logo após <tag> HTML de abertura", () => {
    expect(cleanOrphanPunctuation("<p>, João</p>")).toBe("<p>João</p>");
  });

  it("idempotência: aplicar 2x produz mesmo resultado", () => {
    const input =
      "João, , portador(a) do RG nº, inscrito(a) no CPF , residente em SP, .";
    const once = cleanOrphanPunctuation(input);
    const twice = cleanOrphanPunctuation(once);
    expect(twice).toBe(once);
  });

  it("não altera texto já limpo", () => {
    const limpo =
      "João da Silva, brasileiro, casado, corretor, portador(a) do RG nº 12.345.678 SSP/MG, inscrito(a) no CPF sob o nº 123.456.789-09.";
    expect(cleanOrphanPunctuation(limpo)).toBe(limpo);
  });

  it("trata HTML real com múltiplos placeholders vazios", () => {
    // Simula o que sai do replacePlaceholders quando profissão, estado civil
    // e nacionalidade vieram vazios e foram substituídos por "".
    const input =
      "<p>João da Silva, , , , portador(a) do RG nº __________ __________, " +
      "inscrito(a) no CPF sob o nº 123.456.789-09, residente em SP, .</p>";
    const out = cleanOrphanPunctuation(input);
    expect(out).toContain("João da Silva, portador(a)");
    expect(out).toContain("residente em SP.");
    expect(out).not.toMatch(/,\s*,/);
    expect(out).not.toMatch(/,\s*\./);
  });

  it("retorna string vazia para input vazio/null sem crash", () => {
    expect(cleanOrphanPunctuation("")).toBe("");
    expect(cleanOrphanPunctuation(null as unknown as string)).toBe(null);
  });

  it("respeita teto de iterações em input patológico (sem travar)", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      // Input patológico hipotético — montamos algo que sempre instabiliza:
      // 100 vírgulas seguidas. Esperamos colapso para 1 em poucas iterações.
      const monstro = "X" + ", ".repeat(100) + "Y";
      const out = cleanOrphanPunctuation(monstro);
      expect(out).toBe("X, Y");
      // Não deve ter atingido o teto (caso comum estabiliza rápido).
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });
});

describe("cleanOrphanPunctuation — integração com replacePlaceholders", () => {
  it("limpa vírgulas órfãs no resultado de replacePlaceholders (default fallback omit)", async () => {
    const { replacePlaceholders } = await import("../placeholder");
    const html =
      "{{vendedor_nome}}, {{vendedor_nacionalidade}}, " +
      "{{vendedor_estado_civil}}, {{vendedor_profissao}}, portador(a)...";
    const out = replacePlaceholders(html, { vendedor_nome: "João da Silva" });
    // Os 3 campos vazios viram "" via omit; cleanup colapsa as vírgulas.
    expect(out).toBe("João da Silva, portador(a)...");
  });

  it("não interfere quando todos os placeholders são preenchidos", async () => {
    const { replacePlaceholders } = await import("../placeholder");
    const html = "{{a}}, {{b}}, {{c}}.";
    const out = replacePlaceholders(html, { a: "X", b: "Y", c: "Z" });
    expect(out).toBe("X, Y, Z.");
  });
});
