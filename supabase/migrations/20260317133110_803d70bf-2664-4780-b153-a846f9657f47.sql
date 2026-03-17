-- Drop any triggers on contracts table that might enforce limits
DO $$
DECLARE
  trigger_rec RECORD;
BEGIN
  FOR trigger_rec IN 
    SELECT trigger_name FROM information_schema.triggers 
    WHERE event_object_table = 'contracts' AND event_object_schema = 'public'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.contracts', trigger_rec.trigger_name);
    RAISE NOTICE 'Dropped trigger: %', trigger_rec.trigger_name;
  END LOOP;
END $$;

-- Also drop any function that might enforce contract limits
DROP FUNCTION IF EXISTS public.enforce_contract_limit() CASCADE;
DROP FUNCTION IF EXISTS public.check_contract_limit() CASCADE;