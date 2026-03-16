

## Diagnóstico

O fluxo atual funciona assim:
1. Admin clica "Convidar Usuário" → preenche email e role → clica "Enviar Convite"
2. A edge function `send-invite` cria o convite e retorna o token
3. O dialog deveria mudar para mostrar o link copiável (`/cadastro?token=xxx`)

O código do `InviteUserDialog.tsx` já tem a lógica para exibir o link (linhas 28-31, 68-87). Possíveis motivos para não aparecer:

1. **A edge function retornou erro** (ex: o usuário não tem role `admin_empresa` no banco, ou houve erro de inserção) — o toast de erro apareceria
2. **A resposta não contém `invitation.token`** — o link não seria gerado
3. **Você ainda não clicou "Enviar Convite"** — o link só aparece após enviar

## Plano

Sem alterações de código necessárias. O fluxo correto é:

1. Ir em **Usuários** (`/app/usuarios`)
2. Clicar no botão **"Convidar Usuário"**
3. Preencher o **email** e selecionar a **função** (role)
4. Clicar **"Enviar Convite"**
5. Após sucesso, o dialog muda para exibir o **link de cadastro** com botão "Copiar Link"
6. Copiar e enviar o link para o novo usuário

Se ao clicar "Enviar Convite" apareceu um **erro no toast** (mensagem vermelha), o problema está na edge function ou nas permissões. Nesse caso, preciso ver o erro específico para corrigir.

**Teste agora**: vá em Usuários, clique "Convidar Usuário", preencha um email, e clique "Enviar Convite". Me diga se aparece o link ou uma mensagem de erro.

