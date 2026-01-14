
import React from 'react';
import { Key } from 'lucide-react';

// This is a UI indicator helper, actual logic is in geminiService
const ApiKeyModal = () => {
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-700 p-8 rounded-2xl max-w-md text-center shadow-2xl">
                <div className="bg-orange-500/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Key className="text-orange-400" size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Acesso de Alta Resolução</h3>
                <p className="text-zinc-400 mb-6">
                    Gerar capas em 2K requer uma Chave de API verificada com faturamento ativado. Você será solicitado a selecionar seu projeto.
                </p>
                <div className="text-xs text-zinc-600">
                    Veja a <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-orange-400">documentação de faturamento</a> para detalhes.
                </div>
            </div>
        </div>
    )
}

export default ApiKeyModal;
