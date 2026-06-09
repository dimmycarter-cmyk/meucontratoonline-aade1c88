/**
 * Decide se o wizard deve auto-selecionar uma empresa (imobiliária) por padrão.
 *
 * Regra (escopo 1-company): só auto-seleciona quando o tenant tem EXATAMENTE uma
 * company e o usuário ainda não interagiu com a seleção. Retorna o id a aplicar,
 * ou `null` quando NÃO se deve mexer no estado atual.
 *
 * Guardas (todas levam a `null` = "não age"):
 *  - loading: lista ainda carregando — esperar o próximo tick.
 *  - touched: usuário já selecionou OU deselecionou manualmente — respeitar sempre.
 *  - currentEmpresaId: já há empresa (seleção manual ou rascunho restaurado com
 *    empresa explícita) — respeitar.
 *  - companies.length !== 1: 0 (nada a escolher) ou 2+ (ambíguo sem coluna de
 *    "padrão") — exige escolha manual.
 *
 * Função PURA e determinística. O caso multi-company depende de uma futura coluna
 * `padrao` em `companies` (follow-up via Supabase MCP) — fora do escopo atual.
 */
export interface CompanyLike {
  id: string;
}

export function resolveDefaultCompanyId(
  companies: ReadonlyArray<CompanyLike>,
  currentEmpresaId: string | null | undefined,
  touched: boolean,
  loading: boolean,
): string | null {
  if (loading) return null;
  if (touched) return null;
  if (currentEmpresaId) return null;
  if (companies.length === 1) return companies[0].id;
  return null;
}
