# 🛠️ PLANO DE AJUSTES — Contract Genius AI (meucontratoonline-aade1c88)

**Repositório:** `https://github.com/dimmycarter-cmyk/meucontratoonline-aade1c88`
**Objetivo:** Implementar 10 ajustes funcionais e de geração de contrato, garantindo UX fluida (autopreenchimento via APIs públicas) e qualidade jurídica do documento final.

> ⚠️ **Instruções para a IA executora (Antigravity / Claude Code):**
> 1. Antes de implementar, leia toda a base de código para entender a arquitetura (frontend, backend, geração do PDF/DOCX do contrato e camada de templates).
> 2. Implemente os ajustes **na ordem listada**, criando commits atômicos por bloco.
> 3. Não quebre funcionalidades existentes — mantenha retrocompatibilidade.
> 4. Para cada item, **escreva testes** quando aplicável.
> 5. Após concluir, abra um PR com checklist marcando cada item.

---

## 📋 ÍNDICE DOS AJUSTES

1. Tornar campo "Identidade (RG)" do vendedor **opcional**
2. Autopreenchimento por **CPF** (vendedores e compradores)
3. Tornar **Data de Nascimento opcional**
4. Corrigir transferência do **CEP** para o contrato
5. **Autocomplete de Profissão** (deixar para sprint futura — apenas estrutura inicial)
6. Autopreenchimento por **CNPJ** das imobiliárias
7. Refatorar **qualificação de cônjuges** no texto do contrato (unificação)
8. Aplicar **negrito** na descrição do imóvel
9. Tornar **multa diária por atraso de entrega das chaves** configurável (não hardcoded)
10. Corrigir bloco de **assinaturas** no rodapé do contrato
11. Corrigir **dados da imobiliária** (telefone e dados bancários) que não estão refletindo no contrato

---

## 🔹 AJUSTE 1 — Campo "Identidade (RG)" do Vendedor: Opcional

**Problema:** O campo de RG/Identidade do vendedor está marcado como obrigatório no formulário, bloqueando o cadastro.

**O que fazer:**
- Frontend: remover atributo `required` do input de RG no formulário de vendedor (e por consistência, do comprador também).
- Backend: alterar schema de validação (Zod / Yup / Joi / Pydantic — o que estiver em uso) para que o campo `rg` (ou `identidade`) seja opcional/`nullable`.
- Banco de dados: garantir que a coluna aceite `NULL`. Se não aceitar, gerar migration:
  ```sql
  ALTER TABLE vendedores ALTER COLUMN rg DROP NOT NULL;
  ALTER TABLE compradores ALTER COLUMN rg DROP NOT NULL;
  ```
- Template do contrato: quando o RG não for informado, gerar string vazia ou omitir graciosamente (ex: `portador da carteira de identidade nº ____`).

**Critério de aceite:** consigo cadastrar e gerar contrato sem preencher RG, sem erro.

---

## 🔹 AJUSTE 2 — Autopreenchimento por CPF (Vendedores e Compradores)

**Objetivo:** Ao digitar o CPF e perder o foco (`onBlur`) ou após 11 dígitos válidos, puxar automaticamente os dados da pessoa.

**Implementação:**
1. **Criar serviço backend** `services/cpf-lookup.service.ts` (ou linguagem equivalente do projeto):
   - Validar CPF antes da consulta (algoritmo dos dígitos verificadores).
   - Integrar com API de consulta de CPF. Sugestões (escolher uma):
     - **InfoSimples** (pago, alta confiabilidade)
     - **HubDoDesenvolvedor** (pago)
     - **APICPF** (pago)
     - **SerproDatavalid** (oficial Receita Federal, requer convênio)
   - Cachear resultados em Redis (ou cache em memória) por 30 dias, com a chave sendo o hash do CPF, para reduzir custo de API.
2. **Criar endpoint** `GET /api/lookup/cpf/:cpf` (proteger com rate limit por usuário, máx. 30 req/min).
3. **Frontend:** no `onBlur` do campo CPF, disparar a consulta e preencher:
   - Nome completo
   - Data de nascimento (se disponível e se o usuário não preencheu manualmente)
   - Nome da mãe (se aplicável e armazenado)
4. **UX:** mostrar spinner durante a consulta e toast de erro silencioso caso a API falhe (não bloquear o formulário — o usuário pode preencher manualmente).
5. **Variáveis de ambiente:** adicionar `CPF_API_URL`, `CPF_API_TOKEN` ao `.env.example`.

**Critério de aceite:** ao digitar um CPF válido, os campos Nome e Data de Nascimento aparecem preenchidos automaticamente em até 3 segundos.

---

## 🔹 AJUSTE 3 — Data de Nascimento: Opcional

**O que fazer:**
- Frontend: remover `required` do campo `dataNascimento` de vendedor e comprador.
- Backend: tornar o campo opcional no schema de validação.
- Template do contrato: se a data não vier preenchida, **não renderizar** o trecho que a menciona (evitar imprimir "nascido em ____").

**Critério de aceite:** posso gerar contrato sem informar data de nascimento.

---

## 🔹 AJUSTE 4 — CEP Não Está Sendo Transferido para o Contrato

**Problema:** O usuário preenche o CEP de vendedor/comprador no formulário, mas ele não aparece no contrato gerado.

**Investigação necessária:**
1. Verificar se o campo `cep` está sendo persistido no banco (consultar uma entrada de teste).
2. Verificar se o objeto passado para o template do contrato (provavelmente em `/services/contract-generator.ts` ou similar) inclui `cep`.
3. Verificar o template (`.docx`, `.hbs`, `.ejs`, `.tsx` ou string interpolada) — se há referência à variável `{{cep}}` ou `${cep}`.

**Correção:**
- Garantir que o CEP é incluído na string de endereço do contrato. Sugestão de formato:
  > "residente e domiciliado na Rua Zurick, nº 58, Bairro Calafate, CEP 30411-130, Belo Horizonte/MG"
- Bônus: integrar com **ViaCEP** (`https://viacep.com.br/ws/{cep}/json/`) para autopreencher logradouro, bairro, cidade e UF ao digitar o CEP. É gratuita e não exige cadastro.

**Critério de aceite:** o CEP digitado aparece no contrato final, dentro do bloco de endereço.

---

## 🔹 AJUSTE 5 — Autocomplete de Profissão (Backlog / Fase 2)

**Status:** Não implementar agora, **deixar estrutura preparada**.

**O que fazer agora:**
- Criar arquivo `data/profissoes-cbo.json` com a lista oficial da CBO (Classificação Brasileira de Ocupações) — pode usar a lista pública do IBGE.
- Criar componente reutilizável `<AutocompleteInput />` no frontend (sem ativá-lo ainda — apenas deixar pronto).
- Adicionar TODO no campo de profissão: `// TODO: integrar com AutocompleteInput usando data/profissoes-cbo.json`.

**Critério de aceite:** arquivo de dados criado, componente criado e marcado como pronto para integração.

---

## 🔹 AJUSTE 6 — Autopreenchimento por CNPJ das Imobiliárias

**Objetivo:** Ao digitar o CNPJ da imobiliária, puxar automaticamente Razão Social, Nome Fantasia, Endereço, Telefone e E-mail.

**Implementação:**
1. **Criar serviço backend** `services/cnpj-lookup.service.ts`:
   - Validar CNPJ antes da consulta.
   - Integrar com **BrasilAPI** (`https://brasilapi.com.br/api/cnpj/v1/{cnpj}`) — gratuita, sem autenticação, retorna dados da Receita Federal.
   - Fallback: **ReceitaWS** (`https://receitaws.com.br/v1/cnpj/{cnpj}`) caso BrasilAPI falhe.
   - Cachear em Redis por 30 dias.
2. **Criar endpoint** `GET /api/lookup/cnpj/:cnpj`.
3. **Frontend:** no `onBlur` do campo CNPJ, preencher automaticamente:
   - Razão Social → campo `razao_social`
   - Nome Fantasia → campo `nome_fantasia` (se aplicável)
   - Logradouro + número + bairro + cidade + UF + CEP → campo de endereço
   - Telefone → campo `telefone` (formatar para `(XX) XXXX-XXXX`)
   - E-mail → campo `email`
4. **UX:** todos os campos preenchidos devem permanecer editáveis para o usuário corrigir caso necessário.

**Critério de aceite:** ao digitar um CNPJ válido, todos os campos da imobiliária aparecem preenchidos.

---

## 🔹 AJUSTE 7 — Qualificação de Cônjuges no Contrato (CRÍTICO)

**Problema atual:** O contrato repete cada cônjuge separadamente, com endereço completo duplicado e dois "casado(a)", como se fossem pessoas não relacionadas.

**Saída atual (errada):**
> LARISA DA GUARDA RODRIGUES, brasileira, **casada**, fisioterapeuta, portadora da carteira de identidade nº - , inscrita no CPF sob o nº 128.624.226-65, **residente e domiciliada na Rua Zurick, nº 58, Bairro Calafate - Belo Horizonte/MG**, doravante denominada simplesmente PROMISSÁRIA COMPRADORA e DIEGO ANTUNES CORDEIRO, brasileiro, **casado**, estudante, portador da carteira de identidade nº - PC/MG, inscrito no CPF sob o nº 424.859.778-01 , **residente e domiciliado na Rua Zurick, nº 58, Bairro Calafate - Belo Horizonte/MG**, doravante denominado simplesmente PROMISSÁRIO COMPRADOR.

**Saída desejada (correta):**
> LARISA DA GUARDA RODRIGUES, brasileira, fisioterapeuta, portadora da carteira de identidade nº - , inscrita no CPF sob o nº 128.624.226-65, **casada com** DIEGO ANTUNES CORDEIRO, brasileiro, estudante, portador da carteira de identidade nº - PC/MG, inscrito no CPF sob o nº 424.859.778-01, **residentes e domiciliados** na Rua Zurick, nº 58, Bairro Calafate - Belo Horizonte/MG, doravante **denominados simplesmente PROMISSÁRIOS COMPRADORES**.

**Implementação:**

1. **Estrutura de dados:** garantir que o formulário permita marcar dois compradores (ou vendedores) como **cônjuges entre si**. Adicionar checkbox `"São cônjuges entre si"` que aparece quando há 2 envolvidos no mesmo papel.

2. **Função geradora** `gerarQualificacaoEnvolvidos(envolvidos, papel)`:

```typescript
function gerarQualificacao(envolvidos: Envolvido[], papel: 'comprador' | 'vendedor'): string {
  const saoConjuges = envolvidos.length === 2 && envolvidos[0].conjugeDe === envolvidos[1].id;
  const mesmoEndereco = envolvidos.every(e =>
    e.endereco === envolvidos[0].endereco
  );

  if (saoConjuges && mesmoEndereco) {
    // Caso unificado: "X, ..., casada com Y, ..., residentes e domiciliados em ..."
    const [a, b] = envolvidos;
    const generoA = a.sexo === 'F' ? 'a' : 'o';
    const generoB = b.sexo === 'F' ? 'a' : 'o';

    return `${a.nome.toUpperCase()}, ${a.nacionalidade}, ${a.profissao}, ` +
           `portador${generoA} da carteira de identidade nº ${a.rg || '____'}, ` +
           `inscrit${generoA} no CPF sob o nº ${a.cpf}, ` +
           `casad${generoA} com ${b.nome.toUpperCase()}, ${b.nacionalidade}, ${b.profissao}, ` +
           `portador${generoB} da carteira de identidade nº ${b.rg || '____'}, ` +
           `inscrit${generoB} no CPF sob o nº ${b.cpf}, ` +
           `residentes e domiciliados na ${formatarEndereco(a.endereco)}, ` +
           `doravante denominados simplesmente ${pluralPapel(papel)}.`;
  }

  // Fallback: qualificação individual concatenada com " e "
  return envolvidos.map(e => qualificacaoIndividual(e, papel)).join(' e ');
}
```

3. **Regras de concordância de gênero:**
   - Se ambos forem do mesmo sexo: usar plural correto (`PROMISSÁRIOS COMPRADORES` / `PROMISSÁRIAS COMPRADORAS`).
   - Sexos diferentes: usar masculino plural (regra gramatical).
   - "Casado com" / "casada com" segue o gênero do primeiro citado.

4. **Endereço:** se os endereços forem diferentes mesmo sendo cônjuges, manter qualificação separada.

**Critério de aceite:** ao gerar contrato com dois cônjuges no mesmo endereço, a qualificação sai unificada conforme o exemplo desejado.

---

## 🔹 AJUSTE 8 — Negrito na Descrição do Imóvel

**Trecho que precisa ficar em negrito:**
> **Apartamento nº 102, Tipo A-3, do CONJUNTO HABITACIONAL PITEIRAS, à rua França 60,**

**Implementação:**
- Se o template é DOCX: usar a tag `<w:b/>` na descrição do imóvel (via biblioteca `docx`, `docxtemplater` ou similar). Em `docxtemplater`, usar a sintaxe `{@descricaoImovelHTML}` com HTML inline `<strong>...</strong>`.
- Se o template é HTML → PDF (via Puppeteer/wkhtmltopdf): envolver a variável em `<strong>{{descricaoImovel}}</strong>`.
- Se é geração programática (PDFKit, jsPDF): aplicar `.font('Helvetica-Bold')` na string da descrição e voltar para `Helvetica` em seguida.

**Critério de aceite:** a descrição do imóvel aparece em negrito no PDF/DOCX gerado.

---

## 🔹 AJUSTE 9 — Multa Diária por Atraso (R$ 54,00 hardcoded) — Tornar Configurável

**Problema:** A cláusula está com valor fixo de R$ 54,00 (cinquenta e quatro reais), mas precisa ser definido por contrato.

**Cláusula atual (errada porque é hardcoded):**
> PARÁGRAFO PRIMEIRO: ...o PROMITENTE VENDEDOR pagará aos PROMISSÁRIOS COMPRADORES a importância de **R$ 54,00 (cinquenta e quatro reais)** por dia de atraso...

**Implementação:**
1. **Localizar o template:** buscar a string "54,00" ou "cinquenta e quatro" no código para encontrar onde está hardcoded.
2. **Adicionar campo no formulário:** seção "Cláusulas e Multas" → input "Multa diária por atraso na entrega das chaves (R$)" com tipo `number`, default vazio.
3. **Adicionar campo na regra de cálculo (opcional/sugerido):** permitir definir como **valor fixo** OU como **percentual sobre o valor do imóvel por dia** (ex: 0,033% que é a regra comum de "1% ao mês"). Radio button com as duas opções.
4. **Conversão para extenso:** usar biblioteca `extenso` (npm) para converter o valor numérico em extenso automaticamente:
   ```bash
   npm install extenso
   ```
   ```typescript
   import extenso from 'extenso';
   const valorExtenso = extenso(multaDiaria, { mode: 'currency' });
   // Ex: extenso(54) → "cinquenta e quatro reais"
   ```
5. **Template atualizado:**
   ```
   ...o PROMITENTE VENDEDOR pagará aos PROMISSÁRIOS COMPRADORES a importância de
   R$ {{multaDiaria | formatarMoeda}} ({{multaDiariaExtenso}}) por dia de atraso...
   ```
6. **Validação:** se o usuário não preencher, exibir aviso: *"Esta cláusula contém um valor de multa diária. Deseja preencher ou omitir a cláusula?"*

**Critério de aceite:** posso definir qualquer valor de multa diária e ele aparece corretamente no contrato (numérico + extenso).

---

## 🔹 AJUSTE 10 — Bloco de Assinaturas Incompleto

**Problema:** O bloco de assinaturas não está renderizando os nomes dos compradores nem as linhas de assinatura.

**Estrutura desejada do bloco de assinaturas:**

```
Belo Horizonte, [data por extenso].


PROMITENTE VENDEDOR:

_________________________________________
PEDRO OTÁVIO VITORINO GOMES
CPF: 000.000.000-00


PROMISSÁRIOS COMPRADORES:

1º: _________________________________________
LARISA DA GUARDA RODRIGUES
CPF: 128.624.226-65

2º: _________________________________________
DIEGO ANTUNES CORDEIRO
CPF: 424.859.778-01


TESTEMUNHAS:

1ª Testemunha:                              2ª Testemunha:
Nome: _____________________                Nome: _____________________
CPF:  _____________________                CPF:  _____________________


CORRETORES / IMOBILIÁRIA:

1º Corretor:                                2º Corretor:
Nome:  _____________________                Nome:  _____________________
CPF:   _____________________                CPF:   _____________________
CRECI: _____________________                CRECI: _____________________
E-mail:_____________________                E-mail:_____________________
```

**Implementação:**
1. Localizar o template do rodapé de assinaturas (provavelmente `signatures-block` ou `footer-template`).
2. **Gerar dinamicamente** os blocos com base em loops sobre os arrays de vendedores, compradores, testemunhas e corretores. Pseudocódigo:

```typescript
// Vendedores
contrato += `\nPROMITENTE${vendedores.length > 1 ? 'S' : ''} VENDEDOR${vendedores.length > 1 ? 'ES' : ''}:\n\n`;
vendedores.forEach((v, i) => {
  contrato += `${vendedores.length > 1 ? `${i+1}º: ` : ''}_________________________________________\n`;
  contrato += `${v.nome.toUpperCase()}\n`;
  contrato += `CPF: ${v.cpf}\n\n`;
});

// Compradores (mesma lógica)
contrato += `\nPROMISSÁRIO${compradores.length > 1 ? 'S' : ''} COMPRADOR${compradores.length > 1 ? 'ES' : ''}:\n\n`;
compradores.forEach((c, i) => {
  contrato += `${compradores.length > 1 ? `${i+1}º: ` : ''}_________________________________________\n`;
  contrato += `${c.nome.toUpperCase()}\n`;
  contrato += `CPF: ${c.cpf}\n\n`;
});

// Testemunhas (sempre 2, lado a lado em tabela)
// Corretores (1 ou 2, lado a lado em tabela)
```

3. **Layout em colunas (testemunhas e corretores):** se o output é DOCX, usar uma tabela 2x2 invisível (sem bordas). Se é HTML→PDF, usar `<table>` ou flexbox.

4. **Concordância de gênero/número:**
   - 1 vendedor masc → "PROMITENTE VENDEDOR"
   - 1 vendedora fem → "PROMITENTE VENDEDORA"
   - 2+ vendedores → "PROMITENTES VENDEDORES"
   - Mesma regra para compradores.

**Critério de aceite:** o bloco de assinaturas exibe todos os nomes e linhas corretamente, com plural/gênero adequados.

---

## 🔹 AJUSTE 11 — Dados da Imobiliária Salvos Não Estão Refletindo no Contrato

**Problema relatado:**
- Telefone da imobiliária está com número errado no contrato (mesmo após edição).
- Dados bancários foram alterados no cadastro, mas o contrato gerado continua exibindo os dados antigos.

**Diagnóstico provável:**
1. **Cache:** os dados da imobiliária podem estar sendo lidos de um cache antigo (Redis, Next.js ISR, React Query stale data).
2. **Snapshot:** o contrato pode estar usando um snapshot dos dados que foi salvo no momento da criação do contrato anterior — e não atualizando ao gerar novo.
3. **Variáveis hardcoded** no template (improvável, mas verificar).

**Plano de ação:**
1. **Auditoria de dados:** abrir o banco e verificar se o registro da imobiliária do usuário está com os dados corretos. Se sim, o problema é na leitura/cache. Se não, é no salvamento.
2. **Frontend → Backend:** verificar se o `PATCH /imobiliarias/:id` está realmente persistindo telefone e dados bancários. Adicionar log temporário se necessário.
3. **Invalidar cache:** após editar a imobiliária, invalidar cache:
   ```typescript
   await redis.del(`imobiliaria:${id}`);
   queryClient.invalidateQueries(['imobiliaria', id]); // se usar React Query
   ```
4. **Geração do contrato:** garantir que o serviço de geração lê os dados da imobiliária **na hora**, não de um snapshot. Buscar sempre o registro atual:
   ```typescript
   const imobiliaria = await db.imobiliaria.findUnique({ where: { id } });
   ```
5. **Dados bancários no template:** verificar se as variáveis `{{banco}}`, `{{agencia}}`, `{{conta}}`, `{{pix}}` estão sendo passadas para o template. Se for um campo único de texto, garantir que está sendo passado também.
6. **Testes:** criar um teste E2E:
   - Editar telefone da imobiliária para `(31) 99999-1234`.
   - Gerar contrato.
   - Verificar se o número aparece corretamente no PDF.

**Critério de aceite:** alterações nos dados da imobiliária refletem imediatamente no próximo contrato gerado.

---

## ✅ CHECKLIST FINAL DO PR

Ao concluir, o PR deve incluir esta checklist:

- [ ] Ajuste 1: RG opcional (frontend + backend + migration)
- [ ] Ajuste 2: Autopreenchimento por CPF (serviço + endpoint + integração frontend)
- [ ] Ajuste 3: Data de nascimento opcional
- [ ] Ajuste 4: CEP transferido para o contrato + integração ViaCEP
- [ ] Ajuste 5: Estrutura preparada para autocomplete de profissão (CBO JSON + componente)
- [ ] Ajuste 6: Autopreenchimento por CNPJ via BrasilAPI
- [ ] Ajuste 7: Refatoração da qualificação de cônjuges (com testes unitários)
- [ ] Ajuste 8: Negrito na descrição do imóvel
- [ ] Ajuste 9: Multa diária configurável (input + extenso automático)
- [ ] Ajuste 10: Bloco de assinaturas completo e dinâmico
- [ ] Ajuste 11: Bug fix de cache/snapshot da imobiliária
- [ ] Testes unitários e E2E passando
- [ ] `.env.example` atualizado com novas variáveis (CPF_API_TOKEN etc.)
- [ ] README atualizado se houver novas dependências ou configurações

---

## 🔧 DEPENDÊNCIAS QUE PROVAVELMENTE SERÃO NECESSÁRIAS

```bash
npm install extenso          # Converte número em extenso (cláusula da multa)
npm install axios            # Para chamadas às APIs de CPF/CNPJ (se ainda não usar)
npm install ioredis          # Cache (se ainda não usar)
npm install @hookform/resolvers zod   # Validação de formulário (se usar React Hook Form)
```

---

## 🚀 ORDEM SUGERIDA DE EXECUÇÃO

1. **Quick wins primeiro** (ajustes 1, 3, 8): tornar campos opcionais e aplicar negrito — baixa complexidade, alto impacto perceptível.
2. **Bug fixes** (ajustes 4, 11): destravar problemas que já estão impactando contratos atuais.
3. **Refatorações de template** (ajustes 7, 9, 10): coração do contrato — exige cuidado e testes.
4. **Integrações externas** (ajustes 2, 6): adicionam UX premium mas dependem de API externa.
5. **Estrutura para futuro** (ajuste 5): apenas preparar.

---

**Quando terminar, gerar um contrato de teste com os mesmos dados do exemplo (Larisa + Diego, Apartamento Piteiras) e enviar o PDF/DOCX para validação manual.**
