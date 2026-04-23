/**
 * Fixture: contrato SEM procurador.
 * tem_procurador = "false" — bloco condicional deve ser totalmente removido
 * antes da validação. Modal não pode listar campos procurador_* como pendentes.
 */
export const seedSemProcurador: Record<string, string> = {
  tem_procurador: "false",
  vendedor_nome: "José Roberto Vendedor",
  vendedor_cpf: "999.888.777-66",
  comprador_nome: "Mariana Compradora",
  comprador_cpf: "555.444.333-22",
};
