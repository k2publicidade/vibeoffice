'use client'

import { useAuth } from '@/hooks/useAuth'
import { CardSpotlight } from '@/components/ui/card-spotlight'
import { RadialGlowBackground } from '@/components/ui/radial-glow-background'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Mail, Briefcase, MapPin, Calendar, Edit3, ShieldCheck } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

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

export default function ProfilePage() {
    const { user } = useAuth()

    if (!user) return null

    const initials = user.name
        ?.split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()

    const stats = [
        { label: 'Projetos', value: '12', color: 'text-[#fc7a67]' },
        { label: 'Tarefas Concluídas', value: '148', color: 'text-green-400' },
        { label: 'Eficiência', value: '94%', color: 'text-blue-400' },
    ]

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-[90%] mx-auto py-8 space-y-8"
        >
            {/* Profile Header Card */}
            <motion.div variants={itemVariants}>
                <CardSpotlight className="relative overflow-hidden border-[#2a2a2a] bg-black/40 backdrop-blur-sm p-8 rounded-2xl">
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                        {/* Avatar Section */}
                        <div className="relative group">
                            <div className="absolute -inset-1 blur-xl bg-gradient-to-br from-[#fe6e5b] to-[#ff0300] opacity-20 group-hover:opacity-40 transition-opacity" />
                            <Avatar className="h-32 w-32 border-2 border-[#2a2a2a] ring-4 ring-black">
                                <AvatarImage src={user.avatar || ''} alt={user.name || ''} />
                                <AvatarFallback className="bg-gradient-to-br from-[#fe6e5b] to-[#ff0300] text-4xl font-bold text-white">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <Button size="icon" className="absolute bottom-0 right-0 rounded-full h-8 w-8 bg-[#fc7a67] hover:bg-[#ff0300] text-white border-2 border-black">
                                <Edit3 className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* User Info Section */}
                        <div className="flex-1 text-center md:text-left space-y-4">
                            <div>
                                <div className="flex flex-col md:flex-row md:items-center gap-3">
                                    <h1 className="text-3xl font-extrabold text-white tracking-tight">{user.name}</h1>
                                    <Badge className="w-fit mx-auto md:mx-0 bg-[#fc7a67]/10 text-[#fc7a67] border-[#fc7a67]/20">
                                        {user.role === 'Admin' ? 'Administrador' : user.sector || 'Colaborador'}
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
                                    <span>Product Designer</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="h-4 w-4" />
                                    <span>São Paulo, BR</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="h-4 w-4" />
                                    <span>Desde Março 2024</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-3 min-w-[200px]">
                            <Button className="w-full bg-[#fc7a67] hover:bg-[#ff0300] text-white rounded-xl shadow-lg shadow-[#fc7a67]/10 border-0">
                                Editar Perfil
                            </Button>
                            <Button variant="outline" className="w-full border-[#2a2a2a] bg-black hover:bg-[#1a1a1a] text-gray-300 rounded-xl">
                                Ver Atividades
                            </Button>
                        </div>
                    </div>
                </CardSpotlight>
            </motion.div>

            {/* Main Grid Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Stats & About */}
                <motion.div variants={itemVariants} className="lg:col-span-1 space-y-6">
                    {/* Stats Card */}
                    <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-2xl p-6 relative overflow-hidden">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-6">Visão Geral</h3>
                        <div className="grid grid-cols-1 gap-6">
                            {stats.map((stat, idx) => (
                                <div key={idx} className="flex items-center justify-between">
                                    <span className="text-gray-400 text-sm">{stat.label}</span>
                                    <span className={cn("text-xl font-bold font-mono", stat.color)}>{stat.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Badges/Achievements Card */}
                    <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-2xl p-6">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">Conquistas</h3>
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="border-yellow-500/20 text-yellow-500 bg-yellow-500/5 py-1 px-3">
                                🏆 Top Performer
                            </Badge>
                            <Badge variant="outline" className="border-blue-500/20 text-blue-500 bg-blue-500/5 py-1 px-3">
                                ⚡ Rapid Responder
                            </Badge>
                            <Badge variant="outline" className="border-purple-500/20 text-purple-500 bg-purple-500/5 py-1 px-3">
                                🎨 Creative Soul
                            </Badge>
                        </div>
                    </div>
                </motion.div>

                {/* Right Column: Experience/Projects */}
                <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
                    {/* Recent Activity */}
                    <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-2xl p-6 h-full">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Atividade Recente</h3>
                            <Button variant="ghost" className="text-[#fc7a67] text-xs hover:bg-[#fc7a67]/10 p-0 h-auto">Ver tudo</Button>
                        </div>

                        <div className="space-y-8 relative before:absolute before:inset-y-0 before:left-[11px] before:w-[2px] before:bg-[#2a2a2a]">
                            {[
                                { title: 'Concluiu a tarefa "Dashboard UI Kit"', time: 'Há 2 horas', icon: ShieldCheck, color: 'text-green-400' },
                                { title: 'Iniciou novo projeto "Sistema de Design v2"', time: 'Há 5 horas', icon: Briefcase, color: 'text-blue-400' },
                                { title: 'Agendou reunião de retrospectiva', time: 'Ontem às 14:00', icon: Calendar, color: 'text-[#fc7a67]' },
                            ].map((item, idx) => (
                                <div key={idx} className="relative pl-10">
                                    <div className={cn("absolute left-0 top-0 w-6 h-6 rounded-full bg-black border-2 border-[#2a2a2a] flex items-center justify-center z-10", item.color)}>
                                        <item.icon className="h-3 w-3" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white leading-none">{item.title}</p>
                                        <p className="text-xs text-gray-500 mt-2">{item.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    )
}
