'use client'

import { useState } from 'react'
import { Task } from '@/types/tasks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TaskCard } from './TaskCard'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Clock, ListTodo } from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface TaskBoardProps {
  tasks: Task[]
  onTaskClick?: (task: Task) => void
  onTaskDelete?: (taskId: string) => void
  onTaskStatusChange?: (taskId: string, newStatus: string) => void
}

const columns = [
  {
    id: 'todo',
    title: 'A Fazer',
    icon: ListTodo,
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/20',
  },
  {
    id: 'in_progress',
    title: 'Em Progresso',
    icon: Clock,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20',
  },
  {
    id: 'done',
    title: 'Concluído',
    icon: CheckCircle2,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
  },
]

interface SortableTaskCardProps {
  task: Task
  onClick?: () => void
}

function SortableTaskCard({ task, onClick }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="cursor-grab active:cursor-grabbing"
    >
      <TaskCard task={task} isDragging={isDragging} />
    </div>
  )
}

interface DroppableColumnProps {
  column: typeof columns[0]
  tasks: Task[]
  onTaskClick?: (task: Task) => void
}

function DroppableColumn({ column, tasks, onTaskClick }: DroppableColumnProps) {
  const Icon = column.icon
  const taskIds = tasks.map(t => t.id)

  return (
    <Card className={`flex flex-col h-full min-h-[600px] ${column.bgColor} border-2 ${column.borderColor}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${column.bgColor}`}>
              <Icon className={`h-5 w-5 ${column.color}`} />
            </div>
            <CardTitle className="text-lg font-semibold">{column.title}</CardTitle>
          </div>
          <Badge variant="secondary" className="text-sm font-medium">
            {tasks.length}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 overflow-y-auto px-3 pb-4">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick?.(task)}
              />
            ))
          ) : (
            <div className="flex items-center justify-center h-32 border-2 border-dashed border-muted-foreground/20 rounded-xl text-muted-foreground text-sm">
              Arraste tarefas aqui
            </div>
          )}
        </SortableContext>
      </CardContent>
    </Card>
  )
}

export function TaskBoard({ tasks, onTaskClick, onTaskDelete, onTaskStatusChange }: TaskBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks)

  // Update local tasks when props change
  if (JSON.stringify(tasks) !== JSON.stringify(localTasks)) {
    setLocalTasks(tasks)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  )

  const handleDragStart = (event: DragStartEvent) => {
    const task = localTasks.find(t => t.id === event.active.id)
    if (task) {
      setActiveTask(task)
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeTask = localTasks.find(t => t.id === activeId)
    const overTask = localTasks.find(t => t.id === overId)

    if (!activeTask) return

    // If over a column
    const overColumn = columns.find(c => c.id === overId)
    if (overColumn && activeTask.status !== overColumn.id) {
      setLocalTasks(prev =>
        prev.map(t =>
          t.id === activeId ? { ...t, status: overColumn.id as Task['status'] } : t
        )
      )
    }

    // If over another task
    if (overTask && activeTask.status !== overTask.status) {
      setLocalTasks(prev =>
        prev.map(t =>
          t.id === activeId ? { ...t, status: overTask.status } : t
        )
      )
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeTask = localTasks.find(t => t.id === activeId)
    if (!activeTask) return

    // Check if dropped on a column
    const overColumn = columns.find(c => c.id === overId)
    if (overColumn) {
      onTaskStatusChange?.(activeId, overColumn.id)
      return
    }

    // Check if dropped on another task
    const overTask = localTasks.find(t => t.id === overId)
    if (overTask && activeTask.status !== overTask.status) {
      onTaskStatusChange?.(activeId, overTask.status)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        {columns.map((column) => {
          const columnTasks = localTasks.filter(t => t.status === column.id)

          return (
            <DroppableColumn
              key={column.id}
              column={column}
              tasks={columnTasks}
              onTaskClick={onTaskClick}
            />
          )
        })}
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="rotate-3 scale-105">
            <TaskCard task={activeTask} isDragging />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
