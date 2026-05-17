'use client';

import React, { useState } from 'react';
import Wizard from '@/components/vibecanvas/Wizard';
import Dashboard from '@/components/vibecanvas/Dashboard';
import { VisualStyle, MusicGenre, FontStyle, TextEffect, GenerationConfig, AlbumMood, SavedProject } from '@/types/vibecanvas';
import { generateBriefing } from '@/lib/vibecanvas/briefingGenerator';
import { saveProject, updateProject } from '@/lib/vibecanvas/storageService';
import { Sparkles, AlertCircle, Disc, X, Copy, Check, RefreshCcw, LayoutGrid, ArrowLeft, FileText } from 'lucide-react';

const INITIAL_CONFIG: GenerationConfig = {
    visualStyle: VisualStyle.DIGITAL_ART,
    musicGenre: MusicGenre.POP,
    mood: AlbumMood.ENERGETIC,
    details: '',
    scenario: '',
    elements: '',
    lighting: '' as any, // Initial empty state, will be handled in Wizard
    textMaterial: '' as any,
    colorPalette: '',
    contrast: '' as any,
    referenceImage: null,
    textConfig: {
        enabled: true,
        title: '',
        artist: '',
        fontStyle: FontStyle.SANS_BOLD,
        color: 'Branco',
        effect: [TextEffect.NEON_GLOW]
    }
};

type AppView = 'dashboard' | 'wizard' | 'results' | 'loading';

export default function VibeCanvasPage() {
    const [view, setView] = useState<AppView>('dashboard');
    const [config, setConfig] = useState<GenerationConfig>(INITIAL_CONFIG);
    const [generatedBriefing, setGeneratedBriefing] = useState<string | null>(null);
    const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState<boolean>(false);

    // Navigation Handlers
    const handleGoToDashboard = () => {
        setView('dashboard');
        setGeneratedBriefing(null);
        setCurrentProjectId(null);
    };

    const handleCreateNew = () => {
        setConfig(INITIAL_CONFIG);
        setGeneratedBriefing(null);
        setCurrentProjectId(null);
        setView('wizard');
    };

    const handleOpenProject = (project: SavedProject) => {
        setConfig(project.config);
        setGeneratedBriefing(project.briefing);
        setCurrentProjectId(project.id);
        setView('results');
    };

    const handleEditProject = () => {
        // Keeps current config, just sends to wizard
        setView('wizard');
    };

    const handleGenerate = async () => {
        setView('loading');
        setError(null);
        setGeneratedBriefing(null);

        try {
            const briefing = generateBriefing(config);
            setGeneratedBriefing(briefing);

            // Auto Save or Update
            if (currentProjectId) {
                updateProject(currentProjectId, config, briefing);
            } else {
                const newProject = saveProject(config, briefing);
                setCurrentProjectId(newProject.id);
            }
            setView('results');

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Erro inesperado ao gerar briefing.");
            setView('wizard'); // Go back to wizard on error
        }
    };

    const handleCopy = () => {
        if (generatedBriefing) {
            navigator.clipboard.writeText(generatedBriefing);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-black text-zinc-100 font-sans selection:bg-orange-500/30 overflow-hidden flex flex-col">

            {/* Internal Header for VibeCanvas actions */}
            <div className=" z-30 bg-black/50 backdrop-blur-md border-b border-white/5 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2 cursor-pointer" onClick={handleGoToDashboard}>
                    <Disc className="text-orange-500 animate-spin-slow" size={28} />
                    <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">VibeCanvas</span>
                </div>

                <div className="flex items-center gap-4">
                    {view !== 'dashboard' && (
                        <button
                            onClick={handleGoToDashboard}
                            className="text-sm font-medium text-zinc-400 hover:text-white flex items-center gap-2 transition-colors"
                        >
                            <LayoutGrid size={16} />
                            <span className="hidden sm:inline">Meus Projetos</span>
                        </button>
                    )}
                    {view === 'results' && (
                        <button
                            onClick={handleCreateNew}
                            className="text-sm font-medium text-white bg-orange-600 hover:bg-orange-500 px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors"
                        >
                            <Sparkles size={14} />
                            <span className="hidden sm:inline">Novo</span>
                        </button>
                    )}
                </div>
            </div>

            <main className="flex-1 relative flex flex-col overflow-y-auto">
                {/* Background Visuals */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-orange-900/10 via-black to-black pointer-events-none fixed"></div>

                {/* Error Toast */}
                {error && (
                    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
                        <div className="bg-red-950/90 border border-red-500/30 text-red-200 px-6 py-4 rounded-xl flex items-center gap-3 shadow-2xl backdrop-blur-md max-w-md">
                            <AlertCircle size={20} className="shrink-0 text-red-400" />
                            <p className="text-sm font-medium leading-tight">{error}</p>
                            <button onClick={() => setError(null)} className="ml-auto hover:text-white p-1"><X className="w-4 h-4" /></button>
                        </div>
                    </div>
                )}

                {/* VIEW: DASHBOARD */}
                {view === 'dashboard' && (
                    <Dashboard onCreateNew={handleCreateNew} onEdit={handleOpenProject} />
                )}

                {/* VIEW: WIZARD */}
                {view === 'wizard' && (
                    <Wizard config={config} setConfig={setConfig} onComplete={handleGenerate} />
                )}

                {/* VIEW: LOADING */}
                {view === 'loading' && (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 animate-in fade-in duration-700 min-h-[50vh]">
                        <div className="relative">
                            <div className="w-24 h-24 border-4 border-zinc-800 rounded-full"></div>
                            <div className="absolute inset-0 w-24 h-24 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <FileText className="text-orange-500 animate-pulse" size={32} />
                            </div>
                        </div>
                        <h2 className="mt-8 text-2xl font-bold text-white">Compilando Briefing</h2>
                        <p className="text-zinc-500 mt-2 text-center max-w-md animate-pulse">
                            Organizando as informações do projeto {config.textConfig.title}...
                        </p>
                    </div>
                )}

                {/* VIEW: RESULTS */}
                {view === 'results' && generatedBriefing && (
                    <div className="w-full max-w-4xl mx-auto px-6 py-8 pb-32 z-10 animate-in slide-in-from-bottom-8 fade-in duration-700">

                        <div className="flex flex-col items-center text-center mb-8 space-y-4">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 text-sm font-medium">
                                <Check size={14} />
                                {currentProjectId ? 'Briefing Salvo com Sucesso' : 'Briefing Gerado'}
                            </div>
                            <h2 className="text-4xl md:text-5xl font-bold text-white">Briefing de Design</h2>
                            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
                                Instruções técnicas para a capa de <b>{config.textConfig.artist} - {config.textConfig.title}</b>.
                            </p>

                            <div className="flex gap-4 pt-2">
                                <button
                                    onClick={handleGoToDashboard}
                                    className="text-zinc-400 hover:text-white flex items-center gap-2 px-4 py-2 hover:bg-white/5 rounded-full transition-colors"
                                >
                                    <ArrowLeft size={16} /> Voltar ao Dashboard
                                </button>
                                <button
                                    onClick={handleEditProject}
                                    className="text-orange-400 hover:text-orange-300 flex items-center gap-2 px-4 py-2 hover:bg-orange-500/10 rounded-full transition-colors"
                                >
                                    <RefreshCcw size={16} /> Editar Informações
                                </button>
                            </div>
                        </div>

                        <div className="relative bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 hover:border-orange-500/30 transition-all duration-500 shadow-2xl shadow-black/50">
                            <div className="absolute top-6 right-6">
                                <button
                                    onClick={handleCopy}
                                    className={`
                                        flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all
                                        ${copied
                                            ? 'bg-green-500 text-white shadow-lg shadow-green-900/20'
                                            : 'bg-white/10 text-white hover:bg-white/20'}
                                    `}
                                >
                                    {copied ? (
                                        <> <Check size={16} /> Copiado! </>
                                    ) : (
                                        <> <Copy size={16} /> Copiar Briefing </>
                                    )}
                                </button>
                            </div>

                            <div className="font-mono text-sm md:text-base leading-relaxed text-zinc-300 whitespace-pre-wrap">
                                {generatedBriefing}
                            </div>
                        </div>

                    </div>
                )}


            </main >
        </div >
    );
}
