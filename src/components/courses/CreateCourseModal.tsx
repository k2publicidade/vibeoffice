'use client'

import { useEffect, useRef, useState } from 'react'
import {
    PremiumModal,
    PremiumModalHeader,
    PremiumModalTitle,
    PremiumModalDescription,
    PremiumModalBody,
    PremiumModalFooter,
} from '@/components/ui/premium-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Course } from '@/types/courses'
import { uploadFile } from '@/lib/supabase/storage'
import { BookOpen, Image as ImageIcon, Link2, Sparkles, Upload, Wand2, X, Loader2, GraduationCap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface CreateCourseModalProps {
    open: boolean
    onClose: () => void
    onCreate: (courseData: Partial<Course>) => Promise<void>
}

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

const difficultyOptions = [
    { value: 'beginner', label: 'Iniciante', color: 'text-emerald-400' },
    { value: 'intermediate', label: 'Intermediário', color: 'text-yellow-400' },
    { value: 'advanced', label: 'Avançado', color: 'text-red-400' },
] as const

export function CreateCourseModal({ open, onClose, onCreate }: CreateCourseModalProps) {
    const [loading, setLoading] = useState(false)
    const [uploadingCover, setUploadingCover] = useState(false)
    const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
    const [coverMode, setCoverMode] = useState<'upload' | 'url' | 'ai'>('upload')
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        subtitle: '',
        description: '',
        instructor: '',
        difficulty: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
        thumbnail: '',
        aiPrompt: '',
    })

    // Reset on close
    useEffect(() => {
        if (!open) {
            setFormData({
                title: '',
                slug: '',
                subtitle: '',
                description: '',
                instructor: '',
                difficulty: 'beginner',
                thumbnail: '',
                aiPrompt: '',
            })
            setSlugManuallyEdited(false)
            setCoverMode('upload')
        }
    }, [open])

    // Auto-slug a partir do título
    useEffect(() => {
        if (!slugManuallyEdited) {
            setFormData(prev => ({ ...prev, slug: slugify(prev.title) }))
        }
    }, [formData.title, slugManuallyEdited])

    const canSubmit = formData.title.trim().length >= 3 && !loading

    const handleFileUpload = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            toast.error('Selecione uma imagem (PNG, JPG ou WEBP).')
            return
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error('A imagem deve ter no máximo 5MB.')
            return
        }
        setUploadingCover(true)
        try {
            const ext = file.name.split('.').pop() || 'png'
            const path = `course-thumbnails/${Date.now()}-${slugify(formData.title || 'curso')}.${ext}`
            const result = await uploadFile({ file, bucket: 'drive-files', path })
            setFormData(prev => ({ ...prev, thumbnail: result.url }))
            toast.success('Imagem de capa carregada!')
        } catch (err) {
            console.error('Erro upload capa:', err)
            const msg = err instanceof Error ? err.message : 'Erro desconhecido'
            toast.error('Falha ao enviar imagem.', { description: msg })
        } finally {
            setUploadingCover(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!canSubmit) return
        setLoading(true)
        try {
            await onCreate({
                title: formData.title.trim(),
                slug: formData.slug.trim() || undefined,
                subtitle: formData.subtitle.trim() || undefined,
                description: formData.description.trim(),
                instructor: formData.instructor.trim() || undefined,
                difficulty: formData.difficulty,
                thumbnail: formData.thumbnail.trim() || undefined,
                is_published: true,
            })
            onClose()
        } catch {
            // toast já tratado no hook
        } finally {
            setLoading(false)
        }
    }

    return (
        <PremiumModal open={open} onClose={onClose} size="xl">
            <PremiumModalHeader>
                <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center border border-red-500/20">
                        <GraduationCap className="h-5 w-5 text-red-400" />
                    </div>
                    <div>
                        <PremiumModalTitle>Criar Novo Curso</PremiumModalTitle>
                        <PremiumModalDescription>
                            Defina metadados, capa e SEO. Você poderá adicionar módulos e aulas no passo seguinte.
                        </PremiumModalDescription>
                    </div>
                </div>
            </PremiumModalHeader>

            <form onSubmit={handleSubmit}>
                <PremiumModalBody className="space-y-7">
                    {/* Bloco: Identidade */}
                    <section className="space-y-4">
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                            <BookOpen className="h-3.5 w-3.5" /> Identidade
                        </h3>

                        <div className="space-y-2">
                            <Label htmlFor="title" className="text-zinc-300">
                                Título do Curso <span className="text-red-400">*</span>
                            </Label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Ex: Estratégia de lançamento single 2026"
                                className="bg-zinc-900/60 border-zinc-800 focus:border-red-500/50 h-11 text-base"
                                required
                                autoFocus
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-end">
                            <div className="space-y-2">
                                <Label htmlFor="slug" className="text-zinc-300">Slug (URL)</Label>
                                <div className="flex items-center bg-zinc-900/60 border border-zinc-800 rounded-md focus-within:border-red-500/50 transition-colors h-11 overflow-hidden">
                                    <span className="text-zinc-500 text-xs pl-3 select-none">/cursos/</span>
                                    <Input
                                        id="slug"
                                        value={formData.slug}
                                        onChange={(e) => {
                                            setSlugManuallyEdited(true)
                                            setFormData({ ...formData, slug: slugify(e.target.value) })
                                        }}
                                        placeholder="meu-curso-incrivel"
                                        className="bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-full pl-1"
                                    />
                                </div>
                            </div>
                            {slugManuallyEdited && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSlugManuallyEdited(false)}
                                    className="h-11 text-xs text-zinc-400 hover:text-white"
                                >
                                    Auto-gerar
                                </Button>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="subtitle" className="text-zinc-300">Subtítulo (descrição curta)</Label>
                            <Input
                                id="subtitle"
                                value={formData.subtitle}
                                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                                placeholder="Uma linha que resume o valor do curso"
                                className="bg-zinc-900/60 border-zinc-800 focus:border-red-500/50 h-11"
                                maxLength={140}
                            />
                            <p className="text-[10px] text-zinc-600 text-right">
                                {formData.subtitle.length}/140
                            </p>
                        </div>
                    </section>

                    {/* Bloco: Imagem de Capa */}
                    <section className="space-y-3">
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                            <ImageIcon className="h-3.5 w-3.5" /> Imagem de Capa
                        </h3>

                        {/* Tabs */}
                        <div className="flex items-center gap-1 bg-zinc-900/60 border border-zinc-800 rounded-lg p-1 w-fit">
                            {([
                                { key: 'upload', label: 'Upload', icon: Upload },
                                { key: 'url', label: 'URL', icon: Link2 },
                                { key: 'ai', label: 'IA (em breve)', icon: Wand2 },
                            ] as const).map(({ key, label, icon: Icon }) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setCoverMode(key)}
                                    disabled={key === 'ai'}
                                    className={cn(
                                        'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                                        coverMode === key
                                            ? 'bg-zinc-800 text-white'
                                            : 'text-zinc-400 hover:text-white',
                                        key === 'ai' && 'opacity-40 cursor-not-allowed'
                                    )}
                                >
                                    <Icon className="h-3.5 w-3.5" />
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* Preview + ação */}
                        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
                            <div className="relative w-full aspect-[5/3] rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden flex items-center justify-center">
                                {formData.thumbnail ? (
                                    <>
                                        <img
                                            src={formData.thumbnail}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                            onError={() => {
                                                toast.error('Não foi possível carregar a imagem.')
                                                setFormData(prev => ({ ...prev, thumbnail: '' }))
                                            }}
                                        />
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => setFormData({ ...formData, thumbnail: '' })}
                                            className="absolute top-1 right-1 h-7 w-7 bg-black/60 hover:bg-black text-white"
                                            aria-label="Remover imagem"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    </>
                                ) : (
                                    <div className="text-center px-3">
                                        <ImageIcon className="h-7 w-7 text-zinc-700 mx-auto mb-1" />
                                        <p className="text-[10px] text-zinc-600">Sem capa</p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                {coverMode === 'upload' && (
                                    <>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp"
                                            className="hidden"
                                            onChange={(e) => {
                                                const f = e.target.files?.[0]
                                                if (f) handleFileUpload(f)
                                            }}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploadingCover}
                                            className="w-full h-11 border-dashed border-zinc-700 hover:border-red-500/40 hover:bg-red-500/5 gap-2"
                                        >
                                            {uploadingCover ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Enviando...
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="h-4 w-4" />
                                                    Anexar Arquivo
                                                </>
                                            )}
                                        </Button>
                                        <p className="text-[10px] text-zinc-500 leading-relaxed">
                                            Recomendado: <strong className="text-zinc-300">500×300px</strong>. PNG, JPG ou WEBP. Máx 5MB.
                                        </p>
                                    </>
                                )}

                                {coverMode === 'url' && (
                                    <>
                                        <Input
                                            value={formData.thumbnail}
                                            onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                                            placeholder="https://exemplo.com/capa.jpg"
                                            className="bg-zinc-900/60 border-zinc-800 h-11"
                                            type="url"
                                        />
                                        <p className="text-[10px] text-zinc-500">
                                            Cole a URL pública de uma imagem (PNG/JPG/WEBP).
                                        </p>
                                    </>
                                )}

                                {coverMode === 'ai' && (
                                    <>
                                        <Textarea
                                            value={formData.aiPrompt}
                                            onChange={(e) => setFormData({ ...formData, aiPrompt: e.target.value })}
                                            placeholder="Descreva a imagem que você quer (em breve geramos via IA)"
                                            className="bg-zinc-900/60 border-zinc-800 min-h-[80px] text-sm"
                                            disabled
                                        />
                                        <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                                            <Sparkles className="h-3 w-3" /> Geração de capa por IA chegará em breve.
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Bloco: Detalhes */}
                    <section className="space-y-4">
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Detalhes</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="instructor" className="text-zinc-300">Instrutor</Label>
                                <Input
                                    id="instructor"
                                    value={formData.instructor}
                                    onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                                    placeholder="Nome do instrutor (opcional)"
                                    className="bg-zinc-900/60 border-zinc-800 h-11"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="difficulty" className="text-zinc-300">Dificuldade</Label>
                                <Select
                                    value={formData.difficulty}
                                    onValueChange={(val) => setFormData({ ...formData, difficulty: val as typeof formData.difficulty })}
                                >
                                    <SelectTrigger id="difficulty" className="bg-zinc-900/60 border-zinc-800 h-11">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-zinc-800">
                                        {difficultyOptions.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                <span className={cn('flex items-center gap-2', opt.color)}>
                                                    <span className="w-2 h-2 rounded-full bg-current" />
                                                    {opt.label}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-zinc-300">Descrição completa</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="O que o aluno vai aprender? Para quem é? Por que vale o tempo?"
                                className="bg-zinc-900/60 border-zinc-800 min-h-[120px] resize-none"
                            />
                        </div>
                    </section>
                </PremiumModalBody>

                <PremiumModalFooter>
                    <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto sm:ml-auto">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="w-full sm:w-auto min-w-[120px] h-11 rounded-full border-zinc-700"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={!canSubmit}
                            className="w-full sm:w-auto min-w-[140px] h-11 rounded-full bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white font-medium disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Criando...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    Criar Curso
                                </>
                            )}
                        </Button>
                    </div>
                </PremiumModalFooter>
            </form>
        </PremiumModal>
    )
}
