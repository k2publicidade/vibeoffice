'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'
import type { Sector } from '@/types/auth'
import type { AnnouncementPriority } from '@/types/announcements'

const SECTORS: Sector[] = [
  'A&R',
  'Marketing',
  'Financeiro',
  'Jurídico',
  'Administrativo',
  'TI/Suporte',
  'Atendimento ao Artista',
]

interface AnnouncementFiltersProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  selectedPriority: AnnouncementPriority | 'all'
  onPriorityChange: (value: AnnouncementPriority | 'all') => void
  selectedSector: Sector | 'all'
  onSectorChange: (value: Sector | 'all') => void
  selectedStatus: 'all' | 'active' | 'expired' | 'archived'
  onStatusChange: (value: 'all' | 'active' | 'expired' | 'archived') => void
  onClearFilters: () => void
  hasActiveFilters: boolean
}

export function AnnouncementFilters({
  searchQuery,
  onSearchChange,
  selectedPriority,
  onPriorityChange,
  selectedSector,
  onSectorChange,
  selectedStatus,
  onStatusChange,
  onClearFilters,
  hasActiveFilters,
}: AnnouncementFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Busca */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Label htmlFor="search" className="sr-only">
            Buscar avisos
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              type="text"
              placeholder="Buscar por título ou mensagem..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Botão Limpar Filtros */}
        {hasActiveFilters && (
          <Button variant="outline" onClick={onClearFilters} className="shrink-0">
            <X className="mr-2 h-4 w-4" />
            Limpar Filtros
          </Button>
        )}
      </div>

      {/* Filtros em Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Prioridade */}
        <div className="space-y-2">
          <Label htmlFor="priority">Prioridade</Label>
          <Select value={selectedPriority} onValueChange={onPriorityChange}>
            <SelectTrigger id="priority">
              <SelectValue placeholder="Todas as prioridades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as prioridades</SelectItem>
              <SelectItem value="info">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                    Informativo
                  </Badge>
                </div>
              </SelectItem>
              <SelectItem value="warning">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-yellow-50 text-yellow-700">
                    Atenção
                  </Badge>
                </div>
              </SelectItem>
              <SelectItem value="urgent">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-red-50 text-red-700">
                    Urgente
                  </Badge>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Setor */}
        <div className="space-y-2">
          <Label htmlFor="sector">Setor</Label>
          <Select value={selectedSector} onValueChange={onSectorChange}>
            <SelectTrigger id="sector">
              <SelectValue placeholder="Todos os setores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os setores</SelectItem>
              {SECTORS.map((sector) => (
                <SelectItem key={sector} value={sector}>
                  {sector}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={selectedStatus} onValueChange={onStatusChange}>
            <SelectTrigger id="status">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="expired">Expirados</SelectItem>
              <SelectItem value="archived">Arquivados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
