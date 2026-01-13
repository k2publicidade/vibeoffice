'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useCourses } from '@/hooks/useCourses'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ArrowLeft, Plus, Save, GripVertical, Trash2, Video, FileText, Check } from 'lucide-react'
import { toast } from 'sonner'
import type { Lesson, LessonType } from '@/types/courses'

export default function CourseEditorPage() {
    const { id } = useParams() as { id: string }
    const router = useRouter()
    const { courses, getCourseById, updateCourse, createModule, deleteModule, createLesson, updateLesson, deleteLesson } = useCourses()
    const { user } = useAuth()

    // Data State
    const course = getCourseById(id)
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        instructor: '',
        thumbnail: '',
        difficulty: 'beginner',
        duration: 0
    })

    // Lesson Edit State
    const [editingLesson, setEditingLesson] = useState<Partial<Lesson> | null>(null)
    const [isLessonModalOpen, setIsLessonModalOpen] = useState(false)
    const [activeModuleId, setActiveModuleId] = useState<string | null>(null)

    // Load Initial Data
    useEffect(() => {
        if (course) {
            setFormData({
                title: course.title,
                description: course.description,
                instructor: course.instructor || '',
                thumbnail: course.thumbnail || '',
                difficulty: course.difficulty,
                duration: course.duration || 0
            })
        }
    }, [course])

    if (!course) return <div className="p-8 text-white">Carregando...</div>

    const handleSaveMetadata = async () => {
        try {
            await updateCourse(id, formData as any) // Casting as any to match partial
            toast.success("Curso atualizado com sucesso!")
        } catch (error) {
            toast.error("Erro ao atualizar curso.")
        }
    }

    const handleAddModule = async () => {
        const title = prompt("Nome do Módulo:")
        if (!title) return

        try {
            // Auto-calculate order based on existing modules
            const order = (course.modules?.length || 0)
            await createModule(id, title, order)
            toast.success("Módulo criado!")
        } catch (error) {
            toast.error("Erro ao criar módulo.")
        }
    }

    const handleDeleteModule = async (moduleId: string) => {
        if (confirm("Excluir módulo e todas as aulas?")) {
            await deleteModule(moduleId)
            toast.success("Módulo excluído.")
        }
    }

    const openLessonModal = (moduleId: string, lesson?: Lesson) => {
        setActiveModuleId(moduleId)
        if (lesson) {
            setEditingLesson({ ...lesson })
        } else {
            setEditingLesson({
                title: '',
                type: 'video',
                content_url: '',
                content: '',
                duration: 10,
                order: 0 // Will need to calculate
            })
        }
        setIsLessonModalOpen(true)
    }

    const handleSaveLesson = async () => {
        if (!editingLesson || !activeModuleId) return

        try {
            if (editingLesson.id) {
                // Update
                await updateLesson(editingLesson.id, editingLesson)
                toast.success("Aula atualizada!")
            } else {
                // Create
                // Calculate order
                const moduleLessons = course.modules?.find(m => m.id === activeModuleId)?.lessons || []
                const order = moduleLessons.length

                await createLesson({
                    ...editingLesson,
                    course_id: id,
                    module_id: activeModuleId,
                    order
                })
                toast.success("Aula criada!")
            }
            setIsLessonModalOpen(false)
        } catch (error) {
            toast.error("Erro ao salvar aula.")
        }
    }

    const handleDeleteLesson = async (lessonId: string) => {
        if (confirm("Excluir aula?")) {
            await deleteLesson(lessonId)
            toast.success("Aula excluída.")
        }
    }

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-8">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/courses/manage')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Editor de Curso</h1>
                        <p className="text-zinc-500 text-sm">{course.title}</p>
                    </div>
                </div>

                <Tabs defaultValue="content" className="space-y-6">
                    <TabsList className="bg-zinc-900 border border-white/5">
                        <TabsTrigger value="info">Informações Básicas</TabsTrigger>
                        <TabsTrigger value="content">Conteúdo (Aulas)</TabsTrigger>
                    </TabsList>

                    {/* Metadata Tab */}
                    <TabsContent value="info">
                        <Card className="bg-zinc-900/50 border-white/5">
                            <CardHeader>
                                <CardTitle className="text-white">Detalhes do Curso</CardTitle>
                                <CardDescription>Informações visíveis no catálogo.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-zinc-400">Título</Label>
                                        <Input
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            className="bg-zinc-800 border-zinc-700"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-zinc-400">Instrutor</Label>
                                        <Input
                                            value={formData.instructor}
                                            onChange={e => setFormData({ ...formData, instructor: e.target.value })}
                                            className="bg-zinc-800 border-zinc-700"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-zinc-400">Descrição</Label>
                                    <Textarea
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="bg-zinc-800 border-zinc-700 h-24"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-zinc-400">URL da Thumbnail</Label>
                                        <Input
                                            value={formData.thumbnail}
                                            onChange={e => setFormData({ ...formData, thumbnail: e.target.value })}
                                            placeholder="https://..."
                                            className="bg-zinc-800 border-zinc-700"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-zinc-400">Dificuldade</Label>
                                        <Select
                                            value={formData.difficulty}
                                            onValueChange={v => setFormData({ ...formData, difficulty: v })}
                                        >
                                            <SelectTrigger className="bg-zinc-800 border-zinc-700">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-zinc-800 border-zinc-700">
                                                <SelectItem value="beginner">Iniciante</SelectItem>
                                                <SelectItem value="intermediate">Intermediário</SelectItem>
                                                <SelectItem value="advanced">Avançado</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <Button onClick={handleSaveMetadata} className="bg-white text-black hover:bg-zinc-200 w-full md:w-auto">
                                    <Save className="mr-2 h-4 w-4" /> Salvar Alterações
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Content Tab */}
                    <TabsContent value="content" className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-semibold text-white">Módulos e Aulas</h3>
                            <Button onClick={handleAddModule} variant="outline" className="border-dashed border-white/20 hover:bg-white/5">
                                <Plus className="mr-2 h-4 w-4" /> Novo Módulo
                            </Button>
                        </div>

                        <div className="space-y-4">
                            {course.modules?.map((module, i) => (
                                <Accordion type="single" collapsible key={module.id} className="bg-zinc-900/30 border border-white/5 rounded-lg">
                                    <AccordionItem value={module.id} className="border-none">
                                        <div className="flex items-center px-4 py-2">
                                            <div className="mr-4 text-zinc-500 cursor-grab"><GripVertical size={16} /></div>
                                            <AccordionTrigger className="hover:no-underline flex-1 text-white font-medium">
                                                {module.title}
                                                <span className="ml-2 text-xs text-zinc-500 font-normal">({module.lessons.length} aulas)</span>
                                            </AccordionTrigger>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={(e) => { e.stopPropagation(); openLessonModal(module.id) }}
                                                    className="text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 h-8"
                                                >
                                                    <Plus size={14} className="mr-1" /> Aula
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteModule(module.id) }}
                                                    className="text-red-500 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0"
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        </div>
                                        <AccordionContent className="px-4 pb-4 pt-0 border-t border-white/5">
                                            <div className="mt-2 space-y-2">
                                                {module.lessons.length === 0 && <p className="text-zinc-600 italic text-sm py-2 text-center border border-dashed border-zinc-800 rounded">Nenhuma aula neste módulo.</p>}
                                                {module.lessons.map(lesson => (
                                                    <div key={lesson.id} className="flex items-center justify-between p-3 bg-black/40 rounded border border-white/5 group hover:border-white/10 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            {lesson.type === 'video' ? <Video size={16} className="text-blue-500" /> : <FileText size={16} className="text-orange-500" />}
                                                            <span className="text-sm text-zinc-300 font-medium">{lesson.title}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
                                                                onClick={() => openLessonModal(module.id, lesson)}
                                                            >
                                                                <Edit2 className="h-3 w-3" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-7 w-7 p-0 text-zinc-400 hover:text-red-500"
                                                                onClick={() => handleDeleteLesson(lesson.id)}
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Edit Lesson Modal */}
                <Dialog open={isLessonModalOpen} onOpenChange={setIsLessonModalOpen}>
                    <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>{editingLesson?.id ? 'Editar Aula' : 'Nova Aula'}</DialogTitle>
                            <DialogDescription>Preencha os dados da aula.</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Título da Aula</Label>
                                <Input
                                    value={editingLesson?.title || ''}
                                    onChange={e => setEditingLesson(prev => prev ? { ...prev, title: e.target.value } : null)}
                                    className="bg-zinc-800 border-zinc-700"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Tipo</Label>
                                    <Select
                                        value={editingLesson?.type || 'video'}
                                        onValueChange={v => setEditingLesson(prev => prev ? { ...prev, type: v as LessonType } : null)}
                                    >
                                        <SelectTrigger className="bg-zinc-800 border-zinc-700">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-800 border-zinc-700">
                                            <SelectItem value="video">Vídeo (YouTube)</SelectItem>
                                            <SelectItem value="html">HTML / Texto</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Duração (minutos)</Label>
                                    <Input
                                        type="number"
                                        value={editingLesson?.duration || 0}
                                        onChange={e => setEditingLesson(prev => prev ? { ...prev, duration: parseInt(e.target.value) } : null)}
                                        className="bg-zinc-800 border-zinc-700"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>{editingLesson?.type === 'video' ? 'URL do Vídeo (YouTube)' : 'Conteúdo HTML/Texto'}</Label>
                                {editingLesson?.type === 'video' ? (
                                    <Input
                                        value={editingLesson?.content_url || ''}
                                        onChange={e => setEditingLesson(prev => prev ? { ...prev, content_url: e.target.value } : null)}
                                        placeholder="https://youtube.com/watch?v=..."
                                        className="bg-zinc-800 border-zinc-700"
                                    />
                                ) : (
                                    <Textarea
                                        value={editingLesson?.content || ''}
                                        onChange={e => setEditingLesson(prev => prev ? { ...prev, content: e.target.value } : null)}
                                        placeholder="<p>Conteúdo da aula...</p>"
                                        className="bg-zinc-800 border-zinc-700 h-32 font-mono text-xs"
                                    />
                                )}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsLessonModalOpen(false)} className="border-white/10 hover:bg-white/5">Cancelar</Button>
                            <Button onClick={handleSaveLesson} className="bg-white text-black hover:bg-zinc-200">Salvar Aula</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </div>
        </div>
    )
}
