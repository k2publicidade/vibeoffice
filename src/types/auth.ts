/**
 * Authentication and Authorization Types
 * Defines user roles, sectors, and session structure
 */

export type Sector = 'A&R' | 'Marketing' | 'Financeiro' | 'Jurídico' | 'Administrativo' | 'TI/Suporte' | 'Atendimento ao Artista'
export type Role = 'Admin' | 'Gerente' | 'Colaborador'

export interface User {
  id: string
  name: string
  email: string
  avatar: string | null
  sector: Sector
  role: Role
  createdAt: Date
  updatedAt: Date
}

export interface Session {
  user: {
    id: string
    email: string
    name: string
    image?: string
    sector: Sector
    role: Role
  }
  expires: string
}

export interface AuthResponse {
  user: User
  session: Session
}
