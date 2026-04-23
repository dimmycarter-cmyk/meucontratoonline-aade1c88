/**
 * Templates globais Leva 1 — fonte de verdade para a migration data.
 * Todos os 5 templates (T6 Procurador adiado para Leva 2) usam placeholders
 * canônicos {{snake_case}}. Sem PII. Validados contra LEGACY_BRACKET_MAP
 * e template-variables.ts.
 */

export interface SeedTemplate {
  nome: string;
  descricao: string;
  tipo: string;
  conteudo: string;
  variaveis: string[];
}

// Bloco padrão de qualificação de pessoa física
const qualificaPessoa = (prefix: string, papel: string) =>
  `<p><strong>${papel}:</strong> {{${prefix}_nome}}, {{${prefix}_nacionalidade}}, {{${prefix}_estado_civil}}, {{${prefix}_profissao}}, portador(a) do RG nº {{${prefix}_rg}} {{${prefix}_orgao_expedidor}}, inscrito(a) no CPF sob o nº {{${prefix}_cpf}}, residente e domiciliado(a) em {{${prefix}_endereco}}, e-mail {{${prefix}_email}}, WhatsApp {{${prefix}_whatsapp}}.</p>`;

const qualificaImobiliaria = () =>
  `<p><strong>INTERVENIENTE ANUENTE — IMOBILIÁRIA:</strong> {{empresa_nome}}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº {{empresa_cnpj}}, CRECI {{empresa_creci}}, com sede em {{empresa_endereco}}, {{empresa_cidade}}/{{empresa_estado}}, CEP {{empresa_cep}}, e-mail {{empresa_email}}, WhatsApp {{empresa_whatsapp}}.</p>`;

const blocoImovel = () =>
  `<h3>CLÁUSULA 1ª — DO OBJETO</h3>
<p>O objeto do presente contrato é o imóvel assim descrito: <strong>{{imovel_descricao}}</strong>, do tipo {{imovel_tipo}}, situado em {{imovel_endereco}}, com área privativa de {{imovel_area_privativa}}, área total de {{imovel_area_total}}, área acessória de {{imovel_area_acessoria}}, contendo {{imovel_vagas}} vaga(s) de garagem, registrado sob a matrícula nº {{imovel_matricula}} no {{imovel_cartorio}}, inscrição municipal {{imovel_inscricao_municipal}}, índice cadastral {{imovel_indice_cadastral}}.</p>`;

const blocoIntermediacao = () =>
  `<h3>CLÁUSULA — DA INTERMEDIAÇÃO IMOBILIÁRIA</h3>
<p>As partes declaram que o presente negócio foi intermediado pela(s) imobiliária(s) abaixo, ficando o(a) VENDEDOR(A) responsável pelo pagamento da corretagem, autorizando expressamente a dedução do(s) respectivo(s) valor(es) diretamente do sinal:</p>
<ul>
  <li><strong>{{empresa_nome}}</strong> — CNPJ {{empresa_cnpj}}, CRECI {{empresa_creci}}. Valor da corretagem: {{valor_corretagem}}.</li>
  <li><strong>{{intermediadora1_nome}}</strong> — CNPJ/CPF {{intermediadora1_cnpj}}, conta {{intermediadora1_banco}} / Ag. {{intermediadora1_agencia}} / C/C {{intermediadora1_conta}}. Valor a receber do sinal: {{intermediadora1_valor_sinal}}.</li>
  <li><strong>{{intermediadora2_nome}}</strong> — CNPJ/CPF {{intermediadora2_cnpj}}, conta {{intermediadora2_banco}} / Ag. {{intermediadora2_agencia}} / C/C {{intermediadora2_conta}}. Valor a receber do sinal: {{intermediadora2_valor_sinal}}.</li>
</ul>`;

const blocoPosseEScritura = () =>
  `<h3>CLÁUSULA — DA POSSE E DA ESCRITURA</h3>
<p>A posse será transmitida ao(à) COMPRADOR(A) em até {{prazo_posse_dias}} dias contados da quitação integral. O prazo para outorga da escritura definitiva é de {{prazo_escritura}}. O atraso na desocupação sujeita o(a) VENDEDOR(A) à multa diária de {{multa_atraso_diaria}}.</p>
<h3>CLÁUSULA — DA RESCISÃO</h3>
<p>O descumprimento contratual sujeita a parte infratora à multa de {{multa_rescisao}}, sem prejuízo de perdas e danos.</p>
<h3>CLÁUSULA — DO FORO</h3>
<p>Fica eleito o foro da comarca de {{foro}} para dirimir quaisquer questões oriundas deste contrato.</p>
<p>{{cidade_contrato}}, {{data_contrato_extenso}}.</p>`;

const blocoAssinaturas = (linhas: string[]) =>
  `<h3>ASSINATURAS</h3>
${linhas.map((l) => `<p>_______________________________________<br/>${l}</p>`).join("\n")}
<p>_______________________________________<br/>Testemunha 1: {{testemunha1_nome}} — CPF {{testemunha1_cpf}}</p>
<p>_______________________________________<br/>Testemunha 2: {{testemunha2_nome}} — CPF {{testemunha2_cpf}}</p>`;

// ===== T1 — Compra e Venda à vista (1V + 1C + intermediadoras) =====
export const T1: SeedTemplate = {
  nome: "Compra e Venda à Vista — Padrão",
  descricao: "Contrato padrão de compra e venda à vista com 1 vendedor, 1 comprador e cláusula de intermediação imobiliária.",
  tipo: "Compra e Venda",
  conteudo: `<h1>INSTRUMENTO PARTICULAR DE COMPRA E VENDA DE IMÓVEL</h1>
<h2>QUALIFICAÇÃO DAS PARTES</h2>
${qualificaPessoa("vendedor", "PROMITENTE VENDEDOR(A)")}
${qualificaPessoa("comprador", "PROMISSÁRIO(A) COMPRADOR(A)")}
${qualificaImobiliaria()}
${blocoImovel()}
<h3>CLÁUSULA 2ª — DO PREÇO E DA FORMA DE PAGAMENTO</h3>
<p>O preço total e certo da presente compra e venda é de <strong>{{valor_total}}</strong> ({{valor_total_extenso}}), pago à vista mediante {{forma_pagamento}}, conforme detalhamento: sinal de {{valor_sinal}} ({{valor_sinal_extenso}}) creditado em conta de titularidade do(a) VENDEDOR(A) — Banco {{vendedor_banco}}, Ag. {{vendedor_agencia}}, C/C {{vendedor_conta}}, PIX {{vendedor_pix}}.</p>
${blocoIntermediacao()}
${blocoPosseEScritura()}
${blocoAssinaturas(["PROMITENTE VENDEDOR(A): {{vendedor_nome}}", "PROMISSÁRIO(A) COMPRADOR(A): {{comprador_nome}}", "INTERVENIENTE ANUENTE: {{empresa_nome}}"])}`,
  variaveis: [],
};

// ===== T2 — Compra e Venda com Financiamento Bancário =====
export const T2: SeedTemplate = {
  nome: "Compra e Venda com Financiamento Bancário",
  descricao: "Contrato de compra e venda com pagamento parcial via financiamento bancário (sinal + financiamento).",
  tipo: "Compra e Venda",
  conteudo: `<h1>INSTRUMENTO PARTICULAR DE COMPRA E VENDA DE IMÓVEL COM FINANCIAMENTO BANCÁRIO</h1>
<h2>QUALIFICAÇÃO DAS PARTES</h2>
${qualificaPessoa("vendedor", "PROMITENTE VENDEDOR(A)")}
${qualificaPessoa("comprador", "PROMISSÁRIO(A) COMPRADOR(A)")}
${qualificaImobiliaria()}
${blocoImovel()}
<h3>CLÁUSULA 2ª — DO PREÇO E DA FORMA DE PAGAMENTO</h3>
<p>O preço total da compra e venda é de <strong>{{valor_total}}</strong> ({{valor_total_extenso}}), pago da seguinte forma:</p>
<ul>
  <li><strong>Sinal:</strong> {{valor_sinal}} ({{valor_sinal_extenso}}), pago na assinatura deste, mediante {{forma_pagamento}}, creditado em conta do(a) VENDEDOR(A) — Banco {{vendedor_banco}}, Ag. {{vendedor_agencia}}, C/C {{vendedor_conta}}, PIX {{vendedor_pix}}.</li>
  <li><strong>Financiamento:</strong> {{valor_financiamento}} ({{valor_financiamento_extenso}}), a ser pago mediante financiamento bancário junto ao <strong>{{banco_financiamento}}</strong>, sob exclusiva responsabilidade do(a) COMPRADOR(A).</li>
</ul>
<h3>CLÁUSULA 3ª — DA CONDIÇÃO SUSPENSIVA</h3>
<p>O presente contrato fica condicionado à aprovação do financiamento bancário. Em caso de negativa, o sinal será integralmente devolvido ao(à) COMPRADOR(A), sem qualquer ônus.</p>
${blocoIntermediacao()}
${blocoPosseEScritura()}
${blocoAssinaturas(["PROMITENTE VENDEDOR(A): {{vendedor_nome}}", "PROMISSÁRIO(A) COMPRADOR(A): {{comprador_nome}}", "INTERVENIENTE ANUENTE: {{empresa_nome}}"])}`,
  variaveis: [],
};

// ===== T3 — 2 Vendedores + Anuente =====
export const T3: SeedTemplate = {
  nome: "Compra e Venda — 2 Vendedores e Anuente",
  descricao: "Contrato com dois vendedores em copropriedade e um terceiro anuente (ex.: ex-cônjuge ou herdeiro).",
  tipo: "Compra e Venda",
  conteudo: `<h1>INSTRUMENTO PARTICULAR DE COMPRA E VENDA DE IMÓVEL</h1>
<h2>QUALIFICAÇÃO DAS PARTES</h2>
${qualificaPessoa("vendedor", "PROMITENTE VENDEDOR(A) 1")}
${qualificaPessoa("vendedor2", "PROMITENTE VENDEDOR(A) 2")}
${qualificaPessoa("anuente", "ANUENTE")}
${qualificaPessoa("comprador", "PROMISSÁRIO(A) COMPRADOR(A)")}
${qualificaImobiliaria()}
${blocoImovel()}
<h3>CLÁUSULA 2ª — DO PREÇO E DA DIVISÃO DO SINAL</h3>
<p>O preço total da compra e venda é de <strong>{{valor_total}}</strong> ({{valor_total_extenso}}), pago à vista mediante {{forma_pagamento}}. O sinal total de {{valor_sinal}} ({{valor_sinal_extenso}}) será dividido entre os(as) VENDEDORES(AS) na seguinte proporção:</p>
<ul>
  <li>{{vendedor_nome}} — {{valor_vendedor_sinal}} — Banco {{vendedor_banco}}, Ag. {{vendedor_agencia}}, C/C {{vendedor_conta}}, PIX {{vendedor_pix}}.</li>
  <li>{{vendedor2_nome}} — {{valor_vendedor2_sinal}} — Banco {{vendedor2_banco}}, Ag. {{vendedor2_agencia}}, C/C {{vendedor2_conta}}, PIX {{vendedor2_pix}}.</li>
</ul>
<h3>CLÁUSULA 3ª — DA ANUÊNCIA</h3>
<p>O(A) ANUENTE {{anuente_nome}} declara expressa concordância com a presente alienação, renunciando a qualquer pretensão sobre o imóvel objeto deste contrato.</p>
${blocoIntermediacao()}
${blocoPosseEScritura()}
${blocoAssinaturas(["PROMITENTE VENDEDOR(A) 1: {{vendedor_nome}}", "PROMITENTE VENDEDOR(A) 2: {{vendedor2_nome}}", "ANUENTE: {{anuente_nome}}", "PROMISSÁRIO(A) COMPRADOR(A): {{comprador_nome}}", "INTERVENIENTE ANUENTE: {{empresa_nome}}"])}`,
  variaveis: [],
};

// ===== T4 — 5 Vendedores + Parcelas =====
export const T4: SeedTemplate = {
  nome: "Compra e Venda — Múltiplos Vendedores em Parcelas",
  descricao: "Contrato com até 5 vendedores em copropriedade e pagamento parcelado (sinal + parcelas).",
  tipo: "Compra e Venda",
  conteudo: `<h1>INSTRUMENTO PARTICULAR DE COMPRA E VENDA DE IMÓVEL EM PARCELAS</h1>
<h2>QUALIFICAÇÃO DAS PARTES</h2>
${qualificaPessoa("vendedor", "PROMITENTE VENDEDOR(A) 1")}
${qualificaPessoa("vendedor2", "PROMITENTE VENDEDOR(A) 2")}
${qualificaPessoa("vendedor3", "PROMITENTE VENDEDOR(A) 3")}
${qualificaPessoa("vendedor4", "PROMITENTE VENDEDOR(A) 4")}
${qualificaPessoa("vendedor5", "PROMITENTE VENDEDOR(A) 5")}
${qualificaPessoa("comprador", "PROMISSÁRIO(A) COMPRADOR(A)")}
${qualificaImobiliaria()}
${blocoImovel()}
<h3>CLÁUSULA 2ª — DO PREÇO</h3>
<p>O preço total é de <strong>{{valor_total}}</strong> ({{valor_total_extenso}}), pago em sinal de {{valor_sinal}} mais parcelas conforme cronograma abaixo.</p>
<h3>CLÁUSULA 3ª — DA DIVISÃO DO SINAL ENTRE OS(AS) VENDEDORES(AS)</h3>
<ul>
  <li>{{vendedor_nome}} — {{valor_vendedor_sinal}} — Banco {{vendedor_banco}}, Ag. {{vendedor_agencia}}, C/C {{vendedor_conta}}, PIX {{vendedor_pix}}.</li>
  <li>{{vendedor2_nome}} — {{valor_vendedor2_sinal}} — Banco {{vendedor2_banco}}, Ag. {{vendedor2_agencia}}, C/C {{vendedor2_conta}}, PIX {{vendedor2_pix}}.</li>
  <li>{{vendedor3_nome}} — {{valor_vendedor3_sinal}} — Banco {{vendedor3_banco}}, Ag. {{vendedor3_agencia}}, C/C {{vendedor3_conta}}, PIX {{vendedor3_pix}}.</li>
  <li>{{vendedor4_nome}} — {{valor_vendedor4_sinal}} — Banco {{vendedor4_banco}}, Ag. {{vendedor4_agencia}}, C/C {{vendedor4_conta}}, PIX {{vendedor4_pix}}.</li>
  <li>{{vendedor5_nome}} — {{valor_vendedor5_sinal}} — Banco {{vendedor5_banco}}, Ag. {{vendedor5_agencia}}, C/C {{vendedor5_conta}}, PIX {{vendedor5_pix}}.</li>
</ul>
<h3>CLÁUSULA 4ª — DAS PARCELAS</h3>
<ul>
  <li>Parcela 1: {{parcela1_data}} — {{parcela1_valor}} ({{parcela1_valor_extenso}})</li>
  <li>Parcela 2: {{parcela2_data}} — {{parcela2_valor}} ({{parcela2_valor_extenso}})</li>
  <li>Parcela 3: {{parcela3_data}} — {{parcela3_valor}} ({{parcela3_valor_extenso}})</li>
  <li>Parcela 4: {{parcela4_data}} — {{parcela4_valor}} ({{parcela4_valor_extenso}})</li>
  <li>Parcela 5: {{parcela5_data}} — {{parcela5_valor}} ({{parcela5_valor_extenso}})</li>
  <li>Parcela 6: {{parcela6_data}} — {{parcela6_valor}} ({{parcela6_valor_extenso}})</li>
</ul>
<p>Demais parcelas, se houver, serão acrescidas em aditivo. O atraso de qualquer parcela sujeita o(a) COMPRADOR(A) à multa de {{multa_atraso_diaria}} ao dia.</p>
${blocoIntermediacao()}
${blocoPosseEScritura()}
${blocoAssinaturas([
    "PROMITENTE VENDEDOR(A) 1: {{vendedor_nome}}",
    "PROMITENTE VENDEDOR(A) 2: {{vendedor2_nome}}",
    "PROMITENTE VENDEDOR(A) 3: {{vendedor3_nome}}",
    "PROMITENTE VENDEDOR(A) 4: {{vendedor4_nome}}",
    "PROMITENTE VENDEDOR(A) 5: {{vendedor5_nome}}",
    "PROMISSÁRIO(A) COMPRADOR(A): {{comprador_nome}}",
    "INTERVENIENTE ANUENTE: {{empresa_nome}}",
  ])}`,
  variaveis: [],
};

// ===== T5 — Casal Comprador (comunhão) =====
export const T5: SeedTemplate = {
  nome: "Compra e Venda — Casal Comprador",
  descricao: "Contrato de compra e venda à vista com casal comprador em comunhão (2 compradores casados entre si).",
  tipo: "Compra e Venda",
  conteudo: `<h1>INSTRUMENTO PARTICULAR DE COMPRA E VENDA DE IMÓVEL</h1>
<h2>QUALIFICAÇÃO DAS PARTES</h2>
${qualificaPessoa("vendedor", "PROMITENTE VENDEDOR(A)")}
${qualificaPessoa("comprador", "PROMISSÁRIO(A) COMPRADOR(A) 1")}
${qualificaPessoa("comprador2", "PROMISSÁRIO(A) COMPRADOR(A) 2")}
<p><em>Os(as) COMPRADORES(AS) declaram-se casados(as) entre si sob o regime de {{comprador_estado_civil}}, adquirindo o imóvel em comunhão.</em></p>
${qualificaImobiliaria()}
${blocoImovel()}
<h3>CLÁUSULA 2ª — DO PREÇO E DA FORMA DE PAGAMENTO</h3>
<p>O preço total é de <strong>{{valor_total}}</strong> ({{valor_total_extenso}}), pago à vista mediante {{forma_pagamento}}, creditado em conta do(a) VENDEDOR(A) — Banco {{vendedor_banco}}, Ag. {{vendedor_agencia}}, C/C {{vendedor_conta}}, PIX {{vendedor_pix}}.</p>
<h3>CLÁUSULA 3ª — DA RESPONSABILIDADE SOLIDÁRIA</h3>
<p>Os(as) COMPRADORES(AS) respondem solidariamente por todas as obrigações decorrentes deste contrato.</p>
${blocoIntermediacao()}
${blocoPosseEScritura()}
${blocoAssinaturas([
    "PROMITENTE VENDEDOR(A): {{vendedor_nome}}",
    "PROMISSÁRIO(A) COMPRADOR(A) 1: {{comprador_nome}}",
    "PROMISSÁRIO(A) COMPRADOR(A) 2: {{comprador2_nome}}",
    "INTERVENIENTE ANUENTE: {{empresa_nome}}",
  ])}`,
  variaveis: [],
};

export const SEED_TEMPLATES = [T1, T2, T3, T4, T5];
