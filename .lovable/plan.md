
Objetivo: impedir perda do rascunho de “Novo Contrato” quando o usuário minimiza/fecha a aba, troca de aba do navegador ou retorna depois de recarregamento.

Diagnóstico provável:
- Hoje o rascunho usa `sessionStorage` (`novo-contrato-draft`).
- `sessionStorage` é frágil para esse cenário: pode ser perdido quando a sessão/aba é encerrada ou recriada pelo navegador (comum em mobile e retomada de aba suspensa).
- Além disso, o salvamento atual engole erro silenciosamente (`catch {}`), então se houver falha de persistência o usuário não recebe aviso.

Plano de implementação:
1) Trocar persistência principal de `sessionStorage` para `localStorage`
- Manter uma chave versionada (ex.: `novo-contrato-draft:v2`).
- Carregar de `localStorage` na montagem do `NovoContrato`.
- Fazer migração automática: se existir no `sessionStorage` antigo, mover para `localStorage` uma única vez.

2) Tornar o autosave mais robusto
- Manter o `useEffect` de autosave, mas com `debounce` curto (300–500ms) para reduzir gravações excessivas.
- Forçar flush de gravação em `visibilitychange` (quando aba fica oculta) e em `pagehide`, para garantir salvamento antes de suspensão/fechamento.

3) Evitar perda por erro de armazenamento
- Substituir `catch {}` por tratamento explícito:
  - log técnico no console;
  - toast amigável informando “Não foi possível salvar rascunho localmente”.
- Continuar removendo objetos `File` do payload (já feito), mantendo só metadados.

4) Isolar rascunho por contexto do usuário
- Usar chave com escopo do tenant/usuário (ex.: `novo-contrato-draft:v2:{tenantId}:{userId}`) para não misturar rascunhos entre contas.

5) Limpeza controlada do rascunho
- Manter limpeza apenas em:
  - criação de contrato concluída com sucesso;
  - ação explícita de “descartar rascunho” (adicionar botão).
- Não limpar automaticamente ao navegar entre telas.

Detalhes técnicos (arquivos):
- `src/pages/app/NovoContrato.tsx`
  - Refatorar helpers `loadDraft/saveDraft/clearDraft` para `localStorage` + versão + escopo.
  - Adicionar migração de chave antiga.
  - Adicionar listeners `visibilitychange` e `pagehide` para flush.
  - Implementar debounce no autosave e tratamento de erro com toast.
  - Adicionar ação “Descartar rascunho” (opcional no footer do wizard).

Critério de aceite:
- Preencher etapas, minimizar/ocultar aba, voltar: dados permanecem.
- Recarregar página: rascunho reaparece.
- Navegar para outra rota e voltar: rascunho permanece.
- Somente após salvar contrato com sucesso (ou descartar manualmente) os dados somem.
