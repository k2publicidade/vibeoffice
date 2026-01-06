'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { LoginSchema, SignupSchema } from '@/lib/validation-schemas'

export const AuthSwitch = () => {
  const [isSignUp, setIsSignUp] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState<string | null>(null)
  const [count, setCount] = useState(0)
  const { signIn, signUp, isLoading } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      if (!isSignUp) {
        const validated = LoginSchema.parse({ email: formData.email, password: formData.password })
        await signIn(validated.email, validated.password)
      } else {
        const validated = SignupSchema.parse({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          confirmPassword: formData.confirmPassword
        })
        await signUp(validated.email, validated.password, validated.name)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao processar requisição')
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[600px] w-full bg-transparent p-4 font-sans selection:bg-[#fd6e5b] selection:text-white">
      <div className={cn(
        "relative overflow-hidden w-full max-w-[1080px] min-h-[600px] md:min-h-[600px] bg-black rounded-[3rem] md:rounded-[4rem] shadow-[0_40px_120px_rgba(253,110,91,0.2)] border border-white/5 transition-all duration-700",
      )}>

        {/* MOBILE ONLY: TAB TOGGLE (Segmented Control) */}
        <div className="flex md:hidden absolute top-8 left-1/2 -translate-x-1/2 z-[110] bg-white/5 p-1 rounded-full border border-white/10 w-[240px]">
          <motion.div
            className="absolute inset-y-1 bg-gradient-to-r from-[#fd6e5b] to-[#ff0300] rounded-full shadow-lg"
            animate={{
              x: isSignUp ? 116 : 0,
              width: 114
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
          <button
            onClick={() => setIsSignUp(false)}
            className={cn(
              "relative z-10 flex-1 py-2 text-xs font-black uppercase tracking-widest transition-colors duration-300",
              !isSignUp ? "text-white" : "text-white/40"
            )}
          >
            Entrar
          </button>
          <button
            onClick={() => setIsSignUp(true)}
            className={cn(
              "relative z-10 flex-1 py-2 text-xs font-black uppercase tracking-widest transition-colors duration-300",
              isSignUp ? "text-white" : "text-white/40"
            )}
          >
            Cadastrar
          </button>
        </div>

        {/* formulários container */}
        <div className="absolute inset-0 z-10 flex flex-col md:flex-row overflow-hidden">

          {/* Cadastro Side */}
          <div className={cn(
            "w-full md:w-1/2 h-full flex flex-col items-center justify-center px-10 md:px-16 text-center transition-all duration-1000 ease-[cubic-bezier(0.7,0,0.3,1)]",
            !isSignUp ? "translate-x-0 md:translate-x-full opacity-0 pointer-events-none" : "translate-x-0 opacity-100"
          )}>
            <motion.div
              initial={false}
              animate={isSignUp ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.6, delay: isSignUp ? 0.3 : 0 }}
              className="w-full pt-20 md:pt-0"
            >
              <h1 className="text-4xl md:text-5xl font-black mb-8 md:mb-10 text-white tracking-tighter">CRIAR CONTA</h1>
              <div className="w-full max-w-sm mx-auto space-y-4 mb-8 md:mb-10">
                <input
                  type="text"
                  placeholder="Nome de usuário"
                  className="w-full px-6 md:px-8 py-3.5 md:py-4 bg-white/5 border border-white/10 text-white rounded-2xl md:rounded-3xl focus:ring-2 focus:ring-[#fd6e5b] transition-all outline-none placeholder:text-white/20 text-sm md:text-base"
                  value={formData.name}
                  onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                  required
                />
                <input
                  type="email"
                  placeholder="E-mail corporativo"
                  className="w-full px-6 md:px-8 py-3.5 md:py-4 bg-white/5 border border-white/10 text-white rounded-2xl md:rounded-3xl focus:ring-2 focus:ring-[#fd6e5b] transition-all outline-none placeholder:text-white/20 text-sm md:text-base"
                  value={formData.email}
                  onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                  required
                />
                <input
                  type="password"
                  placeholder="Senha"
                  className="w-full px-6 md:px-8 py-3.5 md:py-4 bg-white/5 border border-white/10 text-white rounded-2xl md:rounded-3xl focus:ring-2 focus:ring-[#fd6e5b] transition-all outline-none placeholder:text-white/20 text-sm md:text-base"
                  value={formData.password}
                  onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
                  required
                />
                <input
                  type="password"
                  placeholder="Confirmar senha"
                  className="w-full px-6 md:px-8 py-3.5 md:py-4 bg-white/5 border border-white/10 text-white rounded-2xl md:rounded-3xl focus:ring-2 focus:ring-[#fd6e5b] transition-all outline-none placeholder:text-white/20 text-sm md:text-base"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(p => ({ ...p, confirmPassword: e.target.value }))}
                  required
                />
              </div>

              {error && isSignUp && <p className="text-[#ff0300] text-xs mb-6 font-medium">{error}</p>}

              <button
                type="submit"
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full max-w-sm py-4 md:py-5 bg-gradient-to-r from-[#fd6e5b] to-[#ff0300] text-white rounded-full font-black uppercase tracking-[0.2em] hover:shadow-[0_0_30px_rgba(253,110,91,0.5)] transition-all active:scale-95 disabled:opacity-50 text-sm md:text-base"
              >
                {isLoading ? 'CADASTRANDO...' : 'CADASTRAR'}
              </button>
            </motion.div>
          </div>

          {/* Login Side */}
          <div className={cn(
            "w-full md:w-1/2 h-full flex flex-col items-center justify-center px-10 md:px-16 text-center transition-all duration-1000 ease-[cubic-bezier(0.7,0,0.3,1)]",
            isSignUp ? "translate-x-0 md:-translate-x-full opacity-0 pointer-events-none" : "translate-x-0 opacity-100"
          )}>
            <motion.div
              initial={false}
              animate={!isSignUp ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.6, delay: !isSignUp ? 0.3 : 0 }}
              className="w-full pt-20 md:pt-0"
            >
              <h1 className="text-4xl md:text-5xl font-black mb-8 md:mb-10 text-white tracking-tighter">ENTRAR</h1>
              <div className="w-full max-w-sm mx-auto space-y-4 mb-6">
                <input
                  type="email"
                  placeholder="E-mail"
                  className="w-full px-6 md:px-8 py-3.5 md:py-4 bg-white/5 border border-white/10 text-white rounded-2xl md:rounded-3xl focus:ring-2 focus:ring-[#fd6e5b] transition-all outline-none placeholder:text-white/20 text-sm md:text-base"
                  value={formData.email}
                  onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                  required
                />
                <input
                  type="password"
                  placeholder="Senha"
                  className="w-full px-6 md:px-8 py-3.5 md:py-4 bg-white/5 border border-white/10 text-white rounded-2xl md:rounded-3xl focus:ring-2 focus:ring-[#fd6e5b] transition-all outline-none placeholder:text-white/20 text-sm md:text-base"
                  value={formData.password}
                  onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
                  required
                />
              </div>
              <button type="button" className="text-sm text-white/30 mb-8 md:mb-10 hover:text-white transition-colors">Esqueceu sua senha?</button>
              {error && !isSignUp && <p className="text-[#ff0300] text-sm mb-6 font-medium">{error}</p>}
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full max-w-sm py-4 md:py-5 bg-gradient-to-r from-[#fd6e5b] to-[#ff0300] text-white rounded-full font-black uppercase tracking-[0.2em] hover:shadow-[0_0_30px_rgba(253,110,91,0.5)] transition-all active:scale-95 disabled:opacity-50 text-sm md:text-base"
              >
                {isLoading ? 'ENTRANDO...' : 'ENTRAR'}
              </button>
            </motion.div>
          </div>
        </div>

        {/* OVERLAY CONTAINER COM CURVA ÚNICA (DESKTOP ONLY) */}
        <motion.div
          animate={{ x: isSignUp ? "0%" : "-100%" }}
          transition={{ duration: 1.2, ease: [0.7, 0, 0.3, 1] }}
          className="hidden md:block absolute inset-y-0 left-1/2 w-1/2 h-full z-[100]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#fd6e5b] to-[#ff0300]">
            <svg className="absolute top-0 bottom-0 -left-[149px] w-[150px] h-full pointer-events-none overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
              <motion.path
                initial={false}
                animate={{
                  d: isSignUp
                    ? "M 100 0 C 70 25 70 75 100 100 Z"
                    : "M 100 0 C 100 25 100 75 100 100 Z"
                }}
                transition={{ duration: 1.2, ease: [0.7, 0, 0.3, 1] }}
                className="fill-[#fd6e5b]"
              />
            </svg>

            <svg className="absolute top-0 bottom-0 -right-[149px] w-[150px] h-full pointer-events-none overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
              <motion.path
                initial={false}
                animate={{
                  d: !isSignUp
                    ? "M 0 0 C 30 25 30 75 0 100 Z"
                    : "M 0 0 C 0 25 0 75 0 100 Z"
                }}
                transition={{ duration: 1.2, ease: [0.7, 0, 0.3, 1] }}
                className="fill-[#ff0300]"
              />
            </svg>

            <div className="relative w-full h-full flex items-center justify-center p-12 text-white">
              <AnimatePresence mode="wait">
                {isSignUp ? (
                  <motion.div
                    key="to-signin"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.6 }}
                    className="flex flex-col items-center text-center"
                  >
                    <h2 className="text-4xl font-black mb-6 tracking-tighter uppercase whitespace-pre-line">Já tem uma{'\n'}conta?</h2>
                    <p className="text-white/80 font-medium mb-10 max-w-[280px]">Faça login para continuar sua jornada no VibeOffice.</p>
                    <button
                      onClick={() => setIsSignUp(false)}
                      className="px-14 py-4 bg-white text-black rounded-full font-black uppercase tracking-widest hover:scale-110 active:scale-95 transition-all shadow-2xl"
                    >
                      ENTRAR
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="to-signup"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.6 }}
                    className="flex flex-col items-center text-center"
                  >
                    <h2 className="text-4xl font-black mb-6 tracking-tighter uppercase whitespace-pre-line">Novo no{'\n'}VibeOffice?</h2>
                    <p className="text-white/80 font-medium mb-10 max-w-[280px]">Crie sua conta agora e descubra novas ferramentas de produtividade.</p>
                    <button
                      onClick={() => setIsSignUp(true)}
                      className="px-14 py-4 bg-white text-black rounded-full font-black uppercase tracking-widest hover:scale-110 active:scale-95 transition-all shadow-2xl"
                    >
                      CADASTRAR
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Decorative Easter Egg Interaction (Desktop Only or subtle for Mobile) */}
      <div
        className="fixed bottom-6 md:bottom-10 right-10 text-[9px] md:text-[10px] text-white/10 uppercase tracking-[0.5em] hover:text-white/40 transition-colors cursor-pointer select-none"
        onClick={() => setCount(c => c + 1)}
      >
        VIBE OS v4.1 // {count}
      </div>
    </div>
  )
}

export default AuthSwitch
