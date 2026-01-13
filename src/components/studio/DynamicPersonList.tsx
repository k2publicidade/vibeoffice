import React from 'react';
import { Person } from '@/types/studio';
import { Plus, Trash2, User, Phone, Briefcase, Mail } from 'lucide-react';

interface DynamicListProps {
    title: string;
    items: Person[];
    onChange: (items: Person[]) => void;
    requiredFullname?: boolean;
}

const DynamicPersonList: React.FC<DynamicListProps> = ({ title, items, onChange, requiredFullname }) => {

    // Safe ID generation fallback
    const generateId = () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    };

    const handleAdd = () => {
        onChange([...items, { id: generateId(), name: '', phone: '', email: '', contactRole: '' }]);
    };

    const handleRemove = (id: string) => {
        onChange(items.filter(item => item.id !== id));
    };

    const handleUpdate = (id: string, field: keyof Person, value: string) => {
        onChange(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">
                    {title}
                </label>
                <button
                    type="button"
                    onClick={handleAdd}
                    className="
                        group flex items-center gap-1.5 px-3 py-1.5 rounded-full 
                        bg-red-500/10 text-red-400 text-xs font-bold uppercase tracking-wide
                        hover:bg-red-500/20 hover:text-red-300 transition-all
                        border border-red-500/20 active:scale-95
                    "
                >
                    <Plus size={14} className="group-hover:rotate-90 transition-transform" />
                    Adicionar
                </button>
            </div>

            <div className="space-y-3">
                {items.length === 0 && (
                    <div className="p-4 rounded-xl border border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center text-center">
                        <p className="text-zinc-500 text-sm italic">Nenhum profissional adicionado a lista de {title.toLowerCase()}.</p>
                    </div>
                )}

                {items.map((item) => (
                    <div key={item.id} className="group relative grid grid-cols-1 md:grid-cols-12 gap-3 items-start p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 hover:bg-white/[0.07] transition-all">

                        {/* Remove Button - Positioned absolutely on mobile, inline on desktop */}
                        <div className="absolute right-2 top-2 md:relative md:right-auto md:top-auto md:col-span-1 md:flex md:justify-center md:items-center md:h-full md:pt-2">
                            <button
                                type="button"
                                onClick={() => handleRemove(item.id)}
                                className="text-zinc-600 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-500/10 transition-all"
                                title="Remover"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>

                        {/* Name Field - Takes 3 columns */}
                        <div className="md:col-span-3 space-y-1">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User size={14} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    value={item.name}
                                    onChange={(e) => handleUpdate(item.id, 'name', e.target.value)}
                                    placeholder={requiredFullname ? "Nome Completo" : "Nome / Artista"}
                                    className="pl-9 block w-full bg-black/20 border border-white/5 rounded-lg py-2.5 text-zinc-200 placeholder-zinc-600 focus:ring-1 focus:ring-red-500/30 focus:border-red-500/40 text-sm transition-all"
                                />
                            </div>
                        </div>

                        {/* Phone Field - Takes 3 columns */}
                        <div className="md:col-span-3 space-y-1">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Phone size={14} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    value={item.phone || ''}
                                    onChange={(e) => handleUpdate(item.id, 'phone', e.target.value)}
                                    placeholder="Telefone"
                                    className="pl-9 block w-full bg-black/20 border border-white/5 rounded-lg py-2.5 text-zinc-200 placeholder-zinc-600 focus:ring-1 focus:ring-red-500/30 focus:border-red-500/40 text-sm transition-all"
                                />
                            </div>
                        </div>

                        {/* Email Field - Takes 3 columns */}
                        <div className="md:col-span-3 space-y-1">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail size={14} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                                </div>
                                <input
                                    type="email"
                                    value={item.email || ''}
                                    onChange={(e) => handleUpdate(item.id, 'email', e.target.value)}
                                    placeholder="Email"
                                    className="pl-9 block w-full bg-black/20 border border-white/5 rounded-lg py-2.5 text-zinc-200 placeholder-zinc-600 focus:ring-1 focus:ring-red-500/30 focus:border-red-500/40 text-sm transition-all"
                                />
                            </div>
                        </div>

                        {/* Role Field - Takes 2 columns */}
                        <div className="md:col-span-2 space-y-1">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Briefcase size={14} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    value={item.contactRole || ''}
                                    onChange={(e) => handleUpdate(item.id, 'contactRole', e.target.value)}
                                    placeholder="Função"
                                    className="pl-9 block w-full bg-black/20 border border-white/5 rounded-lg py-2.5 text-zinc-200 placeholder-zinc-600 focus:ring-1 focus:ring-red-500/30 focus:border-red-500/40 text-sm transition-all"
                                />
                            </div>
                        </div>

                    </div>
                ))}
            </div>
        </div>
    );
};

export default DynamicPersonList;
