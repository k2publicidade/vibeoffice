'use client'

import { useState } from 'react'
import { useCourses } from '@/hooks/useCourses'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, ArrowLeft, BookOpen, MoreVertical, Search } from 'lucide-react'
import { motion } from 'framer-motion'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { CreateCourseModal } from '@/components/courses/CreateCourseModal'

export default function CoursesManagePage() {
    const router = useRouter()
    const { courses, loading, createCourse, deleteCourse } = useCourses()
    const { user } = useAuth()
    const [searchTerm, setSearchTerm] = useState('')
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

    // Redirect if not admin
    if (!loading && user?.role !== 'Admin') {
        router.push('/courses');
        return null;
    }

    const filteredCourses = courses.filter(c =>
        c.title.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleCreateCourse = async (courseData: any) => {
        try {
            const newCourse = await createCourse(courseData)
            if (newCourse) {
                router.push(`/courses/manage/${newCourse.id}`)
            }
        } catch (error) {
            console.error("Failed to create course", error)
        }
    }

    const handleDeleteCourse = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir este curso? Esta ação não pode ser desfeita.')) {
            await deleteCourse(id)
        }
    }

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.push('/courses')}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Gerenciar Cursos</h1>
                            <p className="text-zinc-400">Adicione, edite ou remova cursos da plataforma.</p>
                        </div>
                    </div>

                    <Button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-red-600 hover:bg-red-700 text-white gap-2"
                    >
                        <Plus size={18} /> Novo Curso
                    </Button>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-4 bg-zinc-900/50 p-4 rounded-xl border border-white/5">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                        <Input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar por título..."
                            className="pl-9 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="rounded-xl border border-white/5 bg-zinc-900/30 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-zinc-900/80">
                            <TableRow className="border-white/5 hover:bg-transparent">
                                <TableHead className="text-zinc-400">Curso</TableHead>
                                <TableHead className="text-zinc-400">Instrutor</TableHead>
                                <TableHead className="text-zinc-400">Dificuldade</TableHead>
                                <TableHead className="text-zinc-400">Aulas</TableHead>
                                <TableHead className="text-right text-zinc-400">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCourses.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-zinc-500">
                                        Nenhum curso encontrado.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredCourses.map((course) => (
                                    <TableRow key={course.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                        <TableCell className="font-medium text-white">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center overflow-hidden">
                                                    {course.thumbnail ? (
                                                        <img src={course.thumbnail} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <BookOpen className="h-5 w-5 text-zinc-600" />
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span>{course.title}</span>
                                                    <span className="text-xs text-zinc-500 truncate max-w-[200px]">{course.description}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-zinc-300">{course.instructor || '-'}</TableCell>
                                        <TableCell>
                                            <span className={`text-xs px-2 py-1 rounded border capitalize
                                        ${course.difficulty === 'beginner' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                    course.difficulty === 'intermediate' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                                        'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                                {course.difficulty}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-zinc-300">{course.lessons_count || 0}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10">
                                                    <DropdownMenuItem onClick={() => router.push(`/courses/manage/${course.id}`)} className="text-zinc-300 focus:text-white focus:bg-white/10 cursor-pointer">
                                                        <Edit2 className="mr-2 h-4 w-4" /> Editar
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDeleteCourse(course.id)} className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer">
                                                        <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <CreateCourseModal
                open={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreateCourse}
            />
        </div>
    )
}
