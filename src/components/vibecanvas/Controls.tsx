
import React, { useRef } from 'react';
import { VisualStyle, MusicGenre, FontStyle, TextEffect, GenerationConfig, AlbumMood, VISUAL_STYLE_CATEGORIES } from '@/types/vibecanvas';
import { Palette, Music, Type, Upload, X, Image as ImageIcon, ChevronDown, Plus, Heart } from 'lucide-react';

interface ControlsProps {
    config: GenerationConfig;
    setConfig: React.Dispatch<React.SetStateAction<GenerationConfig>>;
    className?: string;
}

interface InputWrapperProps {
    label: string;
    icon?: any;
    children: React.ReactNode;
}

const InputWrapper: React.FC<InputWrapperProps> = ({ label, icon: Icon, children }) => (
    <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider ml-1">
            {Icon && <Icon size={12} className="text-orange-500" />}
            {label}
        </label>
        {children}
    </div>
);

const Controls: React.FC<ControlsProps> = ({ config, setConfig, className = "" }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const updateConfig = (key: keyof GenerationConfig, value: any) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const updateTextConfig = (key: keyof GenerationConfig['textConfig'], value: any) => {
        setConfig(prev => ({
            ...prev,
            textConfig: { ...prev.textConfig, [key]: value }
        }));
    };

    const addTextEffect = (effectToAdd: TextEffect) => {
        if (!config.textConfig.effect.includes(effectToAdd)) {
            updateTextConfig('effect', [...config.textConfig.effect, effectToAdd]);
        }
    };

    const removeTextEffect = (effectToRemove: TextEffect) => {
        updateTextConfig('effect', config.textConfig.effect.filter(e => e !== effectToRemove));
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
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

    const SelectStyle = "w-full bg-zinc-800/50 hover:bg-zinc-800 transition-colors border border-zinc-700/50 focus:border-orange-500/50 rounded-xl p-3.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500/20 appearance-none";
    const InputStyle = "w-full bg-zinc-800/50 hover:bg-zinc-800 transition-colors border border-zinc-700/50 focus:border-orange-500/50 rounded-xl p-3.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500/20 placeholder-zinc-600";

    return (
        <div className={`space-y-8 ${className}`}>

            {/* Section 1: Music & Vibe */}
            <section className="space-y-4">
                <div className="flex items-center gap-2 text-zinc-100 text-lg font-semibold">
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                        <Music size={20} className="text-orange-500" />
                    </div>
                    <h2>Estilo Musical</h2>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <InputWrapper label="Gênero">
                        <div className="relative">
                            <select
                                className={SelectStyle}
                                value={config.musicGenre}
                                onChange={(e) => updateConfig('musicGenre', e.target.value)}
                            >
                                {Object.values(MusicGenre).map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
                        </div>
                    </InputWrapper>

                    <InputWrapper label="Humor / Sentimento (Vibe)" icon={Heart}>
                        <div className="relative">
                            <select
                                className={SelectStyle}
                                value={config.mood}
                                onChange={(e) => updateConfig('mood', e.target.value)}
                            >
                                {Object.values(AlbumMood).map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
                        </div>
                    </InputWrapper>
                </div>
            </section>

            {/* Section 2: Visual Style */}
            <section className="space-y-4 pt-4 border-t border-zinc-800/50">
                <div className="flex items-center gap-2 text-zinc-100 text-lg font-semibold">
                    <div className="p-2 bg-red-500/10 rounded-lg">
                        <Palette size={20} className="text-red-500" />
                    </div>
                    <h2>Direção de Arte</h2>
                </div>

                <div className="space-y-4">
                    <InputWrapper label="Estilo Visual">
                        <div className="relative">
                            <select
                                className={SelectStyle}
                                value={config.visualStyle}
                                onChange={(e) => updateConfig('visualStyle', e.target.value)}
                            >
                                {Object.entries(VISUAL_STYLE_CATEGORIES).map(([category, styles]) => (
                                    <optgroup key={category} label={category} className="bg-zinc-900 text-zinc-300 font-semibold">
                                        {styles.map(s => <option key={s} value={s} className="bg-zinc-800 text-zinc-100 font-normal">{s}</option>)}
                                    </optgroup>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
                        </div>
                    </InputWrapper>

                    <InputWrapper label="Detalhes da Cena">
                        <textarea
                            className={`${InputStyle} min-h-[100px] resize-none leading-relaxed`}
                            placeholder="Descreva elementos chave... ex: Um astronauta solitário em um penhasco neon, lua vermelha ao fundo..."
                            value={config.details}
                            onChange={(e) => updateConfig('details', e.target.value)}
                        />
                    </InputWrapper>
                </div>
            </section>

            {/* Section 3: Reference Images */}
            <section className="space-y-4 pt-4 border-t border-zinc-800/50">
                <div className="flex items-center gap-2 text-zinc-100 text-lg font-semibold">
                    <div className="p-2 bg-pink-500/10 rounded-lg">
                        <ImageIcon size={20} className="text-pink-500" />
                    </div>
                    <h2>Referências (Opcional)</h2>
                </div>

                <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`
            relative group w-full aspect-[3/1] rounded-xl border-2 border-dashed transition-all cursor-pointer overflow-hidden
            ${config.referenceImage
                            ? 'border-orange-500/50 bg-zinc-900'
                            : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/30'
                        }
          `}
                >
                    {config.referenceImage ? (
                        <>
                            <img
                                src={config.referenceImage}
                                alt="Referência"
                                className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <button
                                    onClick={clearReferenceImage}
                                    className="bg-red-500/80 hover:bg-red-600 text-white px-4 py-2 rounded-full font-medium text-sm flex items-center gap-2 backdrop-blur-sm transition-all shadow-lg transform scale-100 active:scale-95"
                                >
                                    <X size={16} /> Remover
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 gap-2">
                            <Upload size={24} />
                            <span className="text-sm font-medium">Toque para adicionar foto ou logo</span>
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
            </section>

            {/* Section 4: Typography */}
            <section className="space-y-4 pt-4 border-t border-zinc-800/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-zinc-100 text-lg font-semibold">
                        <div className="p-2 bg-amber-500/10 rounded-lg">
                            <Type size={20} className="text-amber-500" />
                        </div>
                        <h2>Texto e Fonte</h2>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer p-2 -mr-2">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={config.textConfig.enabled}
                            onChange={(e) => updateTextConfig('enabled', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[10px] after:left-[10px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                </div>

                {config.textConfig.enabled && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputWrapper label="Nome do Artista">
                                <input
                                    type="text"
                                    className={InputStyle}
                                    value={config.textConfig.artist}
                                    onChange={(e) => updateTextConfig('artist', e.target.value)}
                                />
                            </InputWrapper>
                            <InputWrapper label="Título do Álbum">
                                <input
                                    type="text"
                                    className={InputStyle}
                                    value={config.textConfig.title}
                                    onChange={(e) => updateTextConfig('title', e.target.value)}
                                />
                            </InputWrapper>
                        </div>

                        <InputWrapper label="Fonte">
                            <div className="relative">
                                <select
                                    className={SelectStyle}
                                    value={config.textConfig.fontStyle}
                                    onChange={(e) => updateTextConfig('fontStyle', e.target.value)}
                                >
                                    {Object.values(FontStyle).map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
                            </div>
                        </InputWrapper>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputWrapper label="Cor">
                                <input
                                    type="text"
                                    placeholder="ex: Dourado"
                                    className={InputStyle}
                                    value={config.textConfig.color}
                                    onChange={(e) => updateTextConfig('color', e.target.value)}
                                />
                            </InputWrapper>

                            <InputWrapper label="Efeitos (Combinar)">
                                <div className="space-y-3">
                                    {/* Active Chips */}
                                    <div className="flex flex-wrap gap-2">
                                        {config.textConfig.effect.map((effect) => (
                                            <span
                                                key={effect}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20"
                                            >
                                                {effect}
                                                <button
                                                    onClick={() => removeTextEffect(effect)}
                                                    className="hover:text-white transition-colors"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>

                                    {/* Add Effect Select */}
                                    <div className="relative">
                                        <select
                                            className={SelectStyle}
                                            value=""
                                            onChange={(e) => addTextEffect(e.target.value as TextEffect)}
                                        >
                                            <option value="" disabled>+ Adicionar Efeito</option>
                                            {Object.values(TextEffect).filter(e => !config.textConfig.effect.includes(e)).map(ef => (
                                                <option key={ef} value={ef}>{ef}</option>
                                            ))}
                                        </select>
                                        <Plus className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
                                    </div>
                                </div>
                            </InputWrapper>
                        </div>
                    </div>
                )}
            </section>

            {/* Spacing for mobile sticky footer */}
            <div className="h-32 lg:h-0"></div>
        </div>
    );
};

export default Controls;
