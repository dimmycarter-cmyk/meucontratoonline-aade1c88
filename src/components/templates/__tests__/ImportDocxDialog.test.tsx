/**
 * Tela de mapeamento do import .docx (1.2, item 1) — testes de componente.
 *
 * Mocka a edge function (supabase.functions.invoke) e o hook de templates;
 * a detecção roda de verdade (motor da 1.1) sobre o texto do mock. Radix
 * Selects nunca são ABERTOS aqui (limitação jsdom) — a semântica dos Selects
 * é coberta na camada pura (import-mapping.test.ts); aqui validamos fluxo,
 * defaults, contadores, bloqueio de avanço, ignorar em massa e gate.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ImportDocxDialog from "../ImportDocxDialog";

const { invokeMock, createTemplateMock, toastMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  createTemplateMock: vi.fn().mockResolvedValue({}),
  toastMock: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: invokeMock } },
}));

vi.mock("@/hooks/useTemplates", () => ({
  useTemplates: () => ({ createTemplate: createTemplateMock, isCreating: false }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

// jsdom não implementa APIs de pointer/scroll usadas pelo Radix.
beforeEach(() => {
  invokeMock.mockReset();
  createTemplateMock.mockClear();
  toastMock.mockClear();
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  Element.prototype.releasePointerCapture = vi.fn();
});

function parseResponse(text: string, html?: string) {
  return {
    data: {
      html: html ?? `<p>${text}</p>`,
      text,
      detectedLabels: [],
      knownPlaceholders: [],
      ambiguousLabels: [],
      piiMatches: [],
      warnings: [],
    },
    error: null,
  };
}

async function uploadDocx(text: string, html?: string) {
  invokeMock.mockResolvedValue(parseResponse(text, html));
  const utils = render(<ImportDocxDialog open onOpenChange={() => {}} />);
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File(["stub"], "modelo-teste.docx", {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  fireEvent.change(input, { target: { files: [file] } });
  await waitFor(() => expect(screen.getByText("Arquivo processado")).toBeInTheDocument());
  return utils;
}

function nextButton() {
  return screen.getByRole("button", { name: /Próximo/ });
}

describe("ImportDocxDialog — tela de mapeamento", () => {
  it("caminho feliz: 3 sintaxes detectadas, tudo exact/high nasce mapeado e o avanço fica livre", async () => {
    await uploadDocx(
      "O VENDEDOR, CPF: ______, dados: [CPF DO(A) VENDEDOR(A)] e {{valor_total}}."
    );

    // Step 1 — estatísticas do motor unificado
    expect(screen.getByText("Campos detectados:").parentElement!.textContent).toContain("3");

    fireEvent.click(nextButton());

    // Step 2 — 3 linhas, todas mapeadas por default (exact/high), 0 a revisar
    expect(screen.getByText(/mapeados/).textContent).toMatch(/3 mapeados · 0 a revisar · 0 ignorados/);
    expect(screen.getByRole("button", { name: /Ignorar todos os restantes/ })).toBeDisabled();
    expect(nextButton()).toBeEnabled();
  });

  it("tudo-medium: linhas nascem 'a revisar', Próximo bloqueia, e o ignorar em massa exige confirmação com contagem", async () => {
    // Sem palavra de papel no contexto → sufixo sem role → medium → review
    await uploadDocx("CPF: ______ e RG: ______");

    fireEvent.click(nextButton());
    expect(screen.getByText(/a revisar/).textContent).toMatch(/0 mapeados · 2 a revisar · 0 ignorados/);
    expect(nextButton()).toBeDisabled();

    // Ação em massa: abre confirmação explícita com a contagem
    fireEvent.click(screen.getByRole("button", { name: /Ignorar todos os restantes \(2\)/ }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.textContent).toContain("Ignorar 2 campos restantes?");

    fireEvent.click(screen.getByRole("button", { name: "Ignorar campos" }));
    await waitFor(() =>
      expect(screen.getByText(/a revisar/).textContent).toMatch(/0 mapeados · 0 a revisar · 2 ignorados/)
    );
    expect(nextButton()).toBeEnabled();
  });

  it("cancelar a confirmação não ignora nada — Ignorar nunca é default", async () => {
    await uploadDocx("CPF: ______");
    fireEvent.click(nextButton());

    fireEvent.click(screen.getByRole("button", { name: /Ignorar todos os restantes \(1\)/ }));
    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getByRole("button", { name: "Voltar e revisar" }));

    await waitFor(() =>
      expect(screen.getByText(/a revisar/).textContent).toMatch(/0 mapeados · 1 a revisar · 0 ignorados/)
    );
    expect(nextButton()).toBeDisabled();
  });

  it("0 detecções: 'Nada a mapear' no passo 2 e gate de 0 variáveis bloqueia a criação no passo 4", async () => {
    await uploadDocx("Contrato sem nenhum campo detectável.");

    fireEvent.click(nextButton()); // → step 2
    expect(screen.getByText("Nada a mapear")).toBeInTheDocument();
    fireEvent.click(nextButton()); // → step 3 (sem PII)
    fireEvent.click(nextButton()); // → step 4

    expect(screen.getByText("Nenhuma variável detectada")).toBeInTheDocument();
    const criar = screen.getByRole("button", { name: /Criar modelo/ });
    expect(criar).toBeDisabled();

    // Ack explícito libera
    fireEvent.click(screen.getByLabelText(/quero criá-lo mesmo assim/));
    await waitFor(() => expect(screen.getByRole("button", { name: /Criar modelo/ })).toBeEnabled());
  });

  it("indexação por paridade: duas lacunas de CPF em contexto de testemunha viram testemunha1_cpf e testemunha2_cpf", async () => {
    await uploadDocx(
      "TESTEMUNHAS:\nTestemunha 1 — CPF: ______\nTestemunha 2 — CPF: ______"
    );

    fireEvent.click(nextButton());
    // Sugestões indexadas selecionadas nos triggers (default "map" p/ high)
    expect(screen.getByText("{{testemunha1_cpf}}")).toBeInTheDocument();
    expect(screen.getByText("{{testemunha2_cpf}}")).toBeInTheDocument();
    expect(screen.getByText(/mapeados/).textContent).toMatch(/2 mapeados · 0 a revisar/);
  });

  it("criação persiste import_metadata com decisões e o HTML final com {{chaves}}", async () => {
    await uploadDocx(
      "O VENDEDOR, CPF: ______.",
      "<p>O VENDEDOR, CPF: ______.</p>"
    );

    fireEvent.click(nextButton()); // step 2 (1 mapeado: vendedor_cpf high)
    fireEvent.click(nextButton()); // step 3
    fireEvent.click(nextButton()); // step 4
    fireEvent.click(screen.getByRole("button", { name: /Criar modelo/ }));

    await waitFor(() => expect(createTemplateMock).toHaveBeenCalledTimes(1));
    const payload = createTemplateMock.mock.calls[0][0];
    expect(payload.conteudo).toContain("{{vendedor_cpf}}");
    expect(payload.variaveis).toEqual(["vendedor_cpf"]);
    expect(payload.import_metadata.version).toBe(1);
    expect(payload.import_metadata.filename).toBe("modelo-teste.docx");
    expect(payload.import_metadata.decisions).toEqual([
      expect.objectContaining({
        raw: "______",
        syntax: "underscore",
        action: "map",
        targetKey: "vendedor_cpf",
      }),
    ]);
  });
});
