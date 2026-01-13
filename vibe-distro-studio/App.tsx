
import React, { useEffect, useState } from 'react';
import { Session, Person, UserRole } from './types';
import * as Storage from './services/storageService';
import SessionForm from './components/SessionForm';
import SessionList from './components/SessionList';
import DashboardStats from './components/DashboardStats';
import AIAssistant from './components/AIAssistant';
import LoginScreen from './components/LoginScreen';
import { PlusCircle, List, LayoutDashboard, AudioWaveform, Download, Filter, XCircle, CalendarRange, LogOut, ShieldCheck, User, Mic2, Headphones, Music } from 'lucide-react';

enum ViewState {
  LIST = 'LIST',
  FORM = 'FORM',
}

const App: React.FC = () => {
  // Auth State
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');

  const [sessions, setSessions] = useState<Session[]>([]);
  const [view, setView] = useState<ViewState>(ViewState.LIST);
  const [editingSession, setEditingSession] = useState<Session | undefined>(undefined);
  
  // Filter State
  const [filterTitle, setFilterTitle] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterProducer, setFilterProducer] = useState('');
  const [filterArtist, setFilterArtist] = useState('');

  useEffect(() => {
    // Load data on mount
    const data = Storage.getSessions();
    setSessions(data);
  }, []);

  const handleLogin = (email: string, role: UserRole) => {
    setUserEmail(email);
    setUserRole(role);
  };

  const handleLogout = () => {
    setUserRole(null);
    setUserEmail('');
    setEditingSession(undefined);
    setView(ViewState.LIST);
    clearFilters();
  };

  const handleSaveSession = (session: Session) => {
    try {
      Storage.saveSession(session);
      setSessions(Storage.getSessions()); // Refresh state
      clearFilters(); // Ensure updated item is visible
      setEditingSession(undefined); // Clear editing state
      setView(ViewState.LIST);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Houve um erro ao salvar a sessão. Verifique o armazenamento do navegador.");
    }
  };

  const handleDeleteSession = (id: string) => {
    if (userRole !== 'ADMIN') {
      alert("Apenas administradores podem excluir sessões.");
      return;
    }

    if (window.confirm("Tem certeza que deseja excluir esta sessão permanentemente?")) {
      Storage.deleteSession(id);
      setSessions(Storage.getSessions());
    }
  };

  const handleEditSession = (session: Session) => {
    if (userRole !== 'ADMIN') {
      alert("Apenas administradores podem editar sessões.");
      return;
    }
    setEditingSession(session);
    setView(ViewState.FORM);
  };

  const handleCancelForm = () => {
    setEditingSession(undefined);
    setView(ViewState.LIST);
  };

  const handleNewSession = () => {
    setEditingSession(undefined);
    setView(ViewState.FORM);
  };

  // Filter Logic
  const filteredSessions = sessions.filter(session => {
    // Title Filter
    if (filterTitle && !session.trackTitle.toLowerCase().includes(filterTitle.toLowerCase())) return false;

    // Date Filters
    if (filterStartDate && session.date < filterStartDate) return false;
    if (filterEndDate && session.date > filterEndDate) return false;

    // Producer Filter
    if (filterProducer) {
      const search = filterProducer.toLowerCase();
      const hasProducer = session.producers.some(p => p.name.toLowerCase().includes(search));
      if (!hasProducer) return false;
    }

    // Artist Filter
    if (filterArtist) {
      const search = filterArtist.toLowerCase();
      const hasArtist = session.artists.some(a => a.name.toLowerCase().includes(search));
      if (!hasArtist) return false;
    }

    return true;
  });

  const clearFilters = () => {
    setFilterTitle('');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterProducer('');
    setFilterArtist('');
  };

  const exportSessionsToCSV = () => {
    if (filteredSessions.length === 0) {
      alert("Não há sessões para exportar com os filtros atuais.");
      return;
    }

    // Comprehensive Headers in Portuguese
    const headers = [
      'ID Sessão',
      'Data de Registro', // Created At
      'Registrado Por',   // Created By
      'Estúdio',
      'Título da Faixa',
      'Data da Sessão',
      'Início',
      'Fim',
      'Tipos de Sessão',
      'Workstation (PC)',
      'Produtores (Nome - Função - Tel - Email)',
      'Artistas (Nome - Função - Tel - Email)',
      'Compositores (Nome - Função - Tel - Email)',
      'Observações'
    ];
    
    const escapeCsv = (str: string | undefined | null) => {
      if (!str) return '';
      const stringValue = String(str);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    const formatPeople = (people: Person[]) => {
      return people.map(p => {
          let parts = [p.name];
          if (p.contactRole) parts.push(`(${p.contactRole})`);
          
          // Handle new and old fields
          if (p.phone) parts.push(`[Tel: ${p.phone}]`);
          if (p.email) parts.push(`[Email: ${p.email}]`);
          if (p.contact && !p.phone && !p.email) parts.push(`[Contato: ${p.contact}]`); // Legacy fallback

          return parts.join(' ');
      }).join('; ');
    };

    const rows = filteredSessions.map(s => [
      s.id,
      new Date(s.createdAt).toLocaleString('pt-BR'), // Formatted Created At
      s.createdBy,
      s.studio,
      s.trackTitle,
      s.date,
      s.startTime,
      s.endTime,
      s.type.join(', '),
      s.pc,
      formatPeople(s.producers),
      formatPeople(s.artists),
      formatPeople(s.composers),
      s.notes || ''
    ].map(escapeCsv).join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `vibe_distro_sessões_completo_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // If not logged in, show Login Screen
  if (!userRole) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-inter">
      {/* Navbar */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-orange-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-red-500/20">
               <AudioWaveform size={24} />
             </div>
             <div>
               <h1 className="text-2xl font-black tracking-tighter text-white uppercase italic">
                 Vibe <span className="text-red-500">Distro</span>
               </h1>
               <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium tracking-widest uppercase">Studio Manager</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${userRole === 'ADMIN' ? 'border-red-500 text-red-500' : 'border-slate-500 text-slate-400'}`}>
                  {userRole}
                </span>
               </div>
             </div>
          </div>
          
          <nav className="flex items-center gap-4">
            <button 
              onClick={() => { setView(ViewState.LIST); setEditingSession(undefined); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wide transition-all hidden sm:flex ${
                view === ViewState.LIST 
                  ? 'text-white bg-red-600 shadow-lg shadow-red-600/20' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <LayoutDashboard size={18} />
              Dashboard
            </button>

            <div className="w-px h-8 bg-slate-700 mx-1 hidden sm:block"></div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Logado como</p>
                <div className="flex items-center justify-end gap-1.5">
                   <p className="text-sm font-medium text-white">
                    {userEmail.split('@')[0]}
                  </p>
                  {userRole === 'ADMIN' ? <ShieldCheck size={14} className="text-red-500" /> : <User size={14} className="text-slate-500" />}
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors border border-transparent hover:border-slate-600"
                title="Sair"
              >
                <LogOut size={20} />
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {view === ViewState.LIST && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-3xl font-bold text-white">Visão Geral</h2>
                <p className="text-slate-400 mt-1">Gerencie suas sessões de estúdio com eficiência.</p>
              </div>
              <div className="flex gap-3">
                 <button
                  onClick={exportSessionsToCSV}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 px-5 py-3 rounded-lg transition-all font-bold uppercase text-xs tracking-wide"
                >
                  <Download size={18} />
                  Exportar CSV
                </button>
                <button
                  onClick={handleNewSession}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg shadow-lg shadow-red-900/30 transition-all hover:scale-105 active:scale-95 font-bold uppercase text-sm tracking-wide"
                >
                  <PlusCircle size={20} />
                  Nova Sessão
                </button>
              </div>
            </div>

            {/* Filter Section */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex flex-col xl:flex-row items-start xl:items-center gap-4 animate-fadeIn">
              <div className="flex items-center gap-2 text-red-500 font-bold uppercase text-xs tracking-wider mr-2 min-w-max self-start xl:self-center mt-3 xl:mt-0">
                <Filter size={16} />
                Filtros
              </div>

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 w-full">
                
                {/* Title Filter */}
                <div className="relative">
                  <label className="block text-xs text-slate-400 mb-1 ml-1">Título / Projeto</label>
                   <div className="relative">
                     <Music size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      type="text" 
                      value={filterTitle}
                      onChange={(e) => setFilterTitle(e.target.value)}
                      placeholder="Buscar faixa..."
                      className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-lg pl-9 pr-3 py-2 focus:ring-red-500 focus:border-red-500 placeholder-slate-500"
                    />
                  </div>
                </div>

                {/* Date Start */}
                <div className="relative">
                  <label className="block text-xs text-slate-400 mb-1 ml-1">Data Início</label>
                  <div className="relative">
                     <CalendarRange size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                     <input 
                      type="date" 
                      value={filterStartDate}
                      onChange={(e) => setFilterStartDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-lg pl-9 pr-3 py-2 focus:ring-red-500 focus:border-red-500 placeholder-slate-500"
                    />
                  </div>
                </div>

                {/* Date End */}
                <div className="relative">
                  <label className="block text-xs text-slate-400 mb-1 ml-1">Data Fim</label>
                   <div className="relative">
                     <CalendarRange size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      type="date" 
                      value={filterEndDate}
                      onChange={(e) => setFilterEndDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-lg pl-9 pr-3 py-2 focus:ring-red-500 focus:border-red-500 placeholder-slate-500"
                    />
                  </div>
                </div>

                {/* Producer Filter */}
                <div className="relative">
                  <label className="block text-xs text-slate-400 mb-1 ml-1">Produtor</label>
                   <div className="relative">
                     <Headphones size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      type="text" 
                      value={filterProducer}
                      onChange={(e) => setFilterProducer(e.target.value)}
                      placeholder="Nome do produtor..."
                      className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-lg pl-9 pr-3 py-2 focus:ring-red-500 focus:border-red-500 placeholder-slate-500"
                    />
                  </div>
                </div>

                {/* Artist Filter */}
                <div className="relative">
                  <label className="block text-xs text-slate-400 mb-1 ml-1">Artista</label>
                   <div className="relative">
                     <Mic2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      type="text" 
                      value={filterArtist}
                      onChange={(e) => setFilterArtist(e.target.value)}
                      placeholder="Nome do artista..."
                      className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-lg pl-9 pr-3 py-2 focus:ring-red-500 focus:border-red-500 placeholder-slate-500"
                    />
                  </div>
                </div>
              </div>

              {(filterTitle || filterStartDate || filterEndDate || filterProducer || filterArtist) && (
                <button 
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-slate-400 hover:text-red-400 text-xs font-medium uppercase tracking-wide px-3 py-2 transition-colors self-end xl:self-center"
                >
                  <XCircle size={14} />
                  Limpar
                </button>
              )}
            </div>

            {/* Stats */}
            {filteredSessions.length > 0 ? (
               <DashboardStats sessions={filteredSessions} />
            ) : sessions.length > 0 ? (
              <div className="text-center py-8 bg-slate-800/30 rounded-xl border border-dashed border-slate-700 text-slate-500">
                Nenhuma sessão encontrada para os filtros selecionados.
              </div>
            ) : null}

            {/* List */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-slate-800 rounded-lg">
                   <List size={20} className="text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-200">
                  {filteredSessions.length !== sessions.length ? 'Sessões Filtradas' : 'Histórico de Sessões'}
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    ({filteredSessions.length} registros)
                  </span>
                </h3>
              </div>
              <SessionList 
                sessions={filteredSessions} 
                onDelete={handleDeleteSession} 
                onEdit={handleEditSession}
                userRole={userRole} 
              />
            </div>

            {/* AI Assistant - Passing filtered sessions ensures context awareness of filters */}
            <AIAssistant sessions={filteredSessions} />
          </div>
        )}

        {view === ViewState.FORM && (
          <div className="animate-fadeIn">
             <div className="mb-6">
               <button 
                 onClick={handleCancelForm}
                 className="text-slate-400 hover:text-white text-sm flex items-center gap-2 transition-colors group"
               >
                 <span className="group-hover:-translate-x-1 transition-transform">←</span> Voltar para Dashboard
               </button>
             </div>
            <SessionForm 
              onSave={handleSaveSession} 
              onCancel={handleCancelForm} 
              currentUserEmail={userEmail}
              initialData={editingSession}
            />
          </div>
        )}

      </main>

      <footer className="border-t border-slate-800 bg-slate-900 py-8 text-center">
        <p className="text-slate-500 text-sm">&copy; {new Date().getFullYear()} Vibe Distro Studio Manager.</p>
      </footer>
    </div>
  );
};

export default App;
