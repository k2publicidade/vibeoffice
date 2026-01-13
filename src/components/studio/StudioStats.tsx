import React, { useMemo } from 'react';
import { StudioBooking, SessionType } from '@/types/studio';
import { Mic2, Headphones, Video, Clock, TrendingUp, Music } from 'lucide-react';

interface StudioStatsProps {
    bookings: StudioBooking[];
}

const StudioStats: React.FC<StudioStatsProps> = ({ bookings }) => {

    const stats = useMemo(() => {
        let totalHours = 0;
        const typeCount: Record<string, number> = {};
        const studioCount: Record<string, number> = {};

        bookings.forEach(session => {
            // Calculate Duration
            const start = parseInt(session.start_time.split(':')[0]) + parseInt(session.start_time.split(':')[1]) / 60;
            const end = parseInt(session.end_time.split(':')[0]) + parseInt(session.end_time.split(':')[1]) / 60;
            let duration = end - start;
            if (duration < 0) duration += 24; // Handle overnight
            totalHours += duration;

            // Count Types
            session.session_types.forEach(t => {
                typeCount[t] = (typeCount[t] || 0) + 1;
            });

            // Count Studios
            studioCount[session.studio_name] = (studioCount[session.studio_name] || 0) + 1;
        });

        // Find most popular type
        let popularType = 'N/A';
        let maxCount = 0;
        Object.entries(typeCount).forEach(([type, count]) => {
            if (count > maxCount) {
                maxCount = count;
                popularType = type;
            }
        });

        return {
            totalSessions: bookings.length,
            totalHours: Math.round(totalHours),
            popularType,
            avgDuration: bookings.length ? (totalHours / bookings.length).toFixed(1) : '0'
        };
    }, [bookings]);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

            {/* Total Sessions */}
            <div className="bg-zinc-800 p-5 rounded-xl border border-zinc-700 shadow-sm flex items-center gap-4 hover:border-red-500/50 transition-colors group">
                <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-all">
                    <Music size={24} />
                </div>
                <div>
                    <p className="text-zinc-400 text-xs uppercase font-bold tracking-wider">Sessões Totais</p>
                    <p className="text-2xl font-black text-white">{stats.totalSessions}</p>
                </div>
            </div>

            {/* Total Hours */}
            <div className="bg-zinc-800 p-5 rounded-xl border border-zinc-700 shadow-sm flex items-center gap-4 hover:border-orange-500/50 transition-colors group">
                <div className="w-12 h-12 bg-orange-500/10 text-orange-500 rounded-xl flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-all">
                    <Clock size={24} />
                </div>
                <div>
                    <p className="text-zinc-400 text-xs uppercase font-bold tracking-wider">Horas de Estúdio</p>
                    <p className="text-2xl font-black text-white">{stats.totalHours}h</p>
                </div>
            </div>

            {/* Popular Type */}
            <div className="bg-zinc-800 p-5 rounded-xl border border-zinc-700 shadow-sm flex items-center gap-4 hover:border-blue-500/50 transition-colors group">
                <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all">
                    <TrendingUp size={24} />
                </div>
                <div>
                    <p className="text-zinc-400 text-xs uppercase font-bold tracking-wider">Tipo + Popular</p>
                    <p className="text-lg font-black text-white truncate max-w-[120px]">{stats.popularType}</p>
                </div>
            </div>

            {/* Avg Duration */}
            <div className="bg-zinc-800 p-5 rounded-xl border border-zinc-700 shadow-sm flex items-center gap-4 hover:border-purple-500/50 transition-colors group">
                <div className="w-12 h-12 bg-purple-500/10 text-purple-500 rounded-xl flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-all">
                    <Clock size={24} />
                </div>
                <div>
                    <p className="text-zinc-400 text-xs uppercase font-bold tracking-wider">Média / Sessão</p>
                    <p className="text-2xl font-black text-white">{stats.avgDuration}h</p>
                </div>
            </div>

        </div>
    );
};

export default StudioStats;
