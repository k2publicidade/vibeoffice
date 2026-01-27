'use client'

import { useState } from 'react'
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

interface Attendee {
  id: string
  name: string
  avatar?: string
}

interface Tag {
  id: string
  name: string
  color: string
}

interface CreateEventModalProps {
  open: boolean
  onClose: () => void
  onSave: (event: {
    title: string
    date: Date
    startTime: string
    endTime: string
    location?: string
    tags: string[]
    attendees: string[]
    linkedTaskId?: string
    linkedTicketId?: string
  }) => void
  selectedDate?: Date
  availableAttendees?: Attendee[]
  availableTags?: Tag[]
}

const defaultTags: Tag[] = [
  { id: 'design', name: 'Design', color: 'hsl(218, 100%, 52%)' },
  { id: 'personal', name: 'Pessoal', color: 'hsl(22, 94%, 48%)' },
  { id: 'developer', name: 'Dev', color: 'hsl(0, 0%, 15%)' },
  { id: 'meeting', name: 'Reunião', color: 'hsl(142, 76%, 36%)' },
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

export function CreateEventModal({
  open,
  onClose,
  onSave,
  selectedDate = new Date(),
  availableAttendees = [],
  availableTags = defaultTags,
}: CreateEventModalProps) {
  const [title, setTitle] = useState('')
  const [date] = useState(selectedDate)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [location, setLocation] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([])

  // Estados para vinculação
  const [linkType, setLinkType] = useState<'none' | 'task' | 'ticket'>('none')
  const [selectedTaskId, setSelectedTaskId] = useState<string>()
  const [selectedTicketId, setSelectedTicketId] = useState<string>()

  const { tasks } = useTasks()
  const { tickets } = useTickets()

  const handleTagToggle = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    )
  }

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

    if (endMinutes <= startMinutes) {
      toast.error('A hora de término deve ser após a hora de início')
      return
    }

    onSave({
      title,
      date,
      startTime,
      endTime,
      location: location || undefined,
      tags: selectedTags,
      attendees: selectedAttendees,
      linkedTaskId: linkType === 'task' ? selectedTaskId : undefined,
      linkedTicketId: linkType === 'ticket' ? selectedTicketId : undefined,
    })
    handleReset()
    onClose()
  }

  const handleReset = () => {
    setTitle('')
    setStartTime('09:00')
    setEndTime('10:00')
    setLocation('')
    setSelectedTags([])
    setSelectedAttendees([])
    setLinkType('none')
    setSelectedTaskId(undefined)
    setSelectedTicketId(undefined)
  }

  return (
    <PremiumModal open={open} onClose={onClose} size="md">
      <PremiumModalHeader>
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
              className="mt-1.5 h-11 rounded-xl border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 focus:border-orange-500 focus:ring-orange-500/20 transition-colors"
            />
          </motion.div>

          {/* Date */}
          <motion.div variants={itemVariants} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
            <div className="h-10 w-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <CalendarIcon className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Data</p>
              <p className="font-medium">
                {format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
          </motion.div>

          {/* Time */}
          <motion.div variants={itemVariants} className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5 text-orange-400" />
            </div>
            <div className="flex items-center gap-2 flex-1">
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger className="flex-1 h-11 rounded-xl border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => {
                    const hour = i.toString().padStart(2, '0')
                    return (
                      <SelectItem key={`${hour}:00`} value={`${hour}:00`}>
                        {hour}:00
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground font-medium">até</span>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger className="flex-1 h-11 rounded-xl border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => {
                    const hour = i.toString().padStart(2, '0')
                    return (
                      <SelectItem key={`${hour}:00`} value={`${hour}:00`}>
                        {hour}:00
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </motion.div>

          {/* Location */}
          <motion.div variants={itemVariants} className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
              <MapPin className="h-5 w-5 text-zinc-400" />
            </div>
            <Input
              placeholder="Adicionar local (opcional)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="h-11 rounded-xl border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 focus:border-orange-500 transition-colors"
            />
          </motion.div>

          {/* Tags */}
          <motion.div variants={itemVariants}>
            <Label className="text-sm font-medium mb-2 block">Categorias</Label>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag, index) => (
                <motion.button
                  key={tag.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleTagToggle(tag.id)}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-medium transition-all duration-200',
                    selectedTags.includes(tag.id)
                      ? 'text-white shadow-md'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                  style={
                    selectedTags.includes(tag.id)
                      ? { backgroundColor: tag.color }
                      : undefined
                  }
                >
                  {tag.name}
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Vincular a Task/Ticket */}
          <motion.div variants={itemVariants}>
            <Label className="text-sm font-medium mb-2 block">
              Vincular a (opcional)
            </Label>
            <Tabs value={linkType} onValueChange={(v) => setLinkType(v as 'none' | 'task' | 'ticket')}>
              <TabsList className="grid w-full grid-cols-3 bg-zinc-800 border-zinc-700">
                <TabsTrigger value="none">Nenhum</TabsTrigger>
                <TabsTrigger value="task">Tarefa</TabsTrigger>
                <TabsTrigger value="ticket">Ticket</TabsTrigger>
              </TabsList>

              {linkType === 'task' && (
                <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                  <SelectTrigger className="mt-2 bg-zinc-800/50 border-zinc-700">
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
                  <SelectTrigger className="mt-2 bg-zinc-800/50 border-zinc-700">
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
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleAttendeeToggle(attendee.id)}
                    className={cn(
                      'rounded-full p-0.5 transition-all duration-200',
                      selectedAttendees.includes(attendee.id)
                        ? 'ring-2 ring-orange-500 ring-offset-2 ring-offset-zinc-900'
                        : 'opacity-60 hover:opacity-100'
                    )}
                  >
                    <Avatar className="h-10 w-10">
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
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-zinc-600 text-zinc-500 hover:border-orange-500 hover:text-orange-500 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </motion.button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </PremiumModalBody>

      <PremiumModalFooter>
        <Button
          variant="outline"
          onClick={onClose}
          className="rounded-full px-6 h-11 border-zinc-700 hover:bg-zinc-800 hover:text-foreground"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          disabled={!title}
          className="rounded-full px-6 h-11 bg-gradient-to-br from-[#fe6e5b] to-[#ff0300] text-white hover:from-[#ff0300] hover:to-[#cc0200] shadow-lg shadow-[#ff0300]/30 transition-all disabled:opacity-50"
        >
          Criar evento
        </Button>
      </PremiumModalFooter>
    </PremiumModal>
  )
}
