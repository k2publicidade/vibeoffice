/**
 * Releases Module Types
 * Defines release structure for music distribution management
 */

import { Sector } from './auth'

export type ReleaseStatus = 'scheduled' | 'in_progress' | 'released'
export type ReleaseType = 'single' | 'ep' | 'album'

export interface Composer {
  name: string
  artistName?: string
}

export interface PlatformLink {
  platform: string
  url: string
  artistName?: string
}

export interface Release {
  id: string
  title: string
  artist: string
  releaseType: ReleaseType
  genre?: string
  releaseDate?: Date
  status: ReleaseStatus
  coverUrl?: string
  composers: Composer[]
  platformLinks: PlatformLink[]
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
  composers?: Composer[]
  platformLinks?: PlatformLink[]
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
