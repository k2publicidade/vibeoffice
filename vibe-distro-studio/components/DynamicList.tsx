
import React from 'react';
import { Person } from '../types';
import { Plus, Trash2, User, Phone, Briefcase, Mail } from 'lucide-react';

interface DynamicListProps {
  title: string;
  items: Person[];
  onChange: (items: Person[]) => void;
  requiredFullname?: boolean;
}

const DynamicList: React.FC<DynamicListProps> = ({ title, items, onChange, requiredFullname }) => {
  
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
    <div className="mb-6 p-5 bg-slate-800/50 rounded-lg border border-slate-700">
      <div className="flex justify-between items-center mb-4">
        <label className="block text-base font-bold text-red-500 uppercase tracking-wider">
          {title}
        </label>
        <button
          type="button"
          onClick={handleAdd}
          className="text-xs flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded transition-colors"
        >
          <Plus size={14} /> Adicionar
        </button>
      </div>

      <div className="space-y-4">
        {items.length === 0 && (
          <p className="text-slate-500 text-sm italic">Nenhum {title.toLowerCase().slice(0, -1)} adicionado.</p>
        )}
        
        {items.map((item) => (
          <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center animate-fadeIn p-3 bg-slate-900/30 rounded-md border border-slate-700/50">
            
            {/* Name Field - Takes 3 columns */}
            <div className="relative md:col-span-3">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={16} className="text-slate-500" />
              </div>
              <input
                type="text"
                value={item.name}
                onChange={(e) => handleUpdate(item.id, 'name', e.target.value)}
                placeholder={requiredFullname ? "Nome Completo" : "Nome / Artista"}
                className="pl-10 block w-full bg-slate-900 border border-slate-700 rounded-lg py-2 text-slate-100 placeholder-slate-500 focus:ring-red-500 focus:border-red-500 text-xs sm:text-sm"
              />
            </div>

            {/* Phone Field - Takes 3 columns */}
            <div className="relative md:col-span-3">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone size={16} className="text-slate-500" />
              </div>
              <input
                type="text"
                value={item.phone || ''}
                onChange={(e) => handleUpdate(item.id, 'phone', e.target.value)}
                placeholder="Telefone"
                className="pl-10 block w-full bg-slate-900 border border-slate-700 rounded-lg py-2 text-slate-100 placeholder-slate-500 focus:ring-red-500 focus:border-red-500 text-xs sm:text-sm"
              />
            </div>

            {/* Email Field - Takes 3 columns */}
            <div className="relative md:col-span-3">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail size={16} className="text-slate-500" />
              </div>
              <input
                type="email"
                value={item.email || ''}
                onChange={(e) => handleUpdate(item.id, 'email', e.target.value)}
                placeholder="Email"
                className="pl-10 block w-full bg-slate-900 border border-slate-700 rounded-lg py-2 text-slate-100 placeholder-slate-500 focus:ring-red-500 focus:border-red-500 text-xs sm:text-sm"
              />
            </div>

            {/* Role Field - Takes 2 columns */}
            <div className="relative md:col-span-2">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Briefcase size={16} className="text-slate-500" />
              </div>
              <input
                type="text"
                value={item.contactRole || ''}
                onChange={(e) => handleUpdate(item.id, 'contactRole', e.target.value)}
                placeholder="Função (Ex: A&R)"
                className="pl-10 block w-full bg-slate-900 border border-slate-700 rounded-lg py-2 text-slate-100 placeholder-slate-500 focus:ring-red-500 focus:border-red-500 text-xs sm:text-sm"
              />
            </div>

            {/* Delete Button - Takes 1 column */}
            <div className="md:col-span-1 flex justify-end md:justify-center">
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                className="text-slate-400 hover:text-red-400 p-2 transition-colors"
                title="Remover"
              >
                <Trash2 size={18} />
              </button>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
};

export default DynamicList;
