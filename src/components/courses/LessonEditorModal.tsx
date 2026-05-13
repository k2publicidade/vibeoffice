'use client'

import { ComponentType, useEffect, useRef, useState } from 'react'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Lesson, LessonMaterial } from '@/types/courses'
import { uploadFile } from '@/lib/supabase/storage'
import {
    Bold,
    Heading2,
    Heading3,
    Image as ImageIcon,
    Link2,
    List as ListIcon,
    Loader2,
    Paperclip,
    Pilcrow,
    PlayCircle,
    Sparkles,
    Trash2,
    Upload,
    Video as VideoIcon,
} from 'lucide-react'
import { toast } from 'sonner'

interface LessonEditorModalProps {
    open: boolean
    onClose: () => void
    moduleName?: string
    lesson?: Partial<Lesson> | null
    onSave: (lessonData: Partial<Lesson>) => Promise<void>
}

interface FormState {
    title: string
    chapter: string
    content_url: string
    content: string
    materials: LessonMaterial[]
}

const defaultState: FormState = {
    title: '',
    chapter: '',
    content_url: '',
    content: '<p>Conteúdo da aula...</p>',
    materials: [],
}

// Detecta provider de vídeo e gera embed URL (best-effort)
function videoEmbedUrl(url: string): string | null {
    if (!url) return null
    try {
        const u = new URL(url)
        if (u.hostname.includes('youtube.com')) {
            const id = u.searchParams.get('v')
            if (id) return `https://www.youtube.com/embed/${id}`
        }
        if (u.hostname === 'youtu.be') {
            return `https://www.youtube.com/embed/${u.pathname.replace('/', '')}`
        }
        if (u.hostname.includes('vimeo.com')) {
            const id = u.pathname.split('/').filter(Boolean).pop()
            if (id) return `https://player.vimeo.com/video/${id}`
        }
        return url
    } catch {
        return null
    }
}

export function LessonEditorModal({ open, onClose, moduleName, lesson, onSave }: LessonEditorModalProps) {
    const [state, setState] = useState<FormState>(defaultState)
    const [loading, setLoading] = useState(false)
    const [uploadingMaterial, setUploadingMaterial] = useState(false)
    const [aiBusy, setAiBusy] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (open) {
            setState({
                title: lesson?.title || '',
                chapter: lesson?.chapter || '',
                content_url: lesson?.content_url || '',
                content: lesson?.content || defaultState.content,
                materials: (lesson?.materials as LessonMaterial[]) || [],
            })
        }
    }, [open, lesson])

    // --- Toolbar: insere/envolve seleção com tags HTML ---
    const wrapSelection = (open: string, close: string) => {
        const el = textareaRef.current
        if (!el) return
        const { selectionStart, selectionEnd, value } = el
        const before = value.slice(0, selectionStart)
        const selected = value.slice(selectionStart, selectionEnd) || 'texto'
        const after = value.slice(selectionEnd)
        const newValue = `${before}${open}${selected}${close}${after}`
        setState(prev => ({ ...prev, content: newValue }))
        requestAnimationFrame(() => {
            el.focus()
            const pos = before.length + open.length + selected.length
            el.setSelectionRange(pos, pos)
        })
    }

    const insertAtCursor = (snippet: string) => {
        const el = textareaRef.current
        if (!el) return
        const { selectionStart, value } = el
        const before = value.slice(0, selectionStart)
        const after = value.slice(selectionStart)
        const newValue = `${before}${snippet}${after}`
        setState(prev => ({ ...prev, content: newValue }))
        requestAnimationFrame(() => {
            el.focus()
            const pos = before.length + snippet.length
            el.setSelectionRange(pos, pos)
        })
    }

    const handleInsertImage = () => {
        const url = prompt('URL da imagem:')
        if (!url) return
        insertAtCursor(`\n<img src="${url}" alt="" />\n`)
    }

    // --- "Formatar com IA" — formatação local básica:
    //   converte linhas em <p>, listas em <ul>/<li>, e ## em <h2>.
    //   (Integração real com LLM pode entrar depois — placeholder funcional.)
    const formatWithAI = () => {
        setAiBusy(true)
        try {
            const raw = state.content
                .replace(/<[^>]+>/g, '\n') // strip tags
                .split('\n')
                .map(l => l.trim())
                .filter(Boolean)

            const out: string[] = []
            let listBuffer: string[] = []
            const flushList = () => {
                if (listBuffer.length) {
                    out.push(`<ul>${listBuffer.map(i => `<li>${i}</li>`).join('')}</ul>`)
                    listBuffer = []
                }
            }
            for (const line of raw) {
                if (/^[-*]\s+/.test(line)) {
                    listBuffer.push(line.replace(/^[-*]\s+/, ''))
                    continue
                }
                flushList()
                if (/^###\s+/.test(line)) out.push(`<h3>${line.replace(/^###\s+/, '')}</h3>`)
                else if (/^##\s+/.test(line)) out.push(`<h2>${line.replace(/^##\s+/, '')}</h2>`)
                else out.push(`<p>${line}</p>`)
            }
            flushList()
            setState(prev => ({ ...prev, content: out.join('\n') }))
            toast.success('Conteúdo formatado.')
        } catch {
            toast.error('Não consegui formatar o conteúdo.')
        } finally {
            setAiBusy(false)
        }
    }

    // --- Materiais de apoio ---
    const handleMaterialFile = async (file: File) => {
        if (file.size > 25 * 1024 * 1024) {
            toast.error('Arquivo muito grande (máx 25MB).')
            return
        }
        setUploadingMaterial(true)
        try {
            const path = `course-materials/${Date.now()}-${file.name}`
            const result = await uploadFile({ file, bucket: 'drive-files', path })
            const material: LessonMaterial = {
                kind: 'file',
                name: file.name,
                url: result.url,
                size: file.size,
                mime: file.type,
            }
            setState(prev => ({ ...prev, materials: [...prev.materials, material] }))
            toast.success('Material adicionado.')
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erro desconhecido'
            toast.error('Falha no upload.', { description: msg })
        } finally {
            setUploadingMaterial(false)
        }
    }

    const handleAddLink = () => {
        const url = prompt('URL do link:')
        if (!url) return
        const name = prompt('Nome do link:') || url
        setState(prev => ({
            ...prev,
            materials: [...prev.materials, { kind: 'link', name, url }],
        }))
    }

    const removeMaterial = (idx: number) => {
        setState(prev => ({
            ...prev,
            materials: prev.materials.filter((_, i) => i !== idx),
        }))
    }

    // --- Submit ---
    const handleSubmit = async () => {
        if (!state.title.trim()) {
            toast.error('Informe um título para a aula.')
            return
        }
        setLoading(true)
        try {
            const hasVideo = !!state.content_url.trim()
            await onSave({
                ...(lesson?.id ? { id: lesson.id } : {}),
                title: state.title.trim(),
                chapter: state.chapter.trim() || undefined,
                type: hasVideo ? 'video' : 'html',
                content_url: state.content_url.trim() || undefined,
                content: state.content,
                materials: state.materials,
            })
            onClose()
        } catch {
            // já tratado upstream
        } finally {
            setLoading(false)
        }
    }

    const previewEmbed = videoEmbedUrl(state.content_url)

    return (
        <PremiumModal open={open} onClose={onClose} size="full" className="!max-w-5xl">
            <PremiumModalHeader>
                <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center border border-purple-500/20">
                        <PlayCircle className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                        <PremiumModalTitle>
                            {lesson?.id ? 'Editar Aula' : 'Adicionar Nova Aula'}
                        </PremiumModalTitle>
                        <PremiumModalDescription>
                            {moduleName
                                ? <>Aula em <span className="text-zinc-300">{moduleName}</span></>
                                : 'Conteúdo, vídeo e materiais de apoio'}
                        </PremiumModalDescription>
                    </div>
                </div>
            </PremiumModalHeader>

            <PremiumModalBody className="space-y-6">
                {/* Linha: Título + Capítulo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-zinc-300">Título da Aula <span className="text-red-400">*</span></Label>
                        <Input
                            value={state.title}
                            onChange={(e) => setState(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="Ex: Como estruturar uma campanha de release"
                            className="bg-zinc-900/60 border-zinc-800 h-11"
                            autoFocus
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-zinc-300">Nome do Módulo / Capítulo</Label>
                        <Input
                            value={state.chapter}
                            onChange={(e) => setState(prev => ({ ...prev, chapter: e.target.value }))}
                            placeholder="Ex: Módulo 1: Introdução"
                            className="bg-zinc-900/60 border-zinc-800 h-11"
                        />
                    </div>
                </div>

                {/* URL do vídeo */}
                <div className="space-y-2">
                    <Label className="text-zinc-300 flex items-center gap-2">
                        <VideoIcon className="h-3.5 w-3.5 text-zinc-500" />
                        URL do Vídeo (YouTube, Vimeo, etc.)
                    </Label>
                    <Input
                        value={state.content_url}
                        onChange={(e) => setState(prev => ({ ...prev, content_url: e.target.value }))}
                        placeholder="https://youtube.com/watch?v=..."
                        className="bg-zinc-900/60 border-zinc-800 h-11 font-mono text-sm"
                    />
                    {previewEmbed && (
                        <div className="mt-2 rounded-lg overflow-hidden bg-black aspect-video max-w-md border border-zinc-800">
                            <iframe
                                src={previewEmbed}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    )}
                </div>

                {/* Editor + Preview */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <Label className="text-zinc-300">Conteúdo da Aula</Label>
                        <Button
                            type="button"
                            size="sm"
                            onClick={formatWithAI}
                            disabled={aiBusy}
                            className="h-8 gap-1.5 bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-400 hover:to-fuchsia-400 text-white text-xs rounded-full"
                        >
                            {aiBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                            Formatar com IA
                        </Button>
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center gap-1 p-2 bg-zinc-900/60 border border-zinc-800 rounded-t-md">
                        <ToolBtn icon={Heading2} label="H2" onClick={() => wrapSelection('<h2>', '</h2>')} />
                        <ToolBtn icon={Heading3} label="H3" onClick={() => wrapSelection('<h3>', '</h3>')} />
                        <ToolBtn icon={Bold} label="B" onClick={() => wrapSelection('<strong>', '</strong>')} />
                        <ToolBtn icon={Pilcrow} label="P" onClick={() => wrapSelection('<p>', '</p>')} />
                        <ToolBtn icon={ListIcon} label="Lista" onClick={() => insertAtCursor('\n<ul>\n  <li>Item</li>\n</ul>\n')} />
                        <span className="w-px h-5 bg-zinc-800 mx-1" />
                        <ToolBtn icon={ImageIcon} label="Imagem" onClick={handleInsertImage} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-3">
                        <Textarea
                            ref={textareaRef}
                            value={state.content}
                            onChange={(e) => setState(prev => ({ ...prev, content: e.target.value }))}
                            className="bg-zinc-900/60 border-zinc-800 min-h-[280px] font-mono text-xs leading-relaxed rounded-t-none md:rounded-t-md p-4 resize-none"
                            placeholder="<p>Escreva o conteúdo aqui...</p>"
                            spellCheck={false}
                        />
                        <div
                            className="bg-zinc-950 border border-zinc-800 rounded-md min-h-[280px] p-4 overflow-y-auto prose prose-invert prose-sm max-w-none prose-headings:text-white prose-strong:text-white prose-p:text-zinc-300 prose-li:text-zinc-300 prose-a:text-red-400"
                            dangerouslySetInnerHTML={{ __html: state.content || '<p class="text-zinc-600">Pré-visualização aparecerá aqui...</p>' }}
                        />
                    </div>
                </div>

                {/* Materiais de Apoio */}
                <div className="space-y-3 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <Label className="text-zinc-300 flex items-center gap-2">
                            <Paperclip className="h-3.5 w-3.5 text-zinc-500" />
                            Materiais de Apoio
                            <span className="text-[10px] text-zinc-500 font-normal">
                                ({state.materials.length})
                            </span>
                        </Label>
                        <div className="flex items-center gap-2">
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                onChange={(e) => {
                                    const f = e.target.files?.[0]
                                    if (f) handleMaterialFile(f)
                                    e.target.value = ''
                                }}
                            />
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingMaterial}
                                className="h-9 gap-1.5 border-zinc-700 hover:bg-zinc-800"
                            >
                                {uploadingMaterial ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                                + Adicionar Arquivo
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={handleAddLink}
                                className="h-9 gap-1.5 border-zinc-700 hover:bg-zinc-800"
                            >
                                <Link2 className="h-3.5 w-3.5" />
                                + Adicionar Link
                            </Button>
                        </div>
                    </div>

                    {state.materials.length === 0 ? (
                        <p className="text-xs text-zinc-600 px-1">
                            Nenhum material anexado ainda. Use o upload pra arquivos ou link pra recursos externos.
                        </p>
                    ) : (
                        <ul className="space-y-1.5">
                            {state.materials.map((m, i) => (
                                <li
                                    key={i}
                                    className="flex items-center gap-2 px-3 py-2 rounded-md bg-zinc-900/60 border border-zinc-800"
                                >
                                    {m.kind === 'file' ? (
                                        <Paperclip className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                                    ) : (
                                        <Link2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                    )}
                                    <a
                                        href={m.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-zinc-200 hover:text-white truncate flex-1"
                                    >
                                        {m.name}
                                    </a>
                                    {m.kind === 'file' && m.size && (
                                        <span className="text-[10px] text-zinc-500 shrink-0">
                                            {(m.size / 1024 / 1024).toFixed(1)} MB
                                        </span>
                                    )}
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => removeMaterial(i)}
                                        className="h-7 w-7 text-zinc-500 hover:text-red-400"
                                        aria-label="Remover"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
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
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading || !state.title.trim()}
                        className="w-full sm:w-auto min-w-[140px] h-11 rounded-full bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            'Salvar Aula'
                        )}
                    </Button>
                </div>
            </PremiumModalFooter>
        </PremiumModal>
    )
}

function ToolBtn({ icon: Icon, label, onClick }: { icon: ComponentType<{ className?: string }>; label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
        >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{label}</span>
        </button>
    )
}
