'use client'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { GripVertical, Plus, Trash2, Video, FileText, Edit2 } from 'lucide-react'
import { Module, Lesson } from '@/types/courses'

interface ModuleListProps {
    modules: Module[]
    onAddLesson: (moduleId: string) => void
    onEditLesson: (moduleId: string, lesson: Lesson) => void
    onDeleteLesson: (lessonId: string) => void
    onDeleteModule: (moduleId: string) => void
}

export function ModuleList({ modules, onAddLesson, onEditLesson, onDeleteLesson, onDeleteModule }: ModuleListProps) {
    if (!modules || modules.length === 0) {
        return (
            <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl">
                <p className="text-zinc-500">Nenhum módulo criado ainda.</p>
                <p className="text-sm text-zinc-600">Clique em "Novo Módulo" para começar.</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {modules.map((module) => (
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
                                    onClick={(e) => { e.stopPropagation(); onAddLesson(module.id) }}
                                    className="text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 h-8"
                                >
                                    <Plus size={14} className="mr-1" /> Aula
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => { e.stopPropagation(); onDeleteModule(module.id) }}
                                    className="text-red-500 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0"
                                >
                                    <Trash2 size={14} />
                                </Button>
                            </div>
                        </div>
                        <AccordionContent className="px-4 pb-4 pt-0 border-t border-white/5">
                            <div className="mt-2 space-y-2">
                                {module.lessons.length === 0 && (
                                    <p className="text-zinc-600 italic text-sm py-2 text-center border border-dashed border-zinc-800 rounded">
                                        Nenhuma aula neste módulo.
                                    </p>
                                )}
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
                                                onClick={() => onEditLesson(module.id, lesson)}
                                            >
                                                <Edit2 className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 w-7 p-0 text-zinc-400 hover:text-red-500"
                                                onClick={() => onDeleteLesson(lesson.id)}
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
    )
}
