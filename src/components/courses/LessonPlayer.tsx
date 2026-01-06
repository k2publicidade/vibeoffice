'use client'

import type { Lesson, Course } from '@/types/courses'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Circle, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

interface LessonPlayerProps {
  course: Course
  lesson: Lesson
  isCompleted: boolean
  onMarkAsComplete: (lessonId: string, completed: boolean) => void
  onNextLesson?: () => void
  onPreviousLesson?: () => void
  hasNextLesson: boolean
  hasPreviousLesson: boolean
}

export function LessonPlayer({
  course,
  lesson,
  isCompleted,
  onMarkAsComplete,
  onNextLesson,
  onPreviousLesson,
  hasNextLesson,
  hasPreviousLesson,
}: LessonPlayerProps) {
  const [isMarked, setIsMarked] = useState(isCompleted)

  const handleMarkAsComplete = () => {
    const newState = !isMarked
    setIsMarked(newState)
    onMarkAsComplete(lesson.id, newState)
  }

  return (
    <div className="space-y-6">
      {/* Video placeholder */}
      <div className="w-full bg-black rounded-lg overflow-hidden">
        {lesson.videoUrl ? (
          <iframe
            src={lesson.videoUrl}
            className="w-full aspect-video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="w-full aspect-video bg-gradient-to-br from-[#fe6e5b]/20 to-[#ff0300]/20 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p className="text-lg">Nenhum vídeo disponível</p>
              <p className="text-sm">Vídeo será adicionado em breve</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lesson header */}
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold tracking-tight">
                  {lesson.title}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {course.title}
                </p>
              </div>
              <Button
                size="lg"
                variant={isMarked ? 'default' : 'outline'}
                onClick={handleMarkAsComplete}
                className="gap-2 whitespace-nowrap"
              >
                {isMarked ? (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    Concluído
                  </>
                ) : (
                  <>
                    <Circle className="h-5 w-5" />
                    Marcar como concluído
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Content */}
          <Card>
            <CardHeader>
              <CardTitle>Conteúdo da Aula</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <div className="space-y-4 text-foreground whitespace-pre-wrap">
                {lesson.content}
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between gap-4">
            <Button
              variant="outline"
              onClick={onPreviousLesson}
              disabled={!hasPreviousLesson}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Aula Anterior
            </Button>
            <Button
              onClick={onNextLesson}
              disabled={!hasNextLesson}
              className="gap-2"
            >
              Próxima Aula
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Sidebar - Course lessons */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Aulas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {course.lessons.map((l) => (
                  <div
                    key={l.id}
                    className={`p-3 rounded border cursor-pointer transition-colors ${
                      l.id === lesson.id
                        ? 'bg-primary/10 border-primary'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-muted-foreground mt-0.5">
                        {l.order}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium line-clamp-2">
                          {l.title}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
