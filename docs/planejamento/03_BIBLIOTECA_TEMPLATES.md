# 📚 ADENDO 2 — Biblioteca de Templates Pré-Instalados (Seed Library)

**Repositório:** `https://github.com/dimmycarter-cmyk/meucontratoonline-aade1c88`
**Aplica-se a:** PLANO_AJUSTES_CONTRACT_GENIUS_AI.md + ADENDO_MULTITENANT_CONTRACT_GENIUS_AI.md

---

## ⚠️ AVISO À IA EXECUTORA

Este adendo complementa os dois documentos anteriores. Toda imobiliária (tenant) que entra na plataforma deve receber automaticamente uma **biblioteca pré-instalada de modelos de contrato imobiliário** com:

- ✅ Campos em branco (placeholders) prontos para preenchimento.
- ✅ Possibilidade de **clonar e customizar** qualquer modelo do sistema.
- ✅ Possibilidade de **ocultar/desativar** modelos que a imobiliária não usa (sem deletar globalmente).
- ✅ Possibilidade de **criar modelos próprios** do zero ou via upload.
- ✅ Sem afetar as outras imobiliárias quando uma faz qualquer ação.

---

## 🎯 PRINCÍPIOS FUNDAMENTAIS

### 1. Isolamento estrito entre tenants

Uma imobiliária **NUNCA** pode modificar ou deletar um template do sistema globalmente. Suas ações afetam apenas a **visão dela própria** do catálogo.

### 2. Sistema de "soft hide"

Quando uma imobiliária "exclui" um template do sistema, na verdade ela está apenas **ocultando** da sua visão (`is_hidden = true` na tabela `tenant_template_settings`). O template original permanece intacto para os outros tenants.

### 3. Clonagem como base para customização

Se a imobiliária quer **modificar** um template do sistema, o sistema deve oferecer:
- "Personalizar este modelo" → cria uma cópia em `templates/tenants/{tenant_id}/` e oculta o original.

### 4. Versionamento independente

Atualizações nos templates do sistema **não devem sobrescrever** clones customizados das imobiliárias.

---

## 📂 CATEGORIAS DE TEMPLATES PRÉ-INSTALADOS (Sugestão Inicial)

Recomendo começar com este catálogo mínimo viável:

### 🏠 Compra e Venda
- Compra e Venda de Imóvel Residencial Pronto
- Compra e Venda de Imóvel na Planta
- Compra e Venda de Terreno
- Compra e Venda com Financiamento Bancário
- Compra e Venda à Vista
- Promessa de Compra e Venda

### 🔑 Locação
- Locação Residencial (com fiador)
- Locação Residencial (com seguro fiança)
- Locação Residencial (com caução)
- Locação Comercial
- Locação por Temporada
- Renovação de Locação
- Distrato de Locação

### 💼 Intermediação e Comissão
- Contrato de Comissão de Corretagem (exclusivo)
- Contrato de Comissão de Corretagem (não exclusivo)
- Autorização de Venda
- Autorização de Locação

### 📋 Outros
- Permuta de Imóveis
- Cessão de Direitos
- Distrato de Compra e Venda
- Recibo de Sinal e Princípio de Pagamento
- Termo de Vistoria de Imóvel

> Cada modelo deve usar a **mesma estrutura de variáveis** (vendedor, comprador, imóvel, valores, etc.) que os ajustes 7-10 do plano principal definem, para garantir que todas as melhorias funcionem em todos os modelos.

---

## 🗄️ MODELO DE DADOS

### Tabela: `contract_templates` (atualizada)

```sql
CREATE TABLE contract_templates (
  id UUID PRIMARY KEY,
  tenant_id UUID NULL,                    -- NULL = template do sistema
  parent_template_id UUID NULL,            -- se for clone, referência ao original
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  categoria VARCHAR(100) NOT NULL,         -- 'compra_venda', 'locacao', 'comissao', 'outros'
  subcategoria VARCHAR(100),                -- 'residencial_pronto', 'na_planta', etc.
  arquivo_template TEXT NOT NULL,
  variaveis_obrigatorias JSONB DEFAULT '[]',
  variaveis_opcionais JSONB DEFAULT '[]',
  clausulas_configuraveis JSONB DEFAULT '[]',
  tags VARCHAR(255)[],                      -- para busca: 'residencial', 'financiamento', etc.
  versao INTEGER DEFAULT 1,
  is_sistema BOOLEAN DEFAULT false,         -- true para templates pré-instalados
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW(),

  CONSTRAINT chk_tenant_or_system CHECK (
    (is_sistema = true AND tenant_id IS NULL) OR
    (is_sistema = false AND tenant_id IS NOT NULL)
  )
);

CREATE INDEX idx_templates_tenant ON contract_templates(tenant_id);
CREATE INDEX idx_templates_categoria ON contract_templates(categoria);
CREATE INDEX idx_templates_sistema ON contract_templates(is_sistema) WHERE is_sistema = true;
```

### Tabela: `tenant_template_settings` (NOVA)

Esta tabela controla a **visão personalizada** de cada tenant sobre os templates do sistema:

```sql
CREATE TABLE tenant_template_settings (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  template_id UUID NOT NULL,                -- FK para contract_templates
  is_hidden BOOLEAN DEFAULT false,          -- "soft delete" — apenas oculta da visão do tenant
  is_favorite BOOLEAN DEFAULT false,
  apelido_customizado VARCHAR(255),         -- tenant pode renomear o template na sua visão
  ordem_exibicao INTEGER,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW(),

  UNIQUE(tenant_id, template_id)
);

CREATE INDEX idx_template_settings_tenant ON tenant_template_settings(tenant_id);
```

---

## 🌱 ESTRATÉGIA DE SEED (POPULAÇÃO INICIAL)

### Onde guardar os arquivos-fonte

```
/seeds/templates/
  ├── compra-venda/
  │   ├── residencial-pronto.docx
  │   ├── residencial-pronto.metadata.json
  │   ├── na-planta.docx
  │   ├── na-planta.metadata.json
  │   └── ...
  ├── locacao/
  │   ├── residencial-fiador.docx
  │   ├── residencial-fiador.metadata.json
  │   └── ...
  └── ...
```

### Formato do `metadata.json`

```json
{
  "nome": "Compra e Venda de Imóvel Residencial Pronto",
  "descricao": "Modelo padrão para compra e venda de imóveis residenciais prontos para morar.",
  "categoria": "compra_venda",
  "subcategoria": "residencial_pronto",
  "tags": ["residencial", "pronto", "padrao"],
  "variaveis_obrigatorias": [
    "vendedor.nome",
    "vendedor.cpf",
    "comprador.nome",
    "comprador.cpf",
    "imovel.descricao",
    "imovel.endereco",
    "valor.total",
    "valor.sinal",
    "data.entrega_chaves"
  ],
  "variaveis_opcionais": [
    "imovel.matricula",
    "imovel.cartorio_registro"
  ],
  "clausulas_configuraveis": [
    {
      "id": "multa_atraso_chaves",
      "nome": "Multa diária por atraso na entrega das chaves",
      "tipo": "valor_ou_percentual",
      "obrigatoria": false,
      "default": null
    },
    {
      "id": "juros_atraso_pagamento",
      "nome": "Juros sobre atraso de pagamento",
      "tipo": "percentual_mensal",
      "obrigatoria": true,
      "default": 1.0
    }
  ]
}
```

### Script de seed

Criar comando CLI ou migration que:

1. Lê toda a pasta `/seeds/templates/`.
2. Insere/atualiza registros em `contract_templates` com `is_sistema = true` e `tenant_id = NULL`.
3. Roda no **deploy inicial** e em **atualizações da biblioteca**.

```typescript
// scripts/seed-system-templates.ts
async function seedSystemTemplates() {
  const seedDir = './seeds/templates';
  const categorias = await fs.readdir(seedDir);

  for (const categoria of categorias) {
    const files = await fs.readdir(`${seedDir}/${categoria}`);
    const templates = files.filter(f => f.endsWith('.docx'));

    for (const templateFile of templates) {
      const slug = templateFile.replace('.docx', '');
      const metadataPath = `${seedDir}/${categoria}/${slug}.metadata.json`;
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
      const arquivo = await fs.readFile(`${seedDir}/${categoria}/${templateFile}`);

      await db.contractTemplate.upsert({
        where: {
          tenant_id_nome: { tenant_id: null, nome: metadata.nome }
        },
        update: {
          ...metadata,
          arquivo_template: arquivo.toString('base64'),
          versao: { increment: 1 },
          atualizado_em: new Date()
        },
        create: {
          ...metadata,
          tenant_id: null,
          is_sistema: true,
          arquivo_template: arquivo.toString('base64')
        }
      });
    }
  }
}
```

---

## 🔄 FLUXOS DE INTERAÇÃO DO USUÁRIO

### Fluxo 1: Imobiliária visualiza biblioteca

```
GET /api/templates
```

A API deve retornar:
- Todos os templates do sistema (`is_sistema = true`) que **não estão ocultos** para este tenant
- Mais todos os templates customizados deste tenant (`tenant_id = X`)
- Com flags indicando origem (`sistema` / `customizado` / `clonado`)

Query SQL (conceitual):

```sql
SELECT
  t.*,
  COALESCE(s.apelido_customizado, t.nome) AS nome_exibicao,
  CASE
    WHEN t.is_sistema THEN 'sistema'
    WHEN t.parent_template_id IS NOT NULL THEN 'clonado'
    ELSE 'customizado'
  END AS origem,
  COALESCE(s.is_favorite, false) AS is_favorite
FROM contract_templates t
LEFT JOIN tenant_template_settings s
  ON s.template_id = t.id AND s.tenant_id = :tenant_id
WHERE
  (t.is_sistema = true AND COALESCE(s.is_hidden, false) = false)
  OR (t.tenant_id = :tenant_id AND t.ativo = true)
ORDER BY t.categoria, t.nome;
```

### Fluxo 2: Imobiliária "exclui" um template do sistema

```
DELETE /api/templates/:id
```

Comportamento:
- Se for template **do sistema** (`is_sistema = true`):
  - Não deletar! Apenas inserir/atualizar em `tenant_template_settings` com `is_hidden = true`.
  - Mostrar confirmação: *"Este modelo do sistema será ocultado da sua biblioteca. Você pode restaurá-lo a qualquer momento em 'Modelos Ocultos'."*
- Se for template **customizado do próprio tenant** (`tenant_id = X`):
  - Soft delete: `ativo = false`.
  - Avisar: *"Modelo movido para a lixeira. Você pode restaurá-lo nos próximos 30 dias."*

### Fluxo 3: Imobiliária personaliza um template do sistema

```
POST /api/templates/:id/clone
```

Comportamento:
1. Lê o template original.
2. Cria uma cópia em `contract_templates` com:
   - `tenant_id = X`
   - `is_sistema = false`
   - `parent_template_id = id_original`
   - `nome = "{nome_original} (personalizado)"`
3. Pergunta ao usuário: *"Deseja ocultar o modelo original da sua biblioteca? (recomendado)"*
   - Se sim: marca `is_hidden = true` em `tenant_template_settings`.
4. Abre o editor com a cópia.

### Fluxo 4: Imobiliária restaura modelo do sistema oculto

```
POST /api/templates/:id/unhide
```

Comportamento:
- Atualiza `tenant_template_settings` com `is_hidden = false`.
- O template volta a aparecer na biblioteca da imobiliária.

### Fluxo 5: Imobiliária faz upload de modelo próprio

```
POST /api/templates/upload
```

Comportamento:
1. Recebe arquivo `.docx`.
2. **Valida** se o template usa as variáveis padrão da plataforma (`{{vendedor.nome}}`, `{{comprador.cpf}}`, etc.).
3. Identifica variáveis usadas e marca como obrigatórias/opcionais.
4. Salva em `contract_templates` com `tenant_id = X`, `is_sistema = false`, `parent_template_id = null`.
5. Disponibiliza na biblioteca.

---

## 🛡️ REGRAS DE PERMISSÃO

| Ação | Template do Sistema | Template Customizado do Tenant |
|------|--------------------|--------------------------------|
| Visualizar | ✅ Todos os tenants | ✅ Apenas o tenant dono |
| Usar para gerar contrato | ✅ Todos os tenants (se não ocultado) | ✅ Apenas o tenant dono |
| Editar conteúdo | ❌ Nunca | ✅ Apenas o tenant dono |
| Excluir | ⚠️ Apenas oculta (`is_hidden`) | ✅ Soft delete |
| Clonar | ✅ Cria cópia no tenant | ✅ Cria cópia no tenant |
| Favoritar | ✅ Por tenant | ✅ Por tenant |
| Renomear (apelido) | ✅ Por tenant (não altera global) | ✅ Por tenant |

---

## 🔄 ATUALIZAÇÕES DE TEMPLATES DO SISTEMA

Quando a Contract Genius AI atualiza um template do sistema (correção jurídica, ajuste de cláusula etc.):

1. ✅ Templates do sistema são atualizados via seed.
2. ❌ Clones customizados das imobiliárias **NÃO são modificados** (preservar customizações).
3. 📬 Notificar tenants que possuem clones do template atualizado:
   *"O modelo 'X' do sistema foi atualizado com [descrição da mudança]. Sua versão personalizada não foi alterada. Deseja revisar as diferenças?"*

Implementar interface tipo "diff" para o tenant comparar e decidir se quer:
- Manter sua versão customizada.
- Adotar a nova versão do sistema (perdendo customizações).
- Mesclar manualmente.

---

## 🎨 UX DA BIBLIOTECA

Sugestão de tela "Meus Modelos":

```
┌─────────────────────────────────────────────────────────────┐
│ 📚 Biblioteca de Modelos              [+ Novo modelo] [⚙️]  │
├─────────────────────────────────────────────────────────────┤
│ 🔍 Buscar...                    Categoria: [Todas ▼]        │
├─────────────────────────────────────────────────────────────┤
│ ⭐ FAVORITOS                                                │
│ ┌──────────────────┐ ┌──────────────────┐                  │
│ │ Compra e Venda   │ │ Locação          │                  │
│ │ Residencial      │ │ Residencial      │                  │
│ │ [sistema]        │ │ [personalizado]  │                  │
│ │ [Usar] [Editar]  │ │ [Usar] [Editar]  │                  │
│ └──────────────────┘ └──────────────────┘                  │
│                                                              │
│ 🏠 COMPRA E VENDA                                           │
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────┐ │
│ │ Residencial      │ │ Na Planta        │ │ Terreno      │ │
│ │ [sistema]        │ │ [sistema]        │ │ [sistema]    │ │
│ │ [Usar] [⋮]       │ │ [Usar] [⋮]       │ │ [Usar] [⋮]   │ │
│ └──────────────────┘ └──────────────────┘ └──────────────┘ │
│                                                              │
│ 🔑 LOCAÇÃO                                                  │
│ ...                                                          │
│                                                              │
│ 👁️ [Ver modelos ocultos (3)]                                │
└─────────────────────────────────────────────────────────────┘
```

Menu de ações (⋮) em cada card:
- 📝 Personalizar (clonar e editar)
- ⭐ Favoritar
- 🏷️ Renomear (apelido)
- 👁️ Ocultar da minha biblioteca
- 📥 Baixar template (.docx)

---

## ✅ CHECKLIST ADICIONAL DO PR

- [ ] Tabela `contract_templates` criada/migrada com campos necessários
- [ ] Tabela `tenant_template_settings` criada
- [ ] Pasta `/seeds/templates/` populada com modelos iniciais (mínimo 10 modelos)
- [ ] Script de seed implementado e executando no deploy
- [ ] Endpoint `GET /api/templates` filtra corretamente por tenant + ocultos
- [ ] Endpoint `DELETE /api/templates/:id` faz soft hide para sistema e soft delete para customizado
- [ ] Endpoint `POST /api/templates/:id/clone` funciona corretamente
- [ ] Endpoint `POST /api/templates/upload` valida e importa modelos do tenant
- [ ] Endpoint `POST /api/templates/:id/unhide` restaura modelos ocultos
- [ ] UI exibe origem do template (sistema/customizado/clonado)
- [ ] UI permite ocultar/restaurar/clonar via menu de ações
- [ ] Tela "Modelos Ocultos" para restauração
- [ ] Tenant A não consegue ver nem afetar templates do Tenant B
- [ ] Atualização de template do sistema preserva clones customizados
- [ ] Testes E2E cobrindo todos os fluxos acima

---

## 🚀 ORDEM SUGERIDA DE EXECUÇÃO (atualizada)

1. **Primeiro:** ajustes 1-11 do plano principal (qualidade dos contratos atuais).
2. **Em paralelo (pode ser outro dev/sprint):** estrutura de biblioteca de templates deste adendo.
3. **Depois:** população dos 10-15 modelos iniciais (envolve trabalho de redação jurídica + diagramação).
4. **Por fim:** rollout para imobiliárias com onboarding mostrando a biblioteca pré-instalada.

---

## 💡 CONSIDERAÇÕES DE PRODUTO

### Redação dos modelos iniciais

Os modelos pré-instalados são um **ativo jurídico** da plataforma. Considerar:
- Validação por advogado especialista em direito imobiliário.
- Adaptação por região (SP, RJ, MG podem ter especificidades).
- Conformidade com LGPD (cláusulas de proteção de dados pessoais).
- Atualização periódica conforme mudanças legislativas.

### Diferencial competitivo

Imobiliária que assina a Contract Genius AI deveria perceber valor já no primeiro login:
- "Você tem 15 modelos prontos para usar agora."
- "Personalize qualquer um deles em segundos."
- "Ou suba os seus próprios modelos."

Isso reduz **dramaticamente o tempo de onboarding** e aumenta a percepção de valor da assinatura.

### Possível upsell futuro

- **Marketplace de templates** entre imobiliárias (cada uma pode publicar seus modelos para outras usarem, com ou sem cobrança — você fica com fee).
- **Templates premium** validados por escritórios de advocacia parceiros.
- **Auditoria jurídica** opcional dos templates customizados do tenant.
