'use client'

import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import type { Course, Lesson, CourseProgress } from '@/types/courses'

export interface UseCoursesReturn {
  courses: Course[]
  progress: CourseProgress[]
  getCourseById: (id: string) => Course | null
  getLessonById: (courseId: string, lessonId: string) => Lesson | null
  getCourseProgress: (courseId: string) => CourseProgress | null
  updateLessonProgress: (courseId: string, lessonId: string, completed: boolean) => void
  getCourseLessons: (courseId: string) => Lesson[]
  getProgressPercentage: (courseId: string) => number
  getNextLesson: (courseId: string, currentLessonId: string) => Lesson | null
  getPreviousLesson: (courseId: string, currentLessonId: string) => Lesson | null
  isLessonCompleted: (courseId: string, lessonId: string) => boolean
}

export function useCourses(): UseCoursesReturn {
  const [courses, setCourses] = useState<Course[]>([])
  const [progress, setProgress] = useState<CourseProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()

  // Fetch inicial de courses com lessons
  useEffect(() => {
    if (!user) return

    fetchCourses()
    fetchProgress()
  }, [user])

  async function fetchCourses() {
    setIsLoading(true)
    try {
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false })

      if (coursesError) throw coursesError

      // Para cada curso, buscar as lições
      const coursesWithLessons = await Promise.all(
        coursesData.map(async (course) => {
          const { data: lessonsData, error: lessonsError } = await supabase
            .from('lessons')
            .select('*')
            .eq('course_id', course.id)
            .order('order_index')

          if (lessonsError) throw lessonsError

          return {
            id: course.id,
            title: course.title,
            description: course.description || '',
            instructor: course.instructor || '',
            duration: course.duration || 0,
            sector: course.sector,
            thumbnail: course.thumbnail,
            lessons: lessonsData.map((lesson) => ({
              id: lesson.id,
              title: lesson.title,
              description: lesson.description || '',
              duration: lesson.duration || 0,
              videoUrl: lesson.video_url,
              content: lesson.content || '',
            })),
            createdAt: new Date(course.created_at),
            updatedAt: new Date(course.updated_at),
          }
        })
      )

      setCourses(coursesWithLessons)
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchProgress() {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('course_progress')
        .select('*')
        .eq('user_id', user.id)

      if (error) throw error

      setProgress(
        data.map((p) => ({
          userId: p.user_id,
          courseId: p.course_id,
          completedLessons: p.completed_lessons || [],
          lastAccessedAt: p.last_accessed_at ? new Date(p.last_accessed_at) : undefined,
        }))
      )
    } catch (error) {
      console.error('Error fetching progress:', error)
    }
  }

  const getCourseById = useCallback(
    (id: string) => {
      return courses.find((c) => c.id === id) || null
    },
    [courses]
  )

  const getLessonById = useCallback(
    (courseId: string, lessonId: string) => {
      const course = getCourseById(courseId)
      if (!course) return null
      return course.lessons.find((l) => l.id === lessonId) || null
    },
    [getCourseById]
  )

  const getCourseProgress = useCallback(
    (courseId: string) => {
      return progress.find((p) => p.courseId === courseId) || null
    },
    [progress]
  )

  const getCourseLessons = useCallback(
    (courseId: string) => {
      const course = getCourseById(courseId)
      return course?.lessons || []
    },
    [getCourseById]
  )

  const getProgressPercentage = useCallback(
    (courseId: string) => {
      const courseProgress = getCourseProgress(courseId)
      const course = getCourseById(courseId)

      if (!courseProgress || !course || course.lessons.length === 0) return 0

      const completedCount = courseProgress.completedLessons.length
      const totalCount = course.lessons.length

      return Math.round((completedCount / totalCount) * 100)
    },
    [getCourseProgress, getCourseById]
  )

  const updateLessonProgress = useCallback(
    async (courseId: string, lessonId: string, completed: boolean) => {
      if (!user) return

      const currentProgress = progress.find((p) => p.courseId === courseId)

      let newCompletedLessons: string[]
      if (completed) {
        newCompletedLessons = currentProgress
          ? Array.from(new Set([...currentProgress.completedLessons, lessonId]))
          : [lessonId]
      } else {
        newCompletedLessons = currentProgress
          ? currentProgress.completedLessons.filter((id) => id !== lessonId)
          : []
      }

      try {
        // Upsert no banco
        const { error } = await supabase
          .from('course_progress')
          .upsert(
            {
              user_id: user.id,
              course_id: courseId,
              completed_lessons: newCompletedLessons,
              last_accessed_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,course_id' }
          )

        if (error) throw error

        // Atualizar estado local
        setProgress((prev) => {
          const exists = prev.find((p) => p.courseId === courseId)
          if (exists) {
            return prev.map((p) =>
              p.courseId === courseId
                ? {
                    ...p,
                    completedLessons: newCompletedLessons,
                    lastAccessedAt: new Date(),
                  }
                : p
            )
          } else {
            return [
              ...prev,
              {
                userId: user.id,
                courseId,
                completedLessons: newCompletedLessons,
                lastAccessedAt: new Date(),
              },
            ]
          }
        })
      } catch (error) {
        console.error('Error updating lesson progress:', error)
        throw error
      }
    },
    [user, progress]
  )

  const getNextLesson = useCallback(
    (courseId: string, currentLessonId: string) => {
      const course = getCourseById(courseId)
      if (!course) return null

      const currentIndex = course.lessons.findIndex((l) => l.id === currentLessonId)
      if (currentIndex === -1 || currentIndex === course.lessons.length - 1) {
        return null
      }

      return course.lessons[currentIndex + 1]
    },
    [getCourseById]
  )

  const getPreviousLesson = useCallback(
    (courseId: string, currentLessonId: string) => {
      const course = getCourseById(courseId)
      if (!course) return null

      const currentIndex = course.lessons.findIndex((l) => l.id === currentLessonId)
      if (currentIndex <= 0) {
        return null
      }

      return course.lessons[currentIndex - 1]
    },
    [getCourseById]
  )

  const isLessonCompleted = useCallback(
    (courseId: string, lessonId: string) => {
      const courseProgress = getCourseProgress(courseId)
      if (!courseProgress) return false

      return courseProgress.completedLessons.includes(lessonId)
    },
    [getCourseProgress]
  )

  return {
    courses,
    progress,
    getCourseById,
    getLessonById,
    getCourseProgress,
    updateLessonProgress,
    getCourseLessons,
    getProgressPercentage,
    getNextLesson,
    getPreviousLesson,
    isLessonCompleted,
  }
}
