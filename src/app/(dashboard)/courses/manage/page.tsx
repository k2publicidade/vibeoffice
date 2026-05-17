'use client'

import { useState, useEffect, useMemo } from 'react'
import { useCourses } from '@/hooks/useCourses'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import {
    Plus,
    Edit2,
    Trash2,
    ArrowLeft,
    BookOpen,
    Search,
    GraduationCap,
    CheckCircle2,
    FileEdit,
    Lock,
    Loader2,
} from 'lucide-react'
import { motion } from 'framer-motion'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { CreateCourseModal } from '@/components/courses/CreateCourseModal'
import { cn } from '@/lib/utils'

type StatusFilter = 'all' | 'published' | 'draft'

export default function CoursesManagePage() {
    const router = useRouter()
    const { user, isLoading: authLoading } = useAuth()
    const { courses, loading, createCourse, deleteCourse } = useCourses()

    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
    const [authorFilter, setAuthorFilter] = useState<string>('all')
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

    // Guard: apenas Admin
    useEffect(() => {
        if (!authLoading && user && user.role !== 'Admin') {
            router.replace('/courses')
        }
    }, [user, authLoading, router])

    // Stats
    const stats = useMemo(() => {
        const total = courses.length
        const published = courses.filter(c => c.is_published !== false).length
        const drafts = total - published
        return { total, published, drafts }
    }, [courses])

    // Autores únicos pro filtro
    const authors = useMemo(() => {
        const set = new Set<string>()
        courses.forEach(c => {
            const name = c.instructor?.trim()
            if (name) set.add(name)
        })
        return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
    }, [courses])

    // Filtragem
    const filteredCourses = useMemo(() => {
        return courses.filter(c => {
            const matchesSearch = !searchTerm ||
                c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.description?.toLowerCase().includes(searchTerm.toLowerCase())

            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'published' && c.is_published !== false) ||
                (statusFilter === 'draft' && c.is_published === false)

            const matchesAuthor = authorFilter === 'all'
                ? true
                : authorFilter === '__none__'
                    ? !c.instructor?.trim()
                    : (c.instructor || '').trim().toLowerCase() === authorFilter.toLowerCase()

            return matchesSearch && matchesStatus && matchesAuthor
        })
    }, [courses, searchTerm, statusFilter, authorFilter])

    const handleCreateCourse = async (courseData: any) => {
        try {
            const newCourse = await createCourse(courseData)
            if (newCourse) {
                router.push(`/courses/manage/${newCourse.id}`)
            }
        } catch (error) {
            // toast já tratado no hook
        }
    }

    const handleDeleteCourse = async (id: string, title: string) => {
        if (confirm(`Excluir o curso "${title}"? Esta ação não pode ser desfeita.`)) {
            try {
                await deleteCourse(id)
            } catch (e) {
                console.error(e)
            }
        }
    }

    if (authLoading || (user && user.role !== 'Admin')) {
        return (
            <div className="mx-auto max-w-2xl px-4 py-20 text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 border border-white/5">
                    <Lock className="h-7 w-7 text-zinc-500" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Acesso restrito</h2>
                <p className="text-sm text-zinc-400">
                    Esta área é apenas para administradores.
                </p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black text-white">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6 md:space-y-8">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push('/courses')}
                            className="h-11 w-11 shrink-0"
                            aria-label="Voltar"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Gerenciar Cursos</h1>
                            <p className="text-sm text-zinc-400">
                                Adicione, edite ou remova cursos da plataforma.
                            </p>
                        </div>
                    </div>

                    <Button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="h-11 px-5 rounded-full bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white gap-2 font-medium shadow-lg shadow-red-500/20"
                    >
                        <Plus className="h-4 w-4" />
                        Criar Novo Curso
                    </Button>
                </div>

                {/* Stats */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4"
                >
                    <StatCard
                        icon={GraduationCap}
                        label="Total de Cursos"
                        value={stats.total}
                        accent="text-white"
                        ring="from-red-500/20 to-orange-500/20 border-red-500/10"
                    />
                    <StatCard
                        icon={CheckCircle2}
                        label="Publicados"
                        value={stats.published}
                        accent="text-emerald-400"
                        ring="from-emerald-500/20 to-emerald-900/20 border-emerald-500/10"
                    />
                    <StatCard
                        icon={FileEdit}
                        label="Rascunhos"
                        value={stats.drafts}
                        accent="text-yellow-400"
                        ring="from-yellow-500/20 to-yellow-900/20 border-yellow-500/10"
                    />
                </motion.div>

                {/* Filters */}
                <div className="rounded-xl border border-white/5 bg-zinc-900/40 p-3 md:p-4 grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                        <Input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar por título ou descrição..."
                            className="pl-10 bg-zinc-900/60 border-zinc-800 h-11"
                        />
                    </div>

                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                        <SelectTrigger className="bg-zinc-900/60 border-zinc-800 h-11 min-w-[160px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800">
                            <SelectItem value="all">Todos os Status</SelectItem>
                            <SelectItem value="published">Publicados</SelectItem>
                            <SelectItem value="draft">Rascunhos</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={authorFilter} onValueChange={setAuthorFilter}>
                        <SelectTrigger className="bg-zinc-900/60 border-zinc-800 h-11 min-w-[160px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800">
                            <SelectItem value="all">Todos os Autores</SelectItem>
                            <SelectItem value="__none__">(Sem instrutor)</SelectItem>
                            {authors.map(a => (
                                <SelectItem key={a} value={a}>{a}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Table (desktop) + Cards (mobile) */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                    </div>
                ) : (
                    <>
                        {/* Desktop table */}
                        <div className="hidden md:block rounded-xl border border-white/5 bg-zinc-900/30 overflow-hidden">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-zinc-900/80">
                                        <TableRow className="border-white/5 hover:bg-transparent">
                                            <TableHead className="text-zinc-400 min-w-[260px]">Título</TableHead>
                                            <TableHead className="text-zinc-400">Autor</TableHead>
                                            <TableHead className="text-zinc-400">Status</TableHead>
                                            <TableHead className="text-zinc-400">Aulas</TableHead>
                                            <TableHead className="text-right text-zinc-400">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredCourses.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-32 text-center text-zinc-500">
                                                    {courses.length === 0
                                                        ? 'Nenhum curso criado ainda. Clique em "Criar Novo Curso" para começar.'
                                                        : 'Nenhum curso corresponde aos filtros aplicados.'}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredCourses.map((course) => (
                                                <TableRow
                                                    key={course.id}
                                                    className="border-white/5 hover:bg-white/5 transition-colors"
                                                >
                                                    <TableCell className="font-medium text-white py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                                                                {course.thumbnail ? (
                                                                    <img
                                                                        src={course.thumbnail}
                                                                        alt=""
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <BookOpen className="h-5 w-5 text-zinc-600" />
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="truncate">{course.title}</span>
                                                                {course.subtitle && (
                                                                    <span className="text-xs text-zinc-500 truncate max-w-[300px]">
                                                                        {course.subtitle}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-zinc-300">
                                                        {course.instructor || '—'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <StatusBadge published={course.is_published !== false} />
                                                    </TableCell>
                                                    <TableCell className="text-zinc-300 text-center">
                                                        {course.lessons_count || 0}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="inline-flex items-center gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => router.push(`/courses/manage/${course.id}`)}
                                                                className="h-9 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 gap-1.5"
                                                            >
                                                                <Edit2 className="h-3.5 w-3.5" />
                                                                Editar
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDeleteCourse(course.id, course.title)}
                                                                className="h-9 text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1.5"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                Excluir
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* Mobile cards */}
                        <div className="md:hidden space-y-2">
                            {filteredCourses.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-white/10 bg-zinc-900/30 py-12 text-center text-sm text-zinc-500">
                                    {courses.length === 0
                                        ? 'Nenhum curso ainda — toque em "Criar Novo Curso".'
                                        : 'Nenhum curso encontrado.'}
                                </div>
                            ) : (
                                filteredCourses.map((course) => (
                                    <div
                                        key={course.id}
                                        className="rounded-xl border border-white/5 bg-zinc-900/40 p-4 space-y-3"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-12 h-12 rounded bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                                                {course.thumbnail ? (
                                                    <img src={course.thumbnail} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <BookOpen className="h-5 w-5 text-zinc-600" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-medium text-white truncate">{course.title}</h3>
                                                {course.subtitle && (
                                                    <p className="text-xs text-zinc-500 line-clamp-2">{course.subtitle}</p>
                                                )}
                                                <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-400">
                                                    <span>{course.instructor || '—'}</span>
                                                    <span className="w-1 h-1 rounded-full bg-zinc-600" />
                                                    <span>{course.lessons_count || 0} aulas</span>
                                                </div>
                                            </div>
                                            <StatusBadge published={course.is_published !== false} />
                                        </div>
                                        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => router.push(`/courses/manage/${course.id}`)}
                                                className="flex-1 h-10 border-zinc-700 gap-1.5"
                                            >
                                                <Edit2 className="h-3.5 w-3.5" /> Editar
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleDeleteCourse(course.id, course.title)}
                                                className="h-10 w-10 p-0 border-red-500/20 text-red-400 hover:bg-red-500/10"
                                                aria-label="Excluir"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}
            </div>

            <CreateCourseModal
                open={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreateCourse}
            />
        </div>
    )
}

function StatCard({
    icon: Icon,
    label,
    value,
    accent,
    ring,
}: {
    icon: any
    label: string
    value: number
    accent: string
    ring: string
}) {
    return (
        <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-zinc-900 to-black p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                <Icon size={70} />
            </div>
            <div className="relative z-10 flex flex-col gap-3">
                <div className={cn(
                    'w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br border',
                    ring
                )}>
                    <Icon className={cn('h-5 w-5', accent)} />
                </div>
                <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
                    <p className={cn('text-3xl font-black', accent)}>{value}</p>
                </div>
            </div>
        </div>
    )
}

function StatusBadge({ published }: { published: boolean }) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border',
                published
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
            )}
        >
            <span className={cn('w-1.5 h-1.5 rounded-full', published ? 'bg-emerald-400' : 'bg-yellow-400')} />
            {published ? 'Publicado' : 'Rascunho'}
        </span>
    )
}
