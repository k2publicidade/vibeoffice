-- ============================================
-- Migration 027: Fix Studio RLS Policies (Robust)
-- Data: 2026-01-14
-- Descrição: Recria todas as políticas de studio_bookings para corrigir erros de permissão e duplicidade via SQL Editor
-- ============================================

-- 1. Drop ALL existing policies for studio_bookings to ensure a clean slate
DROP POLICY IF EXISTS "Users can view all bookings" ON public.studio_bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON public.studio_bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON public.studio_bookings;
DROP POLICY IF EXISTS "Users can delete own bookings" ON public.studio_bookings;
DROP POLICY IF EXISTS "Users and Admins can update bookings" ON public.studio_bookings;
DROP POLICY IF EXISTS "Users and Admins can delete bookings" ON public.studio_bookings;

-- 2. Re-create Policies

-- READ: Everyone authenticated can view
CREATE POLICY "Users can view all bookings"
  ON public.studio_bookings
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- INSERT: Everyone authenticated can create
CREATE POLICY "Users can create bookings"
  ON public.studio_bookings
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- UPDATE: Creator OR Admin
CREATE POLICY "Users and Admins can update bookings"
  ON public.studio_bookings
  FOR UPDATE
  USING (
    auth.uid() = created_by 
    OR 
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin'
  );

-- DELETE: Creator OR Admin
CREATE POLICY "Users and Admins can delete bookings"
  ON public.studio_bookings
  FOR DELETE
  USING (
    auth.uid() = created_by 
    OR 
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin'
  );
