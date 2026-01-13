import React, { useMemo } from 'react';
import { StudioBooking } from '@/types/studio';
import { Mic2, Headphones, Video, Clock, TrendingUp, Music, Activity, Timer } from 'lucide-react';

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">

            {/* Total Sessions */}
            <div className="group relative overflow-hidden bg-neutral-950/40 backdrop-blur-md rounded-2xl border border-white/5 hover:border-red-500/20 transition-all duration-300 hover:shadow-[0_0_30px_-5px_rgba(220,38,38,0.15)]">
                <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl text-red-500 group-hover:scale-110 transition-transform select-none">
                    #
                </div>
                <div className="p-6 relative z-10">
                    <div className="w-10 h-10 mb-4 bg-gradient-to-br from-red-600 to-red-900 rounded-lg flex items-center justify-center shadow-lg shadow-red-500/20 group-hover:scale-110 transition-transform">
                        <Music size={20} className="text-white" />
                    </div>
                    <div>
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Sessões Totais</p>
                        <h3 className="text-3xl font-black text-white flex items-end gap-2">
                            {stats.totalSessions}
                            <span className="text-sm font-medium text-emerald-500 mb-1.5 flex items-center">
                                <Activity size={14} className="mr-0.5" /> Ativas
                            </span>
                        </h3>
                    </div>
                </div>
                <div className="h-1 w-full bg-white/5 mt-auto">
                    <div className="h-full bg-red-500 w-3/4 rounded-r-full opacity-50"></div>
                </div>
            </div>

            {/* Total Hours */}
            <div className="group relative overflow-hidden bg-neutral-950/40 backdrop-blur-md rounded-2xl border border-white/5 hover:border-orange-500/20 transition-all duration-300 hover:shadow-[0_0_30px_-5px_rgba(249,115,22,0.15)]">
                <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl text-orange-500 group-hover:scale-110 transition-transform select-none">
                    H
                </div>
                <div className="p-6 relative z-10">
                    <div className="w-10 h-10 mb-4 bg-gradient-to-br from-orange-500 to-orange-800 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-110 transition-transform">
                        <Clock size={20} className="text-white" />
                    </div>
                    <div>
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Tempo de Estúdio</p>
                        <h3 className="text-3xl font-black text-white">
                            {stats.totalHours}<span className="text-lg text-zinc-500 font-bold ml-1">h</span>
                        </h3>
                    </div>
                </div>
                <div className="h-1 w-full bg-white/5 mt-auto">
                    <div className="h-full bg-orange-500 w-1/2 rounded-r-full opacity-50"></div>
                </div>
            </div>

            {/* Popular Type */}
            <div className="group relative overflow-hidden bg-neutral-950/40 backdrop-blur-md rounded-2xl border border-white/5 hover:border-blue-500/20 transition-all duration-300 hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.15)]">
                <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl text-blue-500 group-hover:scale-110 transition-transform select-none">
                    %
                </div>
                <div className="p-6 relative z-10">
                    <div className="w-10 h-10 mb-4 bg-gradient-to-br from-blue-500 to-blue-800 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                        <TrendingUp size={20} className="text-white" />
                    </div>
                    <div>
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Foco Principal</p>
                        <h3 className="text-2xl font-black text-white truncate max-w-full" title={stats.popularType}>
                            {stats.popularType}
                        </h3>
                    </div>
                </div>
                <div className="h-1 w-full bg-white/5 mt-auto">
                    <div className="h-full bg-blue-500 w-4/5 rounded-r-full opacity-50"></div>
                </div>
            </div>

            {/* Avg Duration */}
            <div className="group relative overflow-hidden bg-neutral-950/40 backdrop-blur-md rounded-2xl border border-white/5 hover:border-purple-500/20 transition-all duration-300 hover:shadow-[0_0_30px_-5px_rgba(168,85,247,0.15)]">
                <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl text-purple-500 group-hover:scale-110 transition-transform select-none">
                    AVG
                </div>
                <div className="p-6 relative z-10">
                    <div className="w-10 h-10 mb-4 bg-gradient-to-br from-purple-500 to-purple-800 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform">
                        <Timer size={20} className="text-white" />
                    </div>
                    <div>
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Média / Sessão</p>
                        <h3 className="text-3xl font-black text-white">
                            {stats.avgDuration}<span className="text-lg text-zinc-500 font-bold ml-1">h</span>
                        </h3>
                    </div>
                </div>
                <div className="h-1 w-full bg-white/5 mt-auto">
                    <div className="h-full bg-purple-500 w-full rounded-r-full opacity-50"></div>
                </div>
            </div>

        </div>
    );
};

export default StudioStats;
