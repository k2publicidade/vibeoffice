'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Course } from '@/types/courses'

interface CreateCourseModalProps {
    open: boolean
    onClose: () => void
    onCreate: (courseData: Partial<Course>) => Promise<void>
}

export function CreateCourseModal({ open, onClose, onCreate }: CreateCourseModalProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        difficulty: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
        instructor: '',
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.title) return

        setLoading(true)
        try {
            await onCreate(formData)
            onClose()
        } catch (error) {
            console.error('Error submitting form:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] bg-[#18181b] border-zinc-800 text-zinc-100">
                <DialogHeader>
                    <DialogTitle>Criar Novo Curso</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="title" className="text-zinc-400">Título do Curso</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Ex: Introdução ao Marketing Digital"
                            className="bg-zinc-800 border-zinc-700 text-white"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="instructor" className="text-zinc-400">Instrutor</Label>
                        <Input
                            id="instructor"
                            value={formData.instructor}
                            onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                            placeholder="Nome do instrutor"
                            className="bg-zinc-800 border-zinc-700 text-white"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="difficulty" className="text-zinc-400">Dificuldade</Label>
                        <Select
                            value={formData.difficulty}
                            onValueChange={(val: any) => setFormData({ ...formData, difficulty: val })}
                        >
                            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                <SelectValue placeholder="Selecione a dificuldade" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                                <SelectItem value="beginner">Iniciante</SelectItem>
                                <SelectItem value="intermediate">Intermediário</SelectItem>
                                <SelectItem value="advanced">Avançado</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-zinc-400">Descrição</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Breve descrição do curso..."
                            className="bg-zinc-800 border-zinc-700 text-white min-h-[100px]"
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="text-zinc-400 hover:text-white"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={loading || !formData.title}
                        >
                            {loading ? 'Criando...' : 'Criar Curso'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
