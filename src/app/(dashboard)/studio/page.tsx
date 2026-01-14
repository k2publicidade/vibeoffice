"use client"

import React, { useState, useMemo } from 'react';
import { useStudio } from '@/hooks/useStudio';
import { StudioBooking } from '@/types/studio';
import StudioBookingList from '@/components/studio/StudioBookingList';
import StudioBookingForm from '@/components/studio/StudioBookingForm';
import StudioStats from '@/components/studio/StudioStats';
import { Filter, XCircle, Plus, Download, AudioWaveform, Search, Calendar, User, Mic2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export default function StudioPage() {
    const { bookings, loading, refresh, deleteBooking } = useStudio();
    const [showForm, setShowForm] = useState(false);
    const [editingBooking, setEditingBooking] = useState<StudioBooking | undefined>(undefined);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [isFiltersOpen, setIsFiltersOpen] = useState(true);

    // Derived filtered sessions
    const filteredBookings = useMemo(() => {
        return bookings.filter(booking => {
            // Unifield Search (Title, Studio, People)
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesTitle = booking.track_title.toLowerCase().includes(query);
                const matchesStudio = booking.studio_name.toLowerCase().includes(query);
                const matchesProducer = booking.producers?.some(p => p.name.toLowerCase().includes(query));
                const matchesArtist = booking.artists?.some(a => a.name.toLowerCase().includes(query));

                if (!matchesTitle && !matchesStudio && !matchesProducer && !matchesArtist) return false;
            }

            // Date Filters
            if (filterStartDate && booking.booking_date < filterStartDate) return false;
            if (filterEndDate && booking.booking_date > filterEndDate) return false;

            return true;
        });
    }, [bookings, searchQuery, filterStartDate, filterEndDate]);

    const clearFilters = () => {
        setSearchQuery('');
        setFilterStartDate('');
        setFilterEndDate('');
    };

    const handleEdit = (booking: StudioBooking) => {
        setEditingBooking(booking);
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Tem certeza que deseja excluir esta sessão permanentemente?")) {
            await deleteBooking(id);
        }
    };

    const handleFormSuccess = () => {
        setShowForm(false);
        setEditingBooking(undefined);
        refresh();
    };

    const exportToCSV = () => {
        if (filteredBookings.length === 0) return;

        const headers = [
            'ID', 'Faixa', 'Estúdio', 'Data', 'Início', 'Fim', 'Tipos', 'PC', 'Produtores', 'Artistas'
        ];

        const escapeCsv = (str: any) => {
            if (!str) return '';
            const s = String(str);
            if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
            return s;
        };

        const rows = filteredBookings.map(b => [
            b.id,
            b.track_title,
            b.studio_name,
            b.booking_date,
            b.start_time,
            b.end_time,
            b.session_types.join('; '),
            b.workstation_id,
            b.producers?.map(p => p.name).join('; '),
            b.artists?.map(p => p.name).join('; ')
        ].map(escapeCsv).join(','));

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `vibe_studio_export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const hasActiveFilters = searchQuery || filterStartDate || filterEndDate;

    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black text-white">
            <div className="p-6 lg:p-10 max-w-[1600px] mx-auto animate-in fade-in duration-700 slide-in-from-bottom-4">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div className="flex items-center gap-5">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-red-600 rounded-2xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity"></div>
                            <div className="relative w-14 h-14 bg-gradient-to-br from-neutral-900 to-black border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl">
                                <AudioWaveform className="text-red-500" size={28} />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-white tracking-tight uppercase italic flex items-center gap-2">
                                Vibe <span className="text-red-600">Studio</span>
                            </h1>
                            <p className="text-zinc-400 font-medium text-sm tracking-wide">
                                Production Control Center
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={exportToCSV}
                            className="flex items-center gap-2 px-4 py-2 bg-neutral-900/50 hover:bg-neutral-800 text-zinc-300 rounded-xl font-bold uppercase text-xs tracking-wider transition-all border border-white/5 hover:border-white/10"
                        >
                            <Download size={16} /> Exportar
                        </button>
                        <button
                            onClick={() => { setEditingBooking(undefined); setShowForm(true); }}
                            className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_30px_rgba(220,38,38,0.5)] font-bold uppercase text-xs tracking-wider transition-all hover:scale-105 active:scale-95"
                        >
                            <Plus size={18} /> Nova Sessão
                        </button>
                    </div>
                </div>

                {/* Stats Section */}
                <StudioStats bookings={filteredBookings} />

                {/* Control Bar (Filters) */}
                <div className="bg-neutral-950/40 backdrop-blur-xl border border-white/5 rounded-2xl p-1 mb-10 overflow-hidden shadow-2xl">
                    <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-white/5">

                        {/* Unified Search */}
                        <div className="flex-[3] p-3 flex items-center gap-3">
                            <Search size={20} className="text-zinc-500 pl-1" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Pesquisar por Título, Estúdio, Artista ou Produtor..."
                                className="w-full bg-transparent border-none focus:ring-0 text-base placeholder-zinc-600 text-white font-medium"
                            />
                        </div>

                        {/* Date Range */}
                        <div className="flex items-center p-2 gap-2">
                            <div className="flex items-center gap-2 bg-black/20 rounded-lg px-3 py-2 border border-white/5">
                                <Calendar size={14} className="text-zinc-500" />
                                <input
                                    type="date"
                                    value={filterStartDate}
                                    onChange={(e) => setFilterStartDate(e.target.value)}
                                    className="bg-transparent border-none text-xs text-zinc-300 focus:ring-0 p-0 w-24"
                                />
                            </div>
                            <span className="text-zinc-700">-</span>
                            <div className="flex items-center gap-2 bg-black/20 rounded-lg px-3 py-2 border border-white/5">
                                <Calendar size={14} className="text-zinc-500" />
                                <input
                                    type="date"
                                    value={filterEndDate}
                                    onChange={(e) => setFilterEndDate(e.target.value)}
                                    className="bg-transparent border-none text-xs text-zinc-300 focus:ring-0 p-0 w-24"
                                />
                            </div>
                        </div>

                        {/* Action */}
                        {hasActiveFilters && (
                            <div className="p-2 flex items-center justify-center bg-red-500/10">
                                <button
                                    onClick={clearFilters}
                                    className="w-10 h-full flex items-center justify-center rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                    title="Limpar Filtros"
                                >
                                    <XCircle size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* List Content */}
                <div className="relative min-h-[400px]">
                    {loading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                            <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-zinc-500 animate-pulse font-medium tracking-widest text-xs uppercase">Carregando Studio...</p>
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-forwards">
                            <StudioBookingList
                                bookings={filteredBookings}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                            />

                            {/* Footer / Count */}
                            {!loading && filteredBookings.length > 0 && (
                                <p className="text-center text-zinc-600 text-xs uppercase tracking-widest mt-8 font-medium">
                                    Exibindo {filteredBookings.length} sessões
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Form Modal */}
                <Dialog open={showForm} onOpenChange={setShowForm}>
                    <DialogContent className="w-full sm:max-w-6xl bg-transparent border-0 p-0 shadow-none">
                        <StudioBookingForm
                            onSuccess={handleFormSuccess}
                            onCancel={() => setShowForm(false)}
                            initialData={editingBooking}
                        />
                    </DialogContent>
                </Dialog>

            </div>
        </div>
    );
}
