'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useCourses } from '@/hooks/useCourses'
import { useAuth } from '@/hooks/useAuth'
import { uploadFile } from '@/lib/supabase/storage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
    ArrowLeft,
    Plus,
    Save,
    Lock,
    Loader2,
    Upload,
    Image as ImageIcon,
    X,
    Link2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Lesson } from '@/types/courses'
import { ModuleList } from '@/components/courses/ModuleList'
import { LessonEditorModal } from '@/components/courses/LessonEditorModal'
import { CreateModuleModal } from '@/components/courses/CreateModuleModal'
import { cn } from '@/lib/utils'

function slugify(text: string): string {
    return text
        .toString()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
}

export default function CourseEditorPage() {
    const { id } = useParams() as { id: string }
    const router = useRouter()
    const { user, isLoading: authLoading } = useAuth()
    const {
        getCourseById,
        updateCourse,
        createModule,
        deleteModule,
        createLesson,
        updateLesson,
        deleteLesson,
    } = useCourses()

    useEffect(() => {
        if (!authLoading && user && user.role !== 'Admin') {
            router.replace('/courses')
        }
    }, [user, authLoading, router])

    const course = getCourseById(id)

    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        subtitle: '',
        description: '',
        instructor: '',
        thumbnail: '',
        difficulty: 'beginner',
        duration: 0,
        is_published: true,
    })
    const [coverMode, setCoverMode] = useState<'upload' | 'url'>('upload')
    const [uploadingCover, setUploadingCover] = useState(false)
    const [saving, setSaving] = useState(false)

    const [editingLesson, setEditingLesson] = useState<Partial<Lesson> | null>(null)
    const [isLessonModalOpen, setIsLessonModalOpen] = useState(false)
    const [isModuleModalOpen, setIsModuleModalOpen] = useState(false)
    const [activeModuleId, setActiveModuleId] = useState<string | null>(null)

    useEffect(() => {
        if (course) {
            setFormData({
                title: course.title,
                slug: course.slug || slugify(course.title),
                subtitle: course.subtitle || '',
                description: course.description || '',
                instructor: course.instructor || '',
                thumbnail: course.thumbnail || '',
                difficulty: course.difficulty,
                duration: course.duration || 0,
                is_published: course.is_published !== false,
            })
        }
    }, [course])

    if (authLoading || (user && user.role !== 'Admin')) {
        return (
            <div className="mx-auto max-w-2xl px-4 py-20 text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 border border-white/5">
                    <Lock className="h-7 w-7 text-zinc-500" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Acesso restrito</h2>
            </div>
        )
    }

    if (!course) {
        return (
            <div className="flex items-center justify-center min-h-[50vh] text-white">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
            </div>
        )
    }

    const handleCoverUpload = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            toast.error('Selecione uma imagem.')
            return
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Máximo 5MB.')
            return
        }
        setUploadingCover(true)
        try {
            const ext = file.name.split('.').pop() || 'png'
            const path = `course-thumbnails/${Date.now()}-${slugify(formData.title)}.${ext}`
            const result = await uploadFile({ file, bucket: 'drive-files', path })
            setFormData(prev => ({ ...prev, thumbnail: result.url }))
            toast.success('Capa atualizada.')
        } catch (err: any) {
            toast.error('Falha no upload.', { description: err.message })
        } finally {
            setUploadingCover(false)
        }
    }

    const handleSaveMetadata = async () => {
        setSaving(true)
        try {
            await updateCourse(id, {
                title: formData.title,
                slug: formData.slug,
                subtitle: formData.subtitle,
                description: formData.description,
                instructor: formData.instructor,
                thumbnail: formData.thumbnail,
                difficulty: formData.difficulty as any,
                duration: formData.duration,
                is_published: formData.is_published,
            })
            toast.success('Curso atualizado!')
        } catch {
            toast.error('Erro ao atualizar curso.')
        } finally {
            setSaving(false)
        }
    }

    const handleCreateModule = async (title: string) => {
        try {
            const order = course.modules?.length || 0
            await createModule(id, title, order)
            toast.success('Módulo criado!')
        } catch {
            toast.error('Erro ao criar módulo.')
        }
    }

    const handleDeleteModule = async (moduleId: string) => {
        if (confirm('Excluir módulo e todas as aulas?')) {
            await deleteModule(moduleId)
            toast.success('Módulo excluído.')
        }
    }

    const openLessonModal = (moduleId: string, lesson?: Lesson) => {
        setActiveModuleId(moduleId)
        setEditingLesson(lesson ? { ...lesson } : null)
        setIsLessonModalOpen(true)
    }

    const handleSaveLesson = async (lessonData: Partial<Lesson>) => {
        if (!activeModuleId) return
        try {
            if (lessonData.id) {
                await updateLesson(lessonData.id, lessonData)
                toast.success('Aula atualizada!')
            } else {
                const moduleLessons = course.modules?.find(m => m.id === activeModuleId)?.lessons || []
                await createLesson({
                    ...lessonData,
                    course_id: id,
                    module_id: activeModuleId,
                    order: moduleLessons.length,
                })
                toast.success('Aula criada!')
            }
        } catch (e) {
            toast.error('Erro ao salvar aula.')
            throw e
        }
    }

    const handleDeleteLesson = async (lessonId: string) => {
        if (confirm('Excluir aula?')) {
            await deleteLesson(lessonId)
            toast.success('Aula excluída.')
        }
    }

    const activeModuleName = course.modules?.find(m => m.id === activeModuleId)?.title

    return (
        <div className="min-h-screen bg-black text-white">
            <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6 md:space-y-8">

                {/* Header */}
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push('/courses/manage')}
                        className="h-11 w-11"
                        aria-label="Voltar"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl md:text-2xl font-bold truncate">Editor de Curso</h1>
                        <p className="text-zinc-500 text-sm truncate">{course.title}</p>
                    </div>
                    <span
                        className={cn(
                            'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border',
                            formData.is_published
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                        )}
                    >
                        <span className={cn('w-1.5 h-1.5 rounded-full', formData.is_published ? 'bg-emerald-400' : 'bg-yellow-400')} />
                        {formData.is_published ? 'Publicado' : 'Rascunho'}
                    </span>
                </div>

                <Tabs defaultValue="content" className="space-y-6">
                    <TabsList className="bg-zinc-900 border border-white/5 h-11">
                        <TabsTrigger value="info" className="data-[state=active]:bg-zinc-800">
                            Informações
                        </TabsTrigger>
                        <TabsTrigger value="content" className="data-[state=active]:bg-zinc-800">
                            Conteúdo (Aulas)
                        </TabsTrigger>
                        <TabsTrigger value="publish" className="data-[state=active]:bg-zinc-800">
                            Publicação
                        </TabsTrigger>
                    </TabsList>

                    {/* ===== Tab Info ===== */}
                    <TabsContent value="info">
                        <Card className="bg-zinc-900/50 border-white/5">
                            <CardHeader>
                                <CardTitle className="text-white">Detalhes do Curso</CardTitle>
                                <CardDescription>Informações visíveis no catálogo.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-zinc-300">Título</Label>
                                        <Input
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            className="bg-zinc-800 border-zinc-700 h-11"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-zinc-300">Instrutor</Label>
                                        <Input
                                            value={formData.instructor}
                                            onChange={e => setFormData({ ...formData, instructor: e.target.value })}
                                            className="bg-zinc-800 border-zinc-700 h-11"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-zinc-300">Slug (URL)</Label>
                                    <div className="flex items-center bg-zinc-800 border border-zinc-700 rounded-md h-11 overflow-hidden">
                                        <span className="text-zinc-500 text-xs pl-3 select-none">/cursos/</span>
                                        <Input
                                            value={formData.slug}
                                            onChange={e => setFormData({ ...formData, slug: slugify(e.target.value) })}
                                            className="bg-transparent border-0 focus-visible:ring-0 h-full"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-zinc-300">Subtítulo</Label>
                                    <Input
                                        value={formData.subtitle}
                                        onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
                                        placeholder="Resumo curto que aparece no catálogo"
                                        className="bg-zinc-800 border-zinc-700 h-11"
                                        maxLength={140}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-zinc-300">Descrição completa</Label>
                                    <Textarea
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="bg-zinc-800 border-zinc-700 min-h-[120px]"
                                    />
                                </div>

                                {/* Capa */}
                                <div className="space-y-2">
                                    <Label className="text-zinc-300">Imagem de Capa</Label>
                                    <div className="flex items-center gap-1 bg-zinc-900/60 border border-zinc-800 rounded-lg p-1 w-fit">
                                        <button
                                            type="button"
                                            onClick={() => setCoverMode('upload')}
                                            className={cn(
                                                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium',
                                                coverMode === 'upload' ? 'bg-zinc-800 text-white' : 'text-zinc-400'
                                            )}
                                        >
                                            <Upload className="h-3.5 w-3.5" /> Upload
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCoverMode('url')}
                                            className={cn(
                                                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium',
                                                coverMode === 'url' ? 'bg-zinc-800 text-white' : 'text-zinc-400'
                                            )}
                                        >
                                            <Link2 className="h-3.5 w-3.5" /> URL
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-3">
                                        <div className="relative w-full aspect-[5/3] rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden flex items-center justify-center">
                                            {formData.thumbnail ? (
                                                <>
                                                    <img src={formData.thumbnail} className="w-full h-full object-cover" alt="" />
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => setFormData({ ...formData, thumbnail: '' })}
                                                        className="absolute top-1 right-1 h-7 w-7 bg-black/60 hover:bg-black"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </Button>
                                                </>
                                            ) : (
                                                <ImageIcon className="h-7 w-7 text-zinc-700" />
                                            )}
                                        </div>
                                        {coverMode === 'upload' ? (
                                            <div className="space-y-2">
                                                <input
                                                    id="cover-upload"
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const f = e.target.files?.[0]
                                                        if (f) handleCoverUpload(f)
                                                    }}
                                                />
                                                <label htmlFor="cover-upload">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        disabled={uploadingCover}
                                                        onClick={() => document.getElementById('cover-upload')?.click()}
                                                        className="w-full h-11 border-dashed border-zinc-700 gap-2"
                                                    >
                                                        {uploadingCover ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Upload className="h-4 w-4" />
                                                        )}
                                                        Anexar Arquivo
                                                    </Button>
                                                </label>
                                                <p className="text-[10px] text-zinc-500">
                                                    Recomendado 500×300. Máx 5MB.
                                                </p>
                                            </div>
                                        ) : (
                                            <Input
                                                value={formData.thumbnail}
                                                onChange={e => setFormData({ ...formData, thumbnail: e.target.value })}
                                                placeholder="https://..."
                                                className="bg-zinc-800 border-zinc-700 h-11"
                                            />
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-zinc-300">Dificuldade</Label>
                                        <Select
                                            value={formData.difficulty}
                                            onValueChange={v => setFormData({ ...formData, difficulty: v })}
                                        >
                                            <SelectTrigger className="bg-zinc-800 border-zinc-700 h-11">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-zinc-800 border-zinc-700">
                                                <SelectItem value="beginner">Iniciante</SelectItem>
                                                <SelectItem value="intermediate">Intermediário</SelectItem>
                                                <SelectItem value="advanced">Avançado</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-zinc-300">Duração estimada (min)</Label>
                                        <Input
                                            type="number"
                                            value={formData.duration}
                                            onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                                            className="bg-zinc-800 border-zinc-700 h-11"
                                        />
                                    </div>
                                </div>

                                <Button
                                    onClick={handleSaveMetadata}
                                    disabled={saving}
                                    className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white h-11 px-5 rounded-full gap-2"
                                >
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    Salvar Alterações
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ===== Tab Content ===== */}
                    <TabsContent value="content" className="space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div>
                                <h3 className="text-xl font-semibold text-white">Módulos e Aulas</h3>
                                <p className="text-sm text-zinc-500">
                                    Organize o conteúdo em módulos. Cada aula pode ter vídeo, texto e materiais de apoio.
                                </p>
                            </div>
                            <Button
                                onClick={() => setIsModuleModalOpen(true)}
                                variant="outline"
                                className="h-11 border-dashed border-white/20 hover:bg-white/5 text-white gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Novo Módulo
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

                    {/* ===== Tab Publish ===== */}
                    <TabsContent value="publish">
                        <Card className="bg-zinc-900/50 border-white/5">
                            <CardHeader>
                                <CardTitle className="text-white">Publicação</CardTitle>
                                <CardDescription>
                                    Controle a visibilidade do curso no catálogo público da intranet.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-900/60 border border-zinc-800">
                                    <div>
                                        <p className="font-medium text-white">Curso publicado</p>
                                        <p className="text-xs text-zinc-500">
                                            Quando ativado, o curso aparece para todos os colaboradores em /cursos.
                                        </p>
                                    </div>
                                    <Switch
                                        checked={formData.is_published}
                                        onCheckedChange={(v) => setFormData({ ...formData, is_published: v })}
                                    />
                                </div>
                                <Button
                                    onClick={handleSaveMetadata}
                                    disabled={saving}
                                    className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white h-11 px-5 rounded-full gap-2"
                                >
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    Salvar
                                </Button>
                            </CardContent>
                        </Card>
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
