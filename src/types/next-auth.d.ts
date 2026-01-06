import 'next-auth'
import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  /**
   * Estender o tipo User padrão do NextAuth com propriedades customizadas
   */
  interface User {
    sector?: string
    role?: string
  }

  /**
   * Estender o tipo Session padrão do NextAuth
   */
  interface Session {
    user?: {
      sector?: string
      role?: string
    } & DefaultSession['user']
  }

  /**
   * Estender o tipo JWT padrão do NextAuth
   */
  interface JWT {
    sector?: string
    role?: string
  }
}
