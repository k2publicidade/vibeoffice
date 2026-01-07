'use client'

import { Task } from '@/types/tasks'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'

interface DeleteTaskDialogProps {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function DeleteTaskDialog({
  task,
  open,
  onOpenChange,
  onConfirm,
}: DeleteTaskDialogProps) {
  if (!task) return null

  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <AlertDialogTitle>Excluir Tarefa</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3 pt-2">
            <p>Tem certeza que deseja excluir esta tarefa?</p>

            {/* Título da tarefa */}
            <div className="bg-muted/50 p-3 rounded-lg border">
              <p className="font-semibold text-foreground line-clamp-2">
                "{task.title}"
              </p>
              {task.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                  {task.description}
                </p>
              )}
            </div>

            {/* Badge de ticket vinculado */}
            {task.linkedTicketId && (
              <div className="flex items-start gap-2 text-sm">
                <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                  🎫 Ticket vinculado
                </Badge>
                <span className="text-xs text-muted-foreground flex-1">
                  O ticket vinculado será mantido com status inalterado
                </span>
              </div>
            )}

            {/* Aviso */}
            <div className="flex items-start gap-2 text-amber-600 dark:text-amber-500 text-sm bg-amber-500/10 p-2 rounded">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span className="text-xs">
                Esta ação não pode ser desfeita.
              </span>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
