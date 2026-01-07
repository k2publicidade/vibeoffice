-- ============================================
-- Migration 013: Atualizar Roles dos Usuários
-- Data: 2026-01-07
-- Descrição: Atribuir roles corretos aos usuários cadastrados
-- ============================================

-- Atualizar roles dos usuários
UPDATE public.users SET role = 'Colaborador', updated_at = NOW() WHERE email = 'amandaa.contatos@gmail.com';
UPDATE public.users SET role = 'Colaborador', updated_at = NOW() WHERE email = 'kevinn.allan@vibedistro.com';
UPDATE public.users SET role = 'Gerente', updated_at = NOW() WHERE email = 'leitteian@gmail.com';
UPDATE public.users SET role = 'Admin', updated_at = NOW() WHERE email = 'clawber.brasil@vibedistro.com';
UPDATE public.users SET role = 'Admin', updated_at = NOW() WHERE email = 'jayme.lopes@vibedistro.com';

-- Verificar atualizações
SELECT
  email,
  name,
  role,
  sector,
  updated_at
FROM public.users
WHERE email IN (
  'amandaa.contatos@gmail.com',
  'kevinn.allan@vibedistro.com',
  'leitteian@gmail.com',
  'clawber.brasil@vibedistro.com',
  'jayme.lopes@vibedistro.com'
)
ORDER BY role DESC, email;

-- Resumo de distribuição de roles
SELECT
  role,
  COUNT(*) as total_usuarios
FROM public.users
GROUP BY role
ORDER BY role;
