import React, { useState, useEffect } from 'react';
import { StudioBooking, Person, SessionType } from '@/types/studio';
import DynamicPersonList from './DynamicPersonList';
import { Save, Monitor, Clock, Calendar, Music2, StickyNote, Mic2, Edit, Plus } from 'lucide-react';
import { useStudio } from '@/hooks/useStudio';

interface StudioBookingFormProps {
    onSuccess: () => void;
    onCancel: () => void;
    currentUserEmail?: string;
    initialData?: StudioBooking;
}

const StudioBookingForm: React.FC<StudioBookingFormProps> = ({ onSuccess, onCancel, currentUserEmail, initialData }) => {
    const { createBooking, updateBooking } = useStudio();
    const [submitting, setSubmitting] = useState(false);

    // Safe ID generator
    const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

    const [trackTitle, setTrackTitle] = useState('');
    const [studio, setStudio] = useState('Studio A');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState('10:00');
    const [endTime, setEndTime] = useState('14:00');
    const [pc, setPc] = useState('');
    const [types, setTypes] = useState<SessionType[]>(['Gravacao']);
    const [notes, setNotes] = useState('');

    // Initialize with new structure
    const [producers, setProducers] = useState<Person[]>([{ id: generateId(), name: '', phone: '', email: '', contactRole: '' }]);
    const [artists, setArtists] = useState<Person[]>([{ id: generateId(), name: '', phone: '', email: '', contactRole: '' }]);
    const [composers, setComposers] = useState<Person[]>([{ id: generateId(), name: '', phone: '', email: '', contactRole: '' }]);

    // Load initial data if provided (Editing Mode)
    useEffect(() => {
        if (initialData) {
            setTrackTitle(initialData.track_title);
            setStudio(initialData.studio_name);
            setDate(initialData.booking_date);
            setStartTime(initialData.start_time);
            setEndTime(initialData.end_time);
            setPc(initialData.workstation_id || '');
            setTypes(initialData.session_types);
            setNotes(initialData.notes || '');

            setProducers(initialData.producers?.length > 0 ? initialData.producers : []);
            setArtists(initialData.artists?.length > 0 ? initialData.artists : []);
            setComposers(initialData.composers?.length > 0 ? initialData.composers : []);
        }
    }, [initialData]);

    const toggleType = (t: SessionType) => {
        setTypes(prev =>
            prev.includes(t)
                ? prev.filter(x => x !== t)
                : [...prev, t]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        // Explicit Validation
        const missingFields = [];
        if (!trackTitle.trim()) missingFields.push("Título da Faixa");
        if (!studio.trim()) missingFields.push("Estúdio");
        if (!date) missingFields.push("Data");
        if (!startTime) missingFields.push("Início");
        if (!endTime) missingFields.push("Término");
        if (!pc.trim()) missingFields.push("Workstation (PC)");
        if (types.length === 0) missingFields.push("Tipo de Sessão");

        if (missingFields.length > 0) {
            alert(`Não foi possível salvar. Preencha os seguintes campos obrigatórios:\n\n- ${missingFields.join('\n- ')}`);
            setSubmitting(false);
            return;
        }

        const bookingData: Partial<StudioBooking> = {
            track_title: trackTitle,
            studio_name: studio,
            booking_date: date,
            start_time: startTime,
            end_time: endTime,
            workstation_id: pc,
            session_types: types,
            producers: producers.filter(p => p.name.trim() !== ''),
            artists: artists.filter(p => p.name.trim() !== ''),
            composers: composers.filter(p => p.name.trim() !== ''),
            notes: notes.trim(),
            status: initialData ? initialData.status : 'scheduled'
        };

        try {
            if (initialData) {
                await updateBooking(initialData.id, bookingData);
            } else {
                await createBooking(bookingData as any);
            }
            onSuccess();
        } catch (err) {
            console.error("Error submitting form", err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-neutral-950/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden w-full max-w-6xl mx-auto flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="px-8 py-6 border-b border-white/10 bg-white/5 flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <span className="flex items-center justify-center w-10 h-10 rounded-full bg-red-500/10 text-red-500 ring-1 ring-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                            {initialData ? <Edit size={20} /> : <Plus size={20} />}
                        </span>
                        {initialData ? 'Editar Sessão' : 'Nova Sessão'}
                    </h2>
                    <p className="text-sm text-zinc-400 mt-1 pl-14">
                        {initialData ? `Editando ID: ${initialData.id}` : 'Preencha os detalhes da nova produção'}
                    </p>
                </div>
                {/* Optional: Add a close button here if needed, though usually handled by the dialog */}
            </div>

            {/* Scrollable Content */}
            <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">

                {/* Track Title */}
                <div className="space-y-4">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Informações Principais</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Music2 size={20} className="text-zinc-500 group-focus-within:text-red-500 transition-colors" />
                        </div>
                        <input
                            type="text"
                            value={trackTitle}
                            onChange={(e) => setTrackTitle(e.target.value)}
                            placeholder="Título da Faixa / Projeto"
                            className="pl-12 block w-full bg-white/5 border border-white/10 rounded-xl py-4 text-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 transition-all"
                        />
                    </div>
                </div>

                {/* Grid Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-zinc-400 pl-1">Estúdio</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mic2 size={18} className="text-zinc-500 group-focus-within:text-red-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                value={studio}
                                onChange={(e) => setStudio(e.target.value)}
                                placeholder="Ex: Estúdio A"
                                className="pl-10 block w-full bg-white/5 border border-white/10 rounded-lg py-3 text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 transition-all font-medium"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-zinc-400 pl-1">Data</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Calendar size={18} className="text-zinc-500 group-focus-within:text-red-500 transition-colors" />
                            </div>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="pl-10 block w-full bg-white/5 border border-white/10 rounded-lg py-3 text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 transition-all font-medium appearance-none" // appearance-none helps with custom styling in some browsers
                            />
                        </div>
                    </div>

                    <div className="lg:col-span-2 flex gap-4">
                        <div className="w-1/2 space-y-2">
                            <label className="text-xs font-medium text-zinc-400 pl-1">Início</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Clock size={16} className="text-zinc-500 group-focus-within:text-red-500 transition-colors" />
                                </div>
                                <input
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="pl-9 block w-full bg-white/5 border border-white/10 rounded-lg py-3 text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 transition-all font-medium"
                                />
                            </div>
                        </div>
                        <div className="w-1/2 space-y-2">
                            <label className="text-xs font-medium text-zinc-400 pl-1">Término</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Clock size={16} className="text-zinc-500 group-focus-within:text-red-500 transition-colors" />
                                </div>
                                <input
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className="pl-9 block w-full bg-white/5 border border-white/10 rounded-lg py-3 text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 transition-all font-medium"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-2 lg:col-span-4 space-y-2">
                        <label className="text-xs font-medium text-zinc-400 pl-1">Workstation</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Monitor size={18} className="text-zinc-500 group-focus-within:text-red-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                value={pc}
                                onChange={(e) => setPc(e.target.value)}
                                placeholder="PC Principal (Ex: Mac Studio A)"
                                className="pl-10 block w-full bg-white/5 border border-white/10 rounded-lg py-3 text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 transition-all font-medium"
                            />
                        </div>
                    </div>
                </div>

                {/* Type Selection */}
                <div className="space-y-4">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Tipo de Sessão</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {['Gravacao', 'Mix/Master', 'Edicao', 'Producao'].map((t) => {
                            const isSelected = types.includes(t as SessionType);
                            return (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => toggleType(t as SessionType)}
                                    className={`
                                        group relative overflow-hidden p-4 rounded-xl border transition-all duration-300
                                        flex flex-col items-center justify-center gap-2 text-sm font-semibold
                                        ${isSelected
                                            ? 'bg-red-600/10 border-red-500 text-red-400 shadow-[0_0_20px_rgba(220,38,38,0.15)] ring-1 ring-red-500/20'
                                            : 'bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10 hover:border-white/20'
                                        }
                                    `}
                                >
                                    <span className={`w-2 h-2 rounded-full mb-1 transition-colors ${isSelected ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-zinc-700 group-hover:bg-zinc-600'}`}></span>
                                    {t}
                                    {isSelected && <div className="absolute inset-0 bg-gradient-to-tr from-red-600/10 to-transparent pointer-events-none" />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Separator */}
                <div className="h-px w-full bg-white/5" />

                {/* Dynamic Lists */}
                <div className="grid grid-cols-1 gap-12">
                    <DynamicPersonList title="Produtores" items={producers} onChange={setProducers} />
                    <DynamicPersonList title="Artistas" items={artists} onChange={setArtists} />
                    <DynamicPersonList title="Compositores" items={composers} onChange={setComposers} requiredFullname={true} />
                </div>

                {/* Notes */}
                <div className="space-y-4">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Observações Gerais</label>
                    <div className="relative group">
                        <div className="absolute top-4 left-0 pl-4 pointer-events-none">
                            <StickyNote size={20} className="text-zinc-500 group-focus-within:text-yellow-500 transition-colors" />
                        </div>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Detalhes adicionais, equipamentos específicos, etc..."
                            rows={4}
                            className="pl-12 block w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-zinc-500 focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500/50 transition-all resize-none"
                        />
                    </div>
                </div>

            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end gap-3 shrink-0">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-6 py-3 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 font-medium transition-all"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={submitting}
                    className="
                        flex items-center gap-2 px-8 py-3 rounded-lg bg-red-600 text-white font-bold
                        shadow-[0_4px_20px_rgba(220,38,38,0.4)] hover:shadow-[0_6px_25px_rgba(220,38,38,0.5)]
                        hover:scale-[1.02] active:scale-[0.98] transition-all
                        disabled:opacity-50 disabled:cursor-not-allowed
                    "
                >
                    <Save size={18} />
                    {submitting ? 'Salvando...' : initialData ? 'Salvar Alterações' : 'Criar Sessão'}
                </button>
            </div>
        </form>
    );
};

export default StudioBookingForm;
