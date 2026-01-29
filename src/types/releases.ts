/**
 * Releases Module Types
 * Defines release structure for music distribution management
 */

import { Sector } from './auth'

export type ReleaseStatus = 'scheduled' | 'in_progress' | 'released'
export type ReleaseType = 'single' | 'ep' | 'album'

export interface Release {
  id: string
  title: string
  artist: string
  releaseType: ReleaseType
  genre?: string
  releaseDate?: Date
  status: ReleaseStatus
  coverUrl?: string
  spotifyUrl?: string
  appleMusicUrl?: string
  youtubeUrl?: string
  isrc?: string
  upc?: string
  label?: string
  distributor?: string
  notes?: string
  sector?: Sector
  createdBy: string
  createdAt: Date
  updatedAt: Date
  position: number
}

export interface CreateReleaseInput {
  title: string
  artist: string
  releaseType: ReleaseType
  genre?: string
  releaseDate?: Date
  releaseTime?: string // HH:mm format for calendar event
  status?: ReleaseStatus
  coverUrl?: string
  spotifyUrl?: string
  appleMusicUrl?: string
  youtubeUrl?: string
  isrc?: string
  upc?: string
  label?: string
  distributor?: string
  notes?: string
  sector?: Sector
}

export interface ReleaseFilters {
  status?: ReleaseStatus
  releaseType?: ReleaseType
  artist?: string
  searchQuery?: string
}
