'use client'

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCourses } from '@/hooks/useCourses';
import { CheckCircle, LayoutList, ArrowLeft, FileText, CheckCircle2, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { videoEmbedUrl } from '@/lib/video';

export default function CoursePlayerPage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const { courses, loading, getCourseById, toggleLessonComplete, isLessonCompleted, getProgressStats } = useCourses();

    // State
    const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const course = useMemo(() => getCourseById(id), [id, getCourseById]);

    // Set initial lesson
    useEffect(() => {
        if (course && course.modules && course.modules.length > 0 && !currentLessonId) {
            // Find first lesson of first module
            const firstLesson = course.modules[0].lessons[0];
            if (firstLesson) setCurrentLessonId(firstLesson.id);
        }
    }, [course, currentLessonId]);

    // Derived State (precisa estar ANTES dos early returns pra respeitar Rules of Hooks)
    const currentLesson = useMemo(() => {
        if (!course || !currentLessonId) return null;
        for (const mod of course.modules || []) {
            const lesson = (mod.lessons || []).find(l => l.id === currentLessonId);
            if (lesson) return lesson;
        }
        return null;
    }, [course, currentLessonId]);

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500">Carregando curso...</div>;
    if (!course) return <div className="min-h-screen bg-black flex items-center justify-center text-red-500">Curso não encontrado.</div>;

    const isCurrentCompleted = currentLessonId ? isLessonCompleted(course.id, currentLessonId) : false;
    const progress = getProgressStats(course.id);

    // Handlers
    const handleLessonChange = (lessonId: string) => {
        setCurrentLessonId(lessonId);
    };

    const handleToggleComplete = () => {
        if (currentLesson) {
            toggleLessonComplete(course.id, currentLesson.id, !isCurrentCompleted);
        }
    };

    // Render Video/Content
    const renderContent = () => {
        if (!currentLesson) return <div className="text-zinc-500">Selecione uma aula</div>;

        if (currentLesson.type === 'video' && currentLesson.content_url) {
            const embedUrl = videoEmbedUrl(currentLesson.content_url);

            if (!embedUrl) {
                return (
                    <div className="flex flex-col items-center justify-center min-h-[400px] bg-zinc-900/30 rounded-xl border border-white/5 p-6 text-center">
                        <FileText size={48} className="text-zinc-600 mb-4" />
                        <p className="text-zinc-400 mb-2">URL do vídeo inválida ou não suportada.</p>
                        <a
                            href={currentLesson.content_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-red-400 hover:text-red-300 text-sm underline break-all"
                        >
                            Abrir em nova aba
                        </a>
                    </div>
                );
            }

            return (
                <div className="relative w-full h-0 pb-[56.25%] bg-black rounded-xl overflow-hidden border border-white/5 shadow-2xl">
                    <iframe
                        src={embedUrl}
                        className="absolute top-0 left-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                </div>
            );
        }

        if (currentLesson.type === 'html') {
            return (
                <div className="prose prose-invert max-w-none p-8 bg-zinc-900/50 rounded-xl border border-white/5">
                    <div dangerouslySetInnerHTML={{ __html: currentLesson.content || '' }} />
                </div>
            )
        }

        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-zinc-900/30 rounded-xl border border-white/5">
                <FileText size={48} className="text-zinc-600 mb-4" />
                <p className="text-zinc-400">Conteúdo em texto/arquivo. Visualize o material abaixo.</p>
            </div>
        )
    };

    // Conteúdo da sidebar (lista de aulas) — reutilizado em desktop aside e mobile Sheet
    const sidebarContent = (
        <>
            <div className="p-4 border-b border-white/5 bg-zinc-900/50 flex justify-between items-center">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <LayoutList size={18} />
                    Conteúdo
                </h3>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 space-y-6">
                    {course.modules?.map((module, mIndex) => (
                        <div key={module.id} className="space-y-3">
                            <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase font-bold tracking-widest px-2">
                                <span className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[10px]">{mIndex + 1}</span>
                                {module.title}
                            </div>
                            <div className="space-y-1">
                                {module.lessons.map((lesson) => {
                                    const isActive = lesson.id === currentLessonId;
                                    const isDone = isLessonCompleted(course.id, lesson.id);

                                    return (
                                        <button
                                            key={lesson.id}
                                            onClick={() => {
                                                handleLessonChange(lesson.id);
                                                // fecha o Sheet em mobile após escolher a aula
                                                setSidebarOpen(false);
                                            }}
                                            className={cn(
                                                "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all group min-h-11",
                                                isActive ? "bg-red-600/10 border border-red-500/20" : "hover:bg-white/5 border border-transparent"
                                            )}
                                        >
                                            <div className={cn(
                                                "mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                                                isDone
                                                    ? "bg-emerald-500 border-emerald-500"
                                                    : isActive ? "border-red-500" : "border-zinc-700 group-hover:border-zinc-500"
                                            )}>
                                                {isDone && <CheckCircle size={10} className="text-black" />}
                                                {!isDone && isActive && <div className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                                            </div>
                                            <div>
                                                <p className={cn(
                                                    "text-sm font-medium leading-tight mb-1",
                                                    isActive ? "text-red-400" : isDone ? "text-zinc-400" : "text-zinc-300"
                                                )}>
                                                    {lesson.title}
                                                </p>
                                                <p className="text-[10px] text-zinc-600 font-mono">
                                                    {lesson.duration ? `${lesson.duration}m` : 'Vídeo'}
                                                </p>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </>
    );

    return (
        <div className="min-h-screen bg-black text-white flex flex-col overflow-hidden">

            {/* Top Bar */}
            <header className="h-16 border-b border-white/5 bg-zinc-950 flex items-center justify-between px-4 sm:px-6 z-20">
                <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                    <button
                        onClick={() => router.push('/courses')}
                        className="p-2 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors h-11 w-11 flex items-center justify-center shrink-0"
                        aria-label="Voltar para cursos"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="h-6 w-px bg-white/10 shrink-0" />
                    <h1 className="text-sm md:text-base font-bold text-white truncate max-w-[160px] sm:max-w-[200px] md:max-w-md">
                        {course.title}
                    </h1>
                </div>

                <div className="flex items-center gap-2 sm:gap-4">
                    <div className="hidden md:flex flex-col items-end mr-4">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Progresso do Curso</span>
                        <div className="flex items-center gap-2">
                            <div className="w-32 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress.percentage}%` }} />
                            </div>
                            <span className="text-xs font-bold text-white">{progress.percentage}%</span>
                        </div>
                    </div>

                    {/* Botão hambúrguer pra abrir a sidebar em mobile/tablet */}
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden p-2 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors h-11 w-11 flex items-center justify-center"
                        aria-label="Abrir lista de aulas"
                    >
                        <Menu size={20} />
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
                    <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-10 space-y-6 md:space-y-8">

                        {/* Progresso do curso em mobile (header não mostra) */}
                        <div className="md:hidden">
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Progresso do Curso</span>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress.percentage}%` }} />
                                </div>
                                <span className="text-xs font-bold text-white">{progress.percentage}%</span>
                            </div>
                        </div>

                        {/* Video Player */}
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {renderContent()}
                        </div>

                        {/* Lesson Info & Actions */}
                        {currentLesson && (
                            <div className="flex flex-col md:flex-row justify-between items-start gap-4 md:gap-6 pb-20">
                                <div className="flex-1 space-y-4">
                                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                                        <h2 className="text-xl md:text-2xl font-bold text-white">{currentLesson.title}</h2>
                                        {isCurrentCompleted && <span className="bg-emerald-500/10 text-emerald-500 text-xs px-2 py-0.5 rounded border border-emerald-500/20 font-bold uppercase tracking-wider flex items-center gap-1"><CheckCircle2 size={12} /> Concluído</span>}
                                    </div>
                                    <p className="text-zinc-400 leading-relaxed text-sm md:text-base">
                                        {currentLesson.description || 'Sem descrição para esta aula.'}
                                    </p>
                                </div>

                                <div className="flex flex-col gap-3 w-full md:w-auto md:min-w-[200px]">
                                    <button
                                        onClick={handleToggleComplete}
                                        className={cn(
                                            "w-full min-h-11 py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all active:scale-95",
                                            isCurrentCompleted
                                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20"
                                                : "bg-white text-black hover:bg-zinc-200"
                                        )}
                                    >
                                        <CheckCircle size={18} />
                                        {isCurrentCompleted ? 'Concluída' : 'Marcar como Concluída'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </main>

                {/* Sidebar — desktop */}
                <aside className="hidden lg:flex lg:w-72 xl:w-80 border-l border-white/5 bg-zinc-950 flex-col overflow-hidden">
                    {sidebarContent}
                </aside>
            </div>

            {/* Sidebar — mobile/tablet (Sheet) */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetContent
                    side="right"
                    className="w-80 max-w-[85vw] p-0 bg-zinc-950 border-zinc-800 lg:hidden"
                >
                    <div className="flex flex-col h-full">
                        {sidebarContent}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
