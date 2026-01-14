'use client'

import { useState, useEffect } from 'react'
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
import { ArrowLeft, Plus, Save } from 'lucide-react'
import { toast } from 'sonner'
import type { Lesson } from '@/types/courses'
import { ModuleList } from '@/components/courses/ModuleList'
import { LessonEditorModal } from '@/components/courses/LessonEditorModal'
import { CreateModuleModal } from '@/components/courses/CreateModuleModal'

export default function CourseEditorPage() {
    const { id } = useParams() as { id: string }
    const router = useRouter()
    const { getCourseById, updateCourse, createModule, deleteModule, createLesson, updateLesson, deleteLesson } = useCourses()
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
    const [isModuleModalOpen, setIsModuleModalOpen] = useState(false) // New state for Module Modal
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
            await updateCourse(id, formData as any)
            toast.success("Curso atualizado com sucesso!")
        } catch (error) {
            toast.error("Erro ao atualizar curso.")
        }
    }

    const handleCreateModule = async (title: string) => {
        try {
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
            setEditingLesson(null) // Reset to defaults in modal
        }
        setIsLessonModalOpen(true)
    }

    const handleSaveLesson = async (lessonData: Partial<Lesson>) => {
        if (!activeModuleId) return

        try {
            if (lessonData.id) {
                // Update
                await updateLesson(lessonData.id, lessonData)
                toast.success("Aula atualizada!")
            } else {
                // Create
                const moduleLessons = course.modules?.find(m => m.id === activeModuleId)?.lessons || []
                const order = moduleLessons.length

                await createLesson({
                    ...lessonData,
                    course_id: id,
                    module_id: activeModuleId,
                    order
                })
                toast.success("Aula criada!")
            }
        } catch (error) {
            toast.error("Erro ao salvar aula.")
            throw error // Let modal handle error state if needed
        }
    }

    const handleDeleteLesson = async (lessonId: string) => {
        if (confirm("Excluir aula?")) {
            await deleteLesson(lessonId)
            toast.success("Aula excluída.")
        }
    }

    const activeModuleName = course.modules?.find(m => m.id === activeModuleId)?.title

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
                                            className="bg-zinc-800 border-zinc-700 text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-zinc-400">Instrutor</Label>
                                        <Input
                                            value={formData.instructor}
                                            onChange={e => setFormData({ ...formData, instructor: e.target.value })}
                                            className="bg-zinc-800 border-zinc-700 text-white"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-zinc-400">Descrição</Label>
                                    <Textarea
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="bg-zinc-800 border-zinc-700 h-24 text-white"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-zinc-400">URL da Thumbnail</Label>
                                        <Input
                                            value={formData.thumbnail}
                                            onChange={e => setFormData({ ...formData, thumbnail: e.target.value })}
                                            placeholder="https://..."
                                            className="bg-zinc-800 border-zinc-700 text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-zinc-400">Dificuldade</Label>
                                        <Select
                                            value={formData.difficulty}
                                            onValueChange={v => setFormData({ ...formData, difficulty: v })}
                                        >
                                            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
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
                            <Button onClick={() => setIsModuleModalOpen(true)} variant="outline" className="border-dashed border-white/20 hover:bg-white/5 text-white">
                                <Plus className="mr-2 h-4 w-4" /> Novo Módulo
                            </Button>
                        </div>

                        <ModuleList
                            modules={course.modules || []}
                            onAddLesson={openLessonModal}
                            onEditLesson={(mid, lesson) => openLessonModal(mid, lesson)}
                            onDeleteLesson={handleDeleteLesson}
                            onDeleteModule={handleDeleteModule}
                        />
                    </TabsContent>
                </Tabs>

                <LessonEditorModal
                    open={isLessonModalOpen}
                    onClose={() => setIsLessonModalOpen(false)}
                    moduleName={activeModuleName}
                    lesson={editingLesson}
                    onSave={handleSaveLesson}
                />

                <CreateModuleModal
                    open={isModuleModalOpen}
                    onClose={() => setIsModuleModalOpen(false)}
                    onSave={handleCreateModule}
                />

            </div>
        </div>
    )
}
