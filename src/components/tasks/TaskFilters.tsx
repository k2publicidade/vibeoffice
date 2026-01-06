'use client'

import type { TaskFilters, DateFilter, TaskStats } from '@/hooks/useTasks'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { X, Search, AlertTriangle, Calendar, Clock } from 'lucide-react'
import { mockUsers } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

interface TaskFiltersProps {
  filters: TaskFilters
  onFiltersChange: (filters: TaskFilters) => void
  stats?: TaskStats
}

const ALL_VALUE = '__all__'

const sectors = ['A&R', 'Marketing', 'Financeiro', 'Jurídico', 'Administrativo', 'TI/Suporte', 'Atendimento ao Artista']
const priorities = ['low', 'medium', 'high']
const statuses = ['todo', 'in_progress', 'done']

const statusLabels: Record<string, string> = {
  todo: 'A Fazer',
  in_progress: 'Em Progresso',
  done: 'Concluído',
}

const priorityLabels: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
}

const dateFilters: { value: DateFilter; label: string; icon?: React.ReactNode }[] = [
  { value: 'all', label: 'Todas as datas' },
  { value: 'overdue', label: 'Atrasadas', icon: <AlertTriangle className="h-3 w-3 text-red-500" /> },
  { value: 'today', label: 'Hoje' },
  { value: 'tomorrow', label: 'Amanhã' },
  { value: 'this_week', label: 'Esta semana' },
  { value: 'this_month', label: 'Este mês' },
  { value: 'no_date', label: 'Sem data' },
]

export function TaskFilters({ filters, onFiltersChange, stats }: TaskFiltersProps) {
  const hasFilters = Object.values(filters).some(v => v !== undefined && v !== '')

  const handleFilterChange = (key: keyof TaskFilters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value === ALL_VALUE ? undefined : value,
    })
  }

  const handleSearchChange = (value: string) => {
    onFiltersChange({
      ...filters,
      searchQuery: value || undefined,
    })
  }

  const clearFilters = () => {
    onFiltersChange({})
  }

  return (
    <Card className="bg-[#0a0a0a] border-[#2a2a2a]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-white">Filtros</CardTitle>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-xs text-gray-400 hover:text-white"
            >
              <X className="h-3 w-3 mr-1" />
              Limpar
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Busca */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Buscar</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Título ou descrição..."
              value={filters.searchQuery || ''}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder:text-gray-500"
            />
          </div>
        </div>

        <Separator className="bg-[#2a2a2a]" />

        {/* Filtros de Data - Quick Access */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#fc7a67]" />
            Data de Vencimento
          </label>
          <div className="flex flex-wrap gap-2">
            {dateFilters.map((df) => (
              <button
                key={df.value}
                onClick={() => handleFilterChange('dateFilter', df.value)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-full border transition-all flex items-center gap-1.5',
                  filters.dateFilter === df.value
                    ? 'bg-[#fc7a67] text-black border-[#fc7a67]'
                    : 'bg-[#1a1a1a] text-gray-300 border-[#2a2a2a] hover:border-[#fc7a67]/50 hover:text-white'
                )}
              >
                {df.icon}
                {df.label}
                {df.value === 'overdue' && stats?.overdue ? (
                  <Badge variant="destructive" className="ml-1 h-4 px-1.5 text-[10px]">
                    {stats.overdue}
                  </Badge>
                ) : null}
                {df.value === 'today' && stats?.dueToday ? (
                  <Badge className="ml-1 h-4 px-1.5 text-[10px] bg-blue-500">
                    {stats.dueToday}
                  </Badge>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <Separator className="bg-[#2a2a2a]" />

        {/* Setor */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Setor</label>
          <Select value={filters.sector || ALL_VALUE} onValueChange={(value) => handleFilterChange('sector', value)}>
            <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
              <SelectValue placeholder="Todos os setores" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
              <SelectItem value={ALL_VALUE}>Todos os setores</SelectItem>
              {sectors.map((sector) => (
                <SelectItem key={sector} value={sector}>
                  {sector}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Prioridade */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Prioridade</label>
          <Select value={filters.priority || ALL_VALUE} onValueChange={(value) => handleFilterChange('priority', value)}>
            <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
              <SelectValue placeholder="Todas as prioridades" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
              <SelectItem value={ALL_VALUE}>Todas as prioridades</SelectItem>
              {priorities.map((priority) => (
                <SelectItem key={priority} value={priority}>
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full',
                        priority === 'high' && 'bg-red-500',
                        priority === 'medium' && 'bg-yellow-500',
                        priority === 'low' && 'bg-green-500'
                      )}
                    />
                    {priorityLabels[priority]}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Status</label>
          <Select value={filters.status || ALL_VALUE} onValueChange={(value) => handleFilterChange('status', value)}>
            <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
              <SelectItem value={ALL_VALUE}>Todos os status</SelectItem>
              {statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {statusLabels[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Responsável */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Responsável</label>
          <Select value={filters.assignedTo || ALL_VALUE} onValueChange={(value) => handleFilterChange('assignedTo', value)}>
            <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
              <SelectValue placeholder="Todas as pessoas" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
              <SelectItem value={ALL_VALUE}>Todas as pessoas</SelectItem>
              {mockUsers.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats Summary */}
        {stats && (
          <>
            <Separator className="bg-[#2a2a2a]" />
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Resumo</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a]">
                  <p className="text-gray-500">Total</p>
                  <p className="text-lg font-bold text-white">{stats.total}</p>
                </div>
                <div className="p-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a]">
                  <p className="text-gray-500">Concluídas</p>
                  <p className="text-lg font-bold text-green-500">{stats.completed}</p>
                </div>
                <div className="p-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a]">
                  <p className="text-gray-500">Em Progresso</p>
                  <p className="text-lg font-bold text-[#fc7a67]">{stats.inProgress}</p>
                </div>
                <div className="p-2 rounded-lg bg-[#1a1a1a] border border-red-500/30">
                  <p className="text-gray-500">Atrasadas</p>
                  <p className="text-lg font-bold text-red-500">{stats.overdue}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
