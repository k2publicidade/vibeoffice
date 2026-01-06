'use client'

import { Task } from '@/types/tasks'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useUsers } from '@/hooks/useUsers'
import { Calendar, Flag, Trash2, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TaskListProps {
  tasks: Task[]
  onEdit?: (task: Task) => void
  onDelete?: (taskId: string) => void
}

const priorityConfig = {
  low: { label: 'Baixa', color: 'bg-blue-100 text-blue-800' },
  medium: { label: 'Média', color: 'bg-yellow-100 text-yellow-800' },
  high: { label: 'Alta', color: 'bg-red-100 text-red-800' },
}

const statusConfig = {
  todo: { label: 'A Fazer', color: 'bg-gray-100 text-gray-800' },
  in_progress: { label: 'Em Progresso', color: 'bg-blue-100 text-blue-800' },
  done: { label: 'Concluído', color: 'bg-green-100 text-green-800' },
}

export function TaskList({ tasks, onEdit, onDelete }: TaskListProps) {
  const { users } = useUsers()

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Nenhuma tarefa encontrada</p>
      </div>
    )
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Título</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Prioridade</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Setor</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => {
            const assignee = users?.find(u => u.id === task.assignedTo)
            const priority = priorityConfig[task.priority as keyof typeof priorityConfig]
            const status = statusConfig[task.status as keyof typeof statusConfig]
            const dueDate = new Date(task.dueDate || new Date())
            const isOverdue = task.dueDate && dueDate < new Date() && task.status !== 'done'

            const initials = assignee?.name
              .split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase() || '?'

            return (
              <TableRow key={task.id} className="hover:bg-muted/50">
                <TableCell className="font-medium max-w-xs truncate">
                  {task.title}
                </TableCell>
                <TableCell>
                  <Badge className={`${status.color}`}>
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={`${priority.color}`}>
                    <Flag className="h-3 w-3 mr-1" />
                    {priority.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  {assignee ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={assignee.avatar ?? undefined} alt={assignee.name} />
                        <AvatarFallback className="bg-gradient-to-br from-[#fe6e5b] to-[#ff0300] text-white text-xs">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{assignee.name}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Não atribuído</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Calendar className={`h-4 w-4 ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`} />
                    <span className={isOverdue ? 'text-red-500 font-medium' : 'text-sm'}>
                      {dueDate.toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{task.sector}</Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit?.(task)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => onDelete?.(task.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
