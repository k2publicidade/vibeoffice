
import React from 'react';
import { Session, UserRole } from '../types';
import { Clock, Monitor, Users, Music, Mic2, PenTool, Sliders, Music2, StickyNote, MapPin, UserCheck, Pencil, Trash2 } from 'lucide-react';

interface SessionListProps {
  sessions: Session[];
  onDelete: (id: string) => void;
  onEdit: (session: Session) => void;
  userRole: UserRole | null;
}

const getTypeIcon = (type: string) => {
  switch(type) {
    case 'Gravacao': return <Mic2 size={12} />;
    case 'Mix/Master': return <Sliders size={12} />;
    case 'Edicao': return <PenTool size={12} />;
    case 'Producao': return <Music size={12} />;
    default: return <Monitor size={12} />;
  }
};

const SessionList: React.FC<SessionListProps> = ({ sessions, onDelete, onEdit, userRole }) => {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-20 bg-slate-800/50 rounded-xl border border-dashed border-slate-700">
        <Music2 size={48} className="mx-auto text-slate-600 mb-4" />
        <h3 className="text-lg font-medium text-slate-300">Nenhuma sessão registrada</h3>
        <p className="text-slate-500">Comece adicionando uma nova sessão ao estúdio.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {sessions.map((session) => (
        <div key={session.id} className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-red-500/50 transition-colors shadow-md group relative overflow-hidden">
          
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6 mb-6 relative z-10">
            <div className="flex items-start gap-5">
              <div className="bg-slate-900 p-4 rounded-xl text-slate-300 border border-slate-700 text-center min-w-[80px] shadow-inner">
                <div className="text-xs font-bold uppercase text-red-500 mb-1">
                  {new Date(session.date).toLocaleString('pt-BR', { month: 'short' }).replace('.', '')}
                </div>
                <div className="text-3xl font-black text-white leading-none">
                  {new Date(session.date).getDate() + 1}
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  {session.trackTitle}
                </h3>
                
                <div className="flex flex-wrap gap-2 mb-2">
                  {session.type.map((t) => (
                    <div key={t} className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border bg-slate-700 border-slate-600 text-slate-300">
                      {getTypeIcon(t)}
                      {t}
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-slate-400 text-sm mt-3">
                  <div className="flex items-center gap-1.5 bg-slate-900/50 px-2 py-1 rounded border border-slate-700/50">
                    <Clock size={14} className="text-red-500" />
                    {session.startTime} - {session.endTime}
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-900/50 px-2 py-1 rounded border border-slate-700/50">
                    <MapPin size={14} className="text-red-500" />
                    {session.studio}
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-900/50 px-2 py-1 rounded border border-slate-700/50">
                    <Monitor size={14} className="text-red-500" />
                    {session.pc}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 self-end lg:self-center">
              {userRole === 'ADMIN' && (
                <>
                  <button 
                    onClick={() => onEdit(session)}
                    className="flex items-center gap-1 px-4 py-2 text-xs font-medium text-amber-400 hover:bg-amber-950/30 rounded-lg border border-transparent hover:border-amber-900 transition-colors uppercase tracking-wider"
                  >
                    <Pencil size={12} /> Editar
                  </button>
                  <button 
                    onClick={() => onDelete(session.id)}
                    className="flex items-center gap-1 px-4 py-2 text-xs font-medium text-red-400 hover:bg-red-950/30 rounded-lg border border-transparent hover:border-red-900 transition-colors uppercase tracking-wider"
                  >
                    <Trash2 size={12} /> Excluir
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-700/50 relative z-10">
             {/* Producers */}
             <div className="bg-slate-900/30 p-4 rounded-lg">
               <h4 className="text-xs font-bold text-red-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                 <Users size={14} /> Produtores
               </h4>
               {session.producers.length > 0 ? (
                 <ul className="space-y-3">
                   {session.producers.map(p => (
                     <li key={p.id} className="text-sm text-slate-200 flex flex-col">
                       <span className="font-medium">{p.name}</span>
                       <div className="text-xs text-slate-500 flex flex-col mt-0.5">
                         {/* Display either new fields or fallback to old contact field */}
                         {(p.phone || p.email) ? (
                            <>
                              {p.phone && <span>Tel: {p.phone}</span>}
                              {p.email && <span>Email: {p.email}</span>}
                            </>
                         ) : p.contact && <span>{p.contact}</span>}
                         
                         {p.contactRole && <span className="text-red-400 font-medium mt-0.5">{p.contactRole}</span>}
                       </div>
                     </li>
                   ))}
                 </ul>
               ) : <span className="text-xs text-slate-600 italic">Não informado</span>}
             </div>

             {/* Artists */}
             <div className="bg-slate-900/30 p-4 rounded-lg">
               <h4 className="text-xs font-bold text-red-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                 <Mic2 size={14} /> Artistas
               </h4>
               {session.artists.length > 0 ? (
                 <ul className="space-y-3">
                   {session.artists.map(p => (
                     <li key={p.id} className="text-sm text-slate-200 flex flex-col">
                       <span className="font-medium">{p.name}</span>
                        <div className="text-xs text-slate-500 flex flex-col mt-0.5">
                         {(p.phone || p.email) ? (
                            <>
                              {p.phone && <span>Tel: {p.phone}</span>}
                              {p.email && <span>Email: {p.email}</span>}
                            </>
                         ) : p.contact && <span>{p.contact}</span>}
                         {p.contactRole && <span className="text-red-400 font-medium mt-0.5">{p.contactRole}</span>}
                       </div>
                     </li>
                   ))}
                 </ul>
               ) : <span className="text-xs text-slate-600 italic">Não informado</span>}
             </div>

             {/* Composers */}
             <div className="bg-slate-900/30 p-4 rounded-lg">
               <h4 className="text-xs font-bold text-red-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                 <PenTool size={14} /> Compositores
               </h4>
               {session.composers.length > 0 ? (
                 <ul className="space-y-3">
                   {session.composers.map(p => (
                     <li key={p.id} className="text-sm text-slate-200 flex flex-col">
                       <span className="font-medium">{p.name}</span>
                        <div className="text-xs text-slate-500 flex flex-col mt-0.5">
                         {(p.phone || p.email) ? (
                            <>
                              {p.phone && <span>Tel: {p.phone}</span>}
                              {p.email && <span>Email: {p.email}</span>}
                            </>
                         ) : p.contact && <span>{p.contact}</span>}
                         {p.contactRole && <span className="text-red-400 font-medium mt-0.5">{p.contactRole}</span>}
                       </div>
                     </li>
                   ))}
                 </ul>
               ) : <span className="text-xs text-slate-600 italic">Não informado</span>}
             </div>
          </div>
          
          {/* Notes Display */}
          {session.notes && (
            <div className="mt-4 pt-4 border-t border-slate-700/50 relative z-10">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                <StickyNote size={14} /> Observações
              </h4>
              <p className="text-sm text-slate-300 whitespace-pre-wrap bg-slate-900/20 p-3 rounded-lg border border-slate-700/30 italic">
                {session.notes}
              </p>
            </div>
          )}

           {/* Creator Audit Trail */}
           <div className="mt-4 pt-3 border-t border-slate-700/30 flex justify-end">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-slate-900/50 px-2 py-1 rounded-full">
                <UserCheck size={10} />
                Registrado por: <span className="text-slate-400 font-medium">{session.createdBy || 'Sistema'}</span>
              </div>
           </div>
        </div>
      ))}
    </div>
  );
};

export default SessionList;
