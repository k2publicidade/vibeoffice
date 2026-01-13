import React, { useMemo } from 'react';
import { StudioBooking, Person, SessionType } from '@/types/studio';
import { Calendar, Clock, MapPin, Music, Edit, Trash2, Users, Monitor, Headphones, Mic2, FileText, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StudioBookingListProps {
    bookings: StudioBooking[];
    onDelete: (id: string) => void;
    onEdit: (booking: StudioBooking) => void;
}

const StudioBookingList: React.FC<StudioBookingListProps> = ({ bookings, onDelete, onEdit }) => {

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30';
            default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'completed': return 'Concluída';
            case 'cancelled': return 'Cancelada';
            default: return 'Agendada';
        }
    };

    if (bookings.length === 0) {
        return (
            <div className="text-center py-12 bg-zinc-800/30 rounded-xl border border-dashed border-zinc-700">
                <div className="flex justify-center mb-4">
                    <Music size={48} className="text-zinc-600" />
                </div>
                <h3 className="text-lg font-medium text-zinc-300">Nenhuma sessão encontrada</h3>
                <p className="text-zinc-500 mt-1">Crie um novo agendamento para começar.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {bookings.map((booking) => (
                <div
                    key={booking.id}
                    className="group relative bg-zinc-800 rounded-xl border border-zinc-700/50 hover:border-red-500/30 shadow-sm hover:shadow-red-900/10 transition-all duration-300 overflow-hidden"
                >
                    {/* Left colored accent bar */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-600 to-orange-600 group-hover:w-1.5 transition-all"></div>

                    <div className="p-5 pl-7">
                        <div className="flex flex-col lg:flex-row gap-6">

                            {/* Main Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${getStatusColor(booking.status)}`}>
                                        {getStatusLabel(booking.status)}
                                    </span>
                                    <span className="text-zinc-500 text-xs flex items-center gap-1">
                                        <Clock size={12} />
                                        Agendado em {new Date(booking.created_at || '').toLocaleDateString('pt-BR')}
                                    </span>
                                </div>

                                <h3 className="text-xl font-bold text-white mb-2 leading-tight truncate group-hover:text-red-400 transition-colors">
                                    {booking.track_title}
                                </h3>

                                <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-zinc-400">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-zinc-700/50 p-1.5 rounded-md">
                                            <MapPin size={14} className="text-red-500" />
                                        </div>
                                        <span className="font-medium text-zinc-300">{booking.studio_name}</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="bg-zinc-700/50 p-1.5 rounded-md">
                                            <Calendar size={14} className="text-blue-400" />
                                        </div>
                                        <span className="font-medium text-zinc-300">
                                            {format(new Date(booking.booking_date), "dd 'de' MMMM", { locale: ptBR })}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="bg-zinc-700/50 p-1.5 rounded-md">
                                            <Clock size={14} className="text-orange-400" />
                                        </div>
                                        <span className="font-medium text-zinc-300">
                                            {booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="bg-zinc-700/50 p-1.5 rounded-md">
                                            <Monitor size={14} className="text-purple-400" />
                                        </div>
                                        <span className="truncate max-w-[150px]" title={booking.workstation_id}>
                                            {booking.workstation_id}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Types & Details */}
                            <div className="lg:w-1/3 min-w-0 flex flex-col gap-3">
                                <div className="flex flex-wrap gap-1.5">
                                    {booking.session_types.map(t => (
                                        <span key={t} className="px-2 py-1 bg-zinc-900 rounded border border-zinc-700 text-xs text-zinc-300">
                                            {t}
                                        </span>
                                    ))}
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-500">
                                    {booking.producers?.length > 0 && (
                                        <div className="flex items-center gap-1.5 truncate" title="Produtores">
                                            <Headphones size={12} className="shrink-0" />
                                            <span className="truncate">{booking.producers.map(p => p.name).join(', ')}</span>
                                        </div>
                                    )}
                                    {booking.artists?.length > 0 && (
                                        <div className="flex items-center gap-1.5 truncate" title="Artistas">
                                            <Mic2 size={12} className="shrink-0" />
                                            <span className="truncate">{booking.artists.map(p => p.name).join(', ')}</span>
                                        </div>
                                    )}
                                </div>

                                {booking.notes && (
                                    <div className="flex items-start gap-1.5 text-xs text-yellow-500/80 bg-yellow-900/10 p-2 rounded border border-yellow-900/20">
                                        <FileText size={12} className="mt-0.5 shrink-0" />
                                        <p className="line-clamp-2">{booking.notes}</p>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="lg:w-auto flex lg:flex-col justify-end gap-2 pl-4 lg:border-l border-zinc-700/50">
                                <button
                                    onClick={() => onEdit(booking)}
                                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors group/edit"
                                    title="Editar"
                                >
                                    <Edit size={18} className="group-hover/edit:scale-110 transition-transform" />
                                </button>
                                <button
                                    onClick={() => onDelete(booking.id)}
                                    className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors group/del"
                                    title="Excluir"
                                >
                                    <Trash2 size={18} className="group-hover/del:scale-110 transition-transform" />
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
