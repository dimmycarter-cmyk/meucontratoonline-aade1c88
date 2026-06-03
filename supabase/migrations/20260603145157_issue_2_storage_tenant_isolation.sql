-- Migration Issue 2: Storage bucket tenant isolation
-- EPICO 6 Security RLS Hardening
-- Data: 03/06/2026
-- Baseline: 0 arquivos legados (auditoria PASSO A)
-- Nomes antigos validados em 20260308221804[*].sql
--
-- NOTA DE APLICACAO:
-- Aplicado via Storage Policies UI - SQL Editor e EDIT bloqueados por
-- storage.objects owner restriction (Supabase abr/2025). Alteracao = recriar.
-- Nomes reais carregam sufixo UI dm0lod_N. Validado: Lovable scan limpo + E2E Andreia.

-- Step 1: Drop policies antigas (sem isolamento tenant)
-- Nomes EXATOS validados pelo Code

DROP POLICY IF EXISTS "Authenticated users can upload contract documents"
ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can read contract documents"
ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can delete contract documents"
ON storage.objects;

-- Step 2: Create policies com tenant isolation
CREATE POLICY "Tenant-isolated upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'contract-documents'
  AND (storage.foldername(name))[1] = get_user_tenant_id(auth.uid())::text
);

CREATE POLICY "Tenant-isolated read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'contract-documents'
  AND (storage.foldername(name))[1] = get_user_tenant_id(auth.uid())::text
);

CREATE POLICY "Tenant-isolated delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'contract-documents'
  AND (storage.foldername(name))[1] = get_user_tenant_id(auth.uid())::text
);

-- Sem DROP correspondente: nao existia policy de UPDATE antiga no bucket.
CREATE POLICY "Tenant-isolated update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'contract-documents'
  AND (storage.foldername(name))[1] = get_user_tenant_id(auth.uid())::text
);

-- Step 3: Comentarios explicativos
COMMENT ON POLICY "Tenant-isolated upload" ON storage.objects IS
'EPICO 6 Issue 2: tenant isolation no bucket contract-documents (uploads). Path deve comecar com tenant_id/.';

COMMENT ON POLICY "Tenant-isolated read" ON storage.objects IS
'EPICO 6 Issue 2: tenant isolation no bucket contract-documents (leitura). Usuarios so veem arquivos do proprio tenant.';

COMMENT ON POLICY "Tenant-isolated delete" ON storage.objects IS
'EPICO 6 Issue 2: tenant isolation no bucket contract-documents (delete). Usuarios so deletam arquivos do proprio tenant.';

COMMENT ON POLICY "Tenant-isolated update" ON storage.objects IS
'EPICO 6 Issue 2: tenant isolation no bucket contract-documents (update). Usuarios so atualizam arquivos do proprio tenant.';
