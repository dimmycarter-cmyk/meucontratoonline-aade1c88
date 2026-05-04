-- 1. current_step
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS current_step TEXT NOT NULL DEFAULT 'template';

ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_current_step_check;
ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_current_step_check
  CHECK (current_step IN (
    'template',
    'parties-docs',
    'participants',
    'review-data',
    'data-clauses',
    'editor-finish',
    'concluido'
  ));

-- 2. internal_code
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS internal_code TEXT;

-- 3. Status expandido
ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_status_check;
ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_status_check
  CHECK (status IN (
    'rascunho','partes_pendentes','dados_pendentes',
    'revisao_juridica','aguardando_assinatura',
    'concluido','arquivado','cancelado'
  ));

-- 4. Migra status legado
UPDATE public.contracts SET status = 'concluido' WHERE status = 'ativo';

-- 5. Índices
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_status
  ON public.contracts(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_step
  ON public.contracts(tenant_id, current_step);