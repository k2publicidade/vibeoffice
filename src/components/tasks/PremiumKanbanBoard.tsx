'use client'

import * as React from "react"
import { cn } from "@/lib/utils"
import {
    DndContext,
    DragEndEvent,
    DragOverEvent,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    UniqueIdentifier,
    closestCenter,
    useDroppable,
} from "@dnd-kit/core"
import {
    arrayMove,
    SortableContext,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { Plus, MoreHorizontal, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { PremiumTaskCard } from "./PremiumTaskCard"
import { Task, TaskStatus } from "@/types/tasks"

// Types matching the project structure
export interface KanbanColumnData {
    id: TaskStatus
    title: string
    tasks: Task[]
    color: string
}

interface PremiumKanbanBoardProps {
    columns: KanbanColumnData[]
    onTaskMove: (taskId: string, newStatus: TaskStatus) => void
    onAddTask: (status: TaskStatus) => void
    onTaskClick: (task: Task) => void
    className?: string
}

// Droppable Column Component
function KanbanColumn({
    column,
    onAddTask,
    onTaskClick,
    className,
}: {
    column: KanbanColumnData
    onAddTask: (status: TaskStatus) => void
    onTaskClick: (task: Task) => void
    className?: string
}) {
    const { setNodeRef } = useDroppable({
        id: column.id,
    })

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "flex-1 min-w-[320px] flex flex-col bg-[#0a0a0a] rounded-xl p-4 border border-[#2a2a2a] shadow-inner h-full min-h-[500px]",
                className
            )}
        >
            <div className="flex items-center justify-between mb-5 px-1">
                <div className="flex items-center gap-2.5">
                    <div
                        className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(252,122,103,0.5)]"
                        style={{ backgroundColor: column.color }}
                    />
                    <h2 className="text-white font-bold text-sm tracking-wide uppercase">{column.title}</h2>
                    <Badge className="bg-[#1a1a1a] text-gray-500 text-[10px] border-[#2a2a2a] font-mono px-1.5 py-0">
                        {column.tasks.length}
                    </Badge>
                </div>
                <button className="text-gray-600 hover:text-white transition-colors p-1">
                    <MoreHorizontal className="w-4 h-4" />
                </button>
            </div>

            <SortableContext items={column.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-3 min-h-[200px] flex-1">
                    {column.tasks.map((task) => (
                        <PremiumTaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
                    ))}
                </div>
            </SortableContext>

            <button
                onClick={() => onAddTask(column.id)}
                className="mt-4 w-full flex items-center justify-center gap-2 text-gray-500 hover:text-white hover:bg-[#1a1a1a] border border-dashed border-[#2a2a2a] hover:border-[#fc7a67]/50 rounded-lg p-3 text-xs font-medium transition-all duration-200"
            >
                <Plus className="w-3.5 h-3.5" />
                Adicionar tarefa
            </button>
        </div>
    )
}

export function PremiumKanbanBoard({
    columns: initialColumns,
    onTaskMove,
    onAddTask,
    onTaskClick,
    className
}: PremiumKanbanBoardProps) {
    const [activeId, setActiveId] = React.useState<UniqueIdentifier | null>(null)

    // Local state to handle optimistic updates during drag
    const [columns, setColumns] = React.useState<KanbanColumnData[]>(initialColumns)

    // Sync from props if they change externally (while not dragging)
    React.useEffect(() => {
        if (!activeId) {
            setColumns(initialColumns)
        }
    }, [initialColumns, activeId])

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    )

    const findContainer = (id: UniqueIdentifier) => {
        if (columns.find((col) => col.id === id)) {
            return id
        }
        return columns.find((col) => col.tasks.some((task) => task.id === id))?.id
    }

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id)
    }

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event
        if (!over) return

        const activeContainer = findContainer(active.id)
        const overContainer = findContainer(over.id)

        if (!activeContainer || !overContainer || activeContainer === overContainer) {
            return
        }

        setColumns((prev) => {
            const activeColumn = prev.find((col) => col.id === activeContainer)
            const overColumn = prev.find((col) => col.id === overContainer)

            if (!activeColumn || !overColumn) return prev

            const activeTask = activeColumn.tasks.find((t) => t.id === active.id)
            if (!activeTask) return prev

            return prev.map((col) => {
                if (col.id === activeContainer) {
                    return {
                        ...col,
                        tasks: col.tasks.filter((t) => t.id !== active.id),
                    }
                }
                if (col.id === overContainer) {
                    return {
                        ...col,
                        tasks: [...col.tasks, activeTask],
                    }
                }
                return col
            })
        })
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        const activeIdVal = active.id as string

        if (!over) {
            setActiveId(null)
            return
        }

        const activeContainer = findContainer(active.id) as TaskStatus
        const overContainer = findContainer(over.id) as TaskStatus

        if (!activeContainer || !overContainer) {
            setActiveId(null)
            return
        }

        if (activeContainer !== overContainer) {
            // Find source column to confirm the move
            onTaskMove(activeIdVal, overContainer)
        } else {
            // Reordering within same column
            const column = columns.find((col) => col.id === activeContainer)
            if (column) {
                const oldIndex = column.tasks.findIndex((t) => t.id === active.id)
                const newIndex = column.tasks.findIndex((t) => t.id === over.id)

                if (oldIndex !== newIndex) {
                    setColumns(prev => prev.map(col => {
                        if (col.id === activeContainer) {
                            return {
                                ...col,
                                tasks: arrayMove(col.tasks, oldIndex, newIndex)
                            }
                        }
                        return col
                    }))
                }
            }
        }

        setActiveId(null)
    }

    const activeTask = React.useMemo(() => {
        if (!activeId) return null
        for (const column of columns) {
            const task = column.tasks.find((t) => t.id === activeId)
            if (task) return task
        }
        return null
    }, [activeId, columns])

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className={cn("flex flex-col md:flex-row gap-4 md:gap-6 overflow-x-hidden md:overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-[#2a2a2a] scrollbar-track-transparent", className)}>
                {columns.map((column) => (
                    <KanbanColumn
                        key={column.id}
                        column={column}
                        onAddTask={onAddTask}
                        onTaskClick={onTaskClick}
                        className="w-full md:w-[320px] md:min-w-[320px]"
                    />
                ))}
            </div>
            <DragOverlay dropAnimation={null}>
                {activeTask ? (
                    <div className="rotate-3 scale-105 shadow-2xl z-[100] opacity-90 transition-transform duration-200">
                        <PremiumTaskCard task={activeTask} />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    )
}
