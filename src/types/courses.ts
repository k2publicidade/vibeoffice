/**
 * Courses Module Types
 * Defines course structure, lessons, and progress tracking
 */

export interface Lesson {
  id: string
  courseId: string
  title: string
  content: string // Markdown
  videoUrl?: string
  order: number
}

export interface Course {
  id: string
  title: string
  description: string
  instructor: string
  lessons: Lesson[]
  duration?: number // In minutes
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  createdAt: Date
  updatedAt: Date
}

export interface CourseProgress {
  id: string
  userId: string
  courseId: string
  completedLessons: string[] // Lesson IDs
  progress: number // 0-100
  completedAt?: Date
  lastAccessedAt: Date
}
