// Dynamic variables available for contract templates
export interface TemplateVariable {
  key: string;
  label: string;
  category: string;
}

// Helper para gerar bloco de pessoa indexada (vendedor2, vendedor3...)
function pessoa(prefix: string, label: string, category: string): TemplateVariable[] {
  return [
    { key: `${prefix}_nome`, label: `Nome (${label})`, category },
    { key: `${prefix}_cpf`, label: `CPF (${label})`, category },
    { key: `${prefix}_rg`, label: `RG (${label})`, category },
    { key: `${prefix}_orgao_expedidor`, label: `Órgão Expedidor (${label})`, category },
    { key: `${prefix}_profissao`, label: `Profissão (${label})`, category },
    { key: `${prefix}_nacionalidade`, label: `Nacionalidade (${label})`, category },
    { key: `${prefix}_estado_civil`, label: `Estado Civil (${label})`, category },
    { key: `${prefix}_email`, label: `E-mail (${label})`, category },
    { key: `${prefix}_whatsapp`, label: `WhatsApp (${label})`, category },
    { key: `${prefix}_endereco`, label: `Endereço (${label})`, category },
  ];
}

function dadosBancarios(prefix: string, label: string, category: string): TemplateVariable[] {
  return [
    { key: `${prefix}_banco`, label: `Banco (${label})`, category },
    { key: `${prefix}_agencia`, label: `Agência (${label})`, category },
    { key: `${prefix}_conta`, label: `Conta (${label})`, category },
    { key: `${prefix}_pix`, label: `PIX (${label})`, category },
  ];
}

export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  // ===== Comprador =====
  ...pessoa("comprador", "Comprador", "Comprador"),
  ...pessoa("comprador2", "Comprador 2", "Comprador"),

  // ===== Cônjuge do Comprador =====
  ...pessoa("conjuge", "Cônjuge", "Cônjuge"),
  ...pessoa("conjuge2", "Cônjuge 2", "Cônjuge"),

  // ===== Vendedor (até 5) =====
  ...pessoa("vendedor", "Vendedor", "Vendedor"),
  ...dadosBancarios("vendedor", "Vendedor", "Vendedor"),
  ...pessoa("vendedor2", "Vendedor 2", "Vendedor"),
  ...dadosBancarios("vendedor2", "Vendedor 2", "Vendedor"),
  ...pessoa("vendedor3", "Vendedor 3", "Vendedor"),
  ...dadosBancarios("vendedor3", "Vendedor 3", "Vendedor"),
  ...pessoa("vendedor4", "Vendedor 4", "Vendedor"),
  ...dadosBancarios("vendedor4", "Vendedor 4", "Vendedor"),
  ...pessoa("vendedor5", "Vendedor 5", "Vendedor"),
  ...dadosBancarios("vendedor5", "Vendedor 5", "Vendedor"),

  // ===== Anuente =====
  ...pessoa("anuente", "Anuente", "Anuente"),

  // ===== Testemunhas =====
  { key: "testemunha1_nome", label: "Testemunha 1 - Nome", category: "Testemunhas" },
  { key: "testemunha1_cpf", label: "Testemunha 1 - CPF", category: "Testemunhas" },
  { key: "testemunha1_creci", label: "Testemunha 1 - CRECI", category: "Testemunhas" },
  { key: "testemunha1_email", label: "Testemunha 1 - E-mail", category: "Testemunhas" },
  { key: "testemunha2_nome", label: "Testemunha 2 - Nome", category: "Testemunhas" },
  { key: "testemunha2_cpf", label: "Testemunha 2 - CPF", category: "Testemunhas" },
  { key: "testemunha2_creci", label: "Testemunha 2 - CRECI", category: "Testemunhas" },
  { key: "testemunha2_email", label: "Testemunha 2 - E-mail", category: "Testemunhas" },

  // ===== Imóvel =====
  { key: "imovel_endereco", label: "Endereço do Imóvel", category: "Imóvel" },
  { key: "imovel_descricao", label: "Descrição do Imóvel", category: "Imóvel" },
  { key: "imovel_matricula", label: "Matrícula do Imóvel", category: "Imóvel" },
  { key: "imovel_cartorio", label: "Cartório", category: "Imóvel" },
  { key: "imovel_area", label: "Área do Imóvel", category: "Imóvel" },
  { key: "imovel_area_privativa", label: "Área Privativa", category: "Imóvel" },
  { key: "imovel_area_total", label: "Área Total", category: "Imóvel" },
  { key: "imovel_area_acessoria", label: "Área Acessória", category: "Imóvel" },
  { key: "imovel_vagas", label: "Vagas de Garagem", category: "Imóvel" },
  { key: "imovel_tipo", label: "Tipo do Imóvel", category: "Imóvel" },
  { key: "imovel_inscricao_municipal", label: "Inscrição Municipal", category: "Imóvel" },
  { key: "imovel_indice_cadastral", label: "Índice Cadastral", category: "Imóvel" },

  // ===== Financeiro =====
  { key: "valor_total", label: "Valor Total", category: "Financeiro" },
  { key: "valor_total_extenso", label: "Valor Total por Extenso", category: "Financeiro" },
  { key: "valor_sinal", label: "Valor do Sinal", category: "Financeiro" },
  { key: "valor_sinal_extenso", label: "Valor do Sinal por Extenso", category: "Financeiro" },
  { key: "valor_remanescente", label: "Valor Remanescente", category: "Financeiro" },
  { key: "valor_financiamento", label: "Valor do Financiamento", category: "Financeiro" },
  { key: "valor_financiamento_extenso", label: "Valor do Financiamento por Extenso", category: "Financeiro" },
  { key: "valor_vendedor_sinal", label: "Valor para o Vendedor (Sinal)", category: "Financeiro" },
  { key: "valor_vendedor2_sinal", label: "Valor para o Vendedor 2 (Sinal)", category: "Financeiro" },
  { key: "valor_vendedor3_sinal", label: "Valor para o Vendedor 3 (Sinal)", category: "Financeiro" },
  { key: "valor_vendedor4_sinal", label: "Valor para o Vendedor 4 (Sinal)", category: "Financeiro" },
  { key: "valor_vendedor5_sinal", label: "Valor para o Vendedor 5 (Sinal)", category: "Financeiro" },
  { key: "valor_corretagem", label: "Valor da Corretagem", category: "Financeiro" },
  { key: "forma_pagamento", label: "Forma de Pagamento", category: "Financeiro" },
  { key: "banco_financiamento", label: "Banco do Financiamento", category: "Financeiro" },
  { key: "prazo_posse_dias", label: "Prazo de Posse (dias)", category: "Financeiro" },
  { key: "multa_atraso_diaria", label: "Multa Diária por Atraso", category: "Financeiro" },

  // ===== Parcelas (até 12) =====
  ...Array.from({ length: 12 }, (_, i): TemplateVariable[] => [
    { key: `parcela${i + 1}_data`, label: `Data Parcela ${i + 1}`, category: "Parcelas" },
    { key: `parcela${i + 1}_valor`, label: `Valor Parcela ${i + 1}`, category: "Parcelas" },
    { key: `parcela${i + 1}_valor_extenso`, label: `Valor Parcela ${i + 1} por Extenso`, category: "Parcelas" },
  ]).flat(),

  // ===== Imobiliária (canônico empresa_*) =====
  { key: "empresa_nome", label: "Nome da Imobiliária", category: "Imobiliária" },
  { key: "empresa_razao_social", label: "Razão Social", category: "Imobiliária" },
  { key: "empresa_cnpj", label: "CNPJ", category: "Imobiliária" },
  { key: "empresa_creci", label: "CRECI", category: "Imobiliária" },
  { key: "empresa_endereco", label: "Endereço", category: "Imobiliária" },
  { key: "empresa_cidade", label: "Cidade", category: "Imobiliária" },
  { key: "empresa_estado", label: "Estado", category: "Imobiliária" },
  { key: "empresa_cep", label: "CEP", category: "Imobiliária" },
  { key: "empresa_email", label: "E-mail", category: "Imobiliária" },
  { key: "empresa_whatsapp", label: "WhatsApp", category: "Imobiliária" },
  { key: "empresa_logo_url", label: "Logo (URL)", category: "Imobiliária" },
  { key: "empresa_banco", label: "Banco", category: "Imobiliária" },
  { key: "empresa_agencia", label: "Agência", category: "Imobiliária" },
  { key: "empresa_conta", label: "Conta", category: "Imobiliária" },
  { key: "empresa_pix", label: "PIX", category: "Imobiliária" },

  // ===== Intermediadoras =====
  { key: "intermediadora1_nome", label: "Intermediadora 1 - Nome", category: "Intermediadoras" },
  { key: "intermediadora1_cnpj", label: "Intermediadora 1 - CNPJ/CPF", category: "Intermediadoras" },
  { key: "intermediadora1_valor", label: "Intermediadora 1 - Valor", category: "Intermediadoras" },
  { key: "intermediadora2_nome", label: "Intermediadora 2 - Nome", category: "Intermediadoras" },
  { key: "intermediadora2_cnpj", label: "Intermediadora 2 - CNPJ/CPF", category: "Intermediadoras" },
  { key: "intermediadora2_valor", label: "Intermediadora 2 - Valor", category: "Intermediadoras" },

  // ===== Contrato =====
  { key: "data_contrato", label: "Data do Contrato", category: "Contrato" },
  { key: "data_contrato_curta", label: "Data do Contrato (dd/mm/aaaa)", category: "Contrato" },
  { key: "data_contrato_extenso", label: "Data do Contrato por Extenso", category: "Contrato" },
  { key: "cidade_contrato", label: "Cidade do Contrato", category: "Contrato" },
  { key: "cidade_uf", label: "Cidade/UF", category: "Contrato" },
  { key: "prazo_escritura", label: "Prazo para Escritura", category: "Contrato" },
  { key: "multa_rescisao", label: "Multa por Rescisão", category: "Contrato" },
  { key: "foro", label: "Foro", category: "Contrato" },
];

export const getVariablesByCategory = () => {
  const grouped: Record<string, TemplateVariable[]> = {};
  TEMPLATE_VARIABLES.forEach((v) => {
    if (!grouped[v.category]) grouped[v.category] = [];
    grouped[v.category].push(v);
  });
  return grouped;
};
