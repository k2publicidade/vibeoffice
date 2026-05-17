'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Task, TaskStatus, TaskPriority } from '@/types/tasks'
import { Sector } from '@/types/auth'
import {
  PremiumModal,
  PremiumModalHeader,
  PremiumModalTitle,
  PremiumModalDescription,
  PremiumModalBody,
  PremiumModalFooter,
} from '@/components/ui/premium-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Edit2,
  Calendar as CalendarIcon,
  FileText,
  Users,
  Briefcase,
  Flag,
  CheckSquare,
  Clock,
  Sparkles
} from 'lucide-react'
import { useUsers, User } from '@/hooks/useUsers'
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectItem,
} from '@/components/ui/multi-select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { PremiumDatePicker } from '@/components/ui/premium-date-picker'
import { PremiumTimePicker } from '@/components/ui/premium-time-picker'
import { cn } from '@/lib/utils'

interface TaskDialogProps {
  task?: Task
  onSave: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  defaultStatus?: TaskStatus
  /**
   * Quando true, oculta o botão trigger interno. Útil para usar o dialog
   * em modo controlled (ex: edição via state externo) sem renderizar
   * botão duplicado/órfão no DOM. Ver achado S-P1-15.
   */
  hideTrigger?: boolean
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
    assignees: task?.assignees || [],
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
  hideTrigger,
}: TaskDialogProps) {
  const { users, isLoading: usersLoading } = useUsers()
  const [open, setOpen] = useState(isOpen || false)
  const [formData, setFormData] = useState(() => getInitialFormData(task, defaultStatus))
  const [assigneeSearch, setAssigneeSearch] = useState('')

  // Mapa id->user para renderizar badges com nome real (não UUID)
  const userById = (users || []).reduce<Record<string, User>>((acc, u) => {
    acc[u.id] = u
    return acc
  }, {})

  // Filtragem por busca
  const filteredUsers = (users || []).filter(u => {
    if (!assigneeSearch.trim()) return true
    const q = assigneeSearch.toLowerCase()
    return u.name.toLowerCase().includes(q) || u.sector.toLowerCase().includes(q)
  })

  const getInitials = (name: string) =>
    name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()

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

  // Helper para obter cor da prioridade
  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'high':
        return 'text-red-400 bg-red-500/10 border-red-500/20'
      case 'medium':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/20'
      case 'low':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
    }
  }

  return (
    <>
      {!hideTrigger && (
        <Button
          onClick={() => handleOpenChange(true)}
          className={cn(
            "gap-2 h-11 min-w-[140px]",
            task
              ? "bg-zinc-800 hover:bg-zinc-700"
              : "bg-gradient-to-r from-[#fc7a67] to-[#ff0300] hover:from-[#ff0300] hover:to-[#fc7a67]"
          )}
        >
          {task ? (
            <>
              <Edit2 className="h-4 w-4" />
              Editar Tarefa
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Nova Tarefa
            </>
          )}
        </Button>
      )}

      <PremiumModal open={open} onClose={() => handleOpenChange(false)} size="lg">
        <PremiumModalHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#fc7a67]/20 to-[#ff0300]/20 flex items-center justify-center border border-[#fc7a67]/20">
            {task ? (
              <Edit2 className="h-5 w-5 text-[#fc7a67]" />
            ) : (
              <Plus className="h-5 w-5 text-[#fc7a67]" />
            )}
          </div>
          <div>
            <PremiumModalTitle>
              {task ? 'Editar Tarefa' : 'Criar Nova Tarefa'}
            </PremiumModalTitle>
            <PremiumModalDescription>
              {task ? 'Atualize os detalhes da tarefa' : 'Preencha os campos para criar uma nova tarefa'}
            </PremiumModalDescription>
          </div>
        </div>
      </PremiumModalHeader>

      <form onSubmit={handleSubmit}>
        <PremiumModalBody className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
              <FileText className="h-4 w-4" />
              Informações Básicas
            </div>

            {/* Título */}
            <div className="space-y-2">
              <Label htmlFor="title" className="flex items-center gap-2">
                Título
                <span className="text-red-400">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Ex: Desenvolver nova funcionalidade"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="bg-zinc-800/50 border-zinc-700 focus:border-[#fc7a67] transition-colors h-11"
              />
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descreva os detalhes da tarefa..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-zinc-800/50 border-zinc-700 focus:border-[#fc7a67] transition-colors min-h-[100px] resize-none"
              />
            </div>
          </div>

          {/* Organização */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
              <Briefcase className="h-4 w-4" />
              Organização
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Setor */}
              <div className="space-y-2">
                <Label htmlFor="sector" className="flex items-center gap-2">
                  <Briefcase className="h-3.5 w-3.5 text-zinc-500" />
                  Setor
                </Label>
                <Select value={formData.sector} onValueChange={(value) => setFormData({ ...formData, sector: value as Sector })}>
                  <SelectTrigger id="sector" className="bg-zinc-800/50 border-zinc-700 h-11">
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

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status" className="flex items-center gap-2">
                  <CheckSquare className="h-3.5 w-3.5 text-zinc-500" />
                  Status
                </Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as TaskStatus })}>
                  <SelectTrigger id="status" className="bg-zinc-800/50 border-zinc-700 h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-zinc-400"></span>
                        A Fazer
                      </div>
                    </SelectItem>
                    <SelectItem value="in_progress">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-orange-400"></span>
                        Em Progresso
                      </div>
                    </SelectItem>
                    <SelectItem value="done">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-green-400"></span>
                        Concluído
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Responsáveis */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-zinc-500" />
                Responsáveis
                {!!formData.assignees?.length && (
                  <span className="text-xs text-zinc-500 font-normal">
                    ({formData.assignees.length} selecionado{formData.assignees.length > 1 ? 's' : ''})
                  </span>
                )}
              </Label>

              <MultiSelect
                value={formData.assignees || []}
                onValueChange={(value) => setFormData({ ...formData, assignees: value })}
                placeholder={
                  usersLoading
                    ? 'Carregando usuários...'
                    : (users || []).length === 0
                      ? 'Nenhum usuário cadastrado'
                      : 'Selecione os responsáveis'
                }
                maxDisplayItems={4}
                className="bg-zinc-800/50 border-zinc-700 min-h-11"
                renderSelectedValues={(selected) => (
                  <div className="flex flex-wrap gap-1.5">
                    {selected.slice(0, 4).map(id => {
                      const u = userById[id]
                      if (!u) return null
                      return (
                        <div
                          key={id}
                          className="flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-700"
                        >
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={u.avatar || undefined} />
                            <AvatarFallback className="text-[10px] bg-zinc-800 text-zinc-300">
                              {getInitials(u.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-zinc-100">{u.name.split(' ')[0]}</span>
                        </div>
                      )
                    })}
                    {selected.length > 4 && (
                      <span className="text-xs text-zinc-500 self-center">
                        +{selected.length - 4}
                      </span>
                    )}
                  </div>
                )}
              >
                <MultiSelectContent>
                  {/* Search */}
                  <div className="sticky top-0 z-10 -m-1 mb-1 p-2 bg-zinc-900 border-b border-zinc-800">
                    <Input
                      placeholder="Buscar por nome ou setor..."
                      value={assigneeSearch}
                      onChange={(e) => setAssigneeSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      className="h-8 bg-zinc-800/60 border-zinc-700 text-xs"
                    />
                  </div>

                  {usersLoading ? (
                    <div className="flex items-center justify-center py-6 text-sm text-zinc-500 gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando usuários...
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-zinc-500">
                      {users && users.length === 0
                        ? 'Nenhum usuário cadastrado ainda.'
                        : 'Nenhum usuário encontrado.'}
                    </div>
                  ) : (
                    filteredUsers.map((u) => (
                      <MultiSelectItem key={u.id} value={u.id}>
                        <div className="flex items-center gap-2.5 w-full">
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarImage src={u.avatar || undefined} />
                            <AvatarFallback className="text-[10px] bg-zinc-800 text-zinc-300">
                              {getInitials(u.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-sm text-zinc-100 truncate">{u.name}</span>
                            <span className="text-[10px] text-zinc-500 truncate">{u.sector}</span>
                          </div>
                        </div>
                      </MultiSelectItem>
                    ))
                  )}
                </MultiSelectContent>
              </MultiSelect>
            </div>
          </div>

          {/* Prioridade e Prazo */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
              <Flag className="h-4 w-4" />
              Prioridade e Prazo
            </div>

            {/* Prioridade */}
            <div className="space-y-2">
              <Label htmlFor="priority" className="flex items-center gap-2">
                <Flag className="h-3.5 w-3.5 text-zinc-500" />
                Prioridade
              </Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value as TaskPriority })}>
                <SelectTrigger id="priority" className="bg-zinc-800/50 border-zinc-700 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                      Baixa
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-orange-400"></div>
                      Média
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-red-400"></div>
                      Alta
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Indicador de Prioridade Selecionada */}
            <div className={cn(
              "flex items-center gap-2 p-3 rounded-lg border text-sm",
              getPriorityColor(formData.priority)
            )}>
              <Flag className="h-4 w-4" />
              <span className="font-medium">
                Prioridade {formData.priority === 'high' ? 'Alta' : formData.priority === 'medium' ? 'Média' : 'Baixa'}
              </span>
            </div>

            {/* Data e Hora de Vencimento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CalendarIcon className="h-3.5 w-3.5 text-zinc-500" />
                  Data de Vencimento
                </Label>
                <PremiumDatePicker
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
                <Label className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-zinc-500" />
                  Hora
                </Label>
                <PremiumTimePicker
                  date={formData.dueDate}
                  onTimeChange={(newDate) => {
                    setFormData({ ...formData, dueDate: newDate })
                  }}
                />
              </div>
            </div>
          </div>
        </PremiumModalBody>

        <PremiumModalFooter>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="w-full sm:w-auto min-w-[120px] h-11 rounded-full border-zinc-700 hover:bg-zinc-800"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto min-w-[120px] h-11 rounded-full bg-gradient-to-r from-[#fc7a67] to-[#ff0300] hover:from-[#ff0300] hover:to-[#fc7a67] text-white font-medium"
            >
              {task ? 'Atualizar Tarefa' : 'Criar Tarefa'}
            </Button>
          </div>
        </PremiumModalFooter>
      </form>
      </PremiumModal>
    </>
  )
}
