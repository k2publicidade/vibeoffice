'use client'

import { useState, useCallback } from 'react'
import type { Course, Lesson, CourseProgress } from '@/types/courses'
import { mockCourses, mockCourseProgress } from '@/lib/mock-data'

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
  const [courses] = useState<Course[]>(mockCourses)
  const [progress, setProgress] = useState<CourseProgress[]>(mockCourseProgress)

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
    (courseId: string, lessonId: string, completed: boolean) => {
      setProgress((prev) =>
        prev.map((p) => {
          if (p.courseId === courseId) {
            return {
              ...p,
              completedLessons: completed
                ? Array.from(new Set([...p.completedLessons, lessonId]))
                : p.completedLessons.filter((id) => id !== lessonId),
              lastAccessedAt: new Date(),
            }
          }
          return p
        })
      )
    },
    []
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
