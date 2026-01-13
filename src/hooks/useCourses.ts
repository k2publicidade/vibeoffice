'use client'

import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import type { Course, Module, Lesson, CourseProgress } from '@/types/courses'

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [progressData, setProgressData] = useState<Record<string, string[]>>({}) // courseId -> [completedLessonIds]
  const { user } = useAuth()

  // --- Fetch Data ---
  const fetchCourses = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Fetch Courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false })

      if (coursesError) throw coursesError

      // 2. Fetch Modules & Lessons (This could be optimized with a join, but separate calls are safer for nested arrays initially)
      // For simplicity/performance in small apps, we fetch all relevant modules/lessons or we could fetch on demand.
      // Let's fetch strict structure for now. To avoid N+1, we fetch all modules and lessons and map them.

      const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select('*')
        .order('order')

      if (modulesError) throw modulesError

      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .order('order')

      if (lessonsError) throw lessonsError

      // 3. Assemble Structure
      const fullCourses: Course[] = coursesData.map(course => {
        const courseModules = modulesData
          .filter(m => m.course_id === course.id)
          .map(m => ({
            ...m,
            lessons: lessonsData.filter(l => l.module_id === m.id)
          }));

        return {
          ...course,
          modules: courseModules,
          lessons_count: lessonsData.filter(l => l.course_id === course.id).length
        };
      });

      setCourses(fullCourses)

    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setLoading(false)
    }
  }, [])


  const fetchUserProgress = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('user_course_progress')
        .select('course_id, lesson_id')
        .eq('user_id', user.id)

      if (error) throw error;

      // Group by course
      const prog: Record<string, string[]> = {};
      data.forEach(p => {
        if (!prog[p.course_id]) prog[p.course_id] = [];
        prog[p.course_id].push(p.lesson_id);
      });

      setProgressData(prog);

    } catch (err) {
      console.error("Error fetching progress", err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchCourses();
      fetchUserProgress();
    }
  }, [user, fetchCourses, fetchUserProgress])


  // --- Actions ---

  const getCourseById = useCallback((id: string) => {
    return courses.find(c => c.id === id);
  }, [courses]);

  const toggleLessonComplete = async (courseId: string, lessonId: string, isCompleted: boolean) => {
    if (!user) return;

    // Optimistic Update
    setProgressData(prev => {
      const current = prev[courseId] || [];
      const updated = isCompleted
        ? [...current, lessonId]
        : current.filter(id => id !== lessonId);
      return { ...prev, [courseId]: updated };
    });

    try {
      if (isCompleted) {
        await supabase.from('user_course_progress').insert({
          user_id: user.id,
          course_id: courseId,
          lesson_id: lessonId
        });
      } else {
        await supabase.from('user_course_progress').delete()
          .match({ user_id: user.id, lesson_id: lessonId });
      }
    } catch (err) {
      console.error("Error updating progress", err);
      fetchUserProgress(); // Revert on error
    }
  };

  const getProgressStats = useCallback((courseId: string): CourseProgress => {
    const course = courses.find(c => c.id === courseId);
    const completed = progressData[courseId] || [];
    const total = course?.lessons_count || 0;

    return {
      course_id: courseId,
      completed_lessons_count: completed.length,
      total_lessons_count: total,
      percentage: total > 0 ? Math.round((completed.length / total) * 100) : 0,
      completed_lesson_ids: completed
    };
  }, [courses, progressData]);

  return {
    courses,
    loading,
    refresh: fetchCourses,
    getCourseById,
    toggleLessonComplete,
    getProgressStats
  }
}
