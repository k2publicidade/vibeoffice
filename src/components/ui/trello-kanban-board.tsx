'use client'

import { useState, useCallback } from 'react'
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
  UniqueIdentifier,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDroppable } from '@dnd-kit/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, GripVertical } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export interface KanbanTask {
  id: string
  title: string
  description?: string
  [key: string]: unknown
}

export interface KanbanColumn {
  id: string
  title: string
  tasks: KanbanTask[]
  icon?: React.ReactNode
}

export interface TrelloKanbanBoardProps {
  columns: KanbanColumn[]
  columnColors?: Record<string, string>
  columnHeaderColors?: Record<string, string>
  allowAddTask?: boolean
  renderCard?: (task: KanbanTask, isDragging: boolean) => React.ReactNode
  onTaskMove?: (taskId: string, fromColumn: string, toColumn: string) => void
  onTaskClick?: (task: KanbanTask) => void
  onAddTask?: (columnId: string) => void
  className?: string
}

// ============================================================================
// Default Card Component
// ============================================================================

function DefaultTaskCard({ task, isDragging }: { task: KanbanTask; isDragging: boolean }) {
  return (
    <Card className={cn(
      'cursor-pointer transition-all hover:shadow-lg bg-card border',
      isDragging && 'opacity-50 shadow-2xl rotate-2 scale-105'
    )}>
      <CardContent className="pt-4 space-y-2">
        <h3 className="text-sm font-medium text-foreground line-clamp-2">
          {task.title}
        </h3>
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Sortable Task Item
// ============================================================================

interface SortableTaskItemProps {
  task: KanbanTask
  renderCard?: (task: KanbanTask, isDragging: boolean) => React.ReactNode
  onClick?: () => void
}

function SortableTaskItem({ task, renderCard, onClick }: SortableTaskItemProps) {
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
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="cursor-grab active:cursor-grabbing"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      layout
    >
      {renderCard ? renderCard(task, isDragging) : <DefaultTaskCard task={task} isDragging={isDragging} />}
    </motion.div>
  )
}

// ============================================================================
// Droppable Column
// ============================================================================

interface DroppableColumnProps {
  column: KanbanColumn
  colorClass?: string
  headerColorClass?: string
  allowAddTask?: boolean
  renderCard?: (task: KanbanTask, isDragging: boolean) => React.ReactNode
  onTaskClick?: (task: KanbanTask) => void
  onAddTask?: () => void
}

function DroppableColumn({
  column,
  colorClass,
  headerColorClass,
  allowAddTask,
  renderCard,
  onTaskClick,
  onAddTask,
}: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  const taskIds = column.tasks.map(t => t.id)

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        'flex flex-col h-full min-h-[600px] transition-all duration-300 border-2',
        colorClass || 'bg-muted/30 border-muted',
        isOver && 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02]'
      )}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {column.icon && (
              <div className={cn('p-2 rounded-lg', colorClass?.split(' ')[0] || 'bg-muted')}>
                {column.icon}
              </div>
            )}
            <CardTitle className={cn('text-lg font-semibold', headerColorClass)}>
              {column.title}
            </CardTitle>
          </div>
          <Badge variant="secondary" className="text-sm font-medium">
            {column.tasks.length}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 overflow-y-auto px-3 pb-4">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <AnimatePresence mode="popLayout">
            {column.tasks.length > 0 ? (
              column.tasks.map((task) => (
                <SortableTaskItem
                  key={task.id}
                  task={task}
                  renderCard={renderCard}
                  onClick={() => onTaskClick?.(task)}
                />
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-muted-foreground/20 rounded-xl text-muted-foreground"
              >
                <GripVertical className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm">Arraste tarefas aqui</p>
                {allowAddTask && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      onAddTask?.()
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Adicionar
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </SortableContext>

        {/* Add Task Button */}
        {allowAddTask && column.tasks.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation()
              onAddTask?.()
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar tarefa
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function Component({
  columns,
  columnColors = {},
  columnHeaderColors = {},
  allowAddTask = false,
  renderCard,
  onTaskMove,
  onTaskClick,
  onAddTask,
  className,
}: TrelloKanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  )

  // Find task by ID across all columns
  const findTask = useCallback((id: UniqueIdentifier): KanbanTask | undefined => {
    for (const column of columns) {
      const task = column.tasks.find(t => t.id === id)
      if (task) return task
    }
    return undefined
  }, [columns])

  // Find column containing a task
  const findColumnByTaskId = useCallback((taskId: UniqueIdentifier): string | undefined => {
    for (const column of columns) {
      if (column.tasks.find(t => t.id === taskId)) {
        return column.id
      }
    }
    return undefined
  }, [columns])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    const task = findTask(active.id)

    if (task) {
      setActiveTask(task)
    }
  }, [findTask])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // O handleDragOver pode ser usado para feedback visual durante o arraste
    // Por enquanto, a lógica principal está no handleDragEnd
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    setActiveTask(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Find source column
    const sourceColumn = findColumnByTaskId(activeId)
    if (!sourceColumn) return

    // Determine target column
    let targetColumn = findColumnByTaskId(overId)
    if (!targetColumn) {
      // Check if dropped on a column directly
      const column = columns.find(c => c.id === overId)
      if (column) {
        targetColumn = column.id
      }
    }

    // Notify parent of the move
    if (targetColumn && sourceColumn !== targetColumn) {
      onTaskMove?.(activeId, sourceColumn, targetColumn)
    }
  }, [columns, findColumnByTaskId, onTaskMove])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className={cn('grid gap-6 grid-cols-1 md:grid-cols-3', className)}>
        {columns.map((column) => (
          <DroppableColumn
            key={column.id}
            column={column}
            colorClass={columnColors[column.id]}
            headerColorClass={columnHeaderColors[column.id]}
            allowAddTask={allowAddTask}
            renderCard={renderCard}
            onTaskClick={onTaskClick}
            onAddTask={() => onAddTask?.(column.id)}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <motion.div
            initial={{ rotate: 0, scale: 1 }}
            animate={{ rotate: 3, scale: 1.05 }}
            className="cursor-grabbing"
          >
            {renderCard ? renderCard(activeTask, true) : <DefaultTaskCard task={activeTask} isDragging />}
          </motion.div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

// Named export for easier import
export { Component as TrelloKanbanBoard }
