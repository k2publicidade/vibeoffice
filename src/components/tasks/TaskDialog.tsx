'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Task, TaskStatus, TaskPriority } from '@/types/tasks'
import { Sector } from '@/types/auth'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Edit2, Calendar as CalendarIcon } from 'lucide-react'
import { useUsers } from '@/hooks/useUsers'
import { PremiumDatePicker } from '@/components/ui/premium-date-picker'
import { PremiumTimePicker } from '@/components/ui/premium-time-picker'

interface TaskDialogProps {
  task?: Task
  onSave: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  defaultStatus?: TaskStatus
}

const sectors = ['A&R', 'Marketing', 'Financeiro', 'Jurídico', 'Administrativo', 'TI/Suporte', 'Atendimento ao Artista']

// Função para criar o estado inicial do form
function getInitialFormData(task?: Task, defaultStatus?: TaskStatus): Omit<Task, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || defaultStatus || 'todo',
    priority: task?.priority || 'medium',
    sector: task?.sector || 'A&R',
    assignedTo: task?.assignedTo || '',
    createdBy: task?.createdBy || 'user-001',
    dueDate: task?.dueDate || new Date(),
  }
}

export function TaskDialog({
  task,
  onSave,
  isOpen,
  onOpenChange,
  defaultStatus,
}: TaskDialogProps) {
  const { users } = useUsers()
  const [open, setOpen] = useState(isOpen || false)
  const [formData, setFormData] = useState(() => getInitialFormData(task, defaultStatus))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return
    onSave(formData)
    setOpen(false)
    onOpenChange?.(false)
  }

  const handleOpenChange = (newOpen: boolean) => {
    // Resetar form quando abrir para nova tarefa
    if (newOpen && !task) {
      setFormData(getInitialFormData(undefined, defaultStatus))
    }
    setOpen(newOpen)
    onOpenChange?.(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          {task ? (
            <>
              <Edit2 className="h-4 w-4" />
              Editar Tarefa
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Nova Tarefa
            </>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md sm:max-w-lg w-[95vw] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? 'Editar Tarefa' : 'Criar Nova Tarefa'}</DialogTitle>
          <DialogDescription>
            {task ? 'Atualize os detalhes da tarefa' : 'Preencha os campos para criar uma nova tarefa'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              placeholder="Nome da tarefa"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              placeholder="Descrição da tarefa"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Setor */}
          <div className="space-y-2">
            <Label htmlFor="sector">Setor</Label>
            <Select value={formData.sector} onValueChange={(value) => setFormData({ ...formData, sector: value as Sector })}>
              <SelectTrigger id="sector">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sectors.map((sector) => (
                  <SelectItem key={sector} value={sector}>
                    {sector}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Responsável */}
          <div className="space-y-2">
            <Label htmlFor="assignedTo">Responsável</Label>
            <Select value={formData.assignedTo || ''} onValueChange={(value) => setFormData({ ...formData, assignedTo: value })}>
              <SelectTrigger id="assignedTo">
                <SelectValue placeholder="Selecione uma pessoa" />
              </SelectTrigger>
              <SelectContent>
                {(users || []).map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Prioridade */}
          <div className="space-y-2">
            <Label htmlFor="priority">Prioridade</Label>
            <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value as TaskPriority })}>
              <SelectTrigger id="priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as TaskStatus })}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">A Fazer</SelectItem>
                <SelectItem value="in_progress">Em Progresso</SelectItem>
                <SelectItem value="done">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Data de Vencimento */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <PremiumDatePicker
                label="Data de Vencimento"
                date={formData.dueDate}
                onDateChange={(date) => {
                  if (!date) return
                  const newDate = new Date(date)
                  // Manter a hora atual se já existir
                  if (formData.dueDate) {
                    newDate.setHours(formData.dueDate.getHours())
                    newDate.setMinutes(formData.dueDate.getMinutes())
                  }
                  setFormData({ ...formData, dueDate: newDate })
                }}
              />
            </div>
            <div className="space-y-2">
              <PremiumTimePicker
                label="Hora"
                date={formData.dueDate}
                onTimeChange={(newDate) => {
                  // Ensure we keep the date part if it wasn't already set, defaults to today inside picker logic but let's be safe
                  setFormData({ ...formData, dueDate: newDate })
                }}
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {task ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
