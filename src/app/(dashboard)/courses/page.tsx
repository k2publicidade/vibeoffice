'use client'

import { useCourses } from '@/hooks/useCourses'
import { CourseCard } from '@/components/courses/CourseCard'
import { useRouter } from 'next/navigation'
import { AlertCircle, GraduationCap, BookOpen, TrendingUp, Search, SlidersHorizontal } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState, useMemo } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'

export default function CoursesPage() {
  const router = useRouter()
  const { courses, loading, getProgressStats } = useCourses()
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')

  // Calculate stats
  const stats = useMemo(() => {
    let total = courses.length;
    let inProgress = 0;
    let completed = 0;

    courses.forEach(c => {
      const p = getProgressStats(c.id).percentage;
      if (p === 100) completed++;
      else if (p > 0) inProgress++;
    });

    return { total, inProgress, completed };
  }, [courses, getProgressStats]);

  const filteredCourses = useMemo(() => {
    if (!searchTerm) return courses;
    return courses.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [courses, searchTerm]);

  const handleCourseClick = (courseId: string) => {
    router.push(`/courses/${courseId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-8 space-y-8">
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-32 w-full bg-zinc-900 rounded-2xl" />
          <Skeleton className="h-32 w-full bg-zinc-900 rounded-2xl" />
          <Skeleton className="h-32 w-full bg-zinc-900 rounded-2xl" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-96 w-full bg-zinc-900 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="p-6 md:p-8 space-y-10 max-w-[1600px] mx-auto">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-2"
          >
            <h1 className="text-4xl font-black tracking-tight uppercase italic flex items-center gap-2">
              Vibe <span className="text-red-600">Academy</span>
            </h1>
            <p className="text-zinc-400 font-medium tracking-wide">
              Desenvolva suas habilidades e domine o mercado.
            </p>
          </motion.div>

          {/* Search Bar & Admin Actions */}
          <div className="flex flex-col md:flex-row gap-4 items-center">
            {user?.role === 'Admin' && (
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => router.push('/courses/manage')}
                className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-3 rounded-xl border border-white/5 transition-all text-sm font-medium whitespace-nowrap"
              >
                <SlidersHorizontal size={16} />
                Gerenciar Cursos
              </motion.button>
            )}

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative w-full md:w-96"
            >
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-zinc-500" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar cursos..."
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all placeholder-zinc-600"
              />
            </motion.div>
          </div>
        </div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid gap-6 grid-cols-1 sm:grid-cols-3"
        >
          {/* Total */}
          <div className="bg-gradient-to-br from-neutral-900 to-black border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <GraduationCap size={80} />
            </div>
            <div className="relative z-10 flex flex-col justify-between h-full">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/20 to-red-900/20 flex items-center justify-center mb-4 border border-red-500/10">
                <GraduationCap className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Cursos Disponíveis</p>
                <p className="text-4xl font-black text-white">{stats.total}</p>
              </div>
            </div>
          </div>

          {/* In Progress */}
          <div className="bg-gradient-to-br from-neutral-900 to-black border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <BookOpen size={80} />
            </div>
            <div className="relative z-10 flex flex-col justify-between h-full">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-900/20 flex items-center justify-center mb-4 border border-blue-500/10">
                <BookOpen className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Em Andamento</p>
                <p className="text-4xl font-black text-white">{stats.inProgress}</p>
              </div>
            </div>
          </div>

          {/* Completed */}
          <div className="bg-gradient-to-br from-neutral-900 to-black border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <TrendingUp size={80} />
            </div>
            <div className="relative z-10 flex flex-col justify-between h-full">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-900/20 flex items-center justify-center mb-4 border border-emerald-500/10">
                <TrendingUp className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Concluídos</p>
                <p className="text-4xl font-black text-white">{stats.completed}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Content Divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

        {/* Courses Grid */}
        {filteredCourses.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {filteredCourses.map((course, index) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="h-full"
              >
                <CourseCard
                  course={course}
                  progress={getProgressStats(course.id).percentage}
                  onClick={() => handleCourseClick(course.id)}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center py-20"
          >
            <div className="text-center space-y-4 max-w-md p-10 rounded-3xl bg-zinc-900/30 border border-white/5 border-dashed">
              <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="h-10 w-10 text-zinc-600" />
              </div>
              <h3 className="text-xl font-bold text-white">
                {searchTerm ? 'Nenhum curso encontrado' : 'Nenhum curso disponível'}
              </h3>
              <p className="text-sm text-zinc-500">
                {searchTerm ? `Não encontramos resultados para "${searchTerm}".` : 'Novos cursos serão adicionados em breve à plataforma.'}
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
