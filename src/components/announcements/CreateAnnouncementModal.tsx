'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Info, AlertTriangle, AlertCircle } from 'lucide-react'
import { format, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useAnnouncements } from '@/hooks/useAnnouncements'
import type { AnnouncementPriority, CreateAnnouncementData, UpdateAnnouncementData } from '@/types/announcements'
import type { Sector } from '@/types/auth'
import { toast } from 'sonner'

interface CreateAnnouncementModalProps {
  open: boolean
  onClose: () => void
  editingId?: string // Se fornecido, modo edição
}

const SECTORS: Sector[] = [
  'A&R',
  'Marketing',
  'Financeiro',
  'Jurídico',
  'Administrativo',
  'TI/Suporte',
  'Atendimento ao Artista',
]

const PRIORITY_OPTIONS: Array<{
  value: AnnouncementPriority
  label: string
  icon: typeof Info
  color: string
}> = [
  { value: 'info', label: 'Informativo', icon: Info, color: 'text-blue-600' },
  { value: 'warning', label: 'Atenção', icon: AlertTriangle, color: 'text-yellow-600' },
  { value: 'urgent', label: 'Urgente', icon: AlertCircle, color: 'text-red-600' },
]

export function CreateAnnouncementModal({
  open,
  onClose,
  editingId,
}: CreateAnnouncementModalProps) {
  const { user } = useAuth()
  const { createAnnouncement, updateAnnouncement, getAnnouncementById } = useAnnouncements()

  // Form state
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [priority, setPriority] = useState<AnnouncementPriority>('info')
  const [selectedSectors, setSelectedSectors] = useState<Sector[]>([])
  const [selectAllSectors, setSelectAllSectors] = useState(true)
  const [expiresAt, setExpiresAt] = useState<Date>(addDays(new Date(), 7)) // Padrão: 7 dias
  const [link, setLink] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Carregar dados se for modo edição
  useEffect(() => {
    if (open && editingId) {
      const announcement = getAnnouncementById(editingId)
      if (announcement) {
        setTitle(announcement.title)
        setMessage(announcement.message)
        setPriority(announcement.priority)
        setSelectedSectors(announcement.target_sectors)
        setSelectAllSectors(announcement.target_sectors.length === 0)
        setExpiresAt(new Date(announcement.expires_at))
        setLink(announcement.metadata.link || '')
      }
    }
  }, [open, editingId, getAnnouncementById])

  // Reset ao fechar
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setTitle('')
        setMessage('')
        setPriority('info')
        setSelectedSectors([])
        setSelectAllSectors(true)
        setExpiresAt(addDays(new Date(), 7))
        setLink('')
      }, 200)
    }
  }, [open])

  // Toggle setor
  const toggleSector = (sector: Sector) => {
    setSelectAllSectors(false)
    setSelectedSectors((prev) =>
      prev.includes(sector)
        ? prev.filter(s => s !== sector)
        : [...prev, sector]
    )
  }

  // Toggle todos os setores
  const handleSelectAllToggle = () => {
    setSelectAllSectors(!selectAllSectors)
    if (!selectAllSectors) {
      setSelectedSectors([])
    }
  }

  // Validações
  const canSubmit = () => {
    if (!title.trim()) return false
    if (!message.trim()) return false
    if (title.length > 100) return false
    if (!selectAllSectors && selectedSectors.length === 0) return false
    return true
  }

  // Submit
  const handleSubmit = async () => {
    if (!canSubmit()) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    setIsSubmitting(true)

    try {
      const data: CreateAnnouncementData = {
        title: title.trim(),
        message: message.trim(),
        priority,
        target_sectors: selectAllSectors ? [] : selectedSectors,
        expires_at: expiresAt,
        active: true,
        metadata: {
          link: link.trim() || undefined,
        },
      }

      let saved = null
      if (editingId) {
        saved = await updateAnnouncement(editingId, data as UpdateAnnouncementData)
      } else {
        saved = await createAnnouncement(data)
      }

      if (saved) {
        onClose()
      }
    } catch (error) {
      console.error('Error submitting announcement:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Verificar se Gerente pode selecionar setores
  const isManager = user?.role === 'Gerente'
  const managerSector = user?.sector

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingId ? 'Editar Aviso' : 'Criar Novo Aviso'}
          </DialogTitle>
          <DialogDescription>
            {editingId
              ? 'Edite as informações do aviso abaixo.'
              : 'Preencha as informações para criar um novo aviso da empresa.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Título <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Manutenção Programada dos Servidores"
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              {title.length}/100 caracteres
            </p>
          </div>

          {/* Mensagem */}
          <div className="space-y-2">
            <Label htmlFor="message">
              Mensagem <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Descreva o aviso importante para os colaboradores..."
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {message.length} caracteres
            </p>
          </div>

          {/* Prioridade */}
          <div className="space-y-2">
            <Label htmlFor="priority">
              Prioridade <span className="text-red-500">*</span>
            </Label>
            <Select value={priority} onValueChange={(value) => setPriority(value as AnnouncementPriority)}>
              <SelectTrigger id="priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((option) => {
                  const Icon = option.icon
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <Icon className={cn('h-4 w-4', option.color)} />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Data de Expiração */}
          <div className="space-y-2">
            <Label>
              Data de Expiração <span className="text-red-500">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !expiresAt && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expiresAt ? format(expiresAt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'Selecione uma data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={expiresAt}
                  onSelect={(date) => date && setExpiresAt(date)}
                  disabled={(date) => date < new Date() || date > addDays(new Date(), 90)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Máximo de 90 dias a partir de hoje
            </p>
          </div>

          {/* Setores Alvo */}
          <div className="space-y-3">
            <Label>
              Setores Alvo <span className="text-red-500">*</span>
            </Label>

            {/* Checkbox "Todos os setores" */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="all-sectors"
                checked={selectAllSectors}
                onCheckedChange={handleSelectAllToggle}
              />
              <label
                htmlFor="all-sectors"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Todos os setores
              </label>
            </div>

            {/* Grid de setores */}
            {!selectAllSectors && (
              <div className="grid grid-cols-2 gap-2">
                {SECTORS.map((sector) => {
                  const isOwnSector = isManager && sector === managerSector
                  const isDisabled = isManager && !isOwnSector

                  return (
                    <div key={sector} className="flex items-center space-x-2">
                      <Checkbox
                        id={`sector-${sector}`}
                        checked={selectedSectors.includes(sector) || (isManager && isOwnSector)}
                        onCheckedChange={() => !isDisabled && toggleSector(sector)}
                        disabled={isDisabled || (isManager && isOwnSector)}
                      />
                      <label
                        htmlFor={`sector-${sector}`}
                        className={cn(
                          'text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
                          isDisabled && 'opacity-50'
                        )}
                      >
                        {sector}
                        {isManager && isOwnSector && ' (seu setor)'}
                      </label>
                    </div>
                  )
                })}
              </div>
            )}

            {isManager && (
              <p className="text-xs text-muted-foreground">
                Como Gerente, você pode criar avisos apenas para seu setor ou avisos gerais.
              </p>
            )}
          </div>

          {/* Link (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="link">Link Relacionado (opcional)</Label>
            <Input
              id="link"
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://..."
            />
            <p className="text-xs text-muted-foreground">
              URL para documento ou página relacionada ao aviso
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit() || isSubmitting}>
            {isSubmitting ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Publicar Aviso'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
