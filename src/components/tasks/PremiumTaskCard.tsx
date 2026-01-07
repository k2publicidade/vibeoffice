'use client'

import * as React from "react"
import { Task } from "@/types/tasks"
import { cn } from "@/lib/utils"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useUsers } from "@/hooks/useUsers"
import { Calendar, AlertCircle, Edit2 } from "lucide-react"

interface PremiumTaskCardProps {
    task: Task
    onClick?: () => void
}

export function PremiumTaskCard({ task, onClick }: PremiumTaskCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: task.id,
        data: {
            task,
            type: 'task'
        }
    })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    const { users } = useUsers()
    const assignee = users?.find(u => u.id === task.assignedTo)
    const dueDate = task.dueDate ? new Date(task.dueDate) : null
    const isOverdue = dueDate && dueDate < new Date() && task.status !== 'done'

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn(
                "group cursor-grab active:cursor-grabbing",
                isDragging && "opacity-50 z-50"
            )}
        >
            <Card className="bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#fc7a67] transition-all duration-300 p-4 shadow-lg group-hover:shadow-[#fc7a67]/10 relative">
                {/* Botão de edição (não interfere com drag) */}
                {onClick && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onClick()
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        title="Editar tarefa"
                    >
                        <Edit2 className="h-3 w-3 text-zinc-400" />
                    </button>
                )}

                <div className="space-y-3">
                    {/* Tags/Labels e Badge de Ticket Vinculado */}
                    {(task.tags && task.tags.length > 0) || task.linkedTicketId ? (
                        <div className="flex flex-wrap gap-1.5">
                            {task.tags?.map((tag) => (
                                <Badge
                                    key={tag}
                                    className="bg-[#fc7a67]/10 text-[#fc7a67] border-[#fc7a67]/20 text-[10px] px-2 py-0.5 font-medium hover:bg-[#fc7a67] hover:text-white transition-colors"
                                >
                                    {tag}
                                </Badge>
                            ))}
                            {task.linkedTicketId && (
                                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px] px-2 py-0.5 font-medium">
                                    🎫 Ticket
                                </Badge>
                            )}
                        </div>
                    ) : null}

                    {/* Title */}
                    <h3 className="text-white font-semibold text-sm leading-tight group-hover:text-[#fc7a67] transition-colors line-clamp-2">
                        {task.title}
                    </h3>

                    {/* Description */}
                    {task.description && (
                        <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed">
                            {task.description}
                        </p>
                    )}

                    {/* Sector Badge */}
                    <Badge variant="outline" className="text-[10px] border-white/10 text-gray-500 bg-white/5">
                        {task.sector}
                    </Badge>

                    {/* Footer: Date & Assignee */}
                    <div className="flex items-center justify-between pt-2 border-t border-[#2a2a2a]">
                        {dueDate ? (
                            <div className={cn(
                                "flex items-center gap-1.5 text-[10px]",
                                isOverdue ? "text-[#ff0300] font-bold" : "text-gray-500"
                            )}>
                                <Calendar className="w-3 h-3" />
                                {dueDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                            </div>
                        ) : (
                            <div className="w-1" />
                        )}

                        <div className="flex items-center gap-2">
                            {isOverdue && <AlertCircle className="w-3 h-3 text-[#ff0300] animate-pulse" />}
                            {assignee && (
                                <Avatar className="h-6 w-6 border border-[#2a2a2a]">
                                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${assignee.name}`} />
                                    <AvatarFallback className="bg-[#fc7a67] text-white text-[10px] font-bold">
                                        {assignee.name.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                            )}
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    )
}
