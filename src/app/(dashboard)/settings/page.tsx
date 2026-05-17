'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CardSpotlight } from '@/components/ui/card-spotlight'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { User, Shield, Bell, Palette, Globe, Save, Lock } from 'lucide-react'
import { RadialGlowBackground } from '@/components/ui/radial-glow-background'
import { motion } from 'framer-motion'

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
    hidden: { opacity: 0, x: -20 },
    visible: {
        opacity: 1,
        x: 0,
        transition: {
            duration: 0.4,
        },
    },
}

const contentVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.4,
        },
    },
}

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('general')
    const router = useRouter()

    const tabItems = [
        { id: 'general', label: 'Geral', icon: User },
        { id: 'security', label: 'Segurança', icon: Shield },
        { id: 'notifications', label: 'Notificações', icon: Bell },
        { id: 'appearance', label: 'Aparência', icon: Palette },
    ]

    const handleTabChange = (value: string) => {
        if (value === 'notifications') {
            router.push('/settings/notifications')
        } else {
            setActiveTab(value)
        }
    }

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8"
        >
            {/* Header */}
            <motion.div variants={contentVariants} className="mb-10">
                <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-[#fc7a67] to-[#ef5907] bg-clip-text text-transparent">
                    Configurações
                </h1>
                <p className="text-gray-400 mt-1 text-sm">
                    Gerencie suas preferências de conta e do sistema
                </p>
            </motion.div>

            <Tabs defaultValue="general" className="space-y-8" value={activeTab} onValueChange={handleTabChange}>
                {/* Navigation Sidebar-style Tabs */}
                <div className="flex flex-col lg:flex-row gap-8">
                    <motion.aside variants={itemVariants} className="w-full lg:w-64 space-y-2">
                        <TabsList className="flex flex-col h-auto bg-transparent border-0 gap-2 p-0 w-full items-stretch">
                            {tabItems.map((item) => (
                                <TabsTrigger
                                    key={item.id}
                                    value={item.id}
                                    className="flex items-center justify-start gap-3 px-4 py-3 rounded-xl border border-transparent data-[state=active]:bg-[#1a1a1a] data-[state=active]:border-[#2a2a2a] data-[state=active]:text-[#fc7a67] text-gray-400 transition-all hover:bg-white/5"
                                >
                                    <item.icon className="h-4 w-4" />
                                    <span className="text-sm font-medium">{item.label}</span>
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </motion.aside>

                    {/* Content Area */}
                    <motion.div variants={contentVariants} className="flex-1">
                        <CardSpotlight className="bg-black/40 border-[#2a2a2a] backdrop-blur-sm rounded-2xl p-8 relative overflow-hidden min-h-[500px]">
                            <RadialGlowBackground
                                glowColor="rgba(252, 122, 103, 0.05)"
                                glowSize="500px"
                                glowTop="-100px"
                            />

                            <div className="relative z-10">
                                {/* General Settings */}
                                <TabsContent value="general" className="m-0 space-y-8">
                                    <div className="space-y-6">
                                        <h3 className="text-xl font-bold text-white border-b border-[#2a2a2a] pb-4">Informações da Conta</h3>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="name" className="text-gray-400">Nome Completo</Label>
                                                <Input id="name" defaultValue="Usuário Premium" className="bg-[#0a0a0a] border-[#2a2a2a] text-white focus:border-[#fc7a67]/50 h-11" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="email" className="text-gray-400">E-mail</Label>
                                                <Input id="email" defaultValue="contato@vibeoffice.com" className="bg-[#0a0a0a] border-[#2a2a2a] text-white focus:border-[#fc7a67]/50 h-11" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="phone" className="text-gray-400">Telefone</Label>
                                                <Input id="phone" placeholder="+55 (11) 99999-9999" className="bg-[#0a0a0a] border-[#2a2a2a] text-white focus:border-[#fc7a67]/50 h-11" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="lang" className="text-gray-400">Idioma</Label>
                                                <div className="relative">
                                                    <Input id="lang" defaultValue="Português (BR)" className="bg-[#0a0a0a] border-[#2a2a2a] text-white focus:border-[#fc7a67]/50 h-11 pl-10" />
                                                    <Globe className="absolute left-3 top-3.5 h-4 w-4 text-gray-500" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-8 flex justify-end">
                                        <Button className="bg-[#fc7a67] hover:bg-[#ff0300] text-white px-8 rounded-xl h-11 shadow-lg shadow-[#fc7a67]/10 border-0 gap-2">
                                            <Save className="h-4 w-4" />
                                            Salvar Alterações
                                        </Button>
                                    </div>
                                </TabsContent>

                                {/* Security Settings */}
                                <TabsContent value="security" className="m-0 space-y-8">
                                    <div className="space-y-6">
                                        <h3 className="text-xl font-bold text-white border-b border-[#2a2a2a] pb-4">Privacidade e Segurança</h3>

                                        <div className="space-y-6 max-w-md">
                                            <div className="rounded-xl border border-[#2a2a2a] bg-[#0a0a0a] p-4 flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-bold text-white">Autenticação de Dois Fatores</p>
                                                    <p className="text-xs text-gray-500">Adicione uma camada extra de segurança.</p>
                                                </div>
                                                <Switch />
                                            </div>

                                            <div className="space-y-4 pt-4">
                                                <Label className="text-sm font-bold text-white">Alterar Senha</Label>
                                                <div className="space-y-3">
                                                    <Input type="password" placeholder="Senha atual" className="bg-[#0a0a0a] border-[#2a2a2a] text-white h-11" />
                                                    <Input type="password" placeholder="Nova senha" className="bg-[#0a0a0a] border-[#2a2a2a] text-white h-11" />
                                                </div>
                                                <Button className="bg-zinc-800 hover:bg-zinc-700 text-white gap-2 w-full h-11 rounded-xl">
                                                    <Lock className="h-4 w-4" />
                                                    Atualizar Senha
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>


                                {/* Appearance */}
                                <TabsContent value="appearance" className="m-0 space-y-8">
                                    <div className="space-y-6">
                                        <h3 className="text-xl font-bold text-white border-b border-[#2a2a2a] pb-4">Personalização Visual</h3>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-4">
                                                <Label className="text-gray-400">Modo do Sistema</Label>
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#0a0a0a] border border-[#2a2a2a]">
                                                        <span className="text-sm text-white font-medium">Sempre Escuro (Dark)</span>
                                                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                                                    </div>
                                                    <p className="text-[10px] text-gray-500 italic">VIBEDISTRO usa tema escuro permanente. Personalização de cores em breve.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>
                            </div>
                        </CardSpotlight>
                    </motion.div>
                </div>
            </Tabs>
        </motion.div>
    )
}
