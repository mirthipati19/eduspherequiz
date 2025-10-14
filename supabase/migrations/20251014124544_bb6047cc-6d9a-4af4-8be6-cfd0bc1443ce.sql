-- Assign admin role to the current user
INSERT INTO public.user_roles (user_id, role)
VALUES ('dcd798fd-0d2c-4c8f-aa33-ce8e917cad3a', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;