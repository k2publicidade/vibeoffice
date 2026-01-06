'use client'

import type { TicketFilters } from '@/hooks/useTickets'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  MultiSelect,
  MultiSelectItem,
} from '@/components/ui/multi-select'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { X, CircleDot, Clock, PlayCircle, CheckCircle2 } from 'lucide-react'
import { useUsers } from '@/hooks/useUsers'

interface TicketFiltersProps {
  filters: TicketFilters
  onFiltersChange: (filters: TicketFilters) => void
}

const ALL_VALUE = '__all__'

const statuses = ['open', 'analyzing', 'in_progress', 'completed']
const priorities = ['low', 'medium', 'high']
const categories = ['Bug', 'Feature', 'Melhoria', 'Dúvida', 'Outro']

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  open: {
    label: 'Aberto',
    icon: <CircleDot className="h-3.5 w-3.5" />,
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/30'
  },
  analyzing: {
    label: 'Em Análise',
    icon: <Clock className="h-3.5 w-3.5" />,
    color: 'bg-amber-500/10 text-amber-500 border-amber-500/30'
  },
  in_progress: {
    label: 'Em Execução',
    icon: <PlayCircle className="h-3.5 w-3.5" />,
    color: 'bg-[#ef5907]/10 text-[#ef5907] border-[#ef5907]/30'
  },
  completed: {
    label: 'Concluído',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
  },
}

const priorityLabels: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
}

export function TicketFilters({ filters, onFiltersChange }: TicketFiltersProps) {
  const { users } = useUsers()
  const hasFilters =
    (filters.status && filters.status.length > 0) ||
    filters.priority ||
    filters.category ||
    filters.assignedTo

  const handleFilterChange = (key: keyof TicketFilters, value: string | string[]) => {
    if (key === 'status') {
      // Status é multi-seleção
      const statusValue = value as string[]
      onFiltersChange({
        ...filters,
        status: statusValue.length > 0 ? statusValue : undefined,
      })
    } else {
      // Outros filtros são single-value
      onFiltersChange({
        ...filters,
        [key]: value === ALL_VALUE ? undefined : value,
      })
    }
  }

  const clearFilters = () => {
    onFiltersChange({})
  }

  // Renderização customizada dos valores selecionados no MultiSelect
  const renderSelectedStatus = (selectedValues: string[]) => {
    if (selectedValues.length === 0) {
      return <span className="text-muted-foreground">Todos os status</span>
    }

    if (selectedValues.length === 1) {
      const config = statusConfig[selectedValues[0]]
      return (
        <div className="flex items-center gap-1.5">
          {config.icon}
          <span>{config.label}</span>
        </div>
      )
    }

    if (selectedValues.length === statuses.length) {
      return <span>Todos selecionados</span>
    }

    return (
      <div className="flex items-center gap-1">
        {selectedValues.slice(0, 2).map((status) => (
          <Badge
            key={status}
            variant="outline"
            className={`text-xs px-1.5 py-0 h-5 ${statusConfig[status].color}`}
          >
            {statusConfig[status].label}
          </Badge>
        ))}
        {selectedValues.length > 2 && (
          <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
            +{selectedValues.length - 2}
          </Badge>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-zinc-800/50 border border-zinc-700/50 p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Filtros</h3>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-7 px-2 text-xs text-zinc-400 hover:text-orange-400 hover:bg-orange-500/10"
          >
            <X className="h-3 w-3 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      <div className="space-y-6">
        {/* Status - MultiSelect */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Status</label>
          <MultiSelect
            value={filters.status || []}
            onValueChange={(value) => handleFilterChange('status', value)}
            placeholder="Todos os status"
            renderSelectedValues={renderSelectedStatus}
          >
            {statuses.map((status) => {
              const config = statusConfig[status]
              return (
                <MultiSelectItem key={status} value={status}>
                  <div className="flex items-center gap-2">
                    <span className={config.color.split(' ')[1]}>{config.icon}</span>
                    <span>{config.label}</span>
                  </div>
                </MultiSelectItem>
              )
            })}
          </MultiSelect>

          {/* Quick filters */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => handleFilterChange('status', ['open', 'analyzing'])}
            >
              Pendentes
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => handleFilterChange('status', ['in_progress'])}
            >
              Em andamento
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => handleFilterChange('status', ['completed'])}
            >
              Finalizados
            </Button>
          </div>
        </div>

        {/* Priority */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Prioridade</label>
          <Select value={filters.priority || ALL_VALUE} onValueChange={(value) => handleFilterChange('priority', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Todas as prioridades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Todas as prioridades</SelectItem>
              {priorities.map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {priorityLabels[priority]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Categoria</label>
          <Select value={filters.category || ALL_VALUE} onValueChange={(value) => handleFilterChange('category', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Todas as categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Todas as categorias</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Assigned To */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Atribuído a</label>
          <Select value={filters.assignedTo || ALL_VALUE} onValueChange={(value) => handleFilterChange('assignedTo', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Todas as pessoas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Todas as pessoas</SelectItem>
              {(users || []).map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
