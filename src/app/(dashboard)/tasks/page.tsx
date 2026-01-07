'use client'

import { useState, useMemo } from 'react'
import { useTasks } from '@/hooks/useTasks'
import { Task, TaskStatus } from '@/types/tasks'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PremiumKanbanBoard, KanbanColumnData } from '@/components/tasks/PremiumKanbanBoard'
import { TaskList } from '@/components/tasks/TaskList'
import { TaskFilters } from '@/components/tasks/TaskFilters'
import { TaskDialog } from '@/components/tasks/TaskDialog'
import { LayoutGrid, List, Filter, ListTodo, Clock, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

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

  // Converter tasks para colunas do Kanban Premium
  const kanbanColumns = useMemo(
    () => tasksToPremiumColumns(filteredTasks),
    [filteredTasks]
  )

  const handleCreateTask = (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    createTask(taskData)
    setIsDialogOpen(false)
    setPreselectedStatus(undefined)
  }

  const handleEditTask = (task: Task) => {
    setSelectedTask(task)
    setPreselectedStatus(undefined)
    setIsDialogOpen(true)
  }

  const handleSaveTask = (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (selectedTask) {
      updateTask(selectedTask.id, taskData)
      setSelectedTask(undefined)
    } else {
      createTask(taskData)
    }
    setIsDialogOpen(false)
    setPreselectedStatus(undefined)
  }

  const handleDeleteTask = (taskId: string) => {
    if (confirm('Tem certeza que deseja deletar esta tarefa?')) {
      deleteTask(taskId)
    }
  }

  // Handler para mover tarefa entre colunas
  const handleTaskMove = (taskId: string, toStatus: TaskStatus) => {
    updateTask(taskId, { status: toStatus })
  }

  // Handler para adicionar tarefa em coluna específica
  const handleAddTask = (status: TaskStatus) => {
    setSelectedTask(undefined)
    setPreselectedStatus(status)
    setIsDialogOpen(true)
  }

  return (
    <div className="w-[90%] mx-auto py-6 md:py-8">
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
              onDelete={handleDeleteTask}
            />
          ) : (
            <div className="text-center py-12 bg-muted/30 rounded-2xl border-2 border-dashed border-muted-foreground/20">
              <List className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">Nenhuma tarefa corresponde aos filtros selecionados</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog para edição de tarefa */}
      {selectedTask && (
        <TaskDialog
          task={selectedTask}
          onSave={handleSaveTask}
          isOpen={isDialogOpen && !!selectedTask}
          onOpenChange={(open: boolean) => {
            setIsDialogOpen(open)
            if (!open) setSelectedTask(undefined)
          }}
        />
      )}
    </div>
  )
}
