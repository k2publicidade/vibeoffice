'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Card } from '@/components/ui/card'
import { MoreVertical, Edit, Archive, Trash2, Copy } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { AnnouncementWithAuthor } from '@/types/announcements'
import { PRIORITY_CONFIGS } from '@/types/announcements'
import { cn } from '@/lib/utils'
import type { Sector } from '@/types/auth'

interface AnnouncementsTableProps {
  announcements: AnnouncementWithAuthor[]
  onEdit: (id: string) => void
  onArchive: (id: string) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()
}

function formatSectors(sectors: Sector[]): string {
  if (sectors.length === 0) return 'Todos'
  if (sectors.length === 1) return sectors[0]
  if (sectors.length === 2) return `${sectors[0]}, ${sectors[1]}`
  return `${sectors[0]} +${sectors.length - 1}`
}

export function AnnouncementsTable({
  announcements,
  onEdit,
  onArchive,
  onDelete,
  onDuplicate,
}: AnnouncementsTableProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const handleDelete = () => {
    if (deleteConfirmId) {
      onDelete(deleteConfirmId)
      setDeleteConfirmId(null)
    }
  }

  const now = new Date().toISOString()

  // Determinar status do aviso
  const getStatus = (announcement: AnnouncementWithAuthor) => {
    if (!announcement.active) return 'archived'
    if (announcement.expires_at <= now) return 'expired'
    return 'active'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Ativo</Badge>
      case 'expired':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Expirado</Badge>
      case 'archived':
        return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Arquivado</Badge>
      default:
        return null
    }
  }

  if (announcements.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">Nenhum aviso encontrado com os filtros selecionados.</p>
      </Card>
    )
  }

  return (
    <>
      {/* Desktop: Tabela */}
      <div className="hidden md:block rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="min-w-[200px]">Título</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Setores</TableHead>
              <TableHead>Autor</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead>Expira em</TableHead>
              <TableHead className="w-[70px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {announcements.map((announcement) => {
              const status = getStatus(announcement)
              const priorityConfig = PRIORITY_CONFIGS[announcement.priority]

              return (
                <TableRow key={announcement.id}>
                  {/* Status */}
                  <TableCell>{getStatusBadge(status)}</TableCell>

                  {/* Título */}
                  <TableCell className="font-medium">
                    <div className="line-clamp-2">{announcement.title}</div>
                  </TableCell>

                  {/* Prioridade */}
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={cn(priorityConfig.bgColor, priorityConfig.color)}
                    >
                      {priorityConfig.label}
                    </Badge>
                  </TableCell>

                  {/* Setores */}
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatSectors(announcement.target_sectors)}
                    </span>
                  </TableCell>

                  {/* Autor */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={announcement.author.avatar || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(announcement.author.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm truncate max-w-[120px]">
                        {announcement.author.name}
                      </span>
                    </div>
                  </TableCell>

                  {/* Criado em */}
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(announcement.created_at), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </TableCell>

                  {/* Expira em */}
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(announcement.expires_at), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </TableCell>

                  {/* Ações */}
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Abrir menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(announcement.id)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDuplicate(announcement.id)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicar
                        </DropdownMenuItem>
                        {status !== 'archived' && (
                          <DropdownMenuItem onClick={() => onArchive(announcement.id)}>
                            <Archive className="mr-2 h-4 w-4" />
                            Arquivar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteConfirmId(announcement.id)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Deletar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: Cards */}
      <div className="md:hidden space-y-4">
        {announcements.map((announcement) => {
          const status = getStatus(announcement)
          const priorityConfig = PRIORITY_CONFIGS[announcement.priority]

          return (
            <Card key={announcement.id} className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {getStatusBadge(status)}
                  <Badge
                    variant="secondary"
                    className={cn('text-xs', priorityConfig.bgColor, priorityConfig.color)}
                  >
                    {priorityConfig.label}
                  </Badge>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(announcement.id)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDuplicate(announcement.id)}>
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicar
                    </DropdownMenuItem>
                    {status !== 'archived' && (
                      <DropdownMenuItem onClick={() => onArchive(announcement.id)}>
                        <Archive className="mr-2 h-4 w-4" />
                        Arquivar
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setDeleteConfirmId(announcement.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Deletar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Título */}
              <h3 className="font-semibold text-sm mb-2 line-clamp-2">{announcement.title}</h3>

              {/* Info */}
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={announcement.author.avatar || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {getInitials(announcement.author.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{announcement.author.name}</span>
                </div>
                <div>Setores: {formatSectors(announcement.target_sectors)}</div>
                <div>
                  Expira:{' '}
                  {format(new Date(announcement.expires_at), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Dialog de Confirmação de Deleção */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Aviso</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar este aviso permanentemente? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
