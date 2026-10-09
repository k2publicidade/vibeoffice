import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { GenerationConfig, MusicGenre, AlbumMood, VISUAL_STYLE_CATEGORIES, VisualStyle, FontStyle, TextEffect } from '@/types/vibecanvas';
import { ChevronRight, ChevronLeft, Flag, Info, Camera, Image as ImageIcon, Music, Palette, Type, Check, Sparkles, Upload, X } from 'lucide-react';

interface WizardProps {
    config: GenerationConfig;
    setConfig: React.Dispatch<React.SetStateAction<GenerationConfig>>;
    onComplete: () => void;
}

const STEPS = [
    { id: 'intro', title: 'Boas-vindas' },
    { id: 'identity', title: 'Identidade' },
    { id: 'genre', title: 'Gênero' },
    { id: 'mood', title: 'Vibe' },
    { id: 'style', title: 'Estilo' },
    { id: 'scenario', title: 'Cenário & Luz' },
    { id: 'details', title: 'Detalhes' },
    { id: 'review', title: 'Revisão' }
];

const Wizard: React.FC<WizardProps> = ({ config, setConfig, onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0;
        }
    }, [currentStep]);

    const updateConfig = (key: keyof GenerationConfig, value: any) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const updateTextConfig = (key: keyof GenerationConfig['textConfig'], value: any) => {
        setConfig(prev => ({
            ...prev,
            textConfig: { ...prev.textConfig, [key]: value }
        }));
    };

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            onComplete();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) { toast.error('Escolha uma imagem de até 2 MB'); event.target.value = ''; return; }
            const reader = new FileReader();
            reader.onloadend = () => {
                updateConfig('referenceImage', reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const clearReferenceImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        updateConfig('referenceImage', null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Render Functions
    const renderStepContent = () => {
        switch (currentStep) {
            case 0: // Intro
                return (
                    <div className="flex flex-col items-center justify-center text-center space-y-8 py-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="w-24 h-24 bg-gradient-to-tr from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-2xl shadow-orange-900/40 mb-4">
                            <Sparkles className="text-white w-12 h-12" />
                        </div>
                        <div className="space-y-4 max-w-lg">
                            <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
                                Vamos criar algo épico.
                            </h2>
                            <p className="text-zinc-400 text-lg leading-relaxed">
                                Bem-vindo ao <b>VibeCanvas Studio</b>. Vou guiar você em um processo passo a passo para criar briefings perfeitos para capas de álbuns, singles ou playlists.
                            </p>
                        </div>
                        <button
                            onClick={handleNext}
                            className="group bg-white hover:bg-zinc-200 text-black font-bold text-lg px-8 py-4 rounded-full transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 flex items-center gap-2"
                        >
                            Começar Agora
                            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                );

            case 1: // Identity
                return (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                                <Type className="text-orange-500" />
                                Identidade do Projeto
                            </h3>
                            <p className="text-zinc-400">Primeiro, como devemos chamar essa obra? Essas informações aparecerão na capa se você desejar.</p>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300 uppercase tracking-wider">Nome do Artista / Banda</label>
                                <input
                                    type="text"
                                    value={config.textConfig.artist}
                                    onChange={(e) => updateTextConfig('artist', e.target.value)}
                                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 text-white placeholder-zinc-600 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 outline-none transition-all"
                                    placeholder="Ex: MC Kevinho, Arctic Monkeys..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300 uppercase tracking-wider">Título do Álbum / Single</label>
                                <input
                                    type="text"
                                    value={config.textConfig.title}
                                    onChange={(e) => updateTextConfig('title', e.target.value)}
                                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 text-white placeholder-zinc-600 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 outline-none transition-all"
                                    placeholder="Ex: Neon Lights, Saudade..."
                                />
                            </div>
                            <div className="pt-4 flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="includeText"
                                    checked={config.textConfig.enabled}
                                    onChange={(e) => updateTextConfig('enabled', e.target.checked)}
                                    className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-orange-500 focus:ring-orange-500 focus:ring-offset-black"
                                />
                                <label htmlFor="includeText" className="text-zinc-300 cursor-pointer select-none">
                                    Incluir estes textos na arte final?
                                </label>
                            </div>
                        </div>
                    </div>
                );

            case 2: // Genre
                return (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                                <Music className="text-blue-500" />
                                Estilo Musical
                            </h3>
                            <p className="text-zinc-400">Qual a sonoridade desse projeto? Isso ajuda a definir a estética visual correta (ex: Rock pede algo mais sujo, Pop algo mais limpo).</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {Object.values(MusicGenre).map((genre) => (
                                <button
                                    key={genre}
                                    onClick={() => updateConfig('musicGenre', genre)}
                                    className={`
                                    text-left px-4 py-3 rounded-xl border transition-all duration-200
                                    ${config.musicGenre === genre
                                            ? 'bg-blue-500/20 border-blue-500 text-white shadow-lg shadow-blue-900/20'
                                            : 'bg-zinc-800/30 border-zinc-700/50 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-600'}
                                `}
                                >
                                    {genre}
                                </button>
                            ))}
                        </div>
                    </div>
                );

            case 3: // Mood
                return (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                                {/* Mood Icon */}
                                <span className="text-2xl">🎭</span>
                                Vibe e Sentimento
                            </h3>
                            <p className="text-zinc-400">O que o ouvinte deve sentir ao olhar para a capa? Escolha a emoção principal.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Object.values(AlbumMood).map((mood) => (
                                <button
                                    key={mood}
                                    onClick={() => updateConfig('mood', mood)}
                                    className={`
                                    text-left px-5 py-4 rounded-xl border transition-all duration-200 flex items-center justify-between group
                                    ${config.mood === mood
                                            ? 'bg-purple-500/20 border-purple-500 text-white shadow-lg shadow-purple-900/20'
                                            : 'bg-zinc-800/30 border-zinc-700/50 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-600'}
                                `}
                                >
                                    <span>{mood}</span>
                                    {config.mood === mood && <Check size={18} className="text-purple-400" />}
                                </button>
                            ))}
                        </div>
                    </div>
                );

            case 4: // Visual Style
                return (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                                <Palette className="text-pink-500" />
                                Direção de Arte
                            </h3>
                            <p className="text-zinc-400">Agora a parte divertida. Qual técnica visual você visualiza para essa capa?</p>
                        </div>

                        <div className="space-y-8 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                            {Object.entries(VISUAL_STYLE_CATEGORIES).map(([category, styles]) => (
                                <div key={category} className="space-y-3">
                                    <h4 className="text-zinc-500 text-xs font-bold uppercase tracking-widest pl-1">{category}</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {styles.map(style => (
                                            <button
                                                key={style}
                                                onClick={() => updateConfig('visualStyle', style)}
                                                className={`
                                                text-left px-4 py-3 rounded-xl border transition-all duration-200
                                                ${config.visualStyle === style
                                                        ? 'bg-pink-500/20 border-pink-500 text-white shadow-lg shadow-pink-900/20'
                                                        : 'bg-zinc-800/30 border-zinc-700/50 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-600'}
                                            `}
                                            >
                                                {style}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 5: // Scenario & Lighting & Materials
                return (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                                <Camera className="text-purple-400" />
                                Cenário e Atmosfera
                            </h3>
                            <p className="text-zinc-400">Defina o ambiente, a iluminação e os materiais do texto 3D.</p>
                        </div>

                        <div className="space-y-6">
                            {/* Cenário */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300 uppercase tracking-wider">Cenário Principal</label>
                                <input
                                    type="text"
                                    value={config.scenario || ''}
                                    onChange={(e) => updateConfig('scenario', e.target.value)}
                                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 text-white placeholder-zinc-600 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none transition-all"
                                    placeholder="Ex: Uma cidade futurista flutuante, um deserto de areia vermelha..."
                                />
                            </div>

                            {/* Elementos */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300 uppercase tracking-wider">Elementos de Ambiente</label>
                                <input
                                    type="text"
                                    value={config.elements || ''}
                                    onChange={(e) => updateConfig('elements', e.target.value)}
                                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 text-white placeholder-zinc-600 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none transition-all"
                                    placeholder="Ex: Neblina baixa, partículas de luz, chuva ácida..."
                                />
                            </div>

                            {/* Iluminação - Usando Select ou Grid de Opções */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300 uppercase tracking-wider">Iluminação</label>
                                <select
                                    value={config.lighting}
                                    onChange={(e) => updateConfig('lighting', e.target.value)}
                                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 text-white outline-none cursor-pointer"
                                >
                                    <option value="">Selecione uma iluminação...</option>
                                    <option value="Natural / Solar">Natural / Solar</option>
                                    <option value="Estúdio / Fotografia">Estúdio / Fotografia</option>
                                    <option value="Neon / Cyberpunk">Neon / Cyberpunk</option>
                                    <option value="Cinemática / Dramática">Cinemática / Dramática</option>
                                    <option value="Volumétrica / God Rays">Volumétrica / God Rays</option>
                                    <option value="Escura / Low Key">Escura / Low Key</option>
                                    <option value="Dourada / Golden Hour">Dourada / Golden Hour</option>
                                </select>
                            </div>

                            {/* Material Texto */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300 uppercase tracking-wider">Material do Lettering 3D</label>
                                <select
                                    value={config.textMaterial}
                                    onChange={(e) => updateConfig('textMaterial', e.target.value)}
                                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 text-white outline-none cursor-pointer"
                                >
                                    <option value="">Selecione o material...</option>
                                    <option value="Cromo / Prateado">Cromo / Prateado</option>
                                    <option value="Ouro / Dourado">Ouro / Dourado</option>
                                    <option value="Vidro / Cristal">Vidro / Cristal</option>
                                    <option value="Metal Escovado">Metal Escovado</option>
                                    <option value="Neon Luminoso">Neon Luminoso</option>
                                    <option value="Plástico Glossy">Plástico Glossy</option>
                                    <option value="Pedra / Mármore">Pedra / Mármore</option>
                                    <option value="Concreto">Concreto</option>
                                    <option value="Gelo">Gelo</option>
                                </select>
                            </div>
                        </div>
                    </div>
                );

            case 6: // Details & Reference
                return (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                                <Camera className="text-amber-500" />
                                Detalhes Finais
                            </h3>
                            <p className="text-zinc-400">Quer adicionar algo específico? Um objeto, uma cor predominante, ou um cenário?</p>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300 uppercase tracking-wider">Descrição Específica (Opcional)</label>
                                <textarea
                                    value={config.details}
                                    onChange={(e) => updateConfig('details', e.target.value)}
                                    className="w-full h-32 bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 text-white placeholder-zinc-600 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none transition-all resize-none leading-relaxed"
                                    placeholder="Ex: Quero um astronauta sentado numa cadeira de praia em Marte, bebendo um suco neon. Cores predominantes: roxo e ciano."
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300 uppercase tracking-wider">Imagem de Referência (Opcional)</label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`
                                    relative w-full h-32 rounded-xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex items-center justify-center
                                    ${config.referenceImage
                                            ? 'border-amber-500/50 bg-zinc-900'
                                            : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/30'}
                                `}
                                >
                                    {config.referenceImage ? (
                                        <>
                                            <Image
                                                src={config.referenceImage}
                                                alt="Referência"
                                                fill
                                                unoptimized
                                                className="object-cover opacity-60"
                                            />
                                            <button
                                                onClick={clearReferenceImage}
                                                className="absolute bg-black/50 hover:bg-red-500/80 p-2 rounded-full text-white transition-colors"
                                            >
                                                <X size={20} />
                                            </button>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-zinc-500">
                                            <Upload size={24} />
                                            <span className="text-sm">Clique para upload</span>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileUpload}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 7: // Review
                return (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                        <div className="space-y-2 text-center">
                            <h3 className="text-3xl font-bold text-white">Tudo Pronto?</h3>
                            <p className="text-zinc-400">Revise suas escolhas antes de gerarmos o briefing.</p>
                        </div>

                        <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-2xl p-6 space-y-4 max-w-lg mx-auto">
                            <div className="flex justify-between border-b border-white/5 pb-2">
                                <span className="text-zinc-500">Artista</span>
                                <span className="text-white font-medium">{config.textConfig.artist || '-'}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-2">
                                <span className="text-zinc-500">Título</span>
                                <span className="text-white font-medium">{config.textConfig.title || '-'}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-2">
                                <span className="text-zinc-500">Gênero</span>
                                <span className="text-white font-medium">{config.musicGenre}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-2">
                                <span className="text-zinc-500">Vibe</span>
                                <span className="text-white font-medium">{config.mood.split(' / ')[0]}</span>
                            </div>
                            <div className="flex justify-between pb-2">
                                <span className="text-zinc-500">Estilo</span>
                                <span className="text-white font-medium">{config.visualStyle}</span>
                            </div>
                        </div>

                        <div className="flex justify-center pt-4">
                            <button
                                onClick={onComplete}
                                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white text-xl font-bold px-12 py-5 rounded-2xl shadow-xl shadow-orange-900/30 transform transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
                            >
                                <Sparkles className="fill-white" />
                                Gerar Briefing
                            </button>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto h-full flex flex-col relative z-10">

            {/* Container Principal */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-6 py-8"
            >
                {renderStepContent()}
            </div>

            {/* Navegação Fixa Inferior (Escondida no passo 0 e final) */}
            {currentStep > 0 && currentStep < STEPS.length - 1 && (
                <div className="p-6 border-t border-white/10 bg-black/80 backdrop-blur-md flex justify-between items-center">
                    <button
                        onClick={handleBack}
                        className="text-zinc-400 hover:text-white flex items-center gap-2 px-4 py-2 hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <ChevronLeft size={20} />
                        Voltar
                    </button>

                    <div className="flex gap-2">
                        {STEPS.slice(1, -1).map((step, idx) => (
                            <div
                                key={step.id}
                                className={`w-2 h-2 rounded-full transition-all ${idx + 1 === currentStep ? 'bg-orange-500 w-6' : 'bg-zinc-800'}`}
                            />
                        ))}
                    </div>

                    <button
                        onClick={handleNext}
                        disabled={currentStep === 1 && (!config.textConfig.artist || !config.textConfig.title)}
                        className={`
                    bg-white text-black font-semibold px-6 py-3 rounded-xl flex items-center gap-2 transition-all
                    ${(currentStep === 1 && (!config.textConfig.artist || !config.textConfig.title)) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-zinc-200 hover:scale-105 active:scale-95'}
                `}
                    >
                        Próximo
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default Wizard;
