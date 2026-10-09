'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import type {
  Course,
  Module,
  Lesson,
  CourseProgress,
  DifficultyLevel,
} from '@/types/courses'
import { toast } from 'sonner'
import { resolveStorageUrl, storageReference } from '@/lib/supabase/storage'

// --- Row types refletindo o schema do banco (snake_case) ---
interface CourseRow {
  id: string
  title: string
  slug?: string | null
  subtitle?: string | null
  description?: string | null
  thumbnail?: string | null
  instructor?: string | null
  duration?: number | null
  difficulty?: DifficultyLevel | null
  tags?: string[] | null
  is_published?: boolean | null
  author_id?: string | null
  created_at: string
  updated_at?: string | null
}

interface ModuleRow {
  id: string
  course_id: string
  title: string
  order: number
}

interface LessonRow extends Omit<Lesson, 'module_id' | 'course_id'> {
  module_id: string
  course_id: string
}

interface ProgressRow {
  course_id: string
  lesson_id: string
}

interface CreateCoursePayload {
  title: string
  slug: string
  subtitle: string | null
  description: string
  difficulty: DifficultyLevel
  tags: string[]
  thumbnail: string | null
  instructor: string
  duration: number
  is_published: boolean
  author_id: string
}

function isErrorWithMessage(e: unknown): e is { message: string } {
  return typeof e === 'object' && e !== null && 'message' in e &&
    typeof (e as { message: unknown }).message === 'string'
}

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [progressData, setProgressData] = useState<Record<string, string[]>>({}) // courseId -> [completedLessonIds]
  const { user } = useAuth()
  // [C05] Client criado por hook para evitar sessão stale
  const supabase = createClient()

  // --- Fetch Data ---
  const fetchCourses = useCallback(async () => {
    setLoading(true)
    try {
      const { data: coursesDataRaw, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false })

      if (coursesError) throw coursesError
      const coursesData = (coursesDataRaw ?? []) as unknown as CourseRow[]

      const { data: modulesDataRaw, error: modulesError } = await supabase
        .from('modules' as any)
        .select('*')
        .order('order')

      if (modulesError) throw modulesError
      const modulesData = (modulesDataRaw ?? []) as unknown as ModuleRow[]

      const { data: lessonsDataRaw, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .order('order')

      if (lessonsError) throw lessonsError
      const lessonsData = (lessonsDataRaw ?? []) as unknown as LessonRow[]
      await Promise.all(coursesData.map(async course => { course.thumbnail = await resolveStorageUrl(course.thumbnail) }))
      await Promise.all(lessonsData.map(async lesson => {
        lesson.content_url = await resolveStorageUrl(lesson.content_url)
        lesson.materials = await Promise.all((lesson.materials || []).map(async material => ({ ...material, url: (await resolveStorageUrl(material.url))! })))
      }))

      // 3. Assemble Structure
      const fullCourses: Course[] = coursesData.map((course) => {
        const courseModules: Module[] = modulesData
          .filter((m) => m.course_id === course.id)
          .map((m) => ({
            ...m,
            lessons: lessonsData.filter((l) => l.module_id === m.id) as Lesson[],
          }))

        return {
          ...course,
          description: course.description ?? '',
          difficulty: course.difficulty ?? 'beginner',
          tags: course.tags ?? [],
          updated_at: course.updated_at ?? course.created_at,
          is_published: course.is_published ?? true,
          modules: courseModules,
          lessons_count: lessonsData.filter((l) => l.course_id === course.id).length,
        } as Course
      })

      setCourses(fullCourses)
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const fetchUserProgress = useCallback(async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('user_course_progress' as any)
        .select('course_id, lesson_id')
        .eq('user_id', user.id)

      if (error) throw error

      const prog: Record<string, string[]> = {}
      ;((data ?? []) as unknown as ProgressRow[]).forEach((p) => {
        if (!prog[p.course_id]) prog[p.course_id] = []
        prog[p.course_id].push(p.lesson_id)
      })

      setProgressData(prog)
    } catch (err) {
      console.error('Error fetching progress', err)
    }
  }, [user, supabase])

  useEffect(() => {
    if (user) {
      fetchCourses()
      fetchUserProgress()
    }
  }, [user, fetchCourses, fetchUserProgress])

  // --- Actions ---

  const getCourseById = useCallback(
    (id: string) => courses.find((c) => c.id === id),
    [courses]
  )

  const toggleLessonComplete = async (
    courseId: string,
    lessonId: string,
    isCompleted: boolean
  ) => {
    if (!user) return

    // Optimistic Update
    setProgressData((prev) => {
      const current = prev[courseId] || []
      const updated = isCompleted
        ? [...new Set([...current, lessonId])]
        : current.filter((id) => id !== lessonId)
      return { ...prev, [courseId]: updated }
    })

    try {
      if (isCompleted) {
        const { error } = await supabase.from('user_course_progress' as any).upsert({
          user_id: user.id,
          course_id: courseId,
          lesson_id: lessonId,
        }, { onConflict: 'user_id,lesson_id' })
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('user_course_progress' as any)
          .delete()
          .match({ user_id: user.id, lesson_id: lessonId })
        if (error) throw error
      }
    } catch (err) {
      console.error('Error updating progress', err)
      toast.error('Não consegui salvar seu progresso. Tente novamente.')
      fetchUserProgress() // Revert on error
    }
  }

  const getProgressStats = useCallback(
    (courseId: string): CourseProgress => {
      const course = courses.find((c) => c.id === courseId)
      const completed = progressData[courseId] || []
      const total = course?.lessons_count || 0

      return {
        course_id: courseId,
        completed_lessons_count: completed.length,
        total_lessons_count: total,
        percentage: total > 0 ? Math.round((completed.length / total) * 100) : 0,
        completed_lesson_ids: completed,
      }
    },
    [courses, progressData]
  )

  const isLessonCompleted = useCallback(
    (courseId: string, lessonId: string): boolean => {
      const completed = progressData[courseId] || []
      return completed.includes(lessonId)
    },
    [progressData]
  )

  // --- Admin Actions ---

  const slugify = (text: string) =>
    text
      .toString()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')

  const createCourse = async (
    courseData: Partial<Course>
  ): Promise<Course | undefined> => {
    if (!user) return undefined

    try {
      const title = courseData.title?.trim() || ''
      if (!title) throw new Error('Título é obrigatório')

      const slug =
        courseData.slug?.trim() || `${slugify(title)}-${Math.random().toString(36).slice(2, 7)}`

      const payload: CreateCoursePayload = {
        title,
        slug,
        subtitle: courseData.subtitle ?? null,
        description: courseData.description ?? '',
        difficulty: courseData.difficulty ?? 'beginner',
        tags: Array.isArray(courseData.tags) ? courseData.tags : [],
        thumbnail: courseData.thumbnail ? storageReference(courseData.thumbnail) : null,
        instructor: courseData.instructor || user.name || 'Equipe',
        duration: courseData.duration ?? 0,
        is_published: courseData.is_published ?? true,
        author_id: user.id,
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('Creating course with payload:', payload)
      }

      const { data, error } = await supabase
        .from('courses' as any)
        .insert([payload])
        .select()
        .single()

      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        })
        toast.error(`Erro ao criar curso: ${error.message || 'Erro desconhecido'}`, {
          description:
            error.details || error.hint || `Código: ${error.code} - Verifique o console (F12)`,
        })
        throw error
      }

      const newCourse = data as unknown as CourseRow
      const courseResult: Course = {
        ...newCourse,
        description: newCourse.description ?? '',
        difficulty: newCourse.difficulty ?? 'beginner',
        tags: newCourse.tags ?? [],
        updated_at: newCourse.updated_at ?? newCourse.created_at,
        modules: [],
        lessons_count: 0,
      } as Course

      setCourses((prev) => [courseResult, ...prev])
      toast.success('Curso criado com sucesso!')
      return courseResult
    } catch (error: unknown) {
      console.error('Error creating course:', error)
      const message = isErrorWithMessage(error) ? error.message : 'Erro desconhecido'
      if (!message.includes('Erro ao criar curso')) {
        toast.error('Falha ao criar curso', { description: message })
      }
      throw error
    }
  }

  const updateCourse = async (id: string, courseData: Partial<Course>) => {
    try {
      const { data, error } = await supabase
        .from('courses' as any)
        .update({ ...courseData, ...(courseData.thumbnail !== undefined ? { thumbnail: storageReference(courseData.thumbnail || '') } : {}) })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      const updatedCourse = data as unknown as CourseRow
      setCourses((prev) =>
        prev.map((c): Course =>
          c.id === id
            ? {
                ...c,
                ...updatedCourse,
                slug: updatedCourse.slug ?? c.slug,
                subtitle: updatedCourse.subtitle ?? c.subtitle,
                thumbnail: updatedCourse.thumbnail ?? c.thumbnail,
                instructor: updatedCourse.instructor ?? c.instructor,
                duration: updatedCourse.duration ?? c.duration,
                difficulty: updatedCourse.difficulty ?? c.difficulty,
                tags: updatedCourse.tags ?? c.tags,
                is_published: updatedCourse.is_published ?? c.is_published,
                updated_at: updatedCourse.updated_at ?? c.updated_at,
                description: updatedCourse.description || c.description,
              }
            : c
        )
      )
      return data
    } catch (error) {
      console.error('Error updating course:', error)
      throw error
    }
  }

  const deleteCourse = async (id: string) => {
    try {
      const { error } = await supabase.from('courses' as any).delete().eq('id', id)
      if (error) throw error
      setCourses((prev) => prev.filter((c) => c.id !== id))
    } catch (error) {
      console.error('Error deleting course:', error)
      throw error
    }
  }

  // Modules
  const createModule = async (courseId: string, title: string, order: number) => {
    try {
      const { data, error } = await supabase
        .from('modules' as any)
        .insert([{ course_id: courseId, title, order }])
        .select()
        .single()

      if (error) throw error
      await fetchCourses()
      return data
    } catch (error) {
      console.error('Error creating module:', error)
      throw error
    }
  }

  const deleteModule = async (moduleId: string) => {
    try {
      const { error } = await supabase.from('modules' as any).delete().eq('id', moduleId)
      if (error) throw error
      await fetchCourses()
    } catch (error) {
      console.error('Error deleting module:', error)
      throw error
    }
  }

  // Lessons
  const createLesson = async (lessonData: Partial<Lesson>) => {
    try {
      const { data, error } = await supabase
        .from('lessons' as any)
        .insert([lessonData])
        .select()
        .single()

      if (error) throw error
      await fetchCourses()
      return data
    } catch (error) {
      console.error('Error creating lesson:', error)
      throw error
    }
  }

  const updateLesson = async (id: string, lessonData: Partial<Lesson>) => {
    try {
      const { data, error } = await supabase
        .from('lessons' as any)
        .update(lessonData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      await fetchCourses()
      return data
    } catch (error) {
      console.error('Error updating lesson:', error)
      throw error
    }
  }

  const deleteLesson = async (id: string) => {
    try {
      const { error } = await supabase.from('lessons' as any).delete().eq('id', id)
      if (error) throw error
      await fetchCourses()
    } catch (error) {
      console.error('Error deleting lesson:', error)
      throw error
    }
  }

  return {
    courses,
    loading,
    refresh: fetchCourses,
    getCourseById,
    toggleLessonComplete,
    getProgressStats,
    isLessonCompleted,
    // Admin ops
    createCourse,
    updateCourse,
    deleteCourse,
    createModule,
    deleteModule,
    createLesson,
    updateLesson,
    deleteLesson,
  }
}
