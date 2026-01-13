'use client'

import { memo } from 'react'
import { Task } from '@/types/tasks'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { InitialsAvatar } from '@/components/ui/initials-avatar'
import { useUsers } from '@/hooks/useUsers'
import { Calendar, Flag } from 'lucide-react'

interface TaskCardProps {
  task: Task
  onClick?: () => void
  isDragging?: boolean
}

const priorityConfig = {
  low: { label: 'Baixa', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  medium: { label: 'Média', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  high: { label: 'Alta', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
}

const statusConfig = {
  todo: { label: 'A Fazer' },
  in_progress: { label: 'Em Progresso' },
  done: { label: 'Concluído' },
}

export const TaskCard = memo(function TaskCard({ task, onClick, isDragging }: TaskCardProps) {
  const { users } = useUsers()
  const assignee = users?.find(u => task.assignees?.includes(u.id))
  const priority = priorityConfig[task.priority as keyof typeof priorityConfig]
  const status = statusConfig[task.status as keyof typeof statusConfig]

  const dueDate = new Date(task.dueDate || new Date())
  const isOverdue = task.dueDate && dueDate < new Date() && task.status !== 'done'


  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-lg ${
        isDragging ? 'opacity-50' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="pt-4 space-y-3">
        {/* Header com Prioridade */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium text-foreground line-clamp-2 flex-1">
            {task.title}
          </h3>
          <Badge className={`flex-shrink-0 ${priority.color}`}>
            <Flag className="h-3 w-3 mr-1" />
            {priority.label}
          </Badge>
        </div>

        {/* Descrição */}
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Footer com Data e Assignee */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <Calendar className={`h-3 w-3 ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`} />
            <span className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
              {dueDate.toLocaleDateString('pt-BR')}
            </span>
          </div>

          {assignee && (
            <InitialsAvatar name={assignee.name} size="xs" />
          )}
        </div>

        {/* Tags de setor */}
        <div className="flex gap-1 flex-wrap">
          <Badge variant="secondary" className="text-xs">
            {task.sector}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
})

TaskCard.displayName = 'TaskCard'
