'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar as CalendarIcon, Clock, MapPin, Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  PremiumModal,
  PremiumModalHeader,
  PremiumModalTitle,
  PremiumModalDescription,
  PremiumModalBody,
  PremiumModalFooter,
} from '@/components/ui/premium-modal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useTasks } from '@/hooks/useTasks'
import { useTickets } from '@/hooks/useTickets'
import { toast } from 'sonner'
import type { EventType } from '@/types/calendar'
import type { Sector } from '@/types/auth'

interface Attendee {
  id: string
  name: string
  avatar?: string
}

interface CreateEventModalProps {
  open: boolean
  onClose: () => void
  onSave: (event: {
    title: string
    date: Date
    startTime: string
    endTime: string
    type: EventType
    sector?: Sector
    location?: string
    attendees: string[]
    linkedTaskId?: string
    linkedTicketId?: string
  }) => void
  selectedDate?: Date
  selectedHour?: number
  availableAttendees?: Attendee[]
}

const EVENT_TYPES: { id: EventType; name: string; color: string }[] = [
  { id: 'personal', name: 'Pessoal', color: 'hsl(218, 100%, 52%)' },
  { id: 'sector', name: 'Setor', color: 'hsl(22, 94%, 48%)' },
  { id: 'company', name: 'Empresa', color: 'hsl(142, 76%, 36%)' },
]

const SECTORS: Sector[] = [
  'A&R',
  'Marketing',
  'Financeiro',
  'Jurídico',
  'Administrativo',
  'TI/Suporte',
  'Atendimento ao Artista',
]

// Animation variants for staggered children
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
}

// Gerar opções de horário com intervalos de 30 minutos (24h)
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2).toString().padStart(2, '0')
  const min = i % 2 === 0 ? '00' : '30'
  return `${hour}:${min}`
})

export function CreateEventModal({
  open,
  onClose,
  onSave,
  selectedDate = new Date(),
  selectedHour,
  availableAttendees = [],
}: CreateEventModalProps) {
  // Todos os estados do formulário
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(selectedDate)
  const [dateStr, setDateStr] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [location, setLocation] = useState('')
  const [eventType, setEventType] = useState<EventType>('personal')
  const [eventSector, setEventSector] = useState<Sector | undefined>(undefined)
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([])
  const [linkType, setLinkType] = useState<'none' | 'task' | 'ticket'>('none')
  const [selectedTaskId, setSelectedTaskId] = useState<string>()
  const [selectedTicketId, setSelectedTicketId] = useState<string>()

  // Resetar e sincronizar tudo quando o modal abre
  useEffect(() => {
    if (open) {
      // Reset completo do formulário
      setTitle('')
      setLocation('')
      setEventType('personal')
      setEventSector(undefined)
      setSelectedAttendees([])
      setLinkType('none')
      setSelectedTaskId(undefined)
      setSelectedTicketId(undefined)

      // Normalizar data removendo componente de hora
      const normalizedDate = new Date(selectedDate)
      normalizedDate.setHours(0, 0, 0, 0)
      setDate(normalizedDate)

      // Formatar como yyyy-MM-dd para o input date
      const year = normalizedDate.getFullYear()
      const month = (normalizedDate.getMonth() + 1).toString().padStart(2, '0')
      const day = normalizedDate.getDate().toString().padStart(2, '0')
      setDateStr(`${year}-${month}-${day}`)

      // Definir hora baseada no slot clicado
      if (selectedHour !== undefined && selectedHour !== null) {
        const hour = Math.max(0, Math.min(23, selectedHour))
        const endHour = Math.min(23, hour + 1)
        setStartTime(`${hour.toString().padStart(2, '0')}:00`)
        setEndTime(`${endHour.toString().padStart(2, '0')}:00`)
      } else {
        setStartTime('09:00')
        setEndTime('10:00')
      }
    }
  }, [open, selectedDate, selectedHour])

  // Sincronizar dateStr -> date quando o usuário altera o input
  const handleDateChange = (value: string) => {
    setDateStr(value)
    if (value) {
      const [y, m, d] = value.split('-').map(Number)
      const newDate = new Date(y, m - 1, d, 0, 0, 0, 0)
      setDate(newDate)
    }
  }

  const { tasks } = useTasks()
  const { tickets } = useTickets()

  const handleAttendeeToggle = (attendeeId: string) => {
    setSelectedAttendees((prev) =>
      prev.includes(attendeeId)
        ? prev.filter((id) => id !== attendeeId)
        : [...prev, attendeeId]
    )
  }

  const handleSave = () => {
    // Validar que título foi preenchido
    if (!title.trim()) {
      toast.error('O título do evento é obrigatório')
      return
    }

    // Validar que hora de fim é após hora de início
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)
    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin

    // Debug logging
    console.log('[CreateEventModal] Criando evento:', {
      title,
      date: date.toISOString(),
      startTime,
      endTime,
      startMinutes,
      endMinutes,
    })

    if (endMinutes <= startMinutes) {
      toast.error('A hora de término deve ser após a hora de início')
      console.error('[CreateEventModal] Validação falhou: endMinutes <= startMinutes', { startMinutes, endMinutes })
      return
    }

    // Garantir que a data é válida
    if (!date || isNaN(date.getTime())) {
      toast.error('Data inválida selecionada')
      console.error('[CreateEventModal] Data inválida:', date)
      return
    }

    onSave({
      title,
      date,
      startTime,
      endTime,
      type: eventType,
      sector: eventType === 'sector' ? eventSector : undefined,
      location: location || undefined,
      attendees: selectedAttendees,
      linkedTaskId: linkType === 'task' ? selectedTaskId : undefined,
      linkedTicketId: linkType === 'ticket' ? selectedTicketId : undefined,
    })
    onClose()
  }

  return (
    <PremiumModal
      open={open}
      onClose={onClose}
      size="md"
      mobileFullScreen={true}
      title="Novo Evento"
    >
      <PremiumModalHeader hiddenOnMobileFullScreen>
        <PremiumModalTitle>
          {title || 'Novo Evento'}
        </PremiumModalTitle>
        <PremiumModalDescription>
          Preencha os detalhes do seu evento
        </PremiumModalDescription>
      </PremiumModalHeader>

      <PremiumModalBody>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-5"
        >
          {/* Title Input */}
          <motion.div variants={itemVariants}>
            <Label htmlFor="event-title" className="text-sm font-medium">
              Título do evento
            </Label>
            <Input
              id="event-title"
              placeholder="Ex: Reunião com equipe"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5 h-12 md:h-11 rounded-xl border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 focus:border-orange-500 focus:ring-orange-500/20 transition-colors text-base md:text-sm"
            />
          </motion.div>

          {/* Date - Editável */}
          <motion.div variants={itemVariants} className="flex items-center gap-3">
            <div className="h-11 w-11 md:h-10 md:w-10 rounded-xl bg-orange-500/20 flex items-center justify-center flex-shrink-0">
              <CalendarIcon className="h-5 w-5 text-orange-400" />
            </div>
            <div className="flex-1">
              <input
                type="date"
                value={dateStr}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full h-12 md:h-11 px-3 rounded-xl border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 focus:outline-none transition-colors text-base md:text-sm text-foreground [color-scheme:dark]"
              />
              <p className="text-xs text-muted-foreground mt-1 capitalize">
                {date && !isNaN(date.getTime()) ? format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR }) : ''}
              </p>
            </div>
          </motion.div>

          {/* Time */}
          <motion.div variants={itemVariants} className="flex items-center gap-3">
            <div className="h-11 w-11 md:h-10 md:w-10 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5 text-orange-400" />
            </div>
            <div className="flex items-center gap-2 flex-1">
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger className="flex-1 h-12 md:h-11 rounded-xl border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 text-base md:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((time) => (
                    <SelectItem key={`start-${time}`} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground font-medium text-sm">até</span>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger className="flex-1 h-12 md:h-11 rounded-xl border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 text-base md:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((time) => (
                    <SelectItem key={`end-${time}`} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </motion.div>

          {/* Location */}
          <motion.div variants={itemVariants} className="flex items-center gap-3">
            <div className="h-11 w-11 md:h-10 md:w-10 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
              <MapPin className="h-5 w-5 text-zinc-400" />
            </div>
            <Input
              placeholder="Adicionar local (opcional)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="h-12 md:h-11 rounded-xl border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 focus:border-orange-500 transition-colors text-base md:text-sm"
            />
          </motion.div>

          {/* Tipo do Evento */}
          <motion.div variants={itemVariants}>
            <Label className="text-sm font-medium mb-2 block">Categoria</Label>
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map((et, index) => (
                <motion.button
                  key={et.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setEventType(et.id)
                    if (et.id !== 'sector') setEventSector(undefined)
                  }}
                  className={cn(
                    'rounded-full px-4 py-2.5 md:py-2 text-sm font-medium transition-all duration-200 min-h-[44px] md:min-h-0',
                    eventType === et.id
                      ? 'text-white shadow-md'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                  style={
                    eventType === et.id
                      ? { backgroundColor: et.color }
                      : undefined
                  }
                >
                  {et.name}
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Seletor de Setor (quando tipo = Setor) */}
          {eventType === 'sector' && (
            <motion.div variants={itemVariants}>
              <Label className="text-sm font-medium mb-2 block">Setor</Label>
              <Select value={eventSector || ''} onValueChange={(v) => setEventSector(v as Sector)}>
                <SelectTrigger className="h-12 md:h-11 rounded-xl border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 text-base md:text-sm">
                  <SelectValue placeholder="Selecione o setor" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {SECTORS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </motion.div>
          )}

          {/* Vincular a Task/Ticket */}
          <motion.div variants={itemVariants}>
            <Label className="text-sm font-medium mb-2 block">
              Vincular a (opcional)
            </Label>
            <Tabs value={linkType} onValueChange={(v) => setLinkType(v as 'none' | 'task' | 'ticket')}>
              <TabsList className="grid w-full grid-cols-3 bg-zinc-800 border-zinc-700 h-12 md:h-10">
                <TabsTrigger value="none" className="text-sm">Nenhum</TabsTrigger>
                <TabsTrigger value="task" className="text-sm">Tarefa</TabsTrigger>
                <TabsTrigger value="ticket" className="text-sm">Ticket</TabsTrigger>
              </TabsList>

              {linkType === 'task' && (
                <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                  <SelectTrigger className="mt-2 h-12 md:h-11 bg-zinc-800/50 border-zinc-700 text-base md:text-sm">
                    <SelectValue placeholder="Selecione uma tarefa" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {tasks.filter(t => t.status !== 'done').map(task => (
                      <SelectItem key={task.id} value={task.id}>
                        📋 {task.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {linkType === 'ticket' && (
                <Select value={selectedTicketId} onValueChange={setSelectedTicketId}>
                  <SelectTrigger className="mt-2 h-12 md:h-11 bg-zinc-800/50 border-zinc-700 text-base md:text-sm">
                    <SelectValue placeholder="Selecione um ticket" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {tickets.filter(t => t.status !== 'completed').map(ticket => (
                      <SelectItem key={ticket.id} value={ticket.id}>
                        🎫 {ticket.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Tabs>
          </motion.div>

          {/* Attendees */}
          {availableAttendees.length > 0 && (
            <motion.div variants={itemVariants}>
              <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Participantes
              </Label>
              <div className="flex flex-wrap gap-2">
                {availableAttendees.slice(0, 6).map((attendee, index) => (
                  <motion.button
                    key={attendee.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleAttendeeToggle(attendee.id)}
                    className={cn(
                      'rounded-full p-0.5 transition-all duration-200',
                      selectedAttendees.includes(attendee.id)
                        ? 'ring-2 ring-orange-500 ring-offset-2 ring-offset-zinc-900'
                        : 'opacity-60 hover:opacity-100'
                    )}
                  >
                    <Avatar className="h-11 w-11 md:h-10 md:w-10">
                      <AvatarImage src={attendee.avatar} alt={attendee.name} />
                      <AvatarFallback className="bg-gradient-to-br from-[#fe6e5b] to-[#ff0300] text-white text-xs font-semibold">
                        {attendee.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>
                  </motion.button>
                ))}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  className="flex h-11 w-11 md:h-10 md:w-10 items-center justify-center rounded-full border-2 border-dashed border-zinc-600 text-zinc-500 hover:border-orange-500 hover:text-orange-500 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </motion.button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </PremiumModalBody>

      <PremiumModalFooter stickyOnMobile>
        <Button
          variant="outline"
          onClick={onClose}
          className="rounded-full px-6 h-12 md:h-11 border-zinc-700 hover:bg-zinc-800 hover:text-foreground flex-1 md:flex-none"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          disabled={!title}
          className="rounded-full px-6 h-12 md:h-11 bg-gradient-to-br from-[#fe6e5b] to-[#ff0300] text-white hover:from-[#ff0300] hover:to-[#cc0200] shadow-lg shadow-[#ff0300]/30 transition-all disabled:opacity-50 flex-1 md:flex-none"
        >
          Criar evento
        </Button>
      </PremiumModalFooter>
    </PremiumModal>
  )
}
