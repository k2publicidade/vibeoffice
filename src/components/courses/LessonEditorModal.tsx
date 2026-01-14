'use client'

import { useEffect, useState, useRef } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Lesson, LessonType } from '@/types/courses'
import { Video, FileCode, Clock, Upload, FileText } from 'lucide-react'
import { toast } from 'sonner'

interface LessonEditorModalProps {
    open: boolean
    onClose: () => void
    moduleName?: string
    lesson?: Partial<Lesson> | null
    onSave: (lessonData: Partial<Lesson>) => Promise<void>
}

export function LessonEditorModal({ open, onClose, moduleName, lesson, onSave }: LessonEditorModalProps) {
    const [formData, setFormData] = useState<Partial<Lesson>>({
        title: '',
        type: 'video',
        content_url: '',
        content: '',
        duration: 10,
        order: 0
    })
    const [loading, setLoading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (lesson) {
            setFormData(lesson)
        } else {
            setFormData({
                title: '',
                type: 'video',
                content_url: '',
                content: '',
                duration: 10,
                order: 0
            })
        }
    }, [lesson, open])

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        if (file.type !== 'text/html' && !file.name.endsWith('.html')) {
            toast.error('Por favor, selecione um arquivo HTML válido.')
            return
        }

        const reader = new FileReader()
        reader.onload = (e) => {
            const text = e.target?.result as string
            setFormData(prev => ({ ...prev, content: text }))
            toast.success('Conteúdo do arquivo carregado!')
        }
        reader.readAsText(file)
    }

    const handleSubmit = async () => {
        if (!formData.title) return
        setLoading(true)
        try {
            await onSave(formData)
            onClose()
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="bg-zinc-950 border border-white/10 text-white sm:max-w-4xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="px-6 py-4 border-b border-white/5 shrink-0">
                    <DialogTitle className="text-xl flex items-center gap-2">
                        {lesson?.id ? 'Editar Aula' : 'Nova Aula'}
                        {moduleName && <span className="text-xs font-normal text-zinc-500 bg-zinc-900 px-2 py-1 rounded-full border border-white/5"> em {moduleName}</span>}
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400 hidden sm:block">
                        Preencha os detalhes do conteúdo da aula abaixo.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Título da Aula</Label>
                            <Input
                                value={formData.title || ''}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="bg-zinc-900 border-zinc-800 focus:border-red-500/50 text-white text-lg py-5"
                                placeholder="Ex: Introdução ao React"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Tipo</Label>
                                <Select
                                    value={formData.type || 'video'}
                                    onValueChange={v => setFormData({ ...formData, type: v as LessonType })}
                                >
                                    <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white py-5">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                        <SelectItem value="video">
                                            <div className="flex items-center gap-2">
                                                <Video size={14} className="text-blue-500" /> Vídeo
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="html">
                                            <div className="flex items-center gap-2">
                                                <FileCode size={14} className="text-orange-500" /> HTML / Texto
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Duração (min)</Label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                                    <Input
                                        type="number"
                                        value={formData.duration || 0}
                                        onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                                        className="bg-zinc-900 border-zinc-800 text-white pl-10 py-5"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="space-y-4 pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                                {formData.type === 'video' ? 'URL do Conteúdo' : 'Conteúdo da Aula'}
                            </Label>

                            {formData.type === 'html' && (
                                <>
                                    <input
                                        type="file"
                                        accept=".html,text/html"
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 gap-2 border-dashed border-zinc-700 bg-transparent text-zinc-400 hover:text-white hover:bg-zinc-900"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Upload size={14} /> Importar Arquivo HTML
                                    </Button>
                                </>
                            )}
                        </div>

                        {formData.type === 'video' ? (
                            <div className="relative group">
                                <Video className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-red-500 transition-colors" size={20} />
                                <Input
                                    value={formData.content_url || ''}
                                    onChange={e => setFormData({ ...formData, content_url: e.target.value })}
                                    placeholder="https://youtube.com/watch?v=..."
                                    className="bg-zinc-900 border-zinc-800 text-white pl-12 py-6 text-base font-mono focus:border-red-500/50 focus:ring-red-500/20"
                                />
                            </div>
                        ) : (
                            <div className="relative">
                                <Textarea
                                    value={formData.content || ''}
                                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                                    placeholder="<p>Escreva ou cole seu conteúdo HTML aqui...</p>"
                                    className="bg-zinc-900 border-zinc-800 min-h-[300px] font-mono text-sm text-zinc-300 focus:border-orange-500/50 focus:ring-orange-500/20 p-4 leading-relaxed"
                                />
                                <div className="absolute bottom-4 right-4 text-xs text-zinc-600 pointer-events-none bg-black/50 px-2 py-1 rounded">
                                    HTML Mode
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="px-6 py-4 border-t border-white/5 bg-zinc-950 shrink-0">
                    <Button variant="ghost" onClick={onClose} className="text-zinc-500 hover:text-white hover:bg-white/5 mr-2">Cancelar</Button>
                    <Button onClick={handleSubmit} className="bg-red-600 hover:bg-red-700 text-white min-w-[120px]" disabled={loading}>
                        {loading ? 'Salvando...' : 'Salvar Aula'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
