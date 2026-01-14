'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Task } from '@/types/tasks'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Calendar, CheckCircle2, Clock, FileText, User } from 'lucide-react'

interface TaskDetailsModalProps {
    open: boolean
    onClose: () => void
    task: Task | null
    onMarkAsDone?: (taskId: string) => Promise<void>
}

export function TaskDetailsModal({ open, onClose, task, onMarkAsDone }: TaskDetailsModalProps) {
    if (!task) return null

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'bg-red-500/10 text-red-500 border-red-500/20'
            case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
            case 'low': return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
            default: return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'done': return 'bg-green-500/10 text-green-500 border-green-500/20'
            case 'in_progress': return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
            case 'todo': return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
            default: return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'done': return 'Concluída'
            case 'in_progress': return 'Em Progresso'
            case 'todo': return 'A Fazer'
            default: return status
        }
    }

    const getPriorityLabel = (priority: string) => {
        switch (priority) {
            case 'high': return 'Alta'
            case 'medium': return 'Média'
            case 'low': return 'Baixa'
            default: return priority
        }
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] bg-[#18181b] border-zinc-800 text-zinc-100">
                <DialogHeader>
                    <div className="flex items-start justify-between gap-4">
                        <DialogTitle className="text-xl font-semibold leading-none tracking-tight">
                            Detalhes da Tarefa
                        </DialogTitle>
                        <Badge variant="outline" className={getStatusColor(task.status)}>
                            {getStatusLabel(task.status)}
                        </Badge>
                    </div>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-lg font-medium text-white">{task.title}</h3>
                        </div>

                        {task.description && (
                            <div className="flex gap-3">
                                <FileText className="h-5 w-5 text-zinc-500 shrink-0" />
                                <p className="text-sm text-zinc-400 whitespace-pre-wrap">
                                    {task.description}
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-zinc-500" />
                                <div className="text-sm">
                                    <span className="text-zinc-500 block text-xs">Prioridade</span>
                                    <Badge variant="outline" className={`mt-1 ${getPriorityColor(task.priority)}`}>
                                        {getPriorityLabel(task.priority)}
                                    </Badge>
                                </div>
                            </div>

                            {task.dueDate && (
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-zinc-500" />
                                    <div className="text-sm">
                                        <span className="text-zinc-500 block text-xs">Data de entrega</span>
                                        <span className="text-zinc-300">
                                            {format(new Date(task.dueDate), "dd 'de' MMMM", { locale: ptBR })}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {(task.tags && task.tags.length > 0) && (
                            <div className="flex flex-wrap gap-2">
                                {task.tags.map(tag => (
                                    <Badge key={tag} variant="secondary" className="bg-zinc-800 text-zinc-400 border-zinc-700">
                                        #{tag}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="sm:justify-between gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onClose}
                        className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                    >
                        Fechar
                    </Button>

                    {task.status !== 'done' && onMarkAsDone && (
                        <Button
                            type="button"
                            className="bg-green-600 hover:bg-green-700 text-white gap-2"
                            onClick={() => {
                                onMarkAsDone(task.id)
                                onClose()
                            }}
                        >
                            <CheckCircle2 className="h-4 w-4" />
                            Marcar como Concluída
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
