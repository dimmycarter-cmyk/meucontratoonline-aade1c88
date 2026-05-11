-- Adiciona colunas opcionais ao perfil do usuário (profiles).
--
-- whatsapp: contato individual do corretor/usuário, separado do whatsapp
--           da empresa (companies.whatsapp). Útil para identificação no
--           contrato gerado e comunicação interna.
--
-- cargo:    título profissional em texto livre (ex.: "Diretora Comercial
--           Sênior", "Gerente de Vendas", "Trainee"). Conceito ortogonal
--           ao enum app_role, que controla permissões técnicas
--           (super_admin, admin_empresa, corretor, assistente, operacional).
--
-- RLS: as policies existentes em profiles continuam aplicando (filtro por
-- tenant_id + auth.uid()) — nenhuma alteração de policy é necessária.
--
-- Índices: não criamos índices porque os campos não são usados em WHERE
-- nem em JOIN — são apenas exibidos no perfil e copiados para o contrato.

ALTER TABLE public.profiles
  ADD COLUMN whatsapp text,
  ADD COLUMN cargo text;
