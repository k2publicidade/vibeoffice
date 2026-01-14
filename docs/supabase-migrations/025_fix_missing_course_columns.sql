-- ============================================
-- Migration 025: Fix Missing Course Columns
-- Data: 2026-01-14
-- Descrição: Adiciona colunas que podem estar faltando na tabela courses
-- ============================================

DO $$
BEGIN
    -- 1. Add 'difficulty' column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'difficulty') THEN
        ALTER TABLE courses ADD COLUMN difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner';
    END IF;

    -- 2. Add 'tags' column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'tags') THEN
        ALTER TABLE courses ADD COLUMN tags TEXT[];
    END IF;

    -- 3. Add 'thumbnail' column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'thumbnail') THEN
        ALTER TABLE courses ADD COLUMN thumbnail TEXT;
    END IF;

    -- 4. Add 'instructor' column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'instructor') THEN
        ALTER TABLE courses ADD COLUMN instructor TEXT;
    END IF;

    -- 5. Add 'duration' column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'duration') THEN
        ALTER TABLE courses ADD COLUMN duration INTEGER;
    END IF;

END $$;
