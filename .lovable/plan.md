

## Fix: hard block do PDF impedindo fluxo do Salvar

### Diagnóstico

Inspecionei `src/pages/app/NovoContrato.tsx` e o comportamento real é:

- **Navegação entre etapas**: `handleNext()` e `canProceed()` **não consultam** `liveUnresolved`. A navegação já está livre no código (linhas 407–445 e 500–521).
- **Botão "Exportar PDF"**: `handlePrintClick` abre o dialog em modo `hard`. Correto.
- **Botão "Salvar Contrato"**: `handleSaveClick` (linhas 828–836) **abre o dialog em modo `soft`** quando há pendências, exigindo um clique extra em "Salvar como rascunho mesmo assim". Isso é a fonte real do "bloqueio" percebido — Salvar deveria gravar direto como rascunho.

`ContratoDetalhe.tsx` já está correto (só bloqueia Imprimir, não Salvar).

### Mudanças

**Arquivo único: `src/pages/app/NovoContrato.tsx`**

1. **Remover o bloqueio do Salvar** — `handleSaveClick` deixa de abrir o dialog soft. Salva direto:
   ```ts
   const handleSaveClick = () => { void handleSave(); };
   ```
   O `handleSave` já cria o contrato com `status: "rascunho"` (linha 690) e já dispara um `toast` informativo sobre placeholders não resolvidos (linhas 650–657), o que mantém o feedback ao usuário sem interromper o fluxo.

2. **Atualizar o texto do toast no `handleSave`** para deixar claro que foi salvo como rascunho mesmo com pendências (cosmetic, mantém o aviso já existente).

3. **Reafirmar (sem mudança estrutural) que `handleNext`/`canProceed` continuam sem checar `liveUnresolved`** — apenas garantir que nenhuma chamada futura introduza esse acoplamento. Adicionar comentário `// NÃO validar placeholders aqui — só em handlePrintClick` no topo de `handleNext`.

4. **Limpar imports/refs órfãos**: `pendingSoftActionRef` ainda é usado pelo dialog em modo soft (caso reapareça no futuro), mas como nenhum call-site agora seta `mode: "soft"`, o branch `onContinueAnyway` do dialog se torna inalcançável. Manter o ref e o branch (não há custo) mas remover os 4 statements de "soft" em `handleSaveClick`.

5. **Manter intactos**: o `Alert` amarelo no editor-finish (linhas 1216–1239), o botão "Ver pendências" (que abre o dialog em modo hard só para visualização), o `handlePrintClick` (hard block) e toda a lógica do `ContratoDetalhe.tsx`.

### Critérios de aceite

- Avançar/Voltar entre todas as etapas do wizard sem qualquer modal de pendências.
- Clicar em "Salvar Contrato" com pendências → grava `status: "rascunho"` e navega para `/app/contratos`, exibindo um toast amarelo com a contagem de pendências (sem modal).
- Clicar em "Exportar PDF" com pendências → abre `UnresolvedPlaceholdersDialog` em modo `hard` (único CTA: "Voltar para corrigir").
- Sem pendências: ambos os botões funcionam normalmente, sem dialog.
- `tsc --noEmit` limpo; testes Lote A (5/5) e Lote E (7/7) seguem verdes.

