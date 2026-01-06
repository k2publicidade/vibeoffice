/**
 * NextAuth.js v5 Configuration
 * Configuração centralizada para autenticação
 */

import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { mockUsers } from '@/lib/mock-data'
import { LoginSchema } from '@/lib/schemas'
import type { NextAuthConfig } from 'next-auth'

export const authConfig: NextAuthConfig = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'seu@email.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Validar inputs
        const result = LoginSchema.safeParse(credentials)
        if (!result.success) {
          return null
        }

        const { email, password } = result.data

        // Buscar usuário em mockData
        const user = mockUsers.find(u => u.email === email)

        // TODO: Integrar com autenticação real (validar senha com hash, OAuth2, JWT, etc)
        // Por enquanto: aceitar qualquer usuário mockado com senha padrão "password123"
        if (user && password === 'password123') {
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.avatar,
            sector: user.sector,
            role: user.role,
          }
        }

        return null
      },
    }),
  ],

  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = !nextUrl.pathname.startsWith('/login')
      const isAuthRoute = nextUrl.pathname.startsWith('/api/auth')

      // Permitir rotas de API de auth
      if (isAuthRoute) {
        return true
      }

      // Se está em rota protegida e não está logado, redirecionar
      if (isOnDashboard) {
        if (isLoggedIn) return true
        return false // Redireciona para login
      } else if (isLoggedIn) {
        // Se está logado e tentando acessar login, redirecionar para dashboard
        return Response.redirect(new URL('/', nextUrl))
      }

      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.sector = user.sector
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.sector = token.sector as string | undefined
        session.user.role = token.role as string | undefined
      }
      return session
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 horas
    updateAge: 8 * 60 * 60, // 8 horas
  },

  secret: process.env.NEXTAUTH_SECRET,

  debug: process.env.NODE_ENV === 'development',
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
