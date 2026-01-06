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
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Play,
  BookOpen,
  Home
} from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useState, useCallback } from 'react'

export default function LessonPlayerPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string
  const lessonId = params.lessonId as string

  const {
    getCourseById,
    getLessonById,
    getNextLesson,
    getPreviousLesson,
    isLessonCompleted,
    updateLessonProgress,
    getProgressPercentage
  } = useCourses()

  const course = getCourseById(courseId)
  const lesson = getLessonById(courseId, lessonId)
  const nextLesson = getNextLesson(courseId, lessonId)
  const previousLesson = getPreviousLesson(courseId, lessonId)
  const completed = isLessonCompleted(courseId, lessonId)
  const progressPercentage = getProgressPercentage(courseId)

  const [isMarked, setIsMarked] = useState(completed)

  const handleMarkAsComplete = useCallback(() => {
    const newState = !isMarked
    setIsMarked(newState)
    updateLessonProgress(courseId, lessonId, newState)
  }, [isMarked, courseId, lessonId, updateLessonProgress])

  const handleNavigateToLesson = (targetLessonId: string) => {
    router.push(`/courses/${courseId}/${targetLessonId}`)
  }

  if (!course || !lesson) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="bg-black border-[#262626] p-8 text-center">
          <div className="space-y-4">
            <BookOpen className="h-12 w-12 mx-auto text-[#fc7a67]" />
            <h2 className="text-xl font-bold">Aula não encontrada</h2>
            <p className="text-gray-400">A aula que você está procurando não existe.</p>
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

  return (
    <div className="min-h-screen bg-black">
      <div className="p-4 md:p-6 lg:p-8">
        {/* Navigation Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-4 mb-6"
        >
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/courses/${courseId}`)}
              className="text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="hidden sm:block">
              <p className="text-sm text-gray-400">{course.title}</p>
              <h1 className="text-lg font-bold">{lesson.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/courses">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
              >
                <Home className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Cursos</span>
              </Button>
            </Link>
            <Badge
              variant="outline"
              className="border-[#fc7a67]/50 text-[#fc7a67]"
            >
              {progressPercentage}% completo
            </Badge>
          </div>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Video Player */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-black border-[#262626] overflow-hidden">
                {lesson.videoUrl ? (
                  <iframe
                    src={lesson.videoUrl}
                    className="w-full aspect-video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="w-full aspect-video bg-gradient-to-br from-[#ef5907]/20 via-[#0c67ff]/10 to-[#ff0300]/20 flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <Play className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">Vídeo em breve</p>
                      <p className="text-sm">O conteúdo em vídeo será adicionado</p>
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>

            {/* Lesson Header & Actions */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
            >
              <div className="sm:hidden">
                <p className="text-sm text-gray-400">{course.title}</p>
                <h1 className="text-xl font-bold">{lesson.title}</h1>
              </div>

              <div className="hidden sm:block">
                <Badge className="bg-[#fc7a67]/10 text-[#fc7a67] border-0">
                  Aula {lesson.order} de {course.lessons.length}
                </Badge>
              </div>

              <Button
                size="lg"
                variant={isMarked ? 'default' : 'outline'}
                onClick={handleMarkAsComplete}
                className={`gap-2 ${
                  isMarked
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'border-[#262626] hover:border-[#fc7a67] hover:bg-[#fc7a67]/10'
                }`}
              >
                {isMarked ? (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    Concluída
                  </>
                ) : (
                  <>
                    <Circle className="h-5 w-5" />
                    Marcar como concluída
                  </>
                )}
              </Button>
            </motion.div>

            {/* Lesson Content */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-[#1a1a1a] border-[#262626]">
                <CardHeader>
                  <CardTitle className="text-lg">Conteúdo da Aula</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-invert max-w-none">
                    <div className="space-y-4 text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {lesson.content}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Navigation Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex justify-between gap-4"
            >
              <Button
                variant="outline"
                onClick={() => previousLesson && handleNavigateToLesson(previousLesson.id)}
                disabled={!previousLesson}
                className="gap-2 border-[#262626] hover:border-[#fc7a67] disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Aula Anterior</span>
                <span className="sm:hidden">Anterior</span>
              </Button>

              {nextLesson ? (
                <Button
                  onClick={() => handleNavigateToLesson(nextLesson.id)}
                  className="gap-2 bg-[#fc7a67] text-black hover:bg-[#ff0300]"
                >
                  <span className="hidden sm:inline">Próxima Aula</span>
                  <span className="sm:hidden">Próxima</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Link href={`/courses/${courseId}`}>
                  <Button className="gap-2 bg-gradient-to-r from-[#ef5907] to-[#0c67ff] text-white">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Finalizar Curso</span>
                    <span className="sm:hidden">Finalizar</span>
                  </Button>
                </Link>
              )}
            </motion.div>
          </div>

          {/* Sidebar - Lesson List */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="hidden lg:block"
          >
            <Card className="bg-[#1a1a1a] border-[#262626] sticky top-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[#fc7a67]" />
                  Aulas do Curso
                </CardTitle>
                <Progress value={progressPercentage} className="h-1.5 bg-[#262626] mt-2" />
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  <div className="p-4 pt-0 space-y-2">
                    {course.lessons.map((l) => {
                      const isCompleted = isLessonCompleted(courseId, l.id)
                      const isCurrent = l.id === lessonId

                      return (
                        <button
                          key={l.id}
                          onClick={() => handleNavigateToLesson(l.id)}
                          className={`
                            w-full p-3 rounded-lg border text-left transition-all duration-200
                            ${isCurrent
                              ? 'bg-[#fc7a67]/10 border-[#fc7a67] shadow-lg shadow-[#fc7a67]/5'
                              : isCompleted
                                ? 'bg-green-500/5 border-green-500/20 hover:border-green-500/40'
                                : 'bg-black border-[#262626] hover:border-[#fc7a67]/30'
                            }
                          `}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`
                              flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs
                              ${isCurrent
                                ? 'bg-[#fc7a67] text-black font-bold'
                                : isCompleted
                                  ? 'bg-green-500/20 text-green-500'
                                  : 'bg-[#262626] text-gray-400'
                              }
                            `}>
                              {isCompleted && !isCurrent ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              ) : (
                                l.order
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-medium line-clamp-2 ${
                                isCurrent ? 'text-white' : 'text-gray-300'
                              }`}>
                                {l.title}
                              </p>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Mobile Lesson Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:hidden mt-6"
        >
          <Card className="bg-[#1a1a1a] border-[#262626]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[#fc7a67]" />
                  Aulas do Curso
                </span>
                <Badge variant="outline" className="border-[#262626] text-xs">
                  {lesson.order}/{course.lessons.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {course.lessons.map((l) => {
                    const isCompleted = isLessonCompleted(courseId, l.id)
                    const isCurrent = l.id === lessonId

                    return (
                      <button
                        key={l.id}
                        onClick={() => handleNavigateToLesson(l.id)}
                        className={`
                          w-full p-3 rounded-lg border text-left transition-all
                          ${isCurrent
                            ? 'bg-[#fc7a67]/10 border-[#fc7a67]'
                            : isCompleted
                              ? 'bg-green-500/5 border-green-500/20'
                              : 'bg-black border-[#262626]'
                          }
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`
                            w-6 h-6 rounded-full flex items-center justify-center text-xs
                            ${isCurrent
                              ? 'bg-[#fc7a67] text-black font-bold'
                              : isCompleted
                                ? 'bg-green-500/20 text-green-500'
                                : 'bg-[#262626] text-gray-400'
                            }
                          `}>
                            {isCompleted && !isCurrent ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                              l.order
                            )}
                          </div>
                          <p className={`text-sm truncate ${
                            isCurrent ? 'text-white font-medium' : 'text-gray-300'
                          }`}>
                            {l.title}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
