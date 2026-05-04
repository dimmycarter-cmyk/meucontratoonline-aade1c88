-- 1. Sequence table
CREATE TABLE IF NOT EXISTS public.contract_sequences (
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  ano INTEGER NOT NULL,
  ultimo_seq INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, ano)
);

ALTER TABLE public.contract_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view own sequences" ON public.contract_sequences;
CREATE POLICY "Members can view own sequences"
  ON public.contract_sequences FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Super admin can view all sequences" ON public.contract_sequences;
CREATE POLICY "Super admin can view all sequences"
  ON public.contract_sequences FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- 2. Code generator
CREATE OR REPLACE FUNCTION public.generate_internal_code(_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _slug TEXT;
  _ano INTEGER;
  _seq INTEGER;
BEGIN
  SELECT COALESCE(NULLIF(slug, ''), LEFT(id::text, 6))
    INTO _slug FROM public.tenants WHERE id = _tenant_id;

  IF _slug IS NULL THEN
    _slug := LEFT(_tenant_id::text, 6);
  END IF;

  _ano := EXTRACT(YEAR FROM now())::INTEGER;

  INSERT INTO public.contract_sequences (tenant_id, ano, ultimo_seq)
  VALUES (_tenant_id, _ano, 1)
  ON CONFLICT (tenant_id, ano)
  DO UPDATE SET ultimo_seq = public.contract_sequences.ultimo_seq + 1
  RETURNING ultimo_seq INTO _seq;

  RETURN upper(_slug) || '-' || _ano || '-' || lpad(_seq::text, 4, '0');
END;
$$;

-- 3. Trigger
CREATE OR REPLACE FUNCTION public.set_internal_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.internal_code IS NULL OR NEW.internal_code = '' THEN
    NEW.internal_code := public.generate_internal_code(NEW.tenant_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_internal_code ON public.contracts;
CREATE TRIGGER trg_set_internal_code
  BEFORE INSERT ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_internal_code();

-- 4. Backfill
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, tenant_id FROM public.contracts
    WHERE internal_code IS NULL OR internal_code = ''
    ORDER BY created_at ASC
  LOOP
    UPDATE public.contracts
    SET internal_code = public.generate_internal_code(r.tenant_id)
    WHERE id = r.id;
  END LOOP;
END $$;

-- 5. NOT NULL + UNIQUE per tenant
ALTER TABLE public.contracts ALTER COLUMN internal_code SET NOT NULL;

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