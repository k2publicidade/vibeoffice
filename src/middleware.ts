/**
 * Next.js Middleware - Proteção de rotas com NextAuth v5
 * Usa o callback authorized da configuração do NextAuth
 */

import { auth } from '@/lib/auth'

export default auth

// Configurar quais rotas usar middleware
export const config = {
  matcher: [
    /*
     * Proteger todas as rotas exceto:
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagens)
     * - favicon.ico (favicon)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
