// Dynamic variables available for contract templates
export interface TemplateVariable {
  key: string;
  label: string;
  category: string;
}

export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  // Comprador
  { key: "comprador_nome", label: "Nome do Comprador", category: "Comprador" },
  { key: "comprador_cpf", label: "CPF do Comprador", category: "Comprador" },
  { key: "comprador_rg", label: "RG do Comprador", category: "Comprador" },
  { key: "comprador_orgao_expedidor", label: "Órgão Expedidor (Comprador)", category: "Comprador" },
  { key: "comprador_profissao", label: "Profissão do Comprador", category: "Comprador" },
  { key: "comprador_nacionalidade", label: "Nacionalidade do Comprador", category: "Comprador" },
  { key: "comprador_estado_civil", label: "Estado Civil do Comprador", category: "Comprador" },
  { key: "comprador_email", label: "E-mail do Comprador", category: "Comprador" },
  { key: "comprador_whatsapp", label: "WhatsApp do Comprador", category: "Comprador" },
  { key: "comprador_endereco", label: "Endereço do Comprador", category: "Comprador" },

  // Vendedor
  { key: "vendedor_nome", label: "Nome do Vendedor", category: "Vendedor" },
  { key: "vendedor_cpf", label: "CPF do Vendedor", category: "Vendedor" },
  { key: "vendedor_rg", label: "RG do Vendedor", category: "Vendedor" },
  { key: "vendedor_orgao_expedidor", label: "Órgão Expedidor (Vendedor)", category: "Vendedor" },
  { key: "vendedor_profissao", label: "Profissão do Vendedor", category: "Vendedor" },
  { key: "vendedor_nacionalidade", label: "Nacionalidade do Vendedor", category: "Vendedor" },
  { key: "vendedor_estado_civil", label: "Estado Civil do Vendedor", category: "Vendedor" },
  { key: "vendedor_email", label: "E-mail do Vendedor", category: "Vendedor" },
  { key: "vendedor_whatsapp", label: "WhatsApp do Vendedor", category: "Vendedor" },
  { key: "vendedor_endereco", label: "Endereço do Vendedor", category: "Vendedor" },

  // Imóvel
  { key: "imovel_endereco", label: "Endereço do Imóvel", category: "Imóvel" },
  { key: "imovel_matricula", label: "Matrícula do Imóvel", category: "Imóvel" },
  { key: "imovel_cartorio", label: "Cartório", category: "Imóvel" },
  { key: "imovel_area", label: "Área do Imóvel", category: "Imóvel" },
  { key: "imovel_tipo", label: "Tipo do Imóvel", category: "Imóvel" },
  { key: "imovel_inscricao_municipal", label: "Inscrição Municipal", category: "Imóvel" },

  // Financeiro
  { key: "valor_total", label: "Valor Total", category: "Financeiro" },
  { key: "valor_extenso", label: "Valor por Extenso", category: "Financeiro" },
  { key: "valor_sinal", label: "Valor do Sinal", category: "Financeiro" },
  { key: "valor_financiamento", label: "Valor do Financiamento", category: "Financeiro" },
  { key: "forma_pagamento", label: "Forma de Pagamento", category: "Financeiro" },
  { key: "banco_financiamento", label: "Banco do Financiamento", category: "Financeiro" },

  // Empresa / Intermediadora
  { key: "empresa_nome", label: "Nome da Empresa", category: "Empresa" },
  { key: "empresa_cnpj", label: "CNPJ da Empresa", category: "Empresa" },
  { key: "empresa_endereco", label: "Endereço da Empresa", category: "Empresa" },
  { key: "empresa_creci", label: "CRECI da Empresa", category: "Empresa" },

  // Contrato
  { key: "data_contrato", label: "Data do Contrato", category: "Contrato" },
  { key: "cidade_contrato", label: "Cidade do Contrato", category: "Contrato" },
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
