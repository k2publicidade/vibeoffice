import React, { useState, useEffect, useCallback } from 'react';
import { SavedProject, GenerationConfig } from '@/types/vibecanvas';
import { getProjects, deleteProject, restoreProject, getLocalProjects, importLocalProjects } from '@/lib/vibecanvas/storageService';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Trash2, Edit, Calendar, Music, Sparkles, Copy, FolderOpen, ArrowRight } from 'lucide-react';

interface DashboardProps {
    onEdit: (project: SavedProject) => void;
    onCreateNew: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onEdit, onCreateNew }) => {
    const [projects, setProjects] = useState<SavedProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [archived, setArchived] = useState(false);
    const [localCount, setLocalCount] = useState(0);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(false);

    const loadProjects = useCallback(async () => {
        setLoading(true);
        setError(false);
        try { setProjects(await getProjects(archived)); setLocalCount(getLocalProjects().length); }
        catch { setError(true); toast.error('Não foi possível carregar os projetos'); }
        finally { setLoading(false); }
    }, [archived]);

    useEffect(() => {
        void loadProjects();
        const client = createClient();
        const channel = client.channel(`cover-projects:${crypto.randomUUID()}`).on('postgres_changes', { event: '*', schema: 'public', table: 'cover_projects' }, () => void loadProjects()).subscribe();
        return () => { void client.removeChannel(channel); };
    }, [loadProjects]);

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (busy) return;
        setBusy(true);
        try { if (archived) await restoreProject(id); else await deleteProject(id); await loadProjects(); toast.success(archived ? 'Projeto restaurado' : 'Projeto arquivado. Você pode restaurá-lo na lista de arquivados.'); }
        catch { toast.error('Não foi possível atualizar o projeto'); }
        finally { setBusy(false); }
    };

    const handleImport = async () => {
        setBusy(true);
        try { const count = await importLocalProjects(); await loadProjects(); toast.success(`${count} projetos importados para sua conta`); }
        catch { toast.error('Não foi possível concluir a importação. Os projetos locais foram preservados.'); }
        finally { setBusy(false); }
    };

    const formatDate = (timestamp: number) => {
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(timestamp));
    };

    if (loading) return <p className="p-8 text-zinc-400">Carregando projetos…</p>;
    if (error) return <div className="p-8"><p>Não foi possível carregar os projetos.</p><button onClick={() => void loadProjects()} className="underline">Tentar novamente</button></div>;

    return (
        <div className="w-full max-w-7xl mx-auto px-6 py-8 animate-in fade-in duration-500">

            <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
                <div>
                    <h2 className="text-4xl font-bold text-white mb-2">{archived ? 'Projetos arquivados' : 'Projetos de Capas'}</h2>
                    <p className="text-zinc-400">Seus briefings e conceitos ficam salvos na sua conta.</p>
                </div>
                <button
                    onClick={onCreateNew}
                    className="bg-white hover:bg-zinc-200 text-black font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg hover:shadow-white/10 hover:scale-105 active:scale-95"
                >
                    <Sparkles size={18} />
                    Novo Projeto
                </button>
            </div>
            <div className="flex flex-wrap gap-4 mb-6"><button onClick={() => setArchived(value => !value)} disabled={busy} className="underline text-zinc-300">{archived ? 'Ver projetos ativos' : 'Ver arquivados'}</button>{localCount > 0 && <button onClick={() => void handleImport()} disabled={busy} className="underline text-orange-400">Importar {localCount} projetos deste navegador para minha conta</button>}</div>

            {projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-16 border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/30">
                    <div className="w-20 h-20 bg-zinc-800/50 rounded-full flex items-center justify-center mb-6">
                        <FolderOpen className="text-zinc-600" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Nenhum projeto salvo</h3>
                    <p className="text-zinc-500 mb-8 max-w-sm text-center">
                        Seus projetos criados aparecerão aqui para fácil acesso e edição.
                    </p>
                    <button
                        onClick={onCreateNew}
                        className="text-orange-500 hover:text-orange-400 font-medium flex items-center gap-2 hover:underline underline-offset-4"
                    >
                        Criar meu primeiro briefing <ArrowRight size={16} />
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project) => (
                        <div
                            key={project.id}
                            onClick={() => { if (!archived) onEdit(project); }}
                            className="group relative bg-zinc-900 border border-zinc-800 hover:border-orange-500/50 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-orange-900/10 hover:-translate-y-1"
                        >
                            {/* Header */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500/10 to-red-500/10 flex items-center justify-center border border-white/5">
                                    <Music size={18} className="text-orange-400" />
                                </div>
                                <button
                                    onClick={(e) => handleDelete(project.id, e)}
                                    disabled={busy}
                                    aria-label={archived ? 'Restaurar projeto' : 'Arquivar projeto'}
                                    className="text-zinc-600 hover:text-red-500 p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                    {archived ? 'Restaurar' : <Trash2 size={16} />}
                                </button>
                            </div>

                            {/* Content */}
                            <div className="space-y-3 mb-6">
                                <div>
                                    <h3 className="font-bold text-lg text-white truncate pr-4">
                                        {project.config.textConfig.title || 'Sem Título'}
                                    </h3>
                                    <p className="text-sm text-zinc-400 truncate">
                                        {project.config.textConfig.artist || 'Artista Desconhecido'}
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <span className="px-2 py-1 rounded-md bg-zinc-800 text-zinc-400 text-xs border border-zinc-700">
                                        {project.config.musicGenre}
                                    </span>
                                    <span className="px-2 py-1 rounded-md bg-zinc-800 text-zinc-400 text-xs border border-zinc-700">
                                        {project.config.visualStyle}
                                    </span>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                                <div className="flex items-center gap-2 text-xs text-zinc-500">
                                    <Calendar size={12} />
                                    {formatDate(project.createdAt)}
                                </div>
                                <div className="flex items-center gap-1 text-xs font-medium text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    Abrir <ArrowRight size={12} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Dashboard;
