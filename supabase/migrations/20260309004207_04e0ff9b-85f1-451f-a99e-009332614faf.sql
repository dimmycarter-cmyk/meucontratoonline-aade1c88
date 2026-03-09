
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT p.id, 'super_admin'::app_role, p.tenant_id
FROM public.profiles p
WHERE p.email = 'dimmycarter@zixpay.com.br'
ON CONFLICT (user_id, role) DO NOTHING;
