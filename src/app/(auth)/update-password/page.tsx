'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Lock } from 'lucide-react'

export default function UpdatePasswordPage() {
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (password.length < 6) {
            toast.error('A senha deve ter pelo menos 6 caracteres.')
            return
        }

        setLoading(true)
        try {
            const { error } = await supabase.auth.updateUser({ password })
            if (error) throw error

            toast.success('Senha atualizada com sucesso!')
            router.push('/login')
        } catch (error) {
            console.error(error)
            toast.error('Erro ao atualizar senha.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-black p-4 md:p-8 overflow-hidden relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#fd6e5b]/10 blur-[120px] rounded-full pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-black/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 relative z-10"
            >
                <div className="flex flex-col items-center text-center mb-8">
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4 text-[#fd6e5b]">
                        <Lock size={32} />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Nova Senha</h1>
                    <p className="text-white/60 text-sm mt-2">Digite sua nova senha abaixo.</p>
                </div>

                <form onSubmit={handleUpdate} className="space-y-6">
                    <input
                        type="password"
                        placeholder="Nova senha"
                        className="w-full px-6 py-4 bg-white/5 border border-white/10 text-white rounded-2xl focus:ring-2 focus:ring-[#fd6e5b] transition-all outline-none placeholder:text-white/20 text-sm"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoFocus
                    />

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-gradient-to-r from-[#fd6e5b] to-[#ff0300] text-white rounded-full font-black uppercase tracking-[0.2em] hover:shadow-[0_0_30px_rgba(253,110,91,0.5)] transition-all active:scale-95 disabled:opacity-50 text-sm"
                    >
                        {loading ? 'ATUALIZANDO...' : 'SALVAR SENHA'}
                    </button>
                </form>
            </motion.div>
        </div>
    )
}
