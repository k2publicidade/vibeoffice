```
import React from 'react';
import { StudioBooking } from '@/types/studio';
import { Trash2, Headphones, User, Clock, AlertCircle, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StudioBookingListProps {
    bookings: StudioBooking[];
    onDelete: (id: string) => void;
    onEdit: (booking: StudioBooking) => void;
}

const StudioBookingList: React.FC<StudioBookingListProps> = ({ bookings, onDelete, onEdit }) => {

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 ring-emerald-500/10';
            case 'cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20 ring-red-500/10';
            default: return 'bg-blue-500/10 text-blue-500 border-blue-500/20 ring-blue-500/10';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'completed': return 'Realizado';
            case 'cancelled': return 'Cancelado';
            default: return 'Agendado';
        }
    };

    if (bookings.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-neutral-950/30 backdrop-blur-sm rounded-3xl border border-white/5 border-dashed">
                <div className="w-24 h-24 bg-gradient-to-tr from-zinc-800 to-zinc-900 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-black/50 ring-1 ring-white/5">
                    <Disc size={40} className="text-zinc-600 animate-spin-slow" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Agenda Vazia</h3>
                <p className="text-zinc-500 text-center max-w-md">
                    Não encontramos sessões com os filtros atuais. <br />
                    Crie um novo agendamento para movimentar o estúdio.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {bookings.map((booking) => (
                <div
                    key={booking.id}
                    className="group relative bg-neutral-950/60 backdrop-blur-md rounded-2xl border border-white/5 hover:border-red-500/30 transition-all duration-300 overflow-hidden hover:shadow-[0_0_40px_-10px_rgba(239,68,68,0.1)] hover:bg-neutral-900/80"
                >
                    {/* Abstract Header Gradient */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600/50 via-orange-600/50 to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>

                    <div className="p-6">
                        <div className="flex flex-col lg:flex-row gap-8">

                            {/* Date Badge - Left Side */}
                            <div className="hidden lg:flex flex-col items-center justify-center w-20 shrink-0 bg-white/5 rounded-xl border border-white/5 p-3 h-fit group-hover:bg-white/10 transition-colors">
                                <span className="text-xs font-bold text-red-500 uppercase">{format(new Date(booking.booking_date), 'MMM', { locale: ptBR })}</span>
                                <span className="text-3xl font-black text-white">{format(new Date(booking.booking_date), 'dd')}</span>
                                <span className="text-xs text-zinc-500 uppercase font-medium">{format(new Date(booking.booking_date), 'EEE', { locale: ptBR })}</span>
                            </div>

                            {/* Main Content */}
                            <div className="flex-1 min-w-0">

                                {/* Top Row: Meta & Status */}
                                <div className="flex items-center justify-between gap-4 mb-3">
                                    <div className="flex items-center gap-3">
                                        <span className={`px - 2.5 py - 1 rounded - md text - [10px] uppercase font - bold tracking - wider border ring - 1 ${ getStatusStyle(booking.status) } `}>
                                            {getStatusLabel(booking.status)}
                                        </span>
                                        {/* Mobile Date Fallback */}
                                        <div className="lg:hidden flex items-center gap-1.5 text-zinc-400 text-xs font-medium">
                                            <CalendarRange size={12} />
                                            {format(new Date(booking.booking_date), "dd 'de' MMM", { locale: ptBR })}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {booking.session_types.map(t => (
                                            <span key={t} className="px-2 py-0.5 bg-zinc-900/80 border border-white/5 rounded text-[10px] uppercase tracking-wide text-zinc-400 font-medium">
                                                {t}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Title & Studio */}
                                <div className="mb-5">
                                    <h3 className="text-2xl font-bold text-white mb-1.5 group-hover:text-red-500 transition-colors tracking-tight truncate">
                                        {booking.track_title}
                                    </h3>
                                    <div className="flex items-center gap-4 text-sm">
                                        <div className="flex items-center gap-2 text-zinc-400">
                                            <MapPin size={14} className="text-red-500" />
                                            <span className="font-medium">{booking.studio_name}</span>
                                        </div>
                                        <div className="w-1 h-1 bg-zinc-700 rounded-full"></div>
                                        <div className="flex items-center gap-2 text-zinc-400">
                                            <Clock size={14} className="text-orange-500" />
                                            <span className="font-medium mono">{booking.start_time.slice(0, 5)}h - {booking.end_time.slice(0, 5)}h</span>
                                        </div>
                                    </div>
                                </div>

                                {/* People / Resources Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-black/20 rounded-xl border border-white/5">

                                    {/* Producers */}
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                                            <Headphones size={14} className="text-zinc-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-0.5">Produção</p>
                                            <p className="text-sm text-zinc-200 truncate font-medium">
                                                {booking.producers?.length > 0 ? booking.producers.map(p => p.name).join(', ') : <span className="text-zinc-600 italic">Não informado</span>}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Artists */}
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                                            <Mic2 size={14} className="text-zinc-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-0.5">Artistas</p>
                                            <p className="text-sm text-zinc-200 truncate font-medium">
                                                {booking.artists?.length > 0 ? booking.artists.map(p => p.name).join(', ') : <span className="text-zinc-600 italic">Não informado</span>}
                                            </p>
                                        </div>
                                    </div>

                                </div>

                            </div>

                            {/* Right Actions - Desktop */}
                            <div className="flex lg:flex-col items-center lg:justify-center gap-2 border-t lg:border-t-0 lg:border-l border-white/5 pt-4 lg:pt-0 lg:pl-6 shrink-0">
                                <button
                                    onClick={() => onEdit(booking)}
                                    className="flex-1 lg:flex-none w-full lg:w-10 h-10 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                                    title="Editar Detalhes"
                                >
                                    <Edit size={18} />
                                </button>

                                <div className="w-px h-6 bg-white/10 lg:hidden"></div>
                                <div className="h-px w-6 bg-white/10 hidden lg:block"></div>

                                <button
                                    onClick={() => onDelete(booking.id)}
                                    className="flex-1 lg:flex-none w-full lg:w-10 h-10 flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-95"
                                    title="Excluir Sessão"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default StudioBookingList;
