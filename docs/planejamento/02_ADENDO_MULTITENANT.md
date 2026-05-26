# 🏢 ADENDO CRÍTICO — Arquitetura Multi-Tenant e Genericidade

**Repositório:** `https://github.com/dimmycarter-cmyk/meucontratoonline-aade1c88`
**Aplica-se a:** PLANO_AJUSTES_CONTRACT_GENIUS_AI.md (documento principal)

---

## ⚠️ AVISO À IA EXECUTORA

Este adendo é **OBRIGATÓRIO** e deve ser lido **antes** de qualquer implementação.

Todos os exemplos do plano principal (nomes "Larisa", "Diego", "Pedro", "Apartamento Piteiras", "R$ 54,00", endereço "Rua Zurick") são **apenas casos de teste para validação**.

**NUNCA hardcode esses valores no código.** A plataforma é:

- 🏢 **Multi-tenant** — atende dezenas/centenas de imobiliárias, cada uma com seus próprios dados e templates.
- 📄 **Multi-template** — cada imobiliária pode ter múltiplos modelos de contrato (compra e venda, locação, comissão, distrato, permuta etc.).
- 👥 **Multi-envolvidos** — contratos podem ter 1..N vendedores, 1..N compradores, 0..N testemunhas, 0..N corretores, em qualquer combinação de PF e PJ.

Toda implementação deve ser **genérica, parametrizada e isolada por tenant**.

---

## 🧱 PRINCÍPIOS ARQUITETURAIS OBRIGATÓRIOS

### 1. Isolamento por Tenant

Toda query, cache e geração deve respeitar `tenant_id` (ou `imobiliaria_id`):

```typescript
// ❌ ERRADO
const contrato = await db.contrato.findUnique({ where: { id } });

// ✅ CORRETO
const contrato = await db.contrato.findUnique({
  where: { id, tenant_id: ctx.user.tenantId }
});
```

Cache também deve ser isolado:
```typescript
// ❌ ERRADO
redis.get(`imobiliaria:${id}`)

// ✅ CORRETO
redis.get(`tenant:${tenantId}:imobiliaria:${id}`)
```

### 2. Zero Hardcoding de Dados de Exemplo

Os nomes e valores citados no plano servem **apenas para escrever testes**. No código de produção, tudo deve vir de variáveis, banco ou input do usuário.

### 3. Funções Puras e Genéricas

Toda função de geração de contrato deve:
- Receber dados como **parâmetros**.
- Não consultar banco internamente (separação de I/O e lógica).
- Ser testável com mocks.

---

## 🔹 ESCLARECIMENTOS POR AJUSTE

### AJUSTE 7 — Qualificação de Envolvidos (Genérica)

**O exemplo Larisa+Diego é apenas um caso.** A função deve cobrir:

| Cenário | Comportamento esperado |
|---------|----------------------|
| 1 comprador solteiro PF | Qualificação individual padrão |
| 1 comprador casado(a) (cônjuge não é parte) | Mencionar "casado(a) com [Nome do Cônjuge]" sem qualificar o cônjuge inteiro |
| 2 compradores casados entre si, mesmo endereço | **Qualificação unificada** (exemplo do plano) |
| 2 compradores casados entre si, endereços diferentes | Qualificação separada, com menção mútua |
| 2+ compradores em união estável | Mesma regra de cônjuges, trocando termo |
| 2+ compradores sem relação conjugal | Qualificação individual concatenada com vírgula/"e" |
| Comprador PJ | Qualificação como pessoa jurídica (CNPJ, razão social, representante legal) |
| Mix PF + PJ no mesmo papel | Lista heterogênea, cada um com seu formato |
| 3+ compradores (qualquer combinação) | Loop genérico, sem assumir cardinalidade |

**Assinatura sugerida da função:**

```typescript
interface Envolvido {
  id: string;
  tipo: 'PF' | 'PJ';
  nome: string;
  cpfCnpj: string;
  rg?: string;
  nacionalidade?: string;
  estadoCivil?: 'solteiro' | 'casado' | 'divorciado' | 'viuvo' | 'uniao_estavel';
  regimeBens?: 'comunhao_parcial' | 'comunhao_universal' | 'separacao_total' | 'separacao_obrigatoria' | 'participacao_final';
  conjugeId?: string; // se cônjuge também for parte
  conjugeNome?: string; // se cônjuge NÃO for parte (só menção)
  profissao?: string;
  sexo?: 'M' | 'F';
  endereco: Endereco;
  // PJ:
  razaoSocial?: string;
  representanteLegal?: Envolvido;
}

function gerarQualificacaoDoGrupo(
  envolvidos: Envolvido[],
  papel: PapelContratual, // 'comprador' | 'vendedor' | 'fiador' | 'interveniente' etc.
  templateConfig: TemplateConfig // configurações do template do tenant
): string
```

**A função deve detectar automaticamente:**
- Quais envolvidos são cônjuges entre si.
- Quais compartilham endereço.
- Concordância de gênero e número.
- Nome do papel (singular/plural, masculino/feminino).

---

### AJUSTE 8 — Negrito Dinâmico

**O exemplo "Apartamento nº 102, Tipo A-3..." é apenas um teste.**

**Regra real:** o template deve **sempre** aplicar negrito ao campo de descrição do imóvel, **qualquer que seja seu conteúdo**:

```typescript
// Pseudocódigo do template
contrato.adicionarParagrafo({
  texto: `O OBJETO deste contrato é o imóvel: `,
  estilo: 'normal'
});
contrato.adicionarTexto({
  texto: imovel.descricaoCompleta,  // ← vem do banco, varia por contrato
  estilo: 'negrito'
});
```

**Idealmente, criar um sistema de "marcadores de estilo" no template:**

Em vez de aplicar negrito em código, permita que o **template** (que pode variar por tenant) declare:

```handlebars
O OBJETO deste contrato é o imóvel: <strong>{{imovel.descricao}}</strong>, ...
```

Assim cada imobiliária pode customizar quais trechos ficam em negrito no **seu** modelo de contrato sem mudar código.

---

### AJUSTE 9 — Multa Diária (Genérica)

**O valor "R$ 54,00" é hardcode bug — não é regra.**

**Regra real:**
1. Cada contrato pode ter **sua própria multa diária**, definida no momento do preenchimento.
2. Cada imobiliária (tenant) pode ter **valores ou percentuais padrão** configurados nas preferências do tenant, que pré-preenchem o campo (mas o usuário pode sobrescrever por contrato).
3. A cláusula só deve aparecer se o usuário **optar por incluí-la** (checkbox "Incluir cláusula de multa por atraso").
4. Pode ser **valor fixo** OU **percentual** OU **omitida**.

**Estrutura sugerida:**

```typescript
interface ConfiguracaoMulta {
  incluirClausula: boolean;
  tipo: 'valor_fixo' | 'percentual_imovel';
  valorFixoDiario?: number;       // R$
  percentualDiario?: number;       // % do valor do imóvel
  prazoMaximoDias: number;          // após isso, vira multa contratual maior
  clausulaContratualPosPrazo?: string; // referência (ex: "CLÁUSULA SEXTA")
}
```

**Configuração de defaults por tenant:**

```typescript
// Settings da imobiliária
{
  defaults: {
    multaAtraso: {
      incluirPorPadrao: true,
      tipo: 'percentual_imovel',
      percentualDiario: 0.033,  // 1% ao mês
      prazoMaximoDias: 30
    }
  }
}
```

---

### AJUSTE 10 — Bloco de Assinaturas (Genérico)

**O exemplo "Pedro + Larisa + Diego" é apenas um caso.**

**Regra real — o bloco deve suportar QUALQUER combinação:**

| Variação | Comportamento |
|----------|--------------|
| 1 vendedor | "PROMITENTE VENDEDOR" / "VENDEDORA" |
| 2+ vendedores | "PROMITENTES VENDEDORES" + numeração (1º, 2º, 3º...) |
| Vendedor PJ | Nome da empresa + linha para representante legal assinar |
| 0 testemunhas | Omitir bloco de testemunhas |
| 1 testemunha | Bloco com 1 linha |
| 2 testemunhas | Layout em 2 colunas |
| 0 corretores | Omitir bloco |
| 1 corretor | Bloco simples |
| 2+ corretores | Layout em N colunas ou linhas |
| Fiador, interveniente anuente, avalista | Cada papel adicional ganha seu bloco |

**Função genérica:**

```typescript
function gerarBlocoAssinaturas(
  partes: Map<PapelContratual, Envolvido[]>,
  templateConfig: TemplateConfig
): BlocoAssinaturas {
  const blocos: BlocoAssinaturas = [];

  for (const [papel, envolvidos] of partes) {
    if (envolvidos.length === 0) continue;

    blocos.push({
      titulo: gerarTituloPapel(papel, envolvidos), // singular/plural/gênero
      assinaturas: envolvidos.map((e, i) => ({
        numero: envolvidos.length > 1 ? `${i+1}º` : null,
        nome: e.tipo === 'PJ' ? e.razaoSocial : e.nome,
        cpfCnpj: e.cpfCnpj,
        creci: e.creci, // se for corretor
        representante: e.tipo === 'PJ' ? e.representanteLegal : null,
        linhaAssinatura: true
      }))
    });
  }

  return blocos;
}
```

---

## 🎨 ARQUITETURA DE TEMPLATES MULTI-TENANT

### Estrutura recomendada de templates

```
templates/
├── system/                          # Templates padrão da plataforma
│   ├── compra-venda-padrao.docx
│   ├── locacao-residencial.docx
│   ├── locacao-comercial.docx
│   ├── comissao-corretagem.docx
│   └── distrato.docx
└── tenants/                         # Templates customizados por imobiliária
    └── {tenant_id}/
        ├── compra-venda-customizado.docx
        ├── locacao-padrao-tenant.docx
        └── ...
```

### Modelo de banco sugerido

```sql
CREATE TABLE contract_templates (
  id UUID PRIMARY KEY,
  tenant_id UUID,                    -- NULL = template do sistema
  nome VARCHAR(255) NOT NULL,
  tipo_contrato VARCHAR(50) NOT NULL, -- 'compra_venda', 'locacao', etc.
  arquivo_template TEXT NOT NULL,     -- path ou conteúdo do template
  variaveis_obrigatorias JSONB,       -- lista de variáveis que precisam ser preenchidas
  variaveis_opcionais JSONB,
  clausulas_configuraveis JSONB,      -- ex: multa, prazo, juros
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_templates_tenant ON contract_templates(tenant_id);
CREATE INDEX idx_templates_tipo ON contract_templates(tipo_contrato);
```

### Resolução de template

Ao gerar um contrato, o sistema deve:
1. Buscar templates do tenant atual primeiro (`tenant_id = X`).
2. Se não houver template customizado, usar o do sistema (`tenant_id IS NULL`).
3. Aplicar overrides do tenant (ex: logo, cores, defaults).

---

## 🧪 ESTRATÉGIA DE TESTES

Como o sistema é multi-tenant e multi-template, os testes precisam cobrir matriz de casos. Sugestão:

```typescript
describe('Geração de contrato', () => {
  describe('Qualificação de envolvidos', () => {
    test.each([
      ['1 vendedor solteiro', { vendedores: [solteiroPF], ... }],
      ['2 vendedores casados entre si', { vendedores: [casalA, casalB], ... }],
      ['1 vendedor PJ', { vendedores: [empresaX], ... }],
      ['Mix PF + PJ', { vendedores: [pessoaA, empresaX], ... }],
      ['3 compradores não relacionados', { compradores: [a, b, c], ... }],
      // ... mais casos
    ])('caso: %s', (descricao, dados) => {
      const resultado = gerarQualificacao(dados);
      expect(resultado).toMatchSnapshot();
    });
  });

  describe('Bloco de assinaturas', () => {
    test.each([
      ['minimal: 1 vendedor + 1 comprador', ...],
      ['completo: vendedor PJ + 2 compradores casados + 2 testemunhas + 2 corretores', ...],
      // ...
    ])('caso: %s', ...);
  });

  describe('Isolamento multi-tenant', () => {
    test('contrato do tenant A não usa template do tenant B', ...);
    test('cache de imobiliária é isolado por tenant', ...);
  });
});
```

---

## ✅ ADENDO AO CHECKLIST DO PR

Adicionar ao checklist principal:

- [ ] Nenhum dado de exemplo (Larisa, Diego, R$ 54, Piteiras, etc.) aparece hardcoded no código
- [ ] Todas as funções de geração recebem dados como parâmetro (não consultam banco internamente)
- [ ] Queries respeitam `tenant_id` em todas as operações
- [ ] Cache é isolado por tenant
- [ ] Testes cobrem múltiplas cardinalidades (1, 2, 3+ envolvidos)
- [ ] Testes cobrem múltiplos tipos de envolvido (PF, PJ, mix)
- [ ] Testes cobrem múltiplos tipos de contrato (compra/venda, locação, etc.)
- [ ] Templates customizados por tenant funcionam corretamente
- [ ] Fallback para template do sistema funciona quando tenant não tem template próprio

---

## 📌 RESUMO PARA A IA EXECUTORA

**Ao implementar QUALQUER ajuste do plano principal:**

1. ❌ Não copiar literalmente os nomes/valores dos exemplos.
2. ✅ Tratar exemplos como **casos de teste** para snapshot testing.
3. ✅ Toda lógica deve ser **genérica e parametrizada**.
4. ✅ Todo dado deve vir de **banco, input ou configuração de tenant**.
5. ✅ Todo cache, query e geração deve respeitar **isolamento por tenant**.
6. ✅ Pensar em variações: cardinalidade (1, 2, N), tipo (PF, PJ), estado civil, gênero, papel contratual.

**Se você (IA) tiver dúvida sobre como generalizar algum caso, pergunte ao usuário antes de assumir.**
