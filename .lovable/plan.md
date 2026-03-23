
Diagnóstico atualizado (com base no código atual):
1) O `handleSave` já grava `dados` e tenta salvar participantes, mas ainda há dois pontos que podem deixar o contrato “em branco” na prática:
- `conteudo_final` só é recalculado se estiver vazio; se estiver desatualizado, salva texto sem os dados mais recentes.
- Os inserts em `contract_participants` e `contract_documents` não validam `error`; se falhar, passa silenciosamente.
2) Na tela de detalhe (`ContratoDetalhe`), comprador/vendedor vêm apenas de `comprador_id`/`vendedor_id` (contatos). No fluxo IA, esses IDs costumam ser `null`, então parece que “não salvou”, mesmo com dados em `contract_participants`.

Plano de implementação:
1) Fortalecer montagem dos dados no `handleSave` (`src/pages/app/NovoContrato.tsx`)
- Recalcular `mergedDados` no salvar com prioridade para o que foi digitado no formulário.
- Adicionar fallback de nome por papel (`comprador_nome` / `vendedor_nome`) usando `participants.full_name` quando a extração não trouxer `full_name`.
- Garantir que `mergedDados` seja o payload final do contrato sempre.

2) Garantir `conteudo_final` atualizado no salvar (`src/pages/app/NovoContrato.tsx`)
- Criar helper único de substituição de variáveis (aceitando `{{chave}}` e `{{ chave }}`).
- No `handleSave`, aplicar substituição sempre sobre o conteúdo atual do editor (ou template base), não apenas quando vazio.
- Manter cláusulas anexadas sem perder edições manuais.

3) Tratar erros de persistência auxiliar (`src/pages/app/NovoContrato.tsx`)
- Em cada insert de `contract_participants` e `contract_documents`, verificar `{ error }` e abortar com toast claro se falhar.
- Só navegar para `/app/contratos` após todas as gravações concluírem com sucesso.
- No `catch`, exibir erro explícito (hoje está silencioso).

4) Mostrar dados de participantes no detalhe do contrato (`src/pages/app/ContratoDetalhe.tsx`)
- Buscar `contract_participants` por `contract_id`.
- Exibir comprador/vendedor com fallback desses participantes quando `comprador_id`/`vendedor_id` forem nulos.
- Assim, o usuário enxerga os dados realmente salvos no fluxo IA.

Detalhes técnicos:
- Não exige migração de banco (estrutura e RLS já existem para `contracts` e `contract_participants`).
- Foco é consistência de payload + visibilidade do que foi salvo + tratamento de erro real.
- Mantém compatibilidade com fluxo manual e IA.

Critérios de aceite (E2E):
1) Criar contrato via IA com 2 participantes e salvar.
2) Abrir contrato salvo e validar:
- `conteudo_final` com variáveis preenchidas;
- nomes de comprador/vendedor visíveis no detalhe (mesmo sem `comprador_id`/`vendedor_id`);
- ausência de falha silenciosa (toast de erro se qualquer insert auxiliar falhar).
3) Repetir editando campos na etapa “Dados” e confirmando que a última edição aparece no contrato salvo.
