'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Info, AlertTriangle, AlertCircle, MoreVertical, Edit, Archive, ExternalLink } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { AnnouncementWithAuthor, AnnouncementPriority } from '@/types/announcements'
import { PRIORITY_CONFIGS } from '@/types/announcements'
import { cn } from '@/lib/utils'
import type { Sector } from '@/types/auth'

interface AnnouncementCardProps {
  announcement: AnnouncementWithAuthor
  onEdit?: (id: string) => void
  onArchive?: (id: string) => void
  onViewMore?: (announcement: AnnouncementWithAuthor) => void
  canManage?: boolean
}

// Ícones por prioridade
const PRIORITY_ICONS = {
  info: Info,
  warning: AlertTriangle,
  urgent: AlertCircle,
}

// Obter iniciais do nome
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()
}

// Formatar setores para exibição
function formatSectors(sectors: Sector[]): string {
  if (sectors.length === 0) return 'Todos os setores'
  if (sectors.length === 1) return sectors[0]
  if (sectors.length === 2) return `${sectors[0]} e ${sectors[1]}`
  return `${sectors[0]} +${sectors.length - 1}`
}

export function AnnouncementCard({
  announcement,
  onEdit,
  onArchive,
  onViewMore,
  canManage = false,
}: AnnouncementCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const config = PRIORITY_CONFIGS[announcement.priority]
  const PriorityIcon = PRIORITY_ICONS[announcement.priority]

  // Calcular tempo restante até expiração
  const expiresIn = formatDistanceToNow(new Date(announcement.expires_at), {
    locale: ptBR,
    addSuffix: true,
  })

  // Verificar se mensagem precisa de "Ver mais"
  const MAX_MESSAGE_LENGTH = 150
  const needsTruncate = announcement.message.length > MAX_MESSAGE_LENGTH
  const displayMessage = isExpanded || !needsTruncate
    ? announcement.message
    : `${announcement.message.substring(0, MAX_MESSAGE_LENGTH)}...`

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all hover:shadow-md',
        'border-l-4',
        config.borderColor
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 p-4 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Badge de prioridade */}
          <Badge
            variant="secondary"
            className={cn('gap-1', config.bgColor, config.color)}
          >
            <PriorityIcon className="h-3 w-3" />
            {config.label}
          </Badge>

          {/* Setores alvo */}
          <span className="text-xs text-muted-foreground">
            {formatSectors(announcement.target_sectors)}
          </span>
        </div>

        {/* Ações (Admin/Gerente) */}
        {canManage && onEdit && onArchive && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -mr-2 -mt-1"
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Abrir menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(announcement.id)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onArchive(announcement.id)}>
                <Archive className="mr-2 h-4 w-4" />
                Arquivar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Título */}
      <div className="px-4 pb-2">
        <h3 className="font-semibold text-base line-clamp-2 leading-tight">
          {announcement.title}
        </h3>
      </div>

      {/* Mensagem */}
      <div className="px-4 pb-3">
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {displayMessage}
        </p>

        {needsTruncate && (
          <button
            onClick={() => {
              if (onViewMore && !isExpanded) {
                onViewMore(announcement)
              } else {
                setIsExpanded(!isExpanded)
              }
            }}
            className="text-xs text-primary hover:underline mt-1 font-medium"
          >
            {isExpanded ? 'Ver menos' : 'Ver mais'}
          </button>
        )}

        {/* Link/Anexo */}
        {announcement.metadata.link && (
          <a
            href={announcement.metadata.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
          >
            <ExternalLink className="h-3 w-3" />
            Ver documento relacionado
          </a>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 bg-muted/30 border-t">
        {/* Autor */}
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="h-6 w-6">
            <AvatarImage src={announcement.author.avatar || undefined} />
            <AvatarFallback className="text-xs">
              {getInitials(announcement.author.name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground truncate">
            {announcement.author.name}
          </span>
        </div>

        {/* Expira em */}
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          Expira {expiresIn}
        </span>
      </div>
    </Card>
  )
}
