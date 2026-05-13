export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced'
export type LessonType = 'video' | 'html' | 'quiz'

export type LessonMaterial =
  | { kind: 'file'; name: string; url: string; size?: number; mime?: string }
  | { kind: 'link'; name: string; url: string }

export interface Lesson {
  id: string
  course_id: string
  module_id: string
  title: string
  description?: string
  type: LessonType
  content_url?: string // YouTube or File URL
  content?: string // HTML rich-text
  chapter?: string // Capítulo dentro do módulo (ex: "Módulo 1: Introdução")
  materials?: LessonMaterial[]
  duration?: number // Minutes
  order: number
}

export interface Module {
  id: string
  course_id: string
  title: string
  order: number
  lessons: Lesson[]
}

export interface Course {
  id: string
  title: string
  slug?: string
  subtitle?: string
  description: string
  thumbnail?: string
  instructor?: string
  duration?: number // Total minutes
  difficulty: DifficultyLevel
  tags: string[]
  is_published?: boolean
  author_id?: string | null
  created_at: string
  updated_at: string
  modules?: Module[] // Enriched data
  // Legacy/Helper fields for UI
  lessons_count?: number
}

export interface UserLessonProgress {
  lesson_id: string
  completed_at: string
}

export interface CourseProgress {
  course_id: string
  completed_lessons_count: number
  total_lessons_count: number
  percentage: number
  completed_lesson_ids: string[]
}
