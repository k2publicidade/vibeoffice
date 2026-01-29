'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Disc3, Music, Calendar, Link, Tag, Building2, Truck } from 'lucide-react'
import type { Release, ReleaseStatus, ReleaseType, CreateReleaseInput } from '@/types/releases'
import type { Sector } from '@/types/auth'

const RELEASE_TYPES: { value: ReleaseType; label: string }[] = [
  { value: 'single', label: 'Single' },
  { value: 'ep', label: 'EP' },
  { value: 'album', label: 'Álbum' },
]

const SECTORS: Sector[] = ['A&R', 'Marketing', 'Financeiro', 'Jurídico', 'Administrativo', 'TI/Suporte', 'Atendimento ao Artista']

const STATUS_OPTIONS: { value: ReleaseStatus; label: string }[] = [
  { value: 'scheduled', label: 'Programado' },
  { value: 'in_progress', label: 'Em Andamento' },
  { value: 'released', label: 'Lançado' },
]

interface ReleaseModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: CreateReleaseInput) => Promise<void>
  release?: Release | null
  initialStatus?: ReleaseStatus
}

export function ReleaseModal({ open, onClose, onSave, release, initialStatus }: ReleaseModalProps) {
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [releaseType, setReleaseType] = useState<ReleaseType>('single')
  const [genre, setGenre] = useState('')
  const [releaseDate, setReleaseDate] = useState('')
  const [status, setStatus] = useState<ReleaseStatus>('scheduled')
  const [coverUrl, setCoverUrl] = useState('')
  const [spotifyUrl, setSpotifyUrl] = useState('')
  const [appleMusicUrl, setAppleMusicUrl] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [isrc, setIsrc] = useState('')
  const [upc, setUpc] = useState('')
  const [label, setLabel] = useState('')
  const [distributor, setDistributor] = useState('')
  const [notes, setNotes] = useState('')
  const [sector, setSector] = useState<Sector | ''>('')
  const [saving, setSaving] = useState(false)

  const isEditing = !!release

  useEffect(() => {
    if (open) {
      if (release) {
        setTitle(release.title)
        setArtist(release.artist)
        setReleaseType(release.releaseType)
        setGenre(release.genre || '')
        setReleaseDate(release.releaseDate ? release.releaseDate.toISOString().split('T')[0] : '')
        setStatus(release.status)
        setCoverUrl(release.coverUrl || '')
        setSpotifyUrl(release.spotifyUrl || '')
        setAppleMusicUrl(release.appleMusicUrl || '')
        setYoutubeUrl(release.youtubeUrl || '')
        setIsrc(release.isrc || '')
        setUpc(release.upc || '')
        setLabel(release.label || '')
        setDistributor(release.distributor || '')
        setNotes(release.notes || '')
        setSector((release.sector as Sector) || '')
      } else {
        setTitle('')
        setArtist('')
        setReleaseType('single')
        setGenre('')
        setReleaseDate('')
        setStatus(initialStatus || 'scheduled')
        setCoverUrl('')
        setSpotifyUrl('')
        setAppleMusicUrl('')
        setYoutubeUrl('')
        setIsrc('')
        setUpc('')
        setLabel('')
        setDistributor('')
        setNotes('')
        setSector('')
      }
    }
  }, [open, release, initialStatus])

  const handleSave = async () => {
    if (!title.trim() || !artist.trim()) return

    setSaving(true)
    try {
      await onSave({
        title: title.trim(),
        artist: artist.trim(),
        releaseType,
        genre: genre.trim() || undefined,
        releaseDate: releaseDate ? new Date(releaseDate + 'T12:00:00') : undefined,
        status,
        coverUrl: coverUrl.trim() || undefined,
        spotifyUrl: spotifyUrl.trim() || undefined,
        appleMusicUrl: appleMusicUrl.trim() || undefined,
        youtubeUrl: youtubeUrl.trim() || undefined,
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

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto bg-[#0a0a0a] border-[#2a2a2a] text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Disc3 className="w-5 h-5 text-[#fc7a67]" />
            {isEditing ? 'Editar Lançamento' : 'Novo Lançamento'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Title & Artist */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <Label className="text-gray-400 text-xs mb-1.5 block">Título *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nome da faixa, EP ou álbum"
                className="bg-[#111] border-[#2a2a2a] text-white"
              />
            </div>
            <div>
              <Label className="text-gray-400 text-xs mb-1.5 block">Artista *</Label>
              <div className="relative">
                <Music className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <Input
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="Nome do artista"
                  className="bg-[#111] border-[#2a2a2a] text-white pl-9"
                />
              </div>
            </div>
          </div>

          {/* Type, Status, Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            <div>
              <Label className="text-gray-400 text-xs mb-1.5 block">Data de Lançamento</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <Input
                  type="date"
                  value={releaseDate}
                  onChange={(e) => setReleaseDate(e.target.value)}
                  className="bg-[#111] border-[#2a2a2a] text-white pl-9"
                />
              </div>
            </div>
          </div>

          {/* Genre & Sector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-gray-400 text-xs mb-1.5 block">Gênero</Label>
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
              <Label className="text-gray-400 text-xs mb-1.5 block">Setor Responsável</Label>
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
          </div>

          {/* Label & Distributor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          {/* ISRC & UPC */}
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
              <Label className="text-gray-400 text-xs mb-1.5 block">UPC / EAN</Label>
              <Input
                value={upc}
                onChange={(e) => setUpc(e.target.value)}
                placeholder="0000000000000"
                className="bg-[#111] border-[#2a2a2a] text-white font-mono text-sm"
              />
            </div>
          </div>

          {/* Links */}
          <div className="space-y-3">
            <Label className="text-gray-400 text-xs flex items-center gap-1.5">
              <Link className="w-3.5 h-3.5" />
              Links de Plataformas
            </Label>
            <Input
              value={spotifyUrl}
              onChange={(e) => setSpotifyUrl(e.target.value)}
              placeholder="URL do Spotify"
              className="bg-[#111] border-[#2a2a2a] text-white text-sm"
            />
            <Input
              value={appleMusicUrl}
              onChange={(e) => setAppleMusicUrl(e.target.value)}
              placeholder="URL do Apple Music"
              className="bg-[#111] border-[#2a2a2a] text-white text-sm"
            />
            <Input
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="URL do YouTube"
              className="bg-[#111] border-[#2a2a2a] text-white text-sm"
            />
          </div>

          {/* Cover URL */}
          <div>
            <Label className="text-gray-400 text-xs mb-1.5 block">URL da Capa</Label>
            <Input
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://..."
              className="bg-[#111] border-[#2a2a2a] text-white text-sm"
            />
          </div>

          {/* Notes */}
          <div>
            <Label className="text-gray-400 text-xs mb-1.5 block">Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas adicionais sobre o lançamento..."
              className="bg-[#111] border-[#2a2a2a] text-white min-h-[80px] resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose} className="text-gray-400 hover:text-white">
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!title.trim() || !artist.trim() || saving}
              className="bg-gradient-to-r from-[#fc7a67] to-[#ff0300] text-white hover:opacity-90"
            >
              {saving ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Lançamento'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
