'use client'
// Composers & Dynamic Platform Links - v2
import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { PremiumDatePicker } from '@/components/ui/premium-date-picker'
import { PremiumTimePicker } from '@/components/ui/premium-time-picker'
import {
  Disc3,
  Music,
  CalendarClock,
  Tag,
  Building2,
  Truck,
  Link,
  Fingerprint,
  Image,
  FileText,
  Users,
  Plus,
  X,
  FolderOpen
} from 'lucide-react'
import type { Release, ReleaseStatus, ReleaseType, CreateReleaseInput, Composer, PlatformLink, Track } from '@/types/releases'
import type { Sector } from '@/types/auth'
import { DrivePickerModal } from '@/components/drive/DrivePickerModal'

const RELEASE_TYPES: { value: ReleaseType; label: string }[] = [
  { value: 'single', label: 'Single' },
  { value: 'ep', label: 'EP' },
  { value: 'album', label: 'Album' },
]

const PLATFORM_OPTIONS = [
  { value: 'Spotify', label: 'Spotify' },
  { value: 'Apple Music', label: 'Apple Music' },
]

const SECTORS: Sector[] = ['A&R', 'Marketing', 'Financeiro', 'Jurídico', 'Administrativo', 'TI/Suporte', 'Atendimento ao Artista']

const STATUS_OPTIONS: { value: ReleaseStatus; label: string }[] = [
  { value: 'scheduled', label: 'Programado' },
  { value: 'in_progress', label: 'Em Andamento' },
  { value: 'released', label: 'Lancado' },
]

interface ReleaseModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: CreateReleaseInput) => Promise<void>
  release?: Release | null
  initialStatus?: ReleaseStatus
}

function SectionHeader({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <div className="flex items-center gap-2 pt-2 pb-1">
      <Icon className="w-4 h-4 text-[#fc7a67]" />
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</span>
      <div className="flex-1 h-px bg-[#2a2a2a]" />
    </div>
  )
}

export function ReleaseModal({ open, onClose, onSave, release, initialStatus }: ReleaseModalProps) {
  const [title, setTitle] = useState('')
  const [artists, setArtists] = useState<{ name: string; role: 'main' | 'feat' | 'producer' }[]>([])
  const [releaseType, setReleaseType] = useState<ReleaseType>('single')
  const [genre, setGenre] = useState('')
  const [releaseDate, setReleaseDate] = useState<Date | undefined>(undefined)
  const [status, setStatus] = useState<ReleaseStatus>('scheduled')
  const [coverUrl, setCoverUrl] = useState('')
  const [wavUrl, setWavUrl] = useState('')
  const [isrc, setIsrc] = useState('')
  const [upc, setUpc] = useState('')
  const [label, setLabel] = useState('')
  const [distributor, setDistributor] = useState('')
  const [notes, setNotes] = useState('')
  const [sector, setSector] = useState<Sector | ''>('')
  const [saving, setSaving] = useState(false)

  // Drive Picker State
  const [drivePickerOpen, setDrivePickerOpen] = useState(false)
  const [drivePickerTarget, setDrivePickerTarget] = useState<'cover' | 'wav' | null>(null)

  // Dynamic lists
  const [composers, setComposers] = useState<Composer[]>([])
  const [tracks, setTracks] = useState<Track[]>([])
  const [platformLinks, setPlatformLinks] = useState<PlatformLink[]>([])

  const isEditing = !!release

  useEffect(() => {
    if (open) {
      if (release) {
        setTitle(release.title)
        // Initialize artists from release.artists if available, otherwise fallback to release.artist string
        if (release.artists && release.artists.length > 0) {
          setArtists([...release.artists])
        } else {
          setArtists([{ name: release.artist, role: 'main' }])
        }
        setReleaseType(release.releaseType)
        setGenre(release.genre || '')
        setReleaseDate(release.releaseDate ? new Date(release.releaseDate) : undefined)
        setStatus(release.status)
        setCoverUrl(release.coverUrl || '')
        setWavUrl(release.wavUrl || '')
        setIsrc(release.isrc || '')
        setUpc(release.upc || '')
        setLabel(release.label || '')
        setDistributor(release.distributor || '')
        setNotes(release.notes || '')
        setSector((release.sector as Sector) || '')
        setComposers(release.composers?.length ? [...release.composers] : [])
        setTracks(release.tracks?.length ? [...release.tracks] : [])
        setPlatformLinks(release.platformLinks?.length ? [...release.platformLinks] : [])
      } else {
        setTitle('')
        setArtists([{ name: '', role: 'main' }])
        setReleaseType('single')
        setGenre('')
        setReleaseDate(undefined)
        setStatus(initialStatus || 'scheduled')
        setCoverUrl('')
        setWavUrl('')
        setIsrc('')
        setUpc('')
        setLabel('')
        setDistributor('')
        setNotes('')
        setSector('')
        setComposers([])
        setTracks([])
        setPlatformLinks([])
      }
    }
  }, [open, release, initialStatus])

  // Artists handlers
  const addArtist = () => {
    setArtists(prev => [...prev, { name: '', role: 'main' }])
  }

  const updateArtist = (index: number, field: keyof typeof artists[0], value: string) => {
    setArtists(prev => prev.map((a, i) => i === index ? { ...a, [field]: value } : a))
  }

  const removeArtist = (index: number) => {
    if (artists.length <= 1) return // Prevent removing last artist
    setArtists(prev => prev.filter((_, i) => i !== index))
  }

  // Composers handlers
  const addComposer = () => {
    setComposers(prev => [...prev, { name: '', artistName: '' }])
  }

  const updateComposer = (index: number, field: keyof Composer, value: string) => {
    setComposers(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c))
  }

  const removeComposer = (index: number) => {
    setComposers(prev => prev.filter((_, i) => i !== index))
  }

  // Track handlers
  const addTrack = () => {
    setTracks(prev => [...prev, { id: crypto.randomUUID(), title: '', composers: [], isrc: '' }])
  }

  const updateTrack = (index: number, field: keyof Track, value: any) => {
    setTracks(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t))
  }

  const updateTrackComposer = (trackIndex: number, composerIndex: number, field: keyof Composer, value: string) => {
    setTracks(prev => prev.map((t, i) => {
      if (i !== trackIndex) return t
      const newComposers = [...t.composers]
      newComposers[composerIndex] = { ...newComposers[composerIndex], [field]: value }
      return { ...t, composers: newComposers }
    }))
  }

  const addTrackComposer = (trackIndex: number) => {
    setTracks(prev => prev.map((t, i) => {
      if (i !== trackIndex) return t
      return { ...t, composers: [...t.composers, { name: '', artistName: '' }] }
    }))
  }

  const removeTrackComposer = (trackIndex: number, composerIndex: number) => {
    setTracks(prev => prev.map((t, i) => {
      if (i !== trackIndex) return t
      return { ...t, composers: t.composers.filter((_, ci) => ci !== composerIndex) }
    }))
  }

  const removeTrack = (index: number) => {
    setTracks(prev => prev.filter((_, i) => i !== index))
  }

  // Platform links handlers
  const addPlatformLink = () => {
    // Default to Spotify
    setPlatformLinks(prev => [...prev, { platform: 'Spotify', url: '', artistName: '' }])
  }

  const updatePlatformLink = (index: number, field: keyof PlatformLink, value: string) => {
    setPlatformLinks(prev => prev.map((l, i) => i === index ? { ...l, [field]: value } : l))
  }

  const removePlatformLink = (index: number) => {
    setPlatformLinks(prev => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    // Validate: At least one main artist
    const validArtists = artists.filter(a => a.name.trim())
    if (!title.trim() || validArtists.length === 0) return

    setSaving(true)
    try {
      const hours = releaseDate ? releaseDate.getHours() : 12
      const minutes = releaseDate ? releaseDate.getMinutes() : 0
      const releaseTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`

      // Filter out empty entries
      const validComposers = composers.filter(c => c.name.trim())
      const validLinks = platformLinks.filter(l => l.platform.trim() || l.url.trim())
      const validTracks = tracks.filter(t => t.title.trim())

      // Derive main artist string for backward compatibility
      // Use the first MAIN artist, or just the first artist if no Main is found.
      const mainArtistObj = validArtists.find(a => a.role === 'main') || validArtists[0]
      const derivedArtistString = mainArtistObj.name

      await onSave({
        title: title.trim(),
        artist: derivedArtistString,
        artists: validArtists,
        releaseType,
        genre: genre.trim() || undefined,
        releaseDate: releaseDate || undefined,
        releaseTime,
        status,
        coverUrl: coverUrl.trim() || undefined,
        wavUrl: wavUrl.trim() || undefined,
        composers: validComposers.length > 0 ? validComposers : undefined,
        tracks: validTracks.length > 0 ? validTracks : undefined,
        platformLinks: validLinks.length > 0 ? validLinks : undefined,
        isrc: isrc.trim() || undefined,
        upc: upc.trim() || undefined,
        label: label.trim() || undefined,
        distributor: distributor.trim() || undefined,
        notes: notes.trim() || undefined,
        sector: sector || undefined,
      })
      onClose()
    } catch (error) {
      console.error('Error saving release:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDateChange = (date: Date | undefined) => {
    if (date && releaseDate) {
      date.setHours(releaseDate.getHours(), releaseDate.getMinutes())
    } else if (date) {
      date.setHours(12, 0)
    }
    setReleaseDate(date)
  }

  const handleTimeChange = (date: Date) => {
    if (releaseDate) {
      const updated = new Date(releaseDate)
      updated.setHours(date.getHours(), date.getMinutes())
      setReleaseDate(updated)
    } else {
      setReleaseDate(date)
    }
  }

  // Drive Picker logic
  const openDrivePicker = (target: 'cover' | 'wav') => {
    setDrivePickerTarget(target)
    setDrivePickerOpen(true)
  }

  const handleDriveSelect = (url: string) => {
    if (drivePickerTarget === 'cover') {
      setCoverUrl(url)
    } else if (drivePickerTarget === 'wav') {
      setWavUrl(url)
    }
    setDrivePickerOpen(false)
  }

  const ARTIST_ROLES: { value: 'main' | 'feat' | 'producer', label: string }[] = [
    { value: 'main', label: 'Artista Principal' },
    { value: 'feat', label: 'Participacao (Feat)' },
    { value: 'producer', label: 'Produtor' }
  ]

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto bg-[#0a0a0a] border-[#2a2a2a] text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#fc7a67] to-[#ff0300] flex items-center justify-center">
              <Disc3 className="w-4 h-4 text-white" />
            </div>
            {isEditing ? 'Editar Lancamento' : 'Novo Lancamento'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* LEFT COLUMN */}
            <div className="space-y-6">
              {/* Section 1: Basic Info */}
              <SectionHeader icon={Music} title="Informacoes Basicas" />
              <div className="space-y-3">
                <div>
                  <Label className="text-gray-400 text-xs mb-1.5 block">Titulo *</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Nome da faixa, EP ou album"
                    className="bg-[#111] border-[#2a2a2a] text-white"
                  />
                </div>

                {/* ARTISTS SECTION */}
                <div>
                  <Label className="text-gray-400 text-xs mb-1.5 block">Artistas *</Label>
                  <div className="space-y-2">
                    {artists.map((artist, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Music className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                          <Input
                            value={artist.name}
                            onChange={(e) => updateArtist(index, 'name', e.target.value)}
                            placeholder="Nome do artista"
                            className="bg-[#111] border-[#2a2a2a] text-white pl-9"
                          />
                        </div>
                        <div className="w-[140px]">
                          <Select value={artist.role} onValueChange={(v: any) => updateArtist(index, 'role', v)}>
                            <SelectTrigger className="bg-[#111] border-[#2a2a2a] text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#111] border-[#2a2a2a]">
                              {ARTIST_ROLES.map(role => (
                                <SelectItem key={role.value} value={role.value} className="text-white">{role.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {artists.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeArtist(index)}
                            className="h-9 w-9 text-gray-500 hover:text-red-400 flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={addArtist}
                      className="text-[#fc7a67] hover:text-[#ff0300] hover:bg-[#fc7a67]/10 text-xs"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Adicionar Artista
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-gray-400 text-xs mb-1.5 block">Tipo</Label>
                    <Select value={releaseType} onValueChange={(v) => setReleaseType(v as ReleaseType)}>
                      <SelectTrigger className="bg-[#111] border-[#2a2a2a] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#111] border-[#2a2a2a]">
                        {RELEASE_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value} className="text-white">{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-400 text-xs mb-1.5 block">Status</Label>
                    <Select value={status} onValueChange={(v) => setStatus(v as ReleaseStatus)}>
                      <SelectTrigger className="bg-[#111] border-[#2a2a2a] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#111] border-[#2a2a2a]">
                        {STATUS_OPTIONS.map(s => (
                          <SelectItem key={s.value} value={s.value} className="text-white">{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Section 2: Scheduling */}
              <SectionHeader icon={CalendarClock} title="Agendamento" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <PremiumDatePicker
                  date={releaseDate}
                  onDateChange={handleDateChange}
                  placeholder="Data de lancamento"
                />
                <PremiumTimePicker
                  date={releaseDate}
                  onTimeChange={handleTimeChange}
                />
              </div>

              {/* Section 4: Details */}
              <SectionHeader icon={Tag} title="Detalhes" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-400 text-xs mb-1.5 block">Genero</Label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                    <Input
                      value={genre}
                      onChange={(e) => setGenre(e.target.value)}
                      placeholder="Pop, Rock, Hip-Hop..."
                      className="bg-[#111] border-[#2a2a2a] text-white pl-9"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-400 text-xs mb-1.5 block">Setor Responsavel</Label>
                  <Select value={sector} onValueChange={(v) => setSector(v as Sector)}>
                    <SelectTrigger className="bg-[#111] border-[#2a2a2a] text-white">
                      <SelectValue placeholder="Selecionar setor" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111] border-[#2a2a2a]">
                      {SECTORS.map(s => (
                        <SelectItem key={s} value={s} className="text-white">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-400 text-xs mb-1.5 block">Gravadora / Selo</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                    <Input
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      placeholder="Nome do selo"
                      className="bg-[#111] border-[#2a2a2a] text-white pl-9"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-400 text-xs mb-1.5 block">Distribuidora</Label>
                  <div className="relative">
                    <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                    <Input
                      value={distributor}
                      onChange={(e) => setDistributor(e.target.value)}
                      placeholder="Nome da distribuidora"
                      className="bg-[#111] border-[#2a2a2a] text-white pl-9"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-6">
              {/* Section 3: Composers (Conditional) & Tracks (Conditional) */}
              {releaseType === 'single' ? (
                <>
                  <SectionHeader icon={Users} title="Compositores" />
                  <div className="space-y-2">
                    {composers.map((composer, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Input
                            value={composer.name}
                            onChange={(e) => updateComposer(index, 'name', e.target.value)}
                            placeholder="Nome completo"
                            className="bg-[#111] border-[#2a2a2a] text-white text-sm"
                          />
                          <Input
                            value={composer.artistName || ''}
                            onChange={(e) => updateComposer(index, 'artistName', e.target.value)}
                            placeholder="Nome artistico"
                            className="bg-[#111] border-[#2a2a2a] text-white text-sm"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeComposer(index)}
                          className="h-9 w-9 text-gray-500 hover:text-red-400 flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={addComposer}
                      className="text-[#fc7a67] hover:text-[#ff0300] hover:bg-[#fc7a67]/10 text-xs"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Adicionar Compositor
                    </Button>
                  </div>

                  {/* Section 5: Identifiers (Only for Single) */}
                  <SectionHeader icon={Fingerprint} title="Identificadores" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-gray-400 text-xs mb-1.5 block">ISRC</Label>
                      <Input
                        value={isrc}
                        onChange={(e) => setIsrc(e.target.value)}
                        placeholder="BR-XXX-00-00000"
                        className="bg-[#111] border-[#2a2a2a] text-white font-mono text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-400 text-xs mb-1.5 block">UPC / EAN (Global)</Label>
                      <Input
                        value={upc}
                        onChange={(e) => setUpc(e.target.value)}
                        placeholder="0000000000000"
                        className="bg-[#111] border-[#2a2a2a] text-white font-mono text-sm"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <SectionHeader icon={Disc3} title="Faixas do Album / EP" />
                  <div className="space-y-4">
                    {tracks.map((track, trackIndex) => (
                      <div key={trackIndex} className="bg-[#111] border border-[#2a2a2a] rounded-lg p-3 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 font-mono w-6">#{trackIndex + 1}</span>
                          <Input
                            value={track.title}
                            onChange={(e) => updateTrack(trackIndex, 'title', e.target.value)}
                            placeholder="Nome da faixa"
                            className="bg-[#0a0a0a] border-[#333] h-8 text-sm"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeTrack(trackIndex)}
                            className="h-8 w-8 text-gray-500 hover:text-red-400 flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Track Composers */}
                        <div className="pl-8 space-y-2">
                          <Label className="text-xs text-gray-500">Compositores</Label>
                          {track.composers.map((composer, cIndex) => (
                            <div key={cIndex} className="flex gap-2">
                              <Input
                                value={composer.name}
                                onChange={(e) => updateTrackComposer(trackIndex, cIndex, 'name', e.target.value)}
                                placeholder="Nome completo"
                                className="bg-[#0a0a0a] border-[#333] h-7 text-xs flex-1"
                              />
                              <Input
                                value={composer.artistName || ''}
                                onChange={(e) => updateTrackComposer(trackIndex, cIndex, 'artistName', e.target.value)}
                                placeholder="Nome Artistico"
                                className="bg-[#0a0a0a] border-[#333] h-7 text-xs flex-1"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeTrackComposer(trackIndex, cIndex)}
                                className="h-7 w-7 text-gray-500 hover:text-red-400 flex-shrink-0"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => addTrackComposer(trackIndex)}
                            className="text-[#fc7a67] hover:text-[#ff0300] text-xs h-6 px-2"
                          >
                            + Add Compositor
                          </Button>
                        </div>

                        {/* Track ISRC */}
                        <div className="pl-8">
                          <Label className="text-xs text-gray-500">ISRC</Label>
                          <Input
                            value={track.isrc}
                            onChange={(e) => updateTrack(trackIndex, 'isrc', e.target.value)}
                            placeholder="BR-XXX-00-00000"
                            className="bg-[#0a0a0a] border-[#333] h-7 text-xs font-mono w-48"
                          />
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addTrack}
                      className="w-full border-dashed border-[#333] text-gray-400 hover:text-[#fc7a67] hover:border-[#fc7a67]"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Faixa
                    </Button>
                  </div>

                  {/* Global UPC for Album/EP */}
                  <SectionHeader icon={Fingerprint} title="Identificadores do Album" />
                  <div>
                    <Label className="text-gray-400 text-xs mb-1.5 block">UPC / EAN</Label>
                    <Input
                      value={upc}
                      onChange={(e) => setUpc(e.target.value)}
                      placeholder="0000000000000"
                      className="bg-[#111] border-[#2a2a2a] text-white font-mono text-sm"
                    />
                  </div>
                </>
              )}


              {/* Section 6: Platform Links */}
              <SectionHeader icon={Link} title="Links de Plataformas" />
              <div className="space-y-2">
                {platformLinks.map((link, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Select
                        value={link.platform}
                        onValueChange={(v) => updatePlatformLink(index, 'platform', v)}
                      >
                        <SelectTrigger className="bg-[#111] border-[#2a2a2a] text-white text-sm">
                          <SelectValue placeholder="Plataforma" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#111] border-[#2a2a2a]">
                          {PLATFORM_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value} className="text-white">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={link.url}
                        onChange={(e) => updatePlatformLink(index, 'url', e.target.value)}
                        placeholder="URL"
                        className="bg-[#111] border-[#2a2a2a] text-white text-sm"
                      />
                      <Input
                        value={link.artistName || ''}
                        onChange={(e) => updatePlatformLink(index, 'artistName', e.target.value)}
                        placeholder="Nome artistico"
                        className="bg-[#111] border-[#2a2a2a] text-white text-sm"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removePlatformLink(index)}
                      className="h-9 w-9 text-gray-500 hover:text-red-400 flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addPlatformLink}
                  className="text-[#fc7a67] hover:text-[#ff0300] hover:bg-[#fc7a67]/10 text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Adicionar Plataforma
                </Button>
              </div>

              {/* Section 7: Cover & Audio & Notes */}
              <SectionHeader icon={Image} title="Capa, Audio e Observacoes" />
              <div className="space-y-3">
                <div>
                  <Label className="text-gray-400 text-xs mb-1.5 block">URL da Capa</Label>
                  <div className="flex gap-2">
                    <Input
                      value={coverUrl}
                      onChange={(e) => setCoverUrl(e.target.value)}
                      placeholder="https://..."
                      className="bg-[#111] border-[#2a2a2a] text-white text-sm flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openDrivePicker('cover')}
                      className="bg-[#111] border-[#2a2a2a] text-gray-300 hover:text-white hover:bg-[#222]"
                    >
                      <FolderOpen className="w-4 h-4 mr-2" />
                      Drive
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-400 text-xs mb-1.5 block">URL do Audio (WAV)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={wavUrl}
                      onChange={(e) => setWavUrl(e.target.value)}
                      placeholder="https://..."
                      className="bg-[#111] border-[#2a2a2a] text-white text-sm flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openDrivePicker('wav')}
                      className="bg-[#111] border-[#2a2a2a] text-gray-300 hover:text-white hover:bg-[#222]"
                    >
                      <FolderOpen className="w-4 h-4 mr-2" />
                      Drive
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-400 text-xs mb-1.5 block">Observacoes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notas adicionais sobre o lancamento..."
                    className="bg-[#111] border-[#2a2a2a] text-white min-h-[80px] resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-[#2a2a2a]">
            <Button variant="ghost" onClick={onClose} className="text-gray-400 hover:text-white">
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!title.trim() || saving}
              className="bg-gradient-to-r from-[#fc7a67] to-[#ff0300] text-white hover:opacity-90"
            >
              {saving ? 'Salvando...' : isEditing ? 'Salvar Alteracoes' : 'Criar Lancamento'}
            </Button>
          </div>
        </div>
      </DialogContent>

      <DrivePickerModal
        open={drivePickerOpen}
        onClose={() => setDrivePickerOpen(false)}
        onSelect={handleDriveSelect}
        title={drivePickerTarget === 'cover' ? 'Selecionar Capa' : 'Selecionar Audio (WAV)'}
        acceptedMimeTypes={drivePickerTarget === 'cover' ? ['image/*'] : ['audio/*', 'audio/wav', 'audio/x-wav']}
      />
    </Dialog>
  )
}
