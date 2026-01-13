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
      const { data: coursesDataRaw, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false })

      if (coursesError) throw coursesError
      const coursesData = coursesDataRaw as any[]

      // 2. Fetch Modules & Lessons (This could be optimized with a join, but separate calls are safer for nested arrays initially)
      // For simplicity/performance in small apps, we fetch all relevant modules/lessons or we could fetch on demand.
      // Let's fetch strict structure for now. To avoid N+1, we fetch all modules and lessons and map them.

      const { data: modulesDataRaw, error: modulesError } = await supabase
        .from('modules' as any)
        .select('*')
        .order('order')

      if (modulesError) throw modulesError
      const modulesData = modulesDataRaw as any[]

      const { data: lessonsDataRaw, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .order('order')

      if (lessonsError) throw lessonsError
      const lessonsData = lessonsDataRaw as any[]

      // 3. Assemble Structure
      const fullCourses: Course[] = coursesData.map(course => {
        const courseModules = modulesData
          .filter(m => m.course_id === course.id)
          .map(m => ({
            ...m,
            lessons: lessonsData.filter((l: any) => l.module_id === m.id)
          }));

        return {
          ...course,
          difficulty: course.difficulty || 'beginner',
          tags: course.tags || [],
          updated_at: course.updated_at || course.created_at,
          modules: courseModules,
          lessons_count: lessonsData.filter((l: any) => l.course_id === course.id).length
        } as Course;
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
        .from('user_course_progress' as any)
        .select('course_id, lesson_id')
        .eq('user_id', user.id)

      if (error) throw error;

      // Group by course
      const prog: Record<string, string[]> = {};
      (data as any[]).forEach(p => {
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
        await supabase.from('user_course_progress' as any).insert({
          user_id: user.id,
          course_id: courseId,
          lesson_id: lessonId
        });
      } else {
        await supabase.from('user_course_progress' as any).delete()
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

  const isLessonCompleted = useCallback((courseId: string, lessonId: string): boolean => {
    const completed = progressData[courseId] || [];
    return completed.includes(lessonId);
  }, [progressData]);

  // --- Admin Actions ---

  const createCourse = async (courseData: Partial<Course>): Promise<Course | undefined> => {
    if (!user) return undefined;

    try {
      const { data, error } = await supabase
        .from('courses' as any)
        .insert([courseData])
        .select()
        .single();

      if (error) throw error;

      const newCourse = data as any;
      const courseResult: Course = {
        ...newCourse,
        modules: [],
        lessons_count: 0,
        createdAt: new Date(newCourse.created_at),
        updatedAt: new Date(newCourse.updated_at)
      };

      setCourses(prev => [courseResult, ...prev]);
      return courseResult;
    } catch (error) {
      console.error('Error creating course:', error);
      throw error;
    }
  };

  const updateCourse = async (id: string, courseData: Partial<Course>) => {
    try {
      const { data, error } = await supabase
        .from('courses' as any)
        .update(courseData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      const updatedCourse = data as any;
      setCourses(prev => prev.map(c => c.id === id ? { ...c, ...updatedCourse, description: updatedCourse.description || c.description } : c));
      return data;
    } catch (error) {
      console.error('Error updating course:', error);
      throw error;
    }
  };

  const deleteCourse = async (id: string) => {
    try {
      const { error } = await supabase
        .from('courses' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCourses(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting course:', error);
      throw error;
    }
  };

  // Modules
  const createModule = async (courseId: string, title: string, order: number) => {
    try {
      const { data, error } = await supabase
        .from('modules' as any)
        .insert([{ course_id: courseId, title, order }])
        .select()
        .single();

      if (error) throw error;

      // Refresh entire course
      await fetchCourses();
      return data;
    } catch (error) {
      console.error('Error creating module:', error);
      throw error;
    }
  };

  const deleteModule = async (moduleId: string) => {
    try {
      const { error } = await supabase
        .from('modules' as any)
        .delete()
        .eq('id', moduleId);

      if (error) throw error;
      await fetchCourses();
    } catch (error) {
      console.error('Error deleting module:', error);
      throw error;
    }
  };

  // Lessons
  const createLesson = async (lessonData: Partial<Lesson>) => {
    try {
      const { data, error } = await supabase
        .from('lessons' as any)
        .insert([lessonData])
        .select()
        .single();

      if (error) throw error;
      await fetchCourses();
      return data;
    } catch (error) {
      console.error('Error creating lesson:', error);
      throw error;
    }
  };

  const updateLesson = async (id: string, lessonData: Partial<Lesson>) => {
    try {
      const { data, error } = await supabase
        .from('lessons' as any)
        .update(lessonData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      await fetchCourses();
      return data;
    } catch (error) {
      console.error('Error updating lesson:', error);
      throw error;
    }
  };

  const deleteLesson = async (id: string) => {
    try {
      const { error } = await supabase
        .from('lessons' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchCourses();
    } catch (error) {
      console.error('Error deleting lesson:', error);
      throw error;
    }
  };

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
    deleteLesson
  }
}
