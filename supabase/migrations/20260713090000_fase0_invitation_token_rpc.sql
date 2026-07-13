-- Fase 0 (auditoria) - item 2: fecha o vazamento da tabela invitations.
--
-- A policy "Anyone can read invitation by token" usava USING (true) e expunha
-- a tabela invitations INTEIRA (email, role, tenant_id, invited_by e o token -
-- credencial de accept_invitation) para anon. RLS nao enxerga o parametro de
-- query, entao o correto e uma RPC SECURITY DEFINER que recebe o token e
-- devolve APENAS uma linha com os campos necessarios a tela de aceite.
--
-- Ver docs/AUDITORIA_COMPLETA_2026-07.md, secao "d) RISCOS MULTI-TENANT" (ALTA #2).

-- 1. Remove a policy permissiva. SEM IF EXISTS de proposito: se o nome divergir,
--    queremos o erro na aplicacao, nao um no-op silencioso.
DROP POLICY "Anyone can read invitation by token" ON public.invitations;

-- 2. RPC read-only que expoe somente os campos da tela de aceite, de UM convite
--    valido (pending e nao expirado) identificado pelo token. Nunca a tabela
--    inteira, nunca o proprio token nem invited_by.
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token uuid)
RETURNS TABLE (
  email text,
  role public.app_role,
  tenant_id uuid,
  expires_at timestamptz,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT i.email, i.role, i.tenant_id, i.expires_at, i.status
  FROM invitations i
  WHERE i.token = p_token
    AND i.status = 'pending'
    AND i.expires_at > now();
END;
$$;

-- 3. Permissoes: a funcao roda como owner (SECURITY DEFINER); concede EXECUTE
--    a anon (fluxo de cadastro por convite, usuario ainda nao logado) e a
--    authenticated. Revoga de PUBLIC para nao vazar via role default.
REVOKE ALL ON FUNCTION public.get_invitation_by_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(uuid) TO anon, authenticated;
