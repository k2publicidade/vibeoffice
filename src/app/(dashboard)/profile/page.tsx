'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useTasks } from '@/hooks/useTasks'
import { useCalendar } from '@/hooks/useCalendar'
import type { Sector } from '@/types/auth'
import { CardSpotlight } from '@/components/ui/card-spotlight'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Mail, Briefcase, Calendar, Edit3, ShieldCheck } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const sectors: Sector[] = [
    'A&R',
    'Marketing',
    'Financeiro',
    'Jurídico',
    'Administrativo',
    'TI/Suporte',
    'Atendimento ao Artista',
]

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
}

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.5,
        },
    },
}

function formatDate(date: Date) {
    return new Intl.DateTimeFormat('pt-BR', {
        month: 'long',
        year: 'numeric',
    }).format(date)
}

function formatRelativeDate(date: Date) {
    const diffMs = Date.now() - date.getTime()
    const diffMinutes = Math.max(0, Math.floor(diffMs / 60000))

    if (diffMinutes < 1) return 'Agora'
    if (diffMinutes < 60) return `Há ${diffMinutes} min`

    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `Há ${diffHours} h`

    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return 'Ontem'
    if (diffDays < 30) return `Há ${diffDays} dias`

    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date)
}

export default function ProfilePage() {
    const { user, isLoading, updateProfile } = useAuth()
    const { tasks, stats: taskStats, isLoading: tasksLoading } = useTasks()
    const { events, isLoading: eventsLoading } = useCalendar()
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [form, setForm] = useState({ name: '', sector: 'Administrativo' as Sector, avatar: '' })

    useEffect(() => {
        if (!user) return

        setForm({
            name: user.name,
            sector: user.sector,
            avatar: user.avatar || '',
        })
    }, [user])

    const recentActivity = useMemo(() => {
        const taskActivities = tasks.map((task) => ({
            id: `task-${task.id}`,
            title: task.status === 'done'
                ? `Concluiu a tarefa "${task.title}"`
                : `Atualizou a tarefa "${task.title}"`,
            time: formatRelativeDate(task.updatedAt),
            sortDate: task.updatedAt,
            icon: ShieldCheck,
            color: task.status === 'done' ? 'text-green-400' : 'text-blue-400',
        }))

        const eventActivities = events
            .filter((event) => user && (event.createdBy === user.id || event.attendees?.includes(user.id)))
            .map((event) => ({
                id: `event-${event.id}`,
                title: `Agendou "${event.title}"`,
                time: formatRelativeDate(event.createdAt),
                sortDate: event.createdAt,
                icon: Calendar,
                color: 'text-[#fc7a67]',
            }))

        return [...taskActivities, ...eventActivities]
            .sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime())
            .slice(0, 5)
    }, [events, tasks, user])

    if (!user && !isLoading) return null
    if (!user) return null

    const initials = user.name
        ?.split(' ')
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()

    const efficiency = taskStats.total > 0
        ? Math.round((taskStats.completed / taskStats.total) * 100)
        : null

    const stats = [
        { label: 'Tarefas do banco', value: String(taskStats.total), color: 'text-[#fc7a67]' },
        { label: 'Tarefas concluídas', value: String(taskStats.completed), color: 'text-green-400' },
        { label: 'Eficiência', value: efficiency === null ? '—' : `${efficiency}%`, color: 'text-blue-400' },
    ]

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setIsSaving(true)

        try {
            await updateProfile({
                name: form.name,
                sector: form.sector,
                avatar: form.avatar,
            })
            toast.success('Perfil atualizado com dados salvos no banco')
            setIsEditOpen(false)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao atualizar perfil')
        } finally {
            setIsSaving(false)
        }
    }

    const activityIsLoading = tasksLoading || eventsLoading

    return (
        <>
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-8"
            >
                <motion.div variants={itemVariants}>
                    <CardSpotlight className="relative overflow-hidden border-[#2a2a2a] bg-black/40 backdrop-blur-sm p-8 rounded-2xl">
                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                            <div className="relative group">
                                <div className="absolute -inset-1 blur-xl bg-gradient-to-br from-[#fe6e5b] to-[#ff0300] opacity-20 group-hover:opacity-40 transition-opacity" />
                                <Avatar className="h-32 w-32 border-2 border-[#2a2a2a] ring-4 ring-black">
                                    <AvatarImage src={user.avatar || ''} alt={user.name || ''} />
                                    <AvatarFallback className="bg-gradient-to-br from-[#fe6e5b] to-[#ff0300] text-4xl font-bold text-white">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                                <Button
                                    type="button"
                                    size="icon"
                                    onClick={() => setIsEditOpen(true)}
                                    aria-label="Editar foto do perfil"
                                    className="absolute bottom-0 right-0 rounded-full h-8 w-8 bg-[#fc7a67] hover:bg-[#ff0300] text-white border-2 border-black"
                                >
                                    <Edit3 className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="flex-1 text-center md:text-left space-y-4">
                                <div>
                                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                                        <h1 className="text-3xl font-extrabold text-white tracking-tight">{user.name}</h1>
                                        <Badge className="w-fit mx-auto md:mx-0 bg-[#fc7a67]/10 text-[#fc7a67] border-[#fc7a67]/20">
                                            {user.role === 'Admin' ? 'Administrador' : user.role}
                                        </Badge>
                                    </div>
                                    <p className="text-gray-400 mt-1 flex items-center justify-center md:justify-start gap-2">
                                        <Mail className="h-3.5 w-3.5" />
                                        {user.email}
                                    </p>
                                </div>

                                <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-gray-500">
                                    <div className="flex items-center gap-1.5">
                                        <Briefcase className="h-4 w-4" />
                                        <span>{user.sector}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="h-4 w-4" />
                                        <span>Desde {formatDate(user.createdAt)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 min-w-[200px]">
                                <Button
                                    type="button"
                                    onClick={() => setIsEditOpen(true)}
                                    className="w-full bg-[#fc7a67] hover:bg-[#ff0300] text-white rounded-xl shadow-lg shadow-[#fc7a67]/10 border-0"
                                >
                                    Editar Perfil
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => document.getElementById('profile-activity')?.scrollIntoView({ behavior: 'smooth' })}
                                    className="w-full border-[#2a2a2a] bg-black hover:bg-[#1a1a1a] text-gray-300 rounded-xl"
                                >
                                    Ver Atividades
                                </Button>
                            </div>
                        </div>
                    </CardSpotlight>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <motion.div variants={itemVariants} className="lg:col-span-1 space-y-6">
                        <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-2xl p-6 relative overflow-hidden">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-6">Visão Geral</h3>
                            <div className="grid grid-cols-1 gap-6">
                                {stats.map((stat) => (
                                    <div key={stat.label} className="flex items-center justify-between">
                                        <span className="text-gray-400 text-sm">{stat.label}</span>
                                        <span className={cn('text-xl font-bold font-mono', stat.color)}>{stat.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-2xl p-6">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">Dados do Perfil</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-gray-500">Função</span>
                                    <span className="text-gray-200">{user.role}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-gray-500">Setor</span>
                                    <span className="text-gray-200 text-right">{user.sector}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-gray-500">Atualizado</span>
                                    <span className="text-gray-200">{formatRelativeDate(user.updatedAt)}</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
                        <div id="profile-activity" className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-2xl p-6 h-full scroll-mt-24">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Atividade Recente</h3>
                            </div>

                            {activityIsLoading ? (
                                <p className="text-sm text-gray-500">Carregando atividades do banco...</p>
                            ) : recentActivity.length === 0 ? (
                                <p className="text-sm text-gray-500">Nenhuma atividade encontrada no banco de dados.</p>
                            ) : (
                                <div className="space-y-8 relative before:absolute before:inset-y-0 before:left-[11px] before:w-[2px] before:bg-[#2a2a2a]">
                                    {recentActivity.map((item) => (
                                        <div key={item.id} className="relative pl-10">
                                            <div className={cn('absolute left-0 top-0 w-6 h-6 rounded-full bg-black border-2 border-[#2a2a2a] flex items-center justify-center z-10', item.color)}>
                                                <item.icon className="h-3 w-3" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-white leading-none">{item.title}</p>
                                                <p className="text-xs text-gray-500 mt-2">{item.time}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </motion.div>

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="bg-[#0a0a0a] border-[#2a2a2a] text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Editar perfil</DialogTitle>
                        <DialogDescription className="text-gray-500">
                            As alterações são gravadas diretamente na tabela de usuários do banco.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="profile-name">Nome</Label>
                            <Input
                                id="profile-name"
                                value={form.name}
                                onChange={(event) => setForm(prev => ({ ...prev, name: event.target.value }))}
                                className="bg-black border-[#2a2a2a] text-white"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="profile-sector">Setor</Label>
                            <Select
                                value={form.sector}
                                disabled={user.role !== 'Admin'}
                                onValueChange={(value) => setForm(prev => ({ ...prev, sector: value as Sector }))}
                            >
                                <SelectTrigger id="profile-sector" className="w-full bg-black border-[#2a2a2a] text-white">
                                    <SelectValue placeholder="Selecione o setor" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#0a0a0a] border-[#2a2a2a] text-white">
                                    {sectors.map((sector) => (
                                        <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="profile-avatar">URL do avatar</Label>
                            <Input
                                id="profile-avatar"
                                value={form.avatar}
                                onChange={(event) => setForm(prev => ({ ...prev, avatar: event.target.value }))}
                                placeholder="https://..."
                                className="bg-black border-[#2a2a2a] text-white"
                            />
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsEditOpen(false)}
                                disabled={isSaving}
                                className="border-[#2a2a2a] bg-black hover:bg-[#1a1a1a] text-gray-300"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSaving}
                                className="bg-[#fc7a67] hover:bg-[#ff0300] text-white"
                            >
                                {isSaving ? 'Salvando...' : 'Salvar'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    )
}
