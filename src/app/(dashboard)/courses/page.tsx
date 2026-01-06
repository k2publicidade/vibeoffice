'use client'

import { useCourses } from '@/hooks/useCourses'
import { CourseCard } from '@/components/courses/CourseCard'
import { useRouter } from 'next/navigation'
import { AlertCircle, GraduationCap, BookOpen, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { motion } from 'framer-motion'

export default function CoursesPage() {
  const router = useRouter()
  const { courses, getProgressPercentage } = useCourses()

  // Calculate stats
  const totalCourses = courses.length
  const completedCourses = courses.filter(c => getProgressPercentage(c.id) === 100).length
  const inProgressCourses = courses.filter(c => {
    const progress = getProgressPercentage(c.id)
    return progress > 0 && progress < 100
  }).length

  const handleCourseClick = (courseId: string) => {
    router.push(`/courses/${courseId}`)
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="p-6 md:p-8 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Cursos</h1>
          <p className="text-gray-400">
            Aprenda com nossos cursos e desenvolva suas habilidades
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid gap-4 grid-cols-3"
        >
          <Card className="bg-[#1a1a1a] border-[#262626]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#fc7a67]/10">
                  <GraduationCap className="h-5 w-5 text-[#fc7a67]" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="text-xl font-bold">{totalCourses}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a] border-[#262626]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#0c67ff]/10">
                  <BookOpen className="h-5 w-5 text-[#0c67ff]" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Em Progresso</p>
                  <p className="text-xl font-bold">{inProgressCourses}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a] border-[#262626]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Concluídos</p>
                  <p className="text-xl font-bold">{completedCourses}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Courses Grid */}
        {courses.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {courses.map((course, index) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <CourseCard
                  course={course}
                  progress={getProgressPercentage(course.id)}
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
          >
            <Card className="bg-[#1a1a1a] border-[#262626] p-12">
              <div className="text-center space-y-4">
                <div className="p-4 rounded-full bg-[#fc7a67]/10 w-fit mx-auto">
                  <AlertCircle className="h-12 w-12 text-[#fc7a67]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">
                    Nenhum curso disponível
                  </h3>
                  <p className="text-sm text-gray-400">
                    Novos cursos serão adicionados em breve
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  )
}
