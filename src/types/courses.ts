export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced'
export type LessonType = 'video' | 'html' | 'quiz'

export interface Lesson {
  id: string
  course_id: string
  module_id: string
  title: string
  description?: string
  type: LessonType
  content_url?: string // YouTube or File URL
  content?: string // Markdown/HTML
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
  description: string
  thumbnail?: string
  instructor?: string
  duration?: number // Total minutes
  difficulty: DifficultyLevel
  tags: string[]
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
