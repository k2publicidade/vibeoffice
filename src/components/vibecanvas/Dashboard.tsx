import React, { useState, useEffect } from 'react';
import { SavedProject, GenerationConfig } from '@/types/vibecanvas';
import { getProjects, deleteProject } from '@/lib/vibecanvas/storageService';
import { Trash2, Edit, Calendar, Music, Sparkles, Copy, FolderOpen, ArrowRight } from 'lucide-react';

interface DashboardProps {
    onEdit: (project: SavedProject) => void;
    onCreateNew: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onEdit, onCreateNew }) => {
    const [projects, setProjects] = useState<SavedProject[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = () => {
        setLoading(true);
        const data = getProjects();
        setProjects(data);
        setLoading(false);
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Tem certeza que deseja excluir este projeto?')) {
            deleteProject(id);
            loadProjects();
        }
    };

    const formatDate = (timestamp: number) => {
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(timestamp));
    };

    if (loading) return null;

    return (
        <div className="w-full max-w-7xl mx-auto px-6 py-8 animate-in fade-in duration-500">

            <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
                <div>
                    <h2 className="text-4xl font-bold text-white mb-2">Meus Projetos</h2>
                    <p className="text-zinc-400">Gerencie seus briefings e conceitos.</p>
                </div>
                <button
                    onClick={onCreateNew}
                    className="bg-white hover:bg-zinc-200 text-black font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg hover:shadow-white/10 hover:scale-105 active:scale-95"
                >
                    <Sparkles size={18} />
                    Novo Projeto
                </button>
            </div>

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
                            onClick={() => onEdit(project)}
                            className="group relative bg-zinc-900 border border-zinc-800 hover:border-orange-500/50 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-orange-900/10 hover:-translate-y-1"
                        >
                            {/* Header */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500/10 to-red-500/10 flex items-center justify-center border border-white/5">
                                    <Music size={18} className="text-orange-400" />
                                </div>
                                <button
                                    onClick={(e) => handleDelete(project.id, e)}
                                    className="text-zinc-600 hover:text-red-500 p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                    <Trash2 size={16} />
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
