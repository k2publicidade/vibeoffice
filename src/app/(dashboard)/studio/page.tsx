"use client"

import React, { useState, useMemo } from 'react';
import { useStudio } from '@/hooks/useStudio';
import { StudioBooking } from '@/types/studio';
import StudioBookingList from '@/components/studio/StudioBookingList';
import StudioBookingForm from '@/components/studio/StudioBookingForm';
import StudioStats from '@/components/studio/StudioStats';
import { Filter, XCircle, PlusCircle, Download, AudioWaveform, Music, CalendarRange, Headphones, Mic2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export default function StudioPage() {
    const { bookings, loading, refresh, deleteBooking } = useStudio();
    const [showForm, setShowForm] = useState(false);
    const [editingBooking, setEditingBooking] = useState<StudioBooking | undefined>(undefined);

    // Filters
    const [filterTitle, setFilterTitle] = useState('');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [filterProducer, setFilterProducer] = useState('');
    const [filterArtist, setFilterArtist] = useState('');

    // Derived filtered sessions
    const filteredBookings = useMemo(() => {
        return bookings.filter(booking => {
            // Title Filter
            if (filterTitle && !booking.track_title.toLowerCase().includes(filterTitle.toLowerCase())) return false;

            // Date Filters
            if (filterStartDate && booking.booking_date < filterStartDate) return false;
            if (filterEndDate && booking.booking_date > filterEndDate) return false;

            // Producer Filter
            if (filterProducer) {
                const search = filterProducer.toLowerCase();
                const hasProducer = booking.producers?.some(p => p.name.toLowerCase().includes(search));
                if (!hasProducer) return false;
            }

            // Artist Filter
            if (filterArtist) {
                const search = filterArtist.toLowerCase();
                const hasArtist = booking.artists?.some(a => a.name.toLowerCase().includes(search));
                if (!hasArtist) return false;
            }

            return true;
        });
    }, [bookings, filterTitle, filterStartDate, filterEndDate, filterProducer, filterArtist]);

    const clearFilters = () => {
        setFilterTitle('');
        setFilterStartDate('');
        setFilterEndDate('');
        setFilterProducer('');
        setFilterArtist('');
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

    return (
        <div className="p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-600/20">
                        <AudioWaveform className="text-white" size={24} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight uppercase italic">Vibe <span className="text-red-500">Studio</span></h1>
                        <p className="text-zinc-400 font-medium text-sm">Gerenciamento de Produção & Agenda</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-bold uppercase text-xs tracking-wide transition-all border border-zinc-700"
                    >
                        <Download size={16} /> Exportar CSV
                    </button>
                    <button
                        onClick={() => { setEditingBooking(undefined); setShowForm(true); }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg shadow-red-600/20 font-bold uppercase text-xs tracking-wide transition-all hover:scale-105 active:scale-95"
                    >
                        <PlusCircle size={16} /> Nova Sessão
                    </button>
                </div>
            </div>

            {/* Stats */}
            <StudioStats bookings={filteredBookings} />

            {/* Filters */}
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 flex flex-col xl:flex-row items-start xl:items-center gap-4 mb-8">
                <div className="flex items-center gap-2 text-red-500 font-bold uppercase text-xs tracking-wider mr-2 min-w-max self-start xl:self-center mt-3 xl:mt-0">
                    <Filter size={16} /> Filtros
                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 w-full">
                    {/* Title Filter */}
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"><Music size={14} /></div>
                        <input
                            type="text"
                            value={filterTitle}
                            onChange={(e) => setFilterTitle(e.target.value)}
                            placeholder="Buscar faixa..."
                            className="w-full bg-zinc-900 border border-zinc-700 text-white text-sm rounded-lg pl-9 pr-3 py-2 focus:ring-red-500 focus:border-red-500 placeholder-zinc-500"
                        />
                    </div>

                    {/* Date Start */}
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"><CalendarRange size={14} /></div>
                        <input
                            type="date"
                            value={filterStartDate}
                            onChange={(e) => setFilterStartDate(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-700 text-white text-sm rounded-lg pl-9 pr-3 py-2 focus:ring-red-500 focus:border-red-500"
                        />
                    </div>

                    {/* Date End */}
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"><CalendarRange size={14} /></div>
                        <input
                            type="date"
                            value={filterEndDate}
                            onChange={(e) => setFilterEndDate(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-700 text-white text-sm rounded-lg pl-9 pr-3 py-2 focus:ring-red-500 focus:border-red-500"
                        />
                    </div>

                    {/* Producer */}
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"><Headphones size={14} /></div>
                        <input
                            type="text"
                            value={filterProducer}
                            onChange={(e) => setFilterProducer(e.target.value)}
                            placeholder="Produtor..."
                            className="w-full bg-zinc-900 border border-zinc-700 text-white text-sm rounded-lg pl-9 pr-3 py-2 focus:ring-red-500 focus:border-red-500 placeholder-zinc-500"
                        />
                    </div>

                    {/* Artist */}
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"><Mic2 size={14} /></div>
                        <input
                            type="text"
                            value={filterArtist}
                            onChange={(e) => setFilterArtist(e.target.value)}
                            placeholder="Artista..."
                            className="w-full bg-zinc-900 border border-zinc-700 text-white text-sm rounded-lg pl-9 pr-3 py-2 focus:ring-red-500 focus:border-red-500 placeholder-zinc-500"
                        />
                    </div>
                </div>

                {(filterTitle || filterStartDate || filterEndDate || filterProducer || filterArtist) && (
                    <button
                        onClick={clearFilters}
                        className="flex items-center gap-1 text-zinc-400 hover:text-red-400 text-xs font-medium uppercase tracking-wide px-3 py-2 transition-colors"
                    >
                        <XCircle size={14} /> Limpar
                    </button>
                )}
            </div>

            {/* List */}
            {loading ? (
                <div className="text-center py-20">
                    <div className="animate-spin w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-zinc-500">Carregando agendamentos...</p>
                </div>
            ) : (
                <StudioBookingList
                    bookings={filteredBookings}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            )}

            {/* Form Modal */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-4xl bg-transparent border-0 p-0">
                    <StudioBookingForm
                        onSuccess={handleFormSuccess}
                        onCancel={() => setShowForm(false)}
                        initialData={editingBooking}
                    />
                </DialogContent>
            </Dialog>

        </div>
    );
}
