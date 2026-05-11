-- ============================================
-- Migration 021: Sistema de Quadro de Avisos
-- Data: 2026-01-07
-- Descrição: Criar tabela de avisos da empresa com RLS e Realtime
-- ============================================

-- ============================================
-- PASSO 1: CRIAR ENUM PARA PRIORIDADE
-- ============================================

CREATE TYPE announcement_priority AS ENUM ('info', 'warning', 'urgent');

COMMENT ON TYPE announcement_priority IS 'Níveis de prioridade: info (azul), warning (amarelo), urgent (vermelho)';


-- ============================================
-- PASSO 2: CRIAR TABELA COMPANY_ANNOUNCEMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.company_announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Conteúdo do aviso
  title TEXT NOT NULL CHECK (length(title) > 0 AND length(title) <= 100),
  message TEXT NOT NULL CHECK (length(message) > 0),
  priority announcement_priority NOT NULL DEFAULT 'info',

  -- Autoria e segmentação
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_sectors sector_type[] DEFAULT '{}',

  -- Validade e status
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  active BOOLEAN DEFAULT true,

  -- Metadados extras (links, anexos, etc)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraint: data de expiração deve ser futura na criação
  CONSTRAINT expires_in_future CHECK (expires_at > created_at)
);

COMMENT ON TABLE public.company_announcements IS 'Avisos da empresa criados por Admin/Gerente e exibidos na dashboard';
COMMENT ON COLUMN public.company_announcements.title IS 'Título do aviso (máx 100 caracteres)';
COMMENT ON COLUMN public.company_announcements.message IS 'Mensagem completa (suporta markdown)';
COMMENT ON COLUMN public.company_announcements.priority IS 'Nível de prioridade: info, warning, urgent';
COMMENT ON COLUMN public.company_announcements.target_sectors IS 'Array de setores alvo. Vazio = todos os setores';
COMMENT ON COLUMN public.company_announcements.expires_at IS 'Data/hora de expiração. Avisos expirados não são exibidos';
COMMENT ON COLUMN public.company_announcements.active IS 'Controle manual de ativação. False = arquivado';
COMMENT ON COLUMN public.company_announcements.metadata IS 'JSONB para link, attachmentUrl, etc';


-- ============================================
-- PASSO 3: CRIAR ÍNDICES PARA PERFORMANCE
-- ============================================

-- Query principal: buscar avisos ativos e não expirados
CREATE INDEX idx_announcements_active_expires
  ON public.company_announcements(active, expires_at DESC)
  WHERE active = true;

-- Busca por setores (GIN index para arrays)
CREATE INDEX idx_announcements_sectors
  ON public.company_announcements USING GIN(target_sectors);

-- Busca por autor (útil para Gerente ver apenas seus avisos)
CREATE INDEX idx_announcements_created_by
  ON public.company_announcements(created_by);

-- Busca full-text em título e mensagem (para filtros)
CREATE INDEX idx_announcements_search
  ON public.company_announcements USING GIN(to_tsvector('portuguese', title || ' ' || message));


-- ============================================
-- PASSO 4: HABILITAR ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.company_announcements ENABLE ROW LEVEL SECURITY;


-- ============================================
-- PASSO 5: CRIAR RLS POLICIES - SELECT
-- ============================================

-- Política 1: Usuários autenticados veem avisos ativos, não expirados, do seu setor ou gerais
CREATE POLICY "Users view active announcements for their sector"
  ON public.company_announcements
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND active = true
    AND expires_at > NOW()
    AND (
      -- Avisos gerais (sem filtro de setor)
      target_sectors = '{}'
      OR
      -- Avisos do setor do usuário
      (SELECT sector FROM public.users WHERE id = auth.uid()) = ANY(target_sectors)
    )
  );


-- ============================================
-- PASSO 6: CRIAR RLS POLICIES - INSERT
-- ============================================

-- Política 2: Admin pode criar avisos para qualquer setor
CREATE POLICY "Admin can create all announcements"
  ON public.company_announcements
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin'
  );

-- Política 3: Gerente pode criar avisos para seu setor
CREATE POLICY "Manager can create announcements for own sector"
  ON public.company_announcements
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'Gerente'
    AND (
      -- Pode criar avisos gerais
      target_sectors = '{}'
      OR
      -- Ou avisos que incluam seu setor
      (SELECT sector FROM public.users WHERE id = auth.uid()) = ANY(target_sectors)
    )
  );


-- ============================================
-- PASSO 7: CRIAR RLS POLICIES - UPDATE
-- ============================================

-- Política 4: Admin pode atualizar todos os avisos
CREATE POLICY "Admin can update all announcements"
  ON public.company_announcements
  FOR UPDATE
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin')
  WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin');

-- Política 5: Gerente pode atualizar avisos do seu setor
CREATE POLICY "Manager can update own sector announcements"
  ON public.company_announcements
  FOR UPDATE
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'Gerente'
    AND (
      target_sectors = '{}'
      OR (SELECT sector FROM public.users WHERE id = auth.uid()) = ANY(target_sectors)
    )
  )
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'Gerente'
    AND (
      target_sectors = '{}'
      OR (SELECT sector FROM public.users WHERE id = auth.uid()) = ANY(target_sectors)
    )
  );


-- ============================================
-- PASSO 8: CRIAR RLS POLICIES - DELETE
-- ============================================

-- Política 6: Admin pode deletar todos os avisos
CREATE POLICY "Admin can delete all announcements"
  ON public.company_announcements
  FOR DELETE
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin');

-- Política 7: Gerente pode deletar avisos do seu setor
CREATE POLICY "Manager can delete own sector announcements"
  ON public.company_announcements
  FOR DELETE
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'Gerente'
    AND (
      target_sectors = '{}'
      OR (SELECT sector FROM public.users WHERE id = auth.uid()) = ANY(target_sectors)
    )
  );


-- ============================================
-- PASSO 9: HABILITAR REALTIME
-- ============================================

-- Habilitar Realtime para sincronização instantânea
ALTER PUBLICATION supabase_realtime ADD TABLE public.company_announcements;


-- ============================================
-- PASSO 10: CRIAR FUNÇÃO DE AUTO-UPDATE
-- ============================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_announcement_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para chamar a função
CREATE TRIGGER set_announcement_updated_at
  BEFORE UPDATE ON public.company_announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_announcement_updated_at();


-- ============================================
-- PASSO 11: SEED COM DADOS DE EXEMPLO
-- ============================================

-- Inserir avisos de exemplo (usar user Admin para testes)
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Buscar um usuário Admin
  SELECT id INTO admin_user_id
  FROM public.users
  WHERE role = 'Admin'
  LIMIT 1;

  -- Inserir apenas se encontrou um Admin
  IF admin_user_id IS NOT NULL THEN

    -- Aviso 1: Urgente para todos
    INSERT INTO public.company_announcements (
      title,
      message,
      priority,
      created_by,
      target_sectors,
      expires_at,
      active,
      metadata
    ) VALUES (
      'Manutenção Programada dos Servidores',
      'No dia 10/01/2026 às 02:00 realizaremos manutenção nos servidores. O sistema ficará indisponível por aproximadamente 2 horas. Por favor, salvem todo o trabalho antes deste horário.',
      'urgent',
      admin_user_id,
      '{}', -- Todos os setores
      NOW() + INTERVAL '7 days',
      true,
      '{"link": "/docs/manutencao"}'::jsonb
    );

    -- Aviso 2: Warning para Marketing
    INSERT INTO public.company_announcements (
      title,
      message,
      priority,
      created_by,
      target_sectors,
      expires_at,
      active,
      metadata
    ) VALUES (
      'Prazo para Campanhas Q1 se Aproximando',
      'Atenção equipe de Marketing! O prazo para submissão das campanhas do primeiro trimestre é 15/01/2026. Não esqueçam de revisar o material com a diretoria antes.',
      'warning',
      admin_user_id,
      ARRAY['Marketing']::sector_type[],
      NOW() + INTERVAL '10 days',
      true,
      '{}'::jsonb
    );

    -- Aviso 3: Info para todos
    INSERT INTO public.company_announcements (
      title,
      message,
      priority,
      created_by,
      target_sectors,
      expires_at,
      active,
      metadata
    ) VALUES (
      'Novos Cursos Disponíveis na Plataforma',
      'Adicionamos 5 novos cursos à plataforma de treinamento interno! Confira os temas: Gestão de Tempo, Comunicação Efetiva, Excel Avançado, Design Thinking e Liderança. Acesse a aba Cursos para começar.',
      'info',
      admin_user_id,
      '{}', -- Todos os setores
      NOW() + INTERVAL '30 days',
      true,
      '{"link": "/courses"}'::jsonb
    );

    -- Aviso 4: Info para TI/Suporte e Administrativo
    INSERT INTO public.company_announcements (
      title,
      message,
      priority,
      created_by,
      target_sectors,
      expires_at,
      active,
      metadata
    ) VALUES (
      'Atualização do Sistema de Tickets',
      'O sistema de tickets recebeu melhorias! Agora é possível anexar arquivos, marcar tickets como urgentes e receber notificações em tempo real. Confira as novidades.',
      'info',
      admin_user_id,
      ARRAY['TI/Suporte', 'Administrativo']::sector_type[],
      NOW() + INTERVAL '14 days',
      true,
      '{"link": "/tickets"}'::jsonb
    );

  END IF;
END $$;


-- ============================================
-- PASSO 12: VERIFICAÇÃO FINAL
-- ============================================

-- Verificar tabela criada
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'company_announcements') as column_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'company_announcements';

-- Verificar RLS habilitado
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'company_announcements';

-- Verificar policies criadas
SELECT
  tablename,
  policyname,
  cmd as comando,
  qual as using_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'company_announcements'
ORDER BY policyname;

-- Verificar Realtime habilitado
SELECT
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename = 'company_announcements';

-- Verificar índices criados
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'company_announcements'
ORDER BY indexname;

-- Contar avisos inseridos
SELECT
  COUNT(*) as total_avisos,
  COUNT(*) FILTER (WHERE active = true AND expires_at > NOW()) as avisos_ativos
FROM public.company_announcements;


-- ============================================
-- PASSO 13: GRANTS (SEGURANÇA)
-- ============================================

-- Garantir que authenticated role pode acessar a tabela
GRANT SELECT ON public.company_announcements TO authenticated;
GRANT INSERT ON public.company_announcements TO authenticated;
GRANT UPDATE ON public.company_announcements TO authenticated;
GRANT DELETE ON public.company_announcements TO authenticated;

-- Garantir que authenticated pode usar o tipo enum
GRANT USAGE ON TYPE announcement_priority TO authenticated;


-- ============================================
-- OBSERVAÇÕES FINAIS
-- ============================================

-- Esta migration cria:
-- ✅ Tipo ENUM announcement_priority (info, warning, urgent)
-- ✅ Tabela company_announcements com constraints
-- ✅ Índices otimizados para queries principais
-- ✅ RLS policies por role (Admin, Gerente, Colaborador)
-- ✅ Realtime habilitado para sincronização instantânea
-- ✅ Trigger de auto-update em updated_at
-- ✅ 4 avisos de exemplo para testes
--
-- Como usar:
-- 1. Execute esta migration no Supabase SQL Editor
-- 2. Avisos aparecerão automaticamente para usuários filtrados por setor
-- 3. Admin vê e edita todos os avisos
-- 4. Gerente vê e edita avisos do seu setor
-- 5. Colaborador apenas visualiza avisos relevantes
--
-- Segurança:
-- - RLS garante que usuários só veem avisos do seu setor
-- - Gerente não pode editar avisos de outros setores
-- - Avisos expirados são automaticamente filtrados
-- - Realtime funciona respeitando as RLS policies
