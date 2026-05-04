# Plano — Prompt B: `internal_code` automático (formato `SLUG-ANO-SEQUENCIA`)

## 1. Migration SQL (uma só, via tool de migration)

Executa exatamente o que você definiu, com pequenos ajustes de robustez:

### 1.1 Tabela de sequência por tenant/ano
```sql
CREATE TABLE IF NOT EXISTS public.contract_sequences (
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  ano INTEGER NOT NULL,
  ultimo_seq INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, ano)
);

ALTER TABLE public.contract_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own sequences"
  ON public.contract_sequences FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));
-- Sem políticas de INSERT/UPDATE para usuários: a tabela só é escrita
-- pela função SECURITY DEFINER `generate_internal_code`.
```

Super admin já tem acesso global por padrão? Não — então adiciono também:
```sql
CREATE POLICY "Super admin can view all sequences"
  ON public.contract_sequences FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));
```

### 1.2 Função `generate_internal_code(tenant_id)`
Igual ao seu draft. Pontos:
- Usa `slug` do tenant em UPPER; se vazio/null, fallback para `LEFT(id::text, 6)` em UPPER.
- `EXTRACT(YEAR FROM now())`.
- `INSERT ... ON CONFLICT DO UPDATE SET ultimo_seq = ultimo_seq + 1 RETURNING ultimo_seq` — atômico, seguro contra concorrência (linha bloqueada pelo UPSERT).
- Retorna `UPPER(slug) || '-' || ano || '-' || lpad(seq, 4, '0')`.
- `SECURITY DEFINER` + `SET search_path = public`.

### 1.3 Trigger `BEFORE INSERT` em `contracts`
```sql
CREATE OR REPLACE FUNCTION public.set_internal_code() ...
-- Se NEW.internal_code IS NULL OR '' → preenche via generate_internal_code(NEW.tenant_id)

DROP TRIGGER IF EXISTS trg_set_internal_code ON public.contracts;
CREATE TRIGGER trg_set_internal_code
  BEFORE INSERT ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_internal_code();
```

### 1.4 Backfill retroativo (antes do NOT NULL)
`DO $$ ... $$` percorrendo `contracts WHERE internal_code IS NULL OR internal_code = ''` ordenado por `created_at ASC` e chamando `generate_internal_code(r.tenant_id)`. Isso garante numeração cronológica por tenant/ano.

### 1.5 NOT NULL + UNIQUE por tenant
```sql
ALTER TABLE public.contracts ALTER COLUMN internal_code SET NOT NULL;

-- Postgres não aceita IF NOT EXISTS em ADD CONSTRAINT;
-- uso DO block para idempotência:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contracts_internal_code_tenant_unique'
  ) THEN
    ALTER TABLE public.contracts
      ADD CONSTRAINT contracts_internal_code_tenant_unique
      UNIQUE (tenant_id, internal_code);
  END IF;
END $$;
```

> Observação: o draft original tem `ADD CONSTRAINT IF NOT EXISTS`, que **não é sintaxe válida em Postgres**. Vou trocar por esse DO block. Resultado idêntico, sem erro.

## 2. Frontend

### 2.1 Tipo `Contract` (`src/hooks/useContracts.ts`)
- Adicionar `internal_code: string;` à interface.
- `src/integrations/supabase/types.ts` será regenerado automaticamente pela migration; não toco nele.

### 2.2 Listagem `src/pages/app/Contratos.tsx`
- Nova primeira coluna **"Código"** com `font-mono text-sm` em destaque, antes da coluna "Contrato".
- Filtro de busca passa a casar também `internal_code` (`includes` case-insensitive no array `filtered`).
- Placeholder do input atualizado: `"Buscar por código ou nome..."`.

### 2.3 Detalhe `src/pages/app/ContratoDetalhe.tsx`
- No header, renderizar o `internal_code` ao lado do título do contrato como badge/chip discreto (`font-mono`, `text-xs`, `text-muted-foreground`, fundo sutil). Não interfere com edição inline do nome.

### 2.4 Wizard `src/pages/app/NovoContrato.tsx`
- Sem campo de código. Onde fizer sentido (ex.: tela de revisão final ou modal de "Salvar rascunho"), adicionar texto auxiliar discreto: *"Código gerado automaticamente ao salvar"*.
- Não preciso enviar `internal_code` no `INSERT` — a trigger preenche.

## 3. Regras duras respeitadas

- ✅ Só altera `contracts` (constraint+NOT NULL) e cria `contract_sequences` + 2 funções + 1 trigger.
- ✅ Não recria `contracts`. Coluna `internal_code` já existe — só recebe NOT NULL e UNIQUE.
- ✅ Backfill roda **antes** do `SET NOT NULL`.
- ✅ Fallback de 6 chars do `id` quando `slug` vazio/null.
- ✅ RLS habilitada em `contract_sequences` (SELECT só para o próprio tenant + super_admin; sem INSERT/UPDATE público — escrita só via `SECURITY DEFINER`).
- ✅ RLS de `contracts` intacta. `dados`, `current_step`, status, default `'rascunho'` — todos preservados.

## 4. Arquivos tocados

- Migration SQL (via supabase--migration)
- `src/hooks/useContracts.ts` — campo `internal_code` no tipo
- `src/pages/app/Contratos.tsx` — coluna + filtro
- `src/pages/app/ContratoDetalhe.tsx` — exibição no header
- `src/pages/app/NovoContrato.tsx` — texto auxiliar (mudança mínima)

## 5. Validação após executar

1. Build limpo, sem erros de tipo.
2. `SELECT count(*) FROM contracts WHERE internal_code IS NULL OR internal_code = ''` → `0`.
3. Criar contrato novo → trigger gera código no formato `SLUG-2026-0001`, sequência incrementa por tenant/ano.
4. Listagem mostra coluna Código em mono; busca por trecho do código filtra corretamente.
5. Tela de detalhe exibe o código ao lado do título.
6. Tentar inserir 2 contratos com mesmo `(tenant_id, internal_code)` manualmente → erro de unique (constraint funciona).

Aguardando aprovação para executar a migration e aplicar as mudanças de UI.
