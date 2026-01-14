-- ============================================
-- Migration 026: Fix Studio RLS for Admins
-- Data: 2026-01-14
-- Descrição: Permite que Admins editem e excluam qualquer agendamento de estúdio
-- ============================================

-- Drop existing policies that might be too restrictive or update them
DROP POLICY IF EXISTS "Users can update own bookings" ON public.studio_bookings;
DROP POLICY IF EXISTS "Users can delete own bookings" ON public.studio_bookings;

-- Create new comprehensive policies

-- 1. UPDATE: Users can update own, Admins can update all
CREATE POLICY "Users and Admins can update bookings"
  ON public.studio_bookings
  FOR UPDATE
  USING (
    auth.uid() = created_by 
    OR 
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin'
  );

-- 2. DELETE: Users can delete own, Admins can delete all
CREATE POLICY "Users and Admins can delete bookings"
  ON public.studio_bookings
  FOR DELETE
  USING (
    auth.uid() = created_by 
    OR 
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin'
  );
