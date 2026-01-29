'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
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
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Plus, MoreHorizontal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ReleaseCard } from './ReleaseCard'
import type { Release, ReleaseStatus } from '@/types/releases'

export interface ReleaseColumnData {
  id: ReleaseStatus
  title: string
  releases: Release[]
  color: string
}

interface ReleasesKanbanBoardProps {
  columns: ReleaseColumnData[]
  onReleaseMove: (releaseId: string, newStatus: ReleaseStatus) => Promise<void> | void
  onAddRelease: (status: ReleaseStatus) => void
  onReleaseClick: (release: Release) => void
  onDeleteRelease: (release: Release) => void
  className?: string
}

function ReleaseColumn({
  column,
  onAddRelease,
  onReleaseClick,
  onDeleteRelease,
}: {
  column: ReleaseColumnData
  onAddRelease: (status: ReleaseStatus) => void
  onReleaseClick: (release: Release) => void
  onDeleteRelease: (release: Release) => void
}) {
  const { isOver, setNodeRef } = useDroppable({ id: column.id })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-1 min-w-[320px] flex flex-col bg-[#0a0a0a] rounded-xl p-4 border shadow-inner h-full min-h-[500px] transition-all duration-200',
        isOver
          ? 'border-[#fc7a67] bg-[#fc7a67]/5 ring-2 ring-[#fc7a67]/20 scale-[1.01]'
          : 'border-[#2a2a2a]'
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
            {column.releases.length}
          </Badge>
        </div>
        <button className="text-gray-600 hover:text-white transition-colors p-1">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      <SortableContext items={column.releases.map(r => r.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-3 min-h-[200px] flex-1">
          {column.releases.map(release => (
            <ReleaseCard
              key={release.id}
              release={release}
              onClick={() => onReleaseClick(release)}
              onDelete={() => onDeleteRelease(release)}
            />
          ))}
        </div>
      </SortableContext>

      <button
        onClick={() => onAddRelease(column.id)}
        className="mt-4 w-full flex items-center justify-center gap-2 text-gray-500 hover:text-white hover:bg-[#1a1a1a] border border-dashed border-[#2a2a2a] hover:border-[#fc7a67]/50 rounded-lg p-3 text-xs font-medium transition-all duration-200"
      >
        <Plus className="w-3.5 h-3.5" />
        Adicionar lançamento
      </button>
    </div>
  )
}

export function ReleasesKanbanBoard({
  columns: initialColumns,
  onReleaseMove,
  onAddRelease,
  onReleaseClick,
  onDeleteRelease,
  className,
}: ReleasesKanbanBoardProps) {
  const [activeId, setActiveId] = React.useState<UniqueIdentifier | null>(null)
  const [originalContainer, setOriginalContainer] = React.useState<ReleaseStatus | null>(null)
  const [columns, setColumns] = React.useState<ReleaseColumnData[]>(initialColumns)

  React.useEffect(() => {
    if (!activeId) {
      setColumns(initialColumns)
    }
  }, [initialColumns, activeId])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  const findContainer = (id: UniqueIdentifier) => {
    if (columns.find(col => col.id === id)) return id
    return columns.find(col => col.releases.some(r => r.id === id))?.id
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id)
    const container = findContainer(event.active.id) as ReleaseStatus
    setOriginalContainer(container)
    if (typeof window !== 'undefined' && window.navigator.vibrate) {
      window.navigator.vibrate(10)
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeContainer = findContainer(active.id)
    const overContainer = findContainer(over.id)

    if (!activeContainer || !overContainer || activeContainer === overContainer) return

    setColumns(prev => {
      const activeColumn = prev.find(col => col.id === activeContainer)
      const overColumn = prev.find(col => col.id === overContainer)
      if (!activeColumn || !overColumn) return prev

      const activeRelease = activeColumn.releases.find(r => r.id === active.id)
      if (!activeRelease) return prev

      return prev.map(col => {
        if (col.id === activeContainer) {
          return { ...col, releases: col.releases.filter(r => r.id !== active.id) }
        }
        if (col.id === overContainer) {
          return { ...col, releases: [...col.releases, activeRelease] }
        }
        return col
      })
    })
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    const activeIdVal = active.id as string

    if (!over) {
      setActiveId(null)
      setOriginalContainer(null)
      return
    }

    const activeContainer = originalContainer
    const overContainer = findContainer(over.id) as ReleaseStatus

    if (!activeContainer || !overContainer) {
      setActiveId(null)
      setOriginalContainer(null)
      return
    }

    if (activeContainer !== overContainer) {
      try {
        await onReleaseMove(activeIdVal, overContainer)
        if (typeof window !== 'undefined' && window.navigator.vibrate) {
          window.navigator.vibrate([15, 50, 15])
        }
      } catch (error) {
        console.error('Failed to move release:', error)
      } finally {
        setActiveId(null)
        setOriginalContainer(null)
      }
    } else {
      const column = columns.find(col => col.id === activeContainer)
      if (column) {
        const oldIndex = column.releases.findIndex(r => r.id === active.id)
        const newIndex = column.releases.findIndex(r => r.id === over.id)
        if (oldIndex !== newIndex) {
          setColumns(prev => prev.map(col => {
            if (col.id === activeContainer) {
              return { ...col, releases: arrayMove(col.releases, oldIndex, newIndex) }
            }
            return col
          }))
        }
      }
      setActiveId(null)
      setOriginalContainer(null)
    }
  }

  const activeRelease = React.useMemo(() => {
    if (!activeId) return null
    for (const column of columns) {
      const release = column.releases.find(r => r.id === activeId)
      if (release) return release
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
      <div className={cn(
        'flex flex-col md:flex-row gap-4 md:gap-6 overflow-x-hidden md:overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-[#2a2a2a] scrollbar-track-transparent',
        className
      )}>
        {columns.map(column => (
          <ReleaseColumn
            key={column.id}
            column={column}
            onAddRelease={onAddRelease}
            onReleaseClick={onReleaseClick}
            onDeleteRelease={onDeleteRelease}
          />
        ))}
      </div>
      <DragOverlay
        dropAnimation={{
          duration: 250,
          easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
        }}
      >
        {activeRelease ? (
          <div className="rotate-[5deg] scale-110 shadow-2xl z-[100] opacity-95 transition-all duration-200">
            <ReleaseCard release={activeRelease} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
