
import React, { useState, useEffect } from 'react';
import { Session, Person, SessionType } from '../types';
import DynamicList from './DynamicList';
import { Save, Monitor, Clock, Calendar, Music2, StickyNote, Mic2 } from 'lucide-react';

interface SessionFormProps {
  onSave: (session: Session) => void;
  onCancel: () => void;
  currentUserEmail: string;
  initialData?: Session;
}

const SessionForm: React.FC<SessionFormProps> = ({ onSave, onCancel, currentUserEmail, initialData }) => {
  // Safe ID generator
  const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

  const [trackTitle, setTrackTitle] = useState('');
  const [studio, setStudio] = useState('');
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
      setTrackTitle(initialData.trackTitle);
      setStudio(initialData.studio);
      setDate(initialData.date);
      setStartTime(initialData.startTime);
      setEndTime(initialData.endTime);
      setPc(initialData.pc);
      setTypes(initialData.type);
      setNotes(initialData.notes || '');
      
      // Helper to migrate old 'contact' field to 'phone' if 'phone' is missing
      const migratePerson = (p: Person) => ({
        ...p,
        phone: p.phone || p.contact || '', 
        email: p.email || '',
        contactRole: p.contactRole || ''
      });

      setProducers(initialData.producers.length > 0 ? initialData.producers.map(migratePerson) : [{ id: generateId(), name: '', phone: '', email: '', contactRole: '' }]);
      setArtists(initialData.artists.length > 0 ? initialData.artists.map(migratePerson) : [{ id: generateId(), name: '', phone: '', email: '', contactRole: '' }]);
      setComposers(initialData.composers.length > 0 ? initialData.composers.map(migratePerson) : [{ id: generateId(), name: '', phone: '', email: '', contactRole: '' }]);
    }
  }, [initialData]);

  const toggleType = (t: SessionType) => {
    setTypes(prev => 
      prev.includes(t) 
        ? prev.filter(x => x !== t) 
        : [...prev, t]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Explicit Validation to tell user exactly what is missing
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
      return;
    }

    const newSession: Session = {
      // Use existing ID if editing, otherwise generate new
      id: initialData ? initialData.id : generateId(),
      trackTitle,
      studio,
      date,
      startTime,
      endTime,
      pc,
      type: types,
      producers: producers.filter(p => p.name.trim() !== ''),
      artists: artists.filter(p => p.name.trim() !== ''),
      composers: composers.filter(p => p.name.trim() !== ''),
      // Preserve creation info if editing
      createdAt: initialData ? initialData.createdAt : Date.now(),
      createdBy: initialData ? initialData.createdBy : currentUserEmail,
      notes: notes.trim()
    };

    onSave(newSession);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden">
      <div className="p-6 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-900">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="w-2 h-6 bg-red-600 rounded-full"></span>
          {initialData ? 'Editar Sessão' : 'Nova Sessão'}
        </h2>
        <p className="text-sm text-slate-500 mt-1 ml-4">
          {initialData ? `Editando o registro ID: ${initialData.id}` : 'Preencha os detalhes da produção'}
        </p>
      </div>

      <div className="p-6 space-y-8">
        
        {/* Track Title - Prominent */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2 uppercase tracking-wide">Título da Faixa / Projeto <span className="text-red-500">*</span></label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Music2 size={20} className="text-red-500" />
            </div>
            <input
              type="text"
              value={trackTitle}
              onChange={(e) => setTrackTitle(e.target.value)}
              placeholder="Ex: Nome da Música"
              className="pl-12 block w-full bg-slate-900 border border-slate-700 rounded-lg py-4 text-lg text-white placeholder-slate-500 focus:ring-red-500 focus:border-red-500"
            />
          </div>
        </div>

        {/* Row 1: Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Estúdio <span className="text-red-500">*</span></label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mic2 size={18} className="text-slate-500" />
              </div>
              <input
                type="text"
                value={studio}
                onChange={(e) => setStudio(e.target.value)}
                placeholder="Ex: Estúdio A"
                className="pl-10 block w-full bg-slate-900 border border-slate-700 rounded-md py-3 text-white focus:ring-red-500 focus:border-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Data <span className="text-red-500">*</span></label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar size={18} className="text-slate-500" />
              </div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="pl-10 block w-full bg-slate-900 border border-slate-700 rounded-md py-3 text-white focus:ring-red-500 focus:border-red-500"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <div className="w-1/2">
                <label className="block text-sm font-medium text-slate-400 mb-1">Início <span className="text-red-500">*</span></label>
                <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                    <Clock size={16} className="text-slate-500" />
                </div>
                <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="pl-8 block w-full bg-slate-900 border border-slate-700 rounded-md py-3 text-white focus:ring-red-500 focus:border-red-500"
                />
                </div>
            </div>
            <div className="w-1/2">
                <label className="block text-sm font-medium text-slate-400 mb-1">Término <span className="text-red-500">*</span></label>
                <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                    <Clock size={16} className="text-slate-500" />
                </div>
                <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="pl-8 block w-full bg-slate-900 border border-slate-700 rounded-md py-3 text-white focus:ring-red-500 focus:border-red-500"
                />
                </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Workstation (PC) <span className="text-red-500">*</span></label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Monitor size={18} className="text-slate-500" />
              </div>
              <input
                type="text"
                value={pc}
                onChange={(e) => setPc(e.target.value)}
                placeholder="Ex: Mac Studio A"
                className="pl-10 block w-full bg-slate-900 border border-slate-700 rounded-md py-3 text-white focus:ring-red-500 focus:border-red-500"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Type Selection */}
        <div>
           <label className="block text-sm font-medium text-slate-400 mb-3 uppercase tracking-wide">Tipo de Sessão (Selecione um ou mais) <span className="text-red-500">*</span></label>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
             {['Gravacao', 'Mix/Master', 'Edicao', 'Producao'].map((t) => {
               const isSelected = types.includes(t as SessionType);
               return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleType(t as SessionType)}
                  className={`py-3 px-4 rounded-lg border text-sm font-medium transition-all relative overflow-hidden ${
                    isSelected
                      ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-500/30' 
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {isSelected && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full"></span>
                  )}
                  {t}
                </button>
               );
             })}
           </div>
        </div>

        {/* Dynamic Lists */}
        <div className="grid grid-cols-1 gap-8">
          <DynamicList title="Produtores" items={producers} onChange={setProducers} />
          <DynamicList title="Artistas" items={artists} onChange={setArtists} />
          <DynamicList title="Compositores" items={composers} onChange={setComposers} requiredFullname={true} />
        </div>

        {/* Notes Field */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2 uppercase tracking-wide">Observações</label>
          <div className="relative">
            <div className="absolute top-3 left-0 pl-4 pointer-events-none">
              <StickyNote size={20} className="text-slate-500" />
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalhes adicionais da sessão..."
              rows={3}
              className="pl-12 block w-full bg-slate-900 border border-slate-700 rounded-lg py-3 px-4 text-white placeholder-slate-500 focus:ring-red-500 focus:border-red-500"
            />
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-xs text-slate-500 italic">
            Registrado por: <span className="text-slate-400 font-medium">{initialData ? initialData.createdBy : currentUserEmail}</span>
        </div>
      
      </div>

      <div className="bg-slate-900/50 p-6 flex justify-end gap-3 border-t border-slate-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 bg-transparent text-slate-400 hover:text-white font-medium text-base transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold text-base rounded-lg shadow-lg shadow-green-900/20 transition-all hover:scale-105 active:scale-95"
        >
          <Save size={20} />
          {initialData ? 'Atualizar Sessão' : 'Salvar Sessão'}
        </button>
      </div>
    </form>
  );
};

export default SessionForm;
