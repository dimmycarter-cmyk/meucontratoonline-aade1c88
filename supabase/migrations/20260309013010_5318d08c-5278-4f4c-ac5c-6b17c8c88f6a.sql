
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT p.id, 'super_admin'::app_role, p.tenant_id
FROM public.profiles p
WHERE p.email = 'dimmycarter@zixpay.com.br'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = p.id AND ur.role = 'super_admin'
);
