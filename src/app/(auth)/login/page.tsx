/**
 * Login Page
 * Página de autenticação para o sistema
 */

'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AuthSwitch } from '@/components/ui/auth-switch'

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black p-4 md:p-8 overflow-hidden relative">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#fd6e5b]/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-6xl relative z-10">
        <AuthSwitch />

        {/* Helper text for admin users */}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 text-xs text-white/30 px-6 font-medium tracking-wide">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
            <div className="flex gap-2">
              <span className="text-white/50">Admin 1:</span>
              <p className="hover:text-white/60 transition-colors">dotivomaciel@gmail.com</p>
            </div>
            <div className="flex gap-2">
              <span className="text-white/50">Admin 2:</span>
              <p className="hover:text-white/60 transition-colors">k2publicidade@yahoo.com.br</p>
            </div>
          </div>
          <p className="uppercase tracking-[0.2em] mt-2">© 2026 VibeDistro Corporate</p>
        </div>
      </div>
    </div>
  )
}
