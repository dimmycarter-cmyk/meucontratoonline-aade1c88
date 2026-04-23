INSERT INTO public.contract_templates (nome, tipo, descricao, conteudo, variaveis, status, is_global, tenant_id)
SELECT
  'Compra e Venda — Vendedor Representado por Procurador',
  'Compra e Venda',
  'Modelo de Compra e Venda com bloco condicional de procuração. Ative "Possui procurador?" no wizard para incluir o bloco.',
  $TPL$INSTRUMENTO PARTICULAR DE COMPRA E VENDA DE IMÓVEL

Pelo presente instrumento particular, as partes abaixo qualificadas:

VENDEDOR(A): {{vendedor_nome}}, {{vendedor_nacionalidade}}, {{vendedor_estado_civil}}, {{vendedor_profissao}}, portador(a) do CPF nº {{vendedor_cpf}} e RG nº {{vendedor_rg}} ({{vendedor_orgao_expedidor}}), residente e domiciliado(a) em {{vendedor_endereco}}.

{{#if tem_procurador}}
Neste ato representado(a) por seu(sua) procurador(a) {{procurador_nome}}, {{procurador_nacionalidade}}, {{procurador_estado_civil}}, {{procurador_profissao}}, portador(a) do CPF nº {{procurador_cpf}} e RG nº {{procurador_rg}} ({{procurador_orgao_expedidor}}){{#if procurador_oab}}, inscrito(a) na OAB sob o nº {{procurador_oab}}{{/if}}, residente em {{procurador_endereco}}, conforme procuração pública lavrada em {{procurador_data_procuracao}} no {{procurador_cartorio_procuracao}}, Livro {{procurador_livro_procuracao}}, Folha {{procurador_folha_procuracao}}.
{{/if}}

COMPRADOR(A): {{comprador_nome}}, {{comprador_nacionalidade}}, {{comprador_estado_civil}}, {{comprador_profissao}}, portador(a) do CPF nº {{comprador_cpf}} e RG nº {{comprador_rg}}, residente e domiciliado(a) em {{comprador_endereco}}.

CLÁUSULA 1ª — DO OBJETO
O VENDEDOR é legítimo proprietário do imóvel descrito como: {{imovel_descricao}}, situado em {{imovel_endereco}}, registrado sob a matrícula nº {{imovel_matricula}} no {{imovel_cartorio}}.

CLÁUSULA 2ª — DO PREÇO E FORMA DE PAGAMENTO
O preço total do imóvel é de {{valor_total}} ({{valor_total_extenso}}), pago da seguinte forma: {{forma_pagamento}}. Sinal: {{valor_sinal}}. Remanescente: {{valor_remanescente}}.

CLÁUSULA 3ª — DA POSSE
A posse será transmitida ao COMPRADOR em até {{prazo_posse_dias}} dias após a quitação integral.

CLÁUSULA 4ª — DO FORO
Fica eleito o foro de {{foro}} para dirimir quaisquer questões oriundas do presente contrato.

{{cidade_contrato}}, {{data_contrato_extenso}}.


_______________________________________
{{vendedor_nome}}
{{#if tem_procurador}}p.p. {{procurador_nome}}{{/if}}

_______________________________________
{{comprador_nome}}$TPL$,
  '[]'::jsonb,
  'ativo',
  true,
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.contract_templates
  WHERE is_global = true
    AND nome = 'Compra e Venda — Vendedor Representado por Procurador'
);