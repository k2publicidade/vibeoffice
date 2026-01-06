'use client'

import type { Course } from '@/types/courses'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { BookOpen, Clock, User } from 'lucide-react'

interface CourseCardProps {
  course: Course
  progress?: number
  onClick?: () => void
}

const difficultyConfig = {
  beginner: { label: 'Iniciante', color: 'bg-green-100 text-green-800' },
  intermediate: { label: 'Intermediário', color: 'bg-yellow-100 text-yellow-800' },
  advanced: { label: 'Avançado', color: 'bg-red-100 text-red-800' },
}

export function CourseCard({ course, progress = 0, onClick }: CourseCardProps) {
  const difficulty = course.difficulty || 'beginner'
  const config = difficultyConfig[difficulty]

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-lg overflow-hidden"
      onClick={onClick}
    >
      {/* Thumbnail placeholder */}
      <div className="h-40 bg-gradient-to-br from-[#fe6e5b] to-[#ff0300] flex items-center justify-center">
        <BookOpen className="h-12 w-12 text-white opacity-50" />
      </div>

      <CardHeader className="pb-3">
        <h3 className="font-semibold text-foreground line-clamp-2">
          {course.title}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
          {course.description}
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Instructor */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          <span>{course.instructor}</span>
        </div>

        {/* Duration */}
        {course.duration && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{course.duration} minutos</span>
          </div>
        )}

        {/* Difficulty */}
        <div>
          <Badge className={`${config.color} text-xs`}>
            {config.label}
          </Badge>
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Lesson count */}
        <div className="text-xs text-muted-foreground pt-2 border-t border-border">
          {course.lessons.length} aulas
        </div>
      </CardContent>
    </Card>
  )
}
