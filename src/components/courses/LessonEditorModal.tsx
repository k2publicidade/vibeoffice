'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Lesson, LessonType } from '@/types/courses'

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
            <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{lesson?.id ? 'Editar Aula' : 'Nova Aula'}</DialogTitle>
                    <DialogDescription>
                        {moduleName ? `Adicionando ao módulo: ${moduleName}` : 'Preencha os dados da aula.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Título da Aula</Label>
                        <Input
                            value={formData.title || ''}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className="bg-zinc-800 border-zinc-700 text-white"
                            placeholder="Ex: Introdução ao React"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Tipo</Label>
                            <Select
                                value={formData.type || 'video'}
                                onValueChange={v => setFormData({ ...formData, type: v as LessonType })}
                            >
                                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                                    <SelectItem value="video">Vídeo (YouTube)</SelectItem>
                                    <SelectItem value="html">HTML / Texto</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Duração (minutos)</Label>
                            <Input
                                type="number"
                                value={formData.duration || 0}
                                onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                                className="bg-zinc-800 border-zinc-700 text-white"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>{formData.type === 'video' ? 'URL do Vídeo (YouTube)' : 'Conteúdo HTML/Texto'}</Label>
                        {formData.type === 'video' ? (
                            <Input
                                value={formData.content_url || ''}
                                onChange={e => setFormData({ ...formData, content_url: e.target.value })}
                                placeholder="https://youtube.com/watch?v=..."
                                className="bg-zinc-800 border-zinc-700 text-white"
                            />
                        ) : (
                            <Textarea
                                value={formData.content || ''}
                                onChange={e => setFormData({ ...formData, content: e.target.value })}
                                placeholder="<p>Conteúdo da aula...</p>"
                                className="bg-zinc-800 border-zinc-700 h-32 font-mono text-xs text-white"
                            />
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} className="border-white/10 hover:bg-white/5 text-zinc-400">Cancelar</Button>
                    <Button onClick={handleSubmit} className="bg-white text-black hover:bg-zinc-200" disabled={loading}>
                        {loading ? 'Salvando...' : 'Salvar Aula'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
