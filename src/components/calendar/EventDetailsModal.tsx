'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Calendar as CalendarIcon,
    Clock,
    MapPin,
    Users,
    Tag as TagIcon,
    Trash2,
    Edit2,
    X,
    Copy,
    FileText,
    Ticket,
    ClipboardList,
    Save
} from 'lucide-react'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarEvent } from '@/types/calendar'
import { useTasks } from '@/hooks/useTasks'
import { useTickets } from '@/hooks/useTickets'

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

interface EventDetailsModalProps {
    open: boolean
    onClose: () => void
    event: CalendarEvent | null
    onUpdate: (id: string, updates: Partial<CalendarEvent>) => void
    onDelete: (id: string) => void
    onDuplicate?: (id: string) => void
    availableAttendees?: Attendee[]
    availableTags?: Tag[]
}

const defaultTags: Tag[] = [
    { id: 'design', name: 'Design', color: 'hsl(218, 100%, 52%)' },
    { id: 'personal', name: 'Pessoal', color: 'hsl(22, 94%, 48%)' },
    { id: 'developer', name: 'Dev', color: 'hsl(0, 0%, 15%)' },
    { id: 'meeting', name: 'Reunião', color: 'hsl(142, 76%, 36%)' },
]

export function EventDetailsModal({
    open,
    onClose,
    event,
    onUpdate,
    onDelete,
    onDuplicate,
    availableAttendees = [],
    availableTags = defaultTags,
}: EventDetailsModalProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editedEvent, setEditedEvent] = useState<Partial<CalendarEvent>>({})

    // Tasks & Tickets for linking
    const { tasks } = useTasks()
    const { tickets } = useTickets()

    // Estados para vinculação no modo edição
    const [linkType, setLinkType] = useState<'none' | 'task' | 'ticket'>('none')
    const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>()
    const [selectedTicketId, setSelectedTicketId] = useState<string | undefined>()

    useEffect(() => {
        if (event) {
            setEditedEvent({
                title: event.title,
                description: event.description,
                startTime: event.startTime,
                endTime: event.endTime,
                location: event.location,
                type: event.type,
                attendees: event.attendees,
                linkedTaskId: event.linkedTaskId,
                linkedTicketId: event.linkedTicketId,
            })
            // Inicializar linkType baseado no evento existente
            if (event.linkedTaskId) {
                setLinkType('task')
                setSelectedTaskId(event.linkedTaskId)
                setSelectedTicketId(undefined)
            } else if (event.linkedTicketId) {
                setLinkType('ticket')
                setSelectedTicketId(event.linkedTicketId)
                setSelectedTaskId(undefined)
            } else {
                setLinkType('none')
                setSelectedTaskId(undefined)
                setSelectedTicketId(undefined)
            }
            setIsEditing(false)
        }
    }, [event, open])

    if (!event) return null

    const handleSave = () => {
        if (event.id) {
            // Incluir linked items baseado no linkType
            const updatedEvent = {
                ...editedEvent,
                linkedTaskId: linkType === 'task' ? selectedTaskId : undefined,
                linkedTicketId: linkType === 'ticket' ? selectedTicketId : undefined,
            }
            onUpdate(event.id, updatedEvent)
            setIsEditing(false)
        }
    }

    const handleDelete = () => {
        if (event.id) {
            onDelete(event.id)
            onClose()
        }
    }

    const handleDuplicate = () => {
        if (event.id && onDuplicate) {
            onDuplicate(event.id)
            onClose()
        }
    }

    // Get color based on type
    const getTypeColor = (type?: string) => {
        switch (type) {
            case 'personal': return 'hsl(218, 100%, 52%)'
            case 'sector': return 'hsl(22, 94%, 48%)'
            case 'company': return 'hsl(142, 76%, 36%)'
            default: return 'hsl(218, 100%, 52%)'
        }
    }

    const eventColor = getTypeColor(event.type)

    return (
        <PremiumModal open={open} onClose={onClose} size="md" showCloseButton={false}>
            {!isEditing ? (
                // VIEW MODE
                <>
                    <PremiumModalHeader className="relative">
                        <div
                            className="absolute top-0 left-0 w-1.5 h-full rounded-l-2xl"
                            style={{ backgroundColor: eventColor }}
                        />
                        <div className="pl-4">
                            <div className="flex items-center justify-between">
                                <PremiumModalTitle>{event.title}</PremiumModalTitle>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setIsEditing(true)}
                                        className="h-8 w-8 text-zinc-400 hover:text-white"
                                        title="Editar evento"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    {onDuplicate && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={handleDuplicate}
                                            className="h-8 w-8 text-zinc-400 hover:text-blue-400"
                                            title="Duplicar evento"
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleDelete}
                                        className="h-8 w-8 text-zinc-400 hover:text-red-400"
                                        title="Excluir evento"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={onClose}
                                        className="h-8 w-8 text-zinc-400 hover:text-white"
                                        title="Fechar"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <div className="flex gap-2 mt-2">
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white border border-white/10">
                                    {event.type === 'personal' ? 'Pessoal' : event.type === 'sector' ? 'Setor' : 'Empresa'}
                                </span>
                                {event.location && (
                                    <span className="flex items-center gap-1 text-xs text-zinc-400">
                                        <MapPin className="h-3 w-3" /> {event.location}
                                    </span>
                                )}
                            </div>
                        </div>
                    </PremiumModalHeader>

                    <PremiumModalBody className="pl-8 space-y-6">
                        {/* Time */}
                        <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-lg bg-zinc-800/50 flex items-center justify-center shrink-0">
                                <Clock className="h-4 w-4 text-orange-400" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-white">
                                    {format(new Date(event.startTime), "EEEE, d 'de' MMMM", { locale: ptBR })}
                                </p>
                                <p className="text-sm text-zinc-400">
                                    {format(new Date(event.startTime), "HH:mm")} - {format(new Date(event.endTime), "HH:mm")}
                                </p>
                            </div>
                        </div>

                        {/* Description */}
                        {event.description && (
                            <div className="flex items-start gap-3">
                                <div className="h-8 w-8 rounded-lg bg-zinc-800/50 flex items-center justify-center shrink-0">
                                    <FileText className="h-4 w-4 text-zinc-400" />
                                </div>
                                <p className="text-sm text-zinc-300 leading-relaxed">
                                    {event.description}
                                </p>
                            </div>
                        )}

                        {/* Attendees */}
                        {event.attendees && event.attendees.length > 0 && (
                            <div className="flex items-start gap-3">
                                <div className="h-8 w-8 rounded-lg bg-zinc-800/50 flex items-center justify-center shrink-0">
                                    <Users className="h-4 w-4 text-zinc-400" />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {event.attendees.map(attendeeId => {
                                        const user = availableAttendees.find(u => u.id === attendeeId)
                                        if (!user) return null
                                        return (
                                            <div key={attendeeId} className="flex items-center gap-2 bg-zinc-800/50 rounded-full pr-3 pl-1 py-1">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage src={user.avatar} />
                                                    <AvatarFallback className="text-[10px]">{user.name[0]}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-xs text-zinc-300">{user.name}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Linked Items */}
                        {(event.linkedTaskId || event.linkedTicketId) && (
                            <div className="pt-4 border-t border-zinc-800">
                                <p className="text-xs font-semibold text-zinc-500 mb-2 uppercase tracking-wider">Vinculado a</p>
                                <div className="space-y-2">
                                    {event.linkedTaskId && (
                                        <div className="flex items-center gap-2 text-sm text-blue-300 bg-blue-500/10 px-3 py-2 rounded-lg border border-blue-500/20">
                                            <ClipboardList className="h-4 w-4" />
                                            <span>Tarefa vinculada</span>
                                            {/* We would fetch the task title here if we had full access easily, 
                                     but for now keep it generic or assume ID is mostly silent */}
                                        </div>
                                    )}
                                    {event.linkedTicketId && (
                                        <div className="flex items-center gap-2 text-sm text-purple-300 bg-purple-500/10 px-3 py-2 rounded-lg border border-purple-500/20">
                                            <Ticket className="h-4 w-4" />
                                            <span>Ticket vinculado</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </PremiumModalBody>

                    <PremiumModalFooter>
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="w-full rounded-full border-zinc-700 hover:bg-zinc-800"
                        >
                            Fechar
                        </Button>
                    </PremiumModalFooter>
                </>
            ) : (
                // EDIT MODE
                <>
                    <PremiumModalHeader>
                        <PremiumModalTitle>Editar Evento</PremiumModalTitle>
                    </PremiumModalHeader>
                    <PremiumModalBody className="space-y-4">
                        <div className="space-y-2">
                            <Label>Título</Label>
                            <Input
                                value={editedEvent.title}
                                onChange={e => setEditedEvent({ ...editedEvent, title: e.target.value })}
                                className="bg-zinc-800/50 border-zinc-700"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Início</Label>
                                <Input
                                    type="time"
                                    value={editedEvent.startTime ? format(new Date(editedEvent.startTime), 'HH:mm') : ''}
                                    onChange={e => {
                                        const [hours, minutes] = e.target.value.split(':').map(Number);
                                        const newDate = new Date(editedEvent.startTime || new Date());
                                        newDate.setHours(hours, minutes);
                                        setEditedEvent({ ...editedEvent, startTime: newDate });
                                    }}
                                    className="bg-zinc-800/50 border-zinc-700"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Fim</Label>
                                <Input
                                    type="time"
                                    value={editedEvent.endTime ? format(new Date(editedEvent.endTime), 'HH:mm') : ''}
                                    onChange={e => {
                                        const [hours, minutes] = e.target.value.split(':').map(Number);
                                        const newDate = new Date(editedEvent.endTime || new Date());
                                        newDate.setHours(hours, minutes);
                                        setEditedEvent({ ...editedEvent, endTime: newDate });
                                    }}
                                    className="bg-zinc-800/50 border-zinc-700"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Local</Label>
                            <Input
                                value={editedEvent.location || ''}
                                onChange={e => setEditedEvent({ ...editedEvent, location: e.target.value })}
                                placeholder="Adicionar local"
                                className="bg-zinc-800/50 border-zinc-700"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Descrição</Label>
                            <Textarea
                                value={editedEvent.description || ''}
                                onChange={e => setEditedEvent({ ...editedEvent, description: e.target.value })}
                                placeholder="Adicione detalhes..."
                                className="bg-zinc-800/50 border-zinc-700 min-h-[100px]"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Tipo</Label>
                            <Select
                                value={editedEvent.type}
                                onValueChange={(val: any) => setEditedEvent({ ...editedEvent, type: val })}
                            >
                                <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="personal">Pessoal</SelectItem>
                                    <SelectItem value="sector">Setor</SelectItem>
                                    <SelectItem value="company">Empresa</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Vinculação a Task/Ticket */}
                        <div className="space-y-2">
                            <Label>Vincular a (opcional)</Label>
                            <Tabs value={linkType} onValueChange={(v) => setLinkType(v as 'none' | 'task' | 'ticket')}>
                                <TabsList className="grid w-full grid-cols-3 bg-zinc-800 border-zinc-700">
                                    <TabsTrigger value="none">Nenhum</TabsTrigger>
                                    <TabsTrigger value="task">Tarefa</TabsTrigger>
                                    <TabsTrigger value="ticket">Ticket</TabsTrigger>
                                </TabsList>
                            </Tabs>

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
                        </div>
                    </PremiumModalBody>
                    <PremiumModalFooter className="flex justify-between">
                        <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancelar</Button>
                        <Button
                            onClick={handleSave}
                            className="bg-gradient-to-r from-[#fc7a67] to-[#ff0300] text-white hover:from-[#ff0300] hover:to-[#fc7a67]"
                        >
                            <Save className="h-4 w-4 mr-2" />
                            Salvar Alterações
                        </Button>
                    </PremiumModalFooter>
                </>
            )}
        </PremiumModal>
    )
}
