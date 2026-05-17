'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTasks } from '@/hooks/useTasks'
import { useAuth } from '@/hooks/useAuth'
import { Task, TaskStatus } from '@/types/tasks'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PremiumKanbanBoard, KanbanColumnData } from '@/components/tasks/PremiumKanbanBoard'
import { TaskList } from '@/components/tasks/TaskList'
import { TaskFilters } from '@/components/tasks/TaskFilters'
import { TaskDialog } from '@/components/tasks/TaskDialog'
import { DeleteTaskDialog } from '@/components/tasks/DeleteTaskDialog'
import { LayoutGrid, List, Filter, ListTodo, Clock, CheckCircle2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { toast } from 'sonner'

// Configuração de cores das colunas (Novo visual Premium)
const columnColors: Record<TaskStatus, string> = {
  todo: '#94a3b8', // Gray
  in_progress: '#fc7a67', // Coral
  done: '#10b981', // Emerald
}

// Converter Task[] em KanbanColumnData[]
function tasksToPremiumColumns(tasks: Task[]): KanbanColumnData[] {
  return [
    {
      id: 'todo',
      title: 'A Fazer',
      color: columnColors.todo,
      tasks: tasks.filter(t => t.status === 'todo'),
    },
    {
      id: 'in_progress',
      title: 'Em Progresso',
      color: columnColors.in_progress,
      tasks: tasks.filter(t => t.status === 'in_progress'),
    },
    {
      id: 'done',
      title: 'Concluído',
      color: columnColors.done,
      tasks: tasks.filter(t => t.status === 'done'),
    },
  ]
}

export default function TasksPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && user && user.role !== 'Admin') {
      router.replace('/')
    }
  }, [user, authLoading, router])

  const {
    filteredTasks,
    filters,
    stats,
    setFilters,
    createTask,
    updateTask,
    deleteTask,
  } = useTasks()

  const [view, setView] = useState<'board' | 'list'>('board')
  const [selectedTask, setSelectedTask] = useState<Task | undefined>()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [preselectedStatus, setPreselectedStatus] = useState<TaskStatus | undefined>()
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null)

  // Converter tasks para colunas do Kanban Premium
  const kanbanColumns = useMemo(
    () => tasksToPremiumColumns(filteredTasks),
    [filteredTasks]
  )

  const handleCreateTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await createTask(taskData)
      setIsDialogOpen(false)
      setPreselectedStatus(undefined)
      toast.success('Tarefa criada')
    } catch (error) {
      toast.error('Erro ao criar tarefa: ' + (error as Error).message)
    }
  }

  const handleEditTask = (task: Task) => {
    setSelectedTask(task)
    setPreselectedStatus(undefined)
    setIsDialogOpen(true)
  }

  const handleSaveTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (selectedTask) {
        await updateTask(selectedTask.id, taskData)
        setSelectedTask(undefined)
        toast.success('Tarefa atualizada')
      } else {
        await createTask(taskData)
        toast.success('Tarefa criada')
      }
      setIsDialogOpen(false)
      setPreselectedStatus(undefined)
    } catch (error) {
      toast.error('Erro ao salvar tarefa: ' + (error as Error).message)
    }
  }

  // Handler para iniciar processo de delete (usado no Kanban)
  const handleDeleteTask = (task: Task) => {
    setTaskToDelete(task)
  }

  // Handler para iniciar delete via List view — abre o DeleteTaskDialog
  // (substitui confirm() nativo; ver achado S-P1-16)
  const handleDeleteTaskById = (taskId: string) => {
    const task = filteredTasks.find(t => t.id === taskId)
    if (task) setTaskToDelete(task)
  }

  // Handler para confirmar delete via dialog
  const handleConfirmDelete = async () => {
    if (!taskToDelete) return

    try {
      await deleteTask(taskToDelete.id)
      const { toast } = await import('sonner')
      toast.success(`✅ "${taskToDelete.title}" excluída com sucesso`)
      setTaskToDelete(null)
    } catch (error) {
      const { toast } = await import('sonner')
      toast.error('❌ Erro ao excluir tarefa. Tente novamente.')
      console.error('Error deleting task:', error)
    }
  }

  // Handler para mover tarefa entre colunas
  const handleTaskMove = async (taskId: string, toStatus: TaskStatus) => {
    try {
      await updateTask(taskId, { status: toStatus })

      // Toast de sucesso com emoji contextual
      const statusEmoji = {
        todo: '📝',
        in_progress: '⚡',
        done: '✅'
      }
      const statusText = {
        todo: 'A Fazer',
        in_progress: 'Em Progresso',
        done: 'Concluído'
      }
      const task = filteredTasks.find(t => t.id === taskId)
      if (task) {
        const { toast } = await import('sonner')
        toast.success(`${statusEmoji[toStatus]} "${task.title}" movido para ${statusText[toStatus]}`)
      }
    } catch (error) {
      const { toast } = await import('sonner')
      toast.error('Erro ao mover tarefa. Tente novamente.')
      console.error('Error moving task:', error)
    }
  }

  // Handler para adicionar tarefa em coluna específica
  const handleAddTask = (status: TaskStatus) => {
    setSelectedTask(undefined)
    setPreselectedStatus(status)
    setIsDialogOpen(true)
  }

  // Guard visual enquanto carrega ou redireciona
  if (authLoading || (user && user.role !== 'Admin')) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 border border-white/5">
          <Lock className="h-7 w-7 text-zinc-500" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Acesso restrito</h2>
        <p className="text-sm text-zinc-400">
          O módulo de Tarefas está disponível apenas para administradores.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-[#fc7a67] to-[#ef5907] bg-clip-text text-transparent">
            Fluxo de Trabalho
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Gerencie suas tarefas com o novo sistema Premium Kanban
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 border-[#2a2a2a] bg-black hover:bg-[#1a1a1a] text-gray-300">
                <Filter className="h-4 w-4" />
                Filtros
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-[#0a0a0a] border-[#2a2a2a] text-white">
              <SheetHeader>
                <SheetTitle className="text-white">Filtros de Busca</SheetTitle>
              </SheetHeader>
              <div className="mt-8">
                <TaskFilters filters={filters} onFiltersChange={setFilters} stats={stats} />
              </div>
            </SheetContent>
          </Sheet>

          <TaskDialog
            onSave={handleCreateTask}
            isOpen={isDialogOpen && !selectedTask}
            onOpenChange={(open: boolean) => {
              setIsDialogOpen(open)
              if (!open) {
                setSelectedTask(undefined)
                setPreselectedStatus(undefined)
              }
            }}
            defaultStatus={preselectedStatus}
          />
        </div>
      </div>

      {/* Tabs com Toolbar */}
      <Tabs value={view} onValueChange={(v) => setView(v as 'board' | 'list')} className="w-full">
        <div className="flex items-center justify-between gap-4 mb-8">
          <TabsList className="bg-[#0a0a0a] border border-[#2a2a2a] p-1 h-11">
            <TabsTrigger value="board" className="gap-2 data-[state=active]:bg-[#1a1a1a] data-[state=active]:text-[#fc7a67]">
              <LayoutGrid className="h-4 w-4" />
              Board View
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2 data-[state=active]:bg-[#1a1a1a] data-[state=active]:text-[#fc7a67]">
              <List className="h-4 w-4" />
              List View
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 px-4 py-2 bg-[#0a0a0a] rounded-lg border border-[#2a2a2a]">
            <span className="w-2 h-2 rounded-full bg-[#fc7a67] animate-pulse" />
            <p className="text-xs font-medium text-gray-400">
              {filteredTasks.length} Tarefas encontradas
            </p>
          </div>
        </div>

        {/* Visualização Kanban Premium */}
        <TabsContent value="board" className="mt-0 outline-none">
          {filteredTasks.length > 0 ? (
            <PremiumKanbanBoard
              columns={kanbanColumns}
              onTaskMove={handleTaskMove}
              onTaskClick={handleEditTask}
              onAddTask={handleAddTask}
              onDeleteTask={handleDeleteTask}
            />
          ) : (
            <div className="text-center py-12 bg-muted/30 rounded-2xl border-2 border-dashed border-muted-foreground/20">
              <ListTodo className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">Nenhuma tarefa corresponde aos filtros selecionados</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => handleAddTask('todo')}
              >
                Criar primeira tarefa
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Visualização Lista */}
        <TabsContent value="list" className="mt-0">
          {filteredTasks.length > 0 ? (
            <TaskList
              tasks={filteredTasks}
              onEdit={handleEditTask}
              onDelete={handleDeleteTaskById}
            />
          ) : (
            <div className="text-center py-12 bg-muted/30 rounded-2xl border-2 border-dashed border-muted-foreground/20">
              <List className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">Nenhuma tarefa corresponde aos filtros selecionados</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog para edição de tarefa — hideTrigger pra evitar botão duplicado no DOM */}
      {selectedTask && (
        <TaskDialog
          hideTrigger
          task={selectedTask}
          onSave={handleSaveTask}
          isOpen={isDialogOpen && !!selectedTask}
          onOpenChange={(open: boolean) => {
            setIsDialogOpen(open)
            if (!open) setSelectedTask(undefined)
          }}
        />
      )}

      {/* Dialog de confirmação de exclusão */}
      <DeleteTaskDialog
        task={taskToDelete}
        open={!!taskToDelete}
        onOpenChange={(open) => {
          if (!open) setTaskToDelete(null)
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
