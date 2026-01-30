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

export type ArtistRole = 'main' | 'feat' | 'producer'

export interface ReleaseArtist {
  name: string
  role: ArtistRole
}

export interface Track {
  id: string
  title: string
  artists: ReleaseArtist[]
  composers: Composer[]
  isrc?: string
  duration?: string
}

export interface Release {
  id: string
  title: string
  artist: string // Main artist name for display/compatibility
  artists: ReleaseArtist[] // New structured artists
  releaseType: ReleaseType
  genre?: string
  releaseDate?: Date
  status: ReleaseStatus
  coverUrl?: string
  wavUrl?: string
  composers: Composer[] // Used for singles
  tracks: Track[] // New: Used for EP/Albums
  platformLinks: PlatformLink[]
  isrc?: string // Used for singles
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
  artists?: ReleaseArtist[]
  releaseType: ReleaseType
  genre?: string
  releaseDate?: Date
  releaseTime?: string
  status?: ReleaseStatus
  coverUrl?: string
  wavUrl?: string
  composers?: Composer[]
  tracks?: Track[]
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
