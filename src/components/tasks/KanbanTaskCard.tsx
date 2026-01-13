'use client'

import { memo } from 'react'
import { Task } from '@/types/tasks'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { InitialsAvatar } from '@/components/ui/initials-avatar'
import { useUsers } from '@/hooks/useUsers'
import { Calendar, Flag, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface KanbanTaskCardProps {
  task: Task
  onClick?: () => void
  isDragging?: boolean
}

const priorityConfig = {
  low: {
    label: 'Baixa',
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    iconColor: 'text-blue-400',
    borderColor: 'border-l-blue-500',
  },
  medium: {
    label: 'Média',
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    iconColor: 'text-amber-400',
    borderColor: 'border-l-amber-500',
  },
  high: {
    label: 'Alta',
    color: 'bg-red-500/10 text-red-400 border-red-500/30',
    iconColor: 'text-red-400',
    borderColor: 'border-l-red-500',
  },
}

export const KanbanTaskCard = memo(function KanbanTaskCard({
  task,
  onClick,
  isDragging = false,
}: KanbanTaskCardProps) {
  const { users } = useUsers()
  const assignee = users?.find(u => task.assignees?.includes(u.id))
  const priority = priorityConfig[task.priority]
  const dueDate = task.dueDate ? new Date(task.dueDate) : null
  const isOverdue = dueDate && dueDate < new Date() && task.status !== 'done'

  return (
    <motion.div
      whileHover={{ scale: isDragging ? 1 : 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(isDragging && 'opacity-60')}
    >
      <Card
        className={cn(
          'cursor-pointer transition-all duration-200',
          'hover:shadow-lg hover:shadow-black/20',
          'bg-gradient-to-br from-card to-card/80',
          'border-l-4',
          priority.borderColor,
          isDragging && 'shadow-2xl rotate-2 scale-105'
        )}
        onClick={onClick}
      >
        <CardContent className="pt-4 space-y-3">
          {/* Header com Título e Prioridade */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground line-clamp-2 flex-1">
              {task.title}
            </h3>
            <Badge
              className={cn(
                'flex-shrink-0 text-xs border',
                priority.color
              )}
              variant="outline"
            >
              <Flag className={cn('h-3 w-3 mr-1', priority.iconColor)} />
              {priority.label}
            </Badge>
          </div>

          {/* Descrição */}
          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Setor Badge */}
          <Badge variant="secondary" className="text-xs w-fit bg-secondary/50">
            {task.sector}
          </Badge>

          {/* Footer: Data e Assignee */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-center gap-1.5">
              {isOverdue && (
                <AlertCircle className="h-3.5 w-3.5 text-red-500 animate-pulse" />
              )}
              <Calendar
                className={cn(
                  'h-3.5 w-3.5',
                  isOverdue ? 'text-red-500' : 'text-muted-foreground'
                )}
              />
              <span
                className={cn(
                  'text-xs',
                  isOverdue ? 'text-red-500 font-semibold' : 'text-muted-foreground'
                )}
              >
                {dueDate
                  ? dueDate.toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                    })
                  : 'Sem prazo'}
              </span>
            </div>

            {assignee && (
              <InitialsAvatar name={assignee.name} size="xs" />
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
})

KanbanTaskCard.displayName = 'KanbanTaskCard'
