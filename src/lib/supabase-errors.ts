export function parseSupabaseError(error: unknown): string {
  if (!error || typeof error !== "object") return "Erro inesperado.";
  const e = error as Record<string, unknown>;
  const code = String(e.code ?? "");
  const msg = String(e.message ?? "").toLowerCase();

  if (
    ["42501", "PGRST301", "PGRST116"].some((c) => code.includes(c)) ||
    msg.includes("policy") ||
    msg.includes("permission denied") ||
    msg.includes("row-level security")
  ) {
    return "Você não tem permissão para esta ação.";
  }

  if (code === "23505") {
    if (msg.includes("email")) return "Este e-mail já está cadastrado.";
    if (msg.includes("cpf")) return "Este CPF já está cadastrado.";
    if (msg.includes("cnpj")) return "Este CNPJ já está cadastrado.";
    return "Registro duplicado.";
  }
  if (code === "23503") return "Não é possível excluir — este item está em uso.";
  if (code === "23502") return "Campo obrigatório não preenchido.";
  return String(e.message ?? "Erro ao processar a solicitação.");
}
