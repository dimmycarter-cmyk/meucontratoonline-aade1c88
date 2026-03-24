

## Novo Fluxo Manual — Participantes com Formulario Completo

### O que muda

A etapa 2 do fluxo manual ("Partes & Docs") sera substituida por um sistema de participantes com formulario de cadastro inline (igual ao cadastro de contatos). Sem upload de arquivos.

### Como vai funcionar

1. O operador adiciona participantes selecionando o papel (Comprador, Vendedor, Conjuge, Fiador, etc.)
2. Cada participante abre um card com formulario completo: Nome, CPF, RG, Orgao Expedidor, Profissao, WhatsApp, Email, Nacionalidade, Estado Civil, CEP (com auto-preenchimento via ViaCEP), Rua, Numero, Complemento, Bairro, Cidade, UF
3. Opcao de buscar contato cadastrado para preencher automaticamente
4. Ordenacao inteligente: agrupa por papel e insere Conjuge logo apos o participante principal (Comprador → Conjuge → Vendedor → Conjuge)
5. Ao avancar para "Dados & Clausulas", os dados dos participantes sao mapeados automaticamente para o formulario de dados (`dados["comprador_nome"]`, `dados["comprador_cpf"]`, etc.)

### Plano tecnico

#### 1. Criar componente `ManualParticipantCard.tsx` (`src/components/contract/`)
- Card com formulario inline (campos iguais ao cadastro de contatos)
- Botao "Buscar contato" que abre dropdown com contatos existentes e preenche os campos
- Sem upload de documentos (diferente do `ParticipantCard` do fluxo IA)
- Props: participant data, role, onUpdate, onRemove, contacts list

#### 2. Criar componente `ManualParticipantManager.tsx` (`src/components/contract/`)
- Lista de participantes com botao "Adicionar participante" + seletor de papel
- Ordenacao inteligente: ordena a lista para que Conjuge fique sempre logo apos seu principal (Comprador, Conjuge do Comprador, Vendedor, Conjuge do Vendedor, demais)
- Validacao: exige pelo menos 1 comprador e 1 vendedor

#### 3. Editar `NovoContrato.tsx` — Step "parties-docs"
- Remover toda a UI atual (campos de Comprador/Vendedor simples, upload, checklist)
- Usar `ManualParticipantManager` com state `manualParticipants` (array de objetos com role + dados do formulario)
- Ao avancar, mapear cada participante para `dados`:
  - Comprador 1 → `comprador_nome`, `comprador_cpf`, `comprador_rg`, etc.
  - Conjuge do Comprador → `comprador_conjuge_nome`, etc.
  - Vendedor 1 → `vendedor_nome`, `vendedor_cpf`, etc.
- Atualizar `canProceed()`: exige pelo menos 1 comprador e 1 vendedor com nome preenchido
- Atualizar `handleSave()`: criar `contract_participants` a partir de `manualParticipants` em vez da logica atual de comprador/vendedor separado

#### 4. Tipo de dados do participante manual
```text
interface ManualParticipantData {
  id: string;
  role: ParticipantRole;
  nome: string;
  cpf: string;
  rg: string;
  orgao_expedidor: string;
  profissao: string;
  whatsapp: string;
  email: string;
  nacionalidade: string;
  estado_civil: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  contact_id: string | null; // se preenchido de contato existente
}
```

#### 5. Logica de ordenacao
```text
Ordem de prioridade dos papeis:
1. comprador
2. conjuge (vinculado ao comprador anterior)
3. vendedor
4. conjuge (vinculado ao vendedor anterior)
5. fiador, testemunha, procurador, interveniente, outro
```

### Arquivos a criar
- `src/components/contract/ManualParticipantCard.tsx`
- `src/components/contract/ManualParticipantManager.tsx`

### Arquivos a editar
- `src/pages/app/NovoContrato.tsx` — step "parties-docs", canProceed, handleNext (autoFillDados), handleSave

