/**
 * Fixture: contrato com procurador representando o vendedor.
 * tem_procurador = "true" + todos os campos procurador_* preenchidos.
 */
export const seedComProcurador: Record<string, string> = {
  tem_procurador: "true",
  procurador_nome: "Carlos Mendes da Silva",
  procurador_cpf: "111.222.333-44",
  procurador_rg: "MG-12.345.678",
  procurador_orgao_expedidor: "SSP/MG",
  procurador_profissao: "Advogado",
  procurador_nacionalidade: "Brasileiro",
  procurador_estado_civil: "Casado(a)",
  procurador_email: "carlos.mendes@adv.br",
  procurador_whatsapp: "(31) 99999-1234",
  procurador_endereco: "Rua dos Inconfidentes, 1200, Sala 501, Funcionários, Belo Horizonte, MG, 30140-120",
  procurador_oab: "OAB/MG 123.456",
  procurador_outorgante: "José Roberto Vendedor",
  procurador_data_procuracao: "15 de março de 2025",
  procurador_cartorio_procuracao: "5º Tabelionato de Notas de Belo Horizonte/MG",
  procurador_livro_procuracao: "847",
  procurador_folha_procuracao: "152",
  // Dados mínimos pra um contrato fechar
  vendedor_nome: "José Roberto Vendedor",
  vendedor_cpf: "999.888.777-66",
  comprador_nome: "Mariana Compradora",
  comprador_cpf: "555.444.333-22",
};

/**
 * Variante parcial: tem_procurador=true mas faltam alguns campos
 * (usado para garantir que o modal lista APENAS os faltantes da categoria).
 */
export const seedComProcuradorParcial: Record<string, string> = {
  tem_procurador: "true",
  procurador_nome: "Carlos Mendes da Silva",
  procurador_cpf: "111.222.333-44",
  // faltando: procurador_oab, procurador_data_procuracao, procurador_cartorio_procuracao
  vendedor_nome: "José Roberto",
  comprador_nome: "Mariana Compradora",
};
