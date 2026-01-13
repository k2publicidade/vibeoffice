import React, { useState } from 'react';
import { Session } from '../types';
import { analyzeSessions } from '../services/geminiService';
import { Sparkles, X, Send, Bot } from 'lucide-react';

interface AIAssistantProps {
  sessions: Session[];
}

const AIAssistant: React.FC<AIAssistantProps> = ({ sessions }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userQuery = query;
    setQuery('');
    setHistory(prev => [...prev, { role: 'user', text: userQuery }]);
    setLoading(true);

    const response = await analyzeSessions(sessions, userQuery);

    setHistory(prev => [...prev, { role: 'model', text: response }]);
    setLoading(false);
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-red-600 hover:bg-red-500 text-white p-4 rounded-full shadow-2xl shadow-red-600/50 transition-all hover:scale-110 z-50 flex items-center gap-2 group border-2 border-red-400"
        >
          <Sparkles size={24} className="group-hover:animate-pulse" />
          <span className="hidden group-hover:block font-medium pr-2">Vibe AI</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-48px)] h-[500px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-red-700 to-red-600 flex justify-between items-center">
            <div className="flex items-center gap-2 text-white font-bold">
              <Bot size={20} /> Vibe AI Assistant
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white p-1 rounded-md hover:bg-red-500 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-900">
            {history.length === 0 && (
              <div className="text-center text-slate-500 mt-10 text-sm">
                <p>Olá! Eu tenho acesso aos dados das sessões da Vibe Distro.</p>
                <p className="mt-2">Pergunte coisas como:</p>
                <ul className="mt-2 space-y-1 text-red-400">
                  <li>"Quantas gravações fizemos esse mês?"</li>
                  <li>"Quem produziu a faixa X?"</li>
                  <li>"Resuma as sessões da semana passada"</li>
                </ul>
              </div>
            )}
            
            {history.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-red-600 text-white rounded-br-none' 
                      : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 p-3 rounded-2xl rounded-bl-none border border-slate-700">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce delay-75"></div>
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce delay-150"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <form onSubmit={handleSearch} className="p-3 bg-slate-800 border-t border-slate-700">
            <div className="relative">
              <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pergunte sobre as sessões..." 
                className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-full pl-4 pr-12 py-3 focus:ring-2 focus:ring-red-500 focus:outline-none text-sm"
              />
              <button 
                type="submit" 
                disabled={!query.trim() || loading}
                className="absolute right-2 top-2 p-1.5 bg-red-600 text-white rounded-full disabled:opacity-50 hover:bg-red-500 transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default AIAssistant;