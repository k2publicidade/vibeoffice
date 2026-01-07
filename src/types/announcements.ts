/**
 * Types para o sistema de Quadro de Avisos da Empresa
 * Migration: 021_company_announcements.sql
 */

import type { Sector } from './auth'

/**
 * Níveis de prioridade dos avisos
 * - info: Informativo (azul)
 * - warning: Atenção (amarelo)
 * - urgent: Urgente (vermelho)
 */
export type AnnouncementPriority = 'info' | 'warning' | 'urgent'

/**
 * Metadados extras do aviso
 */
export interface AnnouncementMetadata {
  /** URL para documento ou página relacionada */
  link?: string
  /** URL de arquivo anexado (Supabase Storage) */
  attachmentUrl?: string
  /** Nome do arquivo anexado */
  attachmentName?: string
  /** Informações extras customizadas */
  [key: string]: any
}

/**
 * Aviso da empresa (representação do banco de dados)
 */
export interface Announcement {
  id: string
  title: string
  message: string
  priority: AnnouncementPriority
  created_by: string
  target_sectors: Sector[]
  expires_at: string
  active: boolean
  metadata: AnnouncementMetadata
  created_at: string
  updated_at: string
}

/**
 * Aviso com informações do autor (para exibição na UI)
 */
export interface AnnouncementWithAuthor extends Announcement {
  author: {
    id: string
    name: string
    avatar: string | null
    sector: Sector
  }
}

/**
 * Dados para criar um novo aviso
 */
export interface CreateAnnouncementData {
  title: string
  message: string
  priority: AnnouncementPriority
  target_sectors: Sector[]
  expires_at: Date | string
  active?: boolean
  metadata?: AnnouncementMetadata
}

/**
 * Dados para atualizar um aviso existente
 */
export interface UpdateAnnouncementData {
  title?: string
  message?: string
  priority?: AnnouncementPriority
  target_sectors?: Sector[]
  expires_at?: Date | string
  active?: boolean
  metadata?: AnnouncementMetadata
}

/**
 * Filtros para busca de avisos (página admin)
 */
export interface AnnouncementFilters {
  /** Busca por texto (título ou mensagem) */
  search?: string
  /** Filtro por prioridade */
  priority?: AnnouncementPriority[]
  /** Filtro por setor alvo */
  sector?: Sector
  /** Filtro por status */
  status?: 'active' | 'expired' | 'archived' | 'all'
  /** Filtro por autor (ID do usuário) */
  authorId?: string
}

/**
 * Estatísticas de avisos (para dashboard admin)
 */
export interface AnnouncementStats {
  total: number
  active: number
  expired: number
  drafts: number
  expiringToday: number
  byPriority: {
    info: number
    warning: number
    urgent: number
  }
  bySector: Record<Sector, number>
}

/**
 * Badge de prioridade (config de cores e ícones)
 */
export interface PriorityConfig {
  priority: AnnouncementPriority
  label: string
  color: string
  bgColor: string
  borderColor: string
  icon: string
}

/**
 * Configurações visuais por prioridade
 */
export const PRIORITY_CONFIGS: Record<AnnouncementPriority, PriorityConfig> = {
  info: {
    priority: 'info',
    label: 'Informativo',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-500',
    icon: 'Info',
  },
  warning: {
    priority: 'warning',
    label: 'Atenção',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-500',
    icon: 'AlertTriangle',
  },
  urgent: {
    priority: 'urgent',
    label: 'Urgente',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-500',
    icon: 'AlertCircle',
  },
}
