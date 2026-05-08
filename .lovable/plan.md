## Comparativo: Prompt M vs. o que já existe

Antes de escrever qualquer código, inspecionei a tabela `contacts`, `useContacts.ts`, `ManualParticipantCard.tsx` e `NovoContrato.tsx`. **Conclusão: o Prompt M reinventa funcionalidade que já está 90% pronta no projeto.** Recomendo fortemente NÃO executá-lo como está e propor um caminho alternativo bem mais barato.

---

### 1. "Histórico de contatos por tenant" — JÁ EXISTE

A tabela `contacts` (vista nas tabelas Supabase) é exatamente um histórico de pessoas por tenant:
- `tenant_id`, `nome`, `cpf`, `rg`, `email`, `whatsapp`, endereço completo, dados bancários, profissão, estado civil…
- RLS por tenant já aplicada (`tenant_id = get_user_tenant_id(auth.uid())`).
- Hook `useContacts.ts` já expõe `contacts`, `createContact`, `updateContact`, `deleteContact`.
- Tela `/contatos` (`Contatos.tsx`) gerencia esse histórico.

Criar `participant_history` em paralelo geraria duplicação (mesmas pessoas em duas tabelas, com risco de divergência) sem ganho funcional.

---

### 2. Autocomplete por contato — JÁ EXISTE em `ManualParticipantCard`

Linhas 174–204 do componente:
- Botão "Buscar contato" abre um `Popover` com `Input` de busca.
- Filtro client-side por `nome` ou `cpf` em `filteredContacts`.
- Ao clicar numa sugestão, `fillFromContact()` preenche **todos** os campos do participante (nome, CPF, RG, profissão, whatsapp, email, nacionalidade, estado civil, endereço completo) e guarda `contact_id` para vínculo.
- Os contatos chegam via prop `contacts` carregada uma única vez em `NovoContrato.tsx` (`const { contacts } = useContacts()`).

Ou seja: o usuário já tem busca + auto-preenchimento. A única diferença em relação ao Prompt M é que hoje é via botão+popover, não via digitação no campo "Nome".

---

### 3. Problemas técnicos no Prompt M

a. **Schema incompatível**: o SQL referencia `tenant_members(user_id, status)`, tabela que **não existe** no projeto. A relação user↔tenant é via `profiles.tenant_id` + `user_roles`. As policies travariam.

b. **`UNIQUE (tenant_id, cpf)`** com CPF nullable quebra: dois participantes sem CPF ainda inserem (NULL ≠ NULL no Postgres), então o upsert `onConflict: "tenant_id,cpf"` falha quando CPF está vazio — exatamente o caso comum do wizard antes do usuário digitar CPF.

c. **Persistência "ao avançar etapa"** descrita na Tarefa 4 não tem ponto claro de gancho — `ManualParticipantCard` é um card isolado; quem persiste é `ManualParticipantManager`/`NovoContrato`. O prompt diz "adicionar APENAS esta linha após o save existente", mas o save real é em `contract_participants` dentro do submit do wizard.

d. **Snippets do Prompt M estão truncados/mal-formados** (vários blocos JSX cortados — `<Input ...>`, `<div>`, `<ul>`). Executar como está produziria build quebrado.

e. **Dropdown sob `<Input>` reposicionado manualmente** ignora o padrão do projeto: shadcn `Command` + `Popover` (já usado em outras telas) resolveria com acessibilidade e foco corretos.

---

### 4. Recomendação — duas opções honestas

#### Opção A (recomendada, baratíssima): aprimorar o que já existe
- **Zero migration.** Reusar `contacts` como histórico (é exatamente isso).
- Em `ManualParticipantCard.tsx`, transformar o campo "Nome completo" em um combobox que dispara o mesmo `filteredContacts` já carregado via prop. Dropdown abre ao digitar 2+ chars; ao selecionar, chama o `fillFromContact` existente. Botão "Buscar contato" pode ser mantido ou removido — sua escolha.
- Persistência silenciosa no histórico: no submit do wizard (em `NovoContrato.tsx`, onde `contract_participants` é gravado), para cada participante manual sem `contact_id`, chamar `createContact` (já existe e respeita RLS). Idempotência por CPF tratada no client (skip se já existe contato com mesmo CPF no array `contacts`).
- Arquivos tocados: `ManualParticipantCard.tsx` (campo nome) + `NovoContrato.tsx` (1 bloco no submit). Sem novo hook, sem novo componente, sem migration.

#### Opção B (se você realmente quer tabela separada)
- Criar `participant_history` mas:
  - RLS via `tenant_id = get_user_tenant_id(auth.uid())` (padrão do projeto), não `tenant_members`.
  - Sem `UNIQUE (tenant_id, cpf)` — usar índice simples e dedupe no client, ou `UNIQUE (tenant_id, cpf) WHERE cpf IS NOT NULL`.
  - Hook novo `useParticipantHistory.ts` separado de `useContacts`.
  - Componente novo `ContactAutocomplete.tsx` baseado em shadcn `Command` + `Popover` (já no projeto), não `<div>` absoluto manual.
  - Gancho de persistência em `NovoContrato.tsx` no submit do wizard.

Mas Opção B duplica dados de pessoas que já moram em `contacts`, aumenta superfície de RLS/manutenção, e não entrega nada que A não entregue.

---

### Pergunta antes de prosseguir

Qual caminho você quer?

1. **Opção A** — aprimorar com base em `contacts` já existente (1 componente + 1 página, sem migration, sem hook novo). Recomendado.
2. **Opção B** — criar `participant_history` separada, ajustando os bugs do Prompt M (RLS correta, unique index parcial, shadcn Command, gancho no submit do wizard).
3. **Não fazer nada** — o autocomplete via botão "Buscar contato" já cobre o caso de uso.
