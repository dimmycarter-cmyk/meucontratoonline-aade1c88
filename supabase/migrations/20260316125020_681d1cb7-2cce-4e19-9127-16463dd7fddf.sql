
-- Create invitations table
CREATE TABLE public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'corretor',
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'pending',
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  UNIQUE(token)
);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admin can view tenant invitations" ON public.invitations
  FOR SELECT TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (has_role(auth.uid(), 'admin_empresa') OR has_role(auth.uid(), 'super_admin'))
  );

CREATE POLICY "Admin can insert tenant invitations" ON public.invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (has_role(auth.uid(), 'admin_empresa') OR has_role(auth.uid(), 'super_admin'))
  );

CREATE POLICY "Super admin can manage all invitations" ON public.invitations
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Allow anonymous users to read invitations by token (for signup flow)
CREATE POLICY "Anyone can read invitation by token" ON public.invitations
  FOR SELECT TO anon, authenticated
  USING (true);

-- Function to accept invitation (called from handle_new_user trigger)
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invitation RECORD;
BEGIN
  SELECT * INTO v_invitation FROM invitations
  WHERE token = p_token AND status = 'pending' AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Convite inválido ou expirado');
  END IF;

  -- Update user profile to point to invitation's tenant
  UPDATE profiles SET tenant_id = v_invitation.tenant_id WHERE id = p_user_id;
  
  -- Update user role to match invitation
  DELETE FROM user_roles WHERE user_id = p_user_id;
  INSERT INTO user_roles (user_id, role, tenant_id) VALUES (p_user_id, v_invitation.role, v_invitation.tenant_id);
  
  -- Mark invitation as accepted
  UPDATE invitations SET status = 'accepted' WHERE id = v_invitation.id;
  
  -- Delete the auto-created tenant (from handle_new_user trigger)
  -- The old tenant was created with slug = user_id::text
  DELETE FROM tenants WHERE slug = p_user_id::text AND id != v_invitation.tenant_id;
  
  RETURN jsonb_build_object('success', true, 'tenant_id', v_invitation.tenant_id);
END;
$$;
