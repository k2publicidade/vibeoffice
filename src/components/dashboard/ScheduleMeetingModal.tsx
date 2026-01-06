'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar as CalendarIcon, Clock, MapPin, Users, Video, Plus, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { PremiumDatePicker } from '@/components/ui/premium-date-picker'

interface Participant {
  id: string
  name: string
  avatar?: string
}

interface ScheduleMeetingModalProps {
  open: boolean
  onClose: () => void
  onSave: (meeting: {
    title: string
    date: Date
    startTime: string
    duration: string
    location?: string
    meetingLink?: string
    participants: string[]
    agenda?: string
  }) => void
  availableParticipants?: Participant[]
}

const durations = [
  { value: '15', label: '15 minutos' },
  { value: '30', label: '30 minutos' },
  { value: '45', label: '45 minutos' },
  { value: '60', label: '1 hora' },
  { value: '90', label: '1h 30min' },
  { value: '120', label: '2 horas' },
]

const defaultParticipants: Participant[] = [
  { id: '1', name: 'Ana Silva', avatar: '/avatars/ana.jpg' },
  { id: '2', name: 'Carlos Santos', avatar: '/avatars/carlos.jpg' },
  { id: '3', name: 'Marina Costa', avatar: '/avatars/marina.jpg' },
  { id: '4', name: 'Pedro Almeida', avatar: '/avatars/pedro.jpg' },
  { id: '5', name: 'Julia Ferreira', avatar: '/avatars/julia.jpg' },
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

export function ScheduleMeetingModal({
  open,
  onClose,
  onSave,
  availableParticipants = defaultParticipants,
}: ScheduleMeetingModalProps) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState<Date | undefined>()
  const [startTime, setStartTime] = useState('09:00')
  const [duration, setDuration] = useState('60')
  const [location, setLocation] = useState('')
  const [meetingLink, setMeetingLink] = useState('')
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([])
  const [agenda, setAgenda] = useState('')
  const [showLinkInput, setShowLinkInput] = useState(false)

  const handleParticipantToggle = (participantId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(participantId)
        ? prev.filter((id) => id !== participantId)
        : [...prev, participantId]
    )
  }

  const handleSave = () => {
    if (!title || !date || !startTime) return

    onSave({
      title,
      date: date!,
      startTime,
      duration,
      location: location || undefined,
      meetingLink: meetingLink || undefined,
      participants: selectedParticipants,
      agenda: agenda || undefined,
    })
    handleReset()
    onClose()
  }

  const handleReset = () => {
    setTitle('')
    setDate(undefined)
    setStartTime('09:00')
    setDuration('60')
    setLocation('')
    setMeetingLink('')
    setSelectedParticipants([])
    setAgenda('')
    setShowLinkInput(false)
  }

  return (
    <PremiumModal open={open} onClose={onClose} size="lg">
      <PremiumModalHeader>
        <PremiumModalTitle>
          {title || 'Nova Reunião'}
        </PremiumModalTitle>
        <PremiumModalDescription>
          Configure os detalhes da reunião
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
            <Label htmlFor="meeting-title" className="text-sm font-medium">
              Título da reunião
            </Label>
            <Input
              id="meeting-title"
              placeholder="Ex: Alinhamento semanal"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5 h-11 rounded-xl border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 focus:border-orange-500 focus:ring-orange-500/20 transition-all"
            />
          </motion.div>

          {/* Date and Time */}
          <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
            <div>
              <PremiumDatePicker
                label="Data"
                date={date}
                onDateChange={setDate}
              />
            </div>
            <div>
              <Label htmlFor="meeting-time" className="text-sm font-medium">
                Horário
              </Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger className="mt-1.5 h-11 rounded-xl border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800">
                  <Clock className="h-4 w-4 mr-2 text-zinc-400" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => {
                    const hour = i.toString().padStart(2, '0')
                    return (
                      <React.Fragment key={hour}>
                        <SelectItem value={`${hour}:00`}>
                          {hour}:00
                        </SelectItem>
                        <SelectItem value={`${hour}:30`}>
                          {hour}:30
                        </SelectItem>
                      </React.Fragment>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="meeting-duration" className="text-sm font-medium">
                Duração
              </Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="mt-1.5 h-11 rounded-xl border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {durations.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </motion.div>

          {/* Summary */}
          {date && startTime && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20"
            >
              <div className="h-10 w-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Video className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Agendado para</p>
                <p className="font-medium text-zinc-100">
                  {date && format(date, "EEEE, d 'de' MMMM", { locale: ptBR })} às {startTime}
                </p>
              </div>
            </motion.div>
          )}

          {/* Location and Link */}
          <motion.div variants={itemVariants} className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700">
                <MapPin className="h-5 w-5 text-zinc-400" />
              </div>
              <Input
                placeholder="Local da reunião (opcional)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="h-11 rounded-xl border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 focus:border-orange-500 transition-all"
              />
            </div>

            {showLinkInput ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-center gap-3"
              >
                <div className="h-10 w-10 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700">
                  <Link2 className="h-5 w-5 text-zinc-400" />
                </div>
                <Input
                  placeholder="Link da reunião (Meet, Zoom, Teams...)"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  className="h-11 rounded-xl border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 focus:border-orange-500 transition-all"
                />
              </motion.div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowLinkInput(true)}
                className="text-sm text-orange-400 hover:text-orange-300 hover:bg-orange-400/10"
              >
                <Video className="h-4 w-4 mr-2" />
                Adicionar link de videochamada
              </Button>
            )}
          </motion.div>

          {/* Participants */}
          <motion.div variants={itemVariants}>
            <Label className="text-sm font-medium mb-2 flex items-center gap-2">
              <Users className="h-4 w-4 text-zinc-400" />
              Participantes
              {selectedParticipants.length > 0 && (
                <span className="text-xs text-zinc-500">
                  ({selectedParticipants.length} selecionados)
                </span>
              )}
            </Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {availableParticipants.slice(0, 6).map((participant, index) => (
                <motion.button
                  key={participant.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleParticipantToggle(participant.id)}
                  className={cn(
                    'rounded-full p-0.5 transition-all duration-200',
                    selectedParticipants.includes(participant.id)
                      ? 'ring-2 ring-orange-500 ring-offset-2 ring-offset-zinc-900'
                      : 'opacity-60 hover:opacity-100'
                  )}
                  title={participant.name}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={participant.avatar} alt={participant.name} />
                    <AvatarFallback className="bg-gradient-to-br from-[#fe6e5b] to-[#ff0300] text-white text-xs font-semibold">
                      {participant.name
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
                className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-zinc-700 text-zinc-600 hover:border-orange-500 hover:text-orange-500 transition-colors"
              >
                <Plus className="h-4 w-4" />
              </motion.button>
            </div>
          </motion.div>

          {/* Agenda */}
          <motion.div variants={itemVariants}>
            <Label htmlFor="agenda" className="text-sm font-medium">
              Pauta (opcional)
            </Label>
            <Textarea
              id="agenda"
              placeholder="Adicione os tópicos que serão discutidos..."
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              className="mt-1.5 min-h-[80px] rounded-xl border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 focus:border-orange-500 focus:ring-orange-500/20 transition-all resize-none"
            />
          </motion.div>
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
          disabled={!title || !date}
          className="rounded-full px-6 h-11 bg-gradient-to-br from-[#fe6e5b] to-[#ff0300] text-white hover:from-[#ff0300] hover:to-[#cc0200] shadow-lg shadow-[#ff0300]/30 transition-all disabled:opacity-50"
        >
          Agendar reunião
        </Button>
      </PremiumModalFooter>
    </PremiumModal>
  )
}
