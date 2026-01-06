'use client'

import { useCourses } from '@/hooks/useCourses'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ArrowLeft,
  Clock,
  BookOpen,
  User,
  CheckCircle2,
  Play,
  GraduationCap
} from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function CourseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string

  const {
    getCourseById,
    getProgressPercentage,
    isLessonCompleted,
    getCourseProgress
  } = useCourses()

  const course = getCourseById(courseId)
  const progressPercentage = getProgressPercentage(courseId)
  const courseProgress = getCourseProgress(courseId)

  if (!course) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="bg-black border-[#262626] p-8 text-center">
          <div className="space-y-4">
            <GraduationCap className="h-12 w-12 mx-auto text-[#fc7a67]" />
            <h2 className="text-xl font-bold">Curso não encontrado</h2>
            <p className="text-gray-400">O curso que você está procurando não existe.</p>
            <Button
              onClick={() => router.push('/courses')}
              className="bg-[#fc7a67] text-black hover:bg-[#ff0300]"
            >
              Voltar aos Cursos
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const completedLessonsCount = courseProgress?.completedLessons.length || 0
  const totalLessons = course.lessons.length

  return (
    <div className="min-h-screen bg-black">
      <div className="p-6 md:p-8 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/courses')}
            className="text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{course.title}</h1>
            <p className="text-gray-400 mt-1">{course.description}</p>
          </div>
        </motion.div>

        {/* Course Info Cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid gap-4 grid-cols-2 md:grid-cols-4"
        >
          <Card className="bg-[#1a1a1a] border-[#262626]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#fc7a67]/10">
                  <User className="h-5 w-5 text-[#fc7a67]" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Instrutor</p>
                  <p className="font-semibold text-sm">{course.instructor}</p>
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
                  <p className="text-xs text-gray-500">Total de Aulas</p>
                  <p className="font-semibold text-sm">{totalLessons} aulas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a] border-[#262626]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#ef5907]/10">
                  <Clock className="h-5 w-5 text-[#ef5907]" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Duração</p>
                  <p className="font-semibold text-sm">
                    {course.duration ? `${course.duration} min` : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a] border-[#262626]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Concluído</p>
                  <p className="font-semibold text-sm">{completedLessonsCount}/{totalLessons}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-[#1a1a1a] border-[#262626]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Progresso do Curso</span>
                <span className="text-sm text-[#fc7a67] font-bold">{progressPercentage}%</span>
              </div>
              <Progress
                value={progressPercentage}
                className="h-2 bg-[#262626]"
              />
              {progressPercentage === 100 && (
                <div className="mt-3 flex items-center gap-2 text-green-500">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Curso concluído!</span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Lessons List */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-[#1a1a1a] border-[#262626]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-[#fc7a67]" />
                Aulas do Curso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {course.lessons.map((lesson, index) => {
                    const completed = isLessonCompleted(courseId, lesson.id)

                    return (
                      <motion.div
                        key={lesson.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * index }}
                      >
                        <Link href={`/courses/${courseId}/${lesson.id}`}>
                          <Card
                            className={`
                              p-4 cursor-pointer transition-all duration-200
                              ${completed
                                ? 'bg-green-500/5 border-green-500/20 hover:border-green-500/40'
                                : 'bg-black border-[#262626] hover:border-[#fc7a67]/50'
                              }
                            `}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`
                                flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                                ${completed
                                  ? 'bg-green-500/20 text-green-500'
                                  : 'bg-[#fc7a67]/10 text-[#fc7a67]'
                                }
                              `}>
                                {completed ? (
                                  <CheckCircle2 className="h-5 w-5" />
                                ) : (
                                  <span className="font-bold text-sm">{lesson.order}</span>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-white truncate">
                                  {lesson.title}
                                </h3>
                                <p className="text-sm text-gray-400 line-clamp-1">
                                  {lesson.content.split('\n')[0]}
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                {completed && (
                                  <Badge
                                    variant="outline"
                                    className="border-green-500/50 text-green-500 bg-green-500/10"
                                  >
                                    Concluída
                                  </Badge>
                                )}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-[#fc7a67] hover:bg-[#fc7a67]/10"
                                >
                                  <Play className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        </Link>
                      </motion.div>
                    )
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>

        {/* Start/Continue Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center"
        >
          {course.lessons.length > 0 && (
            <Link
              href={`/courses/${courseId}/${
                courseProgress?.completedLessons.length === 0
                  ? course.lessons[0].id
                  : course.lessons.find(l => !courseProgress?.completedLessons.includes(l.id))?.id || course.lessons[0].id
              }`}
            >
              <Button
                size="lg"
                className="bg-gradient-to-r from-[#ef5907] to-[#0c67ff] hover:opacity-90 text-white px-8"
              >
                <Play className="h-5 w-5 mr-2" />
                {progressPercentage === 0
                  ? 'Começar Curso'
                  : progressPercentage === 100
                    ? 'Revisar Curso'
                    : 'Continuar Curso'
                }
              </Button>
            </Link>
          )}
        </motion.div>
      </div>
    </div>
  )
}
