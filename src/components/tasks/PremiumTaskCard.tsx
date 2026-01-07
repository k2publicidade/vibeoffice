'use client'

import * as React from "react"
import { Task } from "@/types/tasks"
import { cn } from "@/lib/utils"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useUsers } from "@/hooks/useUsers"
import { Calendar, AlertCircle, Edit2, Trash2 } from "lucide-react"

interface PremiumTaskCardProps {
    task: Task
    onClick?: () => void
    onDelete?: () => void
}

export const PremiumTaskCard = React.memo(({ task, onClick, onDelete }: PremiumTaskCardProps) => {
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
        <motion.div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
                "group cursor-grab active:cursor-grabbing touch-none",
                isDragging && "opacity-50 z-50"
            )}
        >
            <Card className="bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#fc7a67] transition-all duration-300 p-4 shadow-lg group-hover:shadow-[#fc7a67]/10 relative">
                {/* Botões de ação - aparecem no hover */}
                {(onClick || onDelete) && (
                    <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        {onClick && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onClick()
                                }}
                                className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 pointer-events-auto transition-colors"
                                title="Editar tarefa"
                            >
                                <Edit2 className="h-3 w-3 text-zinc-400" />
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onDelete()
                                }}
                                className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-red-900/80 pointer-events-auto transition-colors group/delete"
                                title="Excluir tarefa"
                            >
                                <Trash2 className="h-3 w-3 text-zinc-400 group-hover/delete:text-red-400 transition-colors" />
                            </button>
                        )}
                    </div>
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
        </motion.div>
    )
}, (prevProps, nextProps) => {
    // Só re-renderiza se task mudou significativamente
    return (
        prevProps.task.id === nextProps.task.id &&
        prevProps.task.status === nextProps.task.status &&
        prevProps.task.title === nextProps.task.title &&
        prevProps.task.priority === nextProps.task.priority &&
        prevProps.task.dueDate?.getTime() === nextProps.task.dueDate?.getTime() &&
        prevProps.task.assignedTo === nextProps.task.assignedTo &&
        prevProps.task.updatedAt.getTime() === nextProps.task.updatedAt.getTime()
    )
})
