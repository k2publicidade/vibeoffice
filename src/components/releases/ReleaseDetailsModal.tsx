import { useRef } from 'react'
import html2canvas from 'html2canvas'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Disc3, Music, Calendar, ExternalLink, Copy, Trash2, Pencil,
  Tag, Building2, Truck, Hash, Globe, Users,
  Download, FileAudio, Image as ImageIcon, Link as LinkIcon,
  Clock, Mic2
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Release } from '@/types/releases'
import { toast } from 'sonner'

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Programado',
  in_progress: 'Em Andamento',
  released: 'Lançado',
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  in_progress: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  released: 'bg-green-500/20 text-green-400 border-green-500/30',
}

const TYPE_LABELS: Record<string, string> = {
  single: 'Single',
  ep: 'EP',
  album: 'Álbum',
}

interface ReleaseDetailsModalProps {
  open: boolean
  onClose: () => void
  release: Release | null
  onEdit: (release: Release) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}

export function ReleaseDetailsModal({
  open,
  onClose,
  release,
  onEdit,
  onDuplicate,
  onDelete,
}: ReleaseDetailsModalProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  if (!release) return null

  const linkItems = (release.platformLinks || []).filter(l => l.url || l.platform)

  const handleDownload = async () => {
    if (!contentRef.current) return

    try {
      const canvas = await html2canvas(contentRef.current, {
        backgroundColor: '#0a0a0a',
        scale: 2,
        useCORS: true,
        logging: false,
      })

      const image = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = image
      link.download = `release-${release.title.toLowerCase().replace(/\s+/g, '-')}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('Imagem gerada com sucesso!')
    } catch (error) {
      console.error('Error generating image:', error)
      toast.error('Erro ao gerar imagem')
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copiado!`)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] p-0 bg-[#0a0a0a] border-[#2a2a2a] text-white overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-[#2a2a2a] flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Disc3 className="w-5 h-5 text-[#fc7a67]" />
            Detalhes do Lançamento
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div ref={contentRef} className="p-6 bg-[#0a0a0a]">
            {/* Header Section with Cover and Main Info */}
            <div className="flex flex-col md:flex-row gap-6 mb-8">
              {/* Cover Image */}
              <div className="w-full md:w-64 flex-shrink-0">
                <div className="aspect-square rounded-xl bg-[#111] border border-[#2a2a2a] overflow-hidden shadow-2xl relative group">
                  {release.coverUrl ? (
                    <img src={release.coverUrl} alt={release.title} className="w-full h-full object-cover" crossOrigin="anonymous" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Disc3 className="w-16 h-16 text-gray-700" />
                    </div>
                  )}
                  {release.coverUrl && (
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button size="icon" variant="ghost" className="text-white hover:bg-white/20" onClick={() => window.open(release.coverUrl, '_blank')}>
                        <ExternalLink className="w-5 h-5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-white hover:bg-white/20" onClick={() => copyToClipboard(release.coverUrl!, 'Link da Capa')}>
                        <Copy className="w-5 h-5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Title & Core Metadata */}
              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className={`${STATUS_COLORS[release.status]} uppercase text-[10px] tracking-wider font-semibold`}>
                          {STATUS_LABELS[release.status]}
                        </Badge>
                        <Badge variant="outline" className="bg-[#1a1a1a] text-gray-400 border-[#2a2a2a] uppercase text-[10px] tracking-wider font-semibold">
                          {TYPE_LABELS[release.releaseType]}
                        </Badge>
                      </div>
                      <h1 className="text-3xl font-bold leading-tight mb-1">{release.title}</h1>
                      <div className="text-xl text-gray-400 flex items-center gap-2">
                        <Music className="w-5 h-5" />
                        {release.artist}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm mt-6 p-4 bg-[#111] rounded-lg border border-[#222]">
                  <div className="space-y-4">
                    {release.releaseDate && (
                      <div>
                        <span className="text-gray-500 text-xs uppercase tracking-wider font-semibold block mb-1">Data de Lançamento</span>
                        <div className="flex items-center gap-2 text-gray-200">
                          <Calendar className="w-4 h-4 text-[#fc7a67]" />
                          {format(release.releaseDate, "dd 'de' MMMM, yyyy", { locale: ptBR })}
                        </div>
                      </div>
                    )}

                    {release.genre && (
                      <div>
                        <span className="text-gray-500 text-xs uppercase tracking-wider font-semibold block mb-1">Gênero</span>
                        <div className="flex items-center gap-2 text-gray-200">
                          <Tag className="w-4 h-4 text-gray-500" />
                          {release.genre}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    {release.label && (
                      <div>
                        <span className="text-gray-500 text-xs uppercase tracking-wider font-semibold block mb-1">Selo / Gravadora</span>
                        <div className="flex items-center gap-2 text-gray-200">
                          <Building2 className="w-4 h-4 text-gray-500" />
                          {release.label}
                        </div>
                      </div>
                    )}

                    {release.distributor && (
                      <div>
                        <span className="text-gray-500 text-xs uppercase tracking-wider font-semibold block mb-1">Distribuidora</span>
                        <div className="flex items-center gap-2 text-gray-200">
                          <Truck className="w-4 h-4 text-gray-500" />
                          {release.distributor}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Separator className="bg-[#222] my-6" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* LEFT COLUMN: Technical Info & Assets */}
              <div className="space-y-6">
                {/* Identification */}
                <div className="bg-[#111] rounded-lg border border-[#222] p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <Hash className="w-4 h-4" /> Identificação
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {release.isrc && (
                      <div>
                        <span className="text-gray-500 text-xs block mb-1">ISRC</span>
                        <code className="text-sm bg-[#0a0a0a] px-2 py-1 rounded border border-[#222] font-mono text-gray-300 select-all block w-full truncate">
                          {release.isrc}
                        </code>
                      </div>
                    )}
                    {release.upc && (
                      <div>
                        <span className="text-gray-500 text-xs block mb-1">UPC / EAN</span>
                        <code className="text-sm bg-[#0a0a0a] px-2 py-1 rounded border border-[#222] font-mono text-gray-300 select-all block w-full truncate">
                          {release.upc}
                        </code>
                      </div>
                    )}
                  </div>
                </div>

                {/* Assets */}
                <div className="bg-[#111] rounded-lg border border-[#222] p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <LinkIcon className="w-4 h-4" /> Assets & Arquivos
                  </h3>

                  <div className="space-y-3">
                    {release.wavUrl ? (
                      <div className="flex items-center justify-between p-3 bg-[#0a0a0a] rounded border border-[#222]">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                            <FileAudio className="w-4 h-4 text-blue-400" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm text-gray-200 font-medium truncate">Arquivo de Áudio (WAV)</div>
                            <div className="text-xs text-gray-500 truncate">{release.wavUrl}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400" onClick={() => copyToClipboard(release.wavUrl!, 'Link do Áudio')}>
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400" onClick={() => window.open(release.wavUrl, '_blank')}>
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 border border-dashed border-[#333] rounded text-center text-sm text-gray-500">
                        Nenhum arquivo de áudio vinculado
                      </div>
                    )}

                    {release.coverUrl ? (
                      <div className="flex items-center justify-between p-3 bg-[#0a0a0a] rounded border border-[#222]">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-8 h-8 rounded bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                            <ImageIcon className="w-4 h-4 text-purple-400" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm text-gray-200 font-medium truncate">Arquivo da Capa</div>
                            <div className="text-xs text-gray-500 truncate">{release.coverUrl}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400" onClick={() => copyToClipboard(release.coverUrl!, 'Link da Capa')}>
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400" onClick={() => window.open(release.coverUrl, '_blank')}>
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Platforms */}
                {linkItems.length > 0 && (
                  <div className="bg-[#111] rounded-lg border border-[#222] p-4 space-y-4">
                    <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                      <Globe className="w-4 h-4" /> Plataformas Digitais
                    </h3>
                    <div className="space-y-2">
                      {linkItems.map((link, i) => (
                        <div key={i} className="flex items-center justify-between p-2 hover:bg-[#1a1a1a] rounded transition-colors group">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="text-sm text-gray-300 font-medium">{link.platform}</span>
                            {link.artistName && (
                              <span className="text-xs text-gray-500">({link.artistName})</span>
                            )}
                          </div>
                          {link.url && (
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: Credits, Tracks, Notes */}
              <div className="space-y-6">
                {/* Artists / Composers */}
                <div className="bg-[#111] rounded-lg border border-[#222] p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <Users className="w-4 h-4" /> Créditos & Artistas
                  </h3>

                  {/* Legacy Artists or New Artists Array */}
                  <div className="space-y-4">
                    {release.artists && release.artists.length > 0 ? (
                      <div>
                        <span className="text-gray-500 text-xs block mb-2 uppercase tracking-wide">Artistas</span>
                        <div className="space-y-2">
                          {release.artists.map((artist, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span className="text-gray-200">{artist.name}</span>
                              <Badge variant="secondary" className="text-[10px] bg-[#222] text-gray-400 hover:bg-[#222]">
                                {artist.role === 'main' ? 'Principal' : artist.role === 'feat' ? 'Participação' : 'Produtor'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {release.composers && release.composers.length > 0 && (
                      <div>
                        <Separator className="bg-[#222] my-3" />
                        <span className="text-gray-500 text-xs block mb-2 uppercase tracking-wide">Compositores</span>
                        <div className="space-y-1">
                          {release.composers.map((composer, i) => (
                            <div key={i} className="text-sm text-gray-300 flex items-center gap-1.5">
                              <Mic2 className="w-3 h-3 text-gray-600" />
                              <span className="text-white">{composer.name}</span>
                              {composer.artistName && (
                                <span className="text-gray-500 ml-1">({composer.artistName})</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tracklist (Only for Album/EP) */}
                {(release.releaseType === 'album' || release.releaseType === 'ep') && release.tracks && release.tracks.length > 0 && (
                  <div className="bg-[#111] rounded-lg border border-[#222] p-4 space-y-4">
                    <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                      <Disc3 className="w-4 h-4" /> Faixas ({release.tracks.length})
                    </h3>
                    <div className="space-y-1">
                      {release.tracks.map((track, i) => (
                        <div key={track.id || i} className="flex items-center gap-3 p-2 hover:bg-[#1a1a1a] rounded group">
                          <span className="text-gray-600 font-mono text-xs w-5 text-right">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-gray-200 font-medium truncate">{track.title}</div>
                            <div className="text-xs text-gray-500 truncate">
                              {track.artists.map(a => a.name).join(', ')}
                            </div>
                          </div>
                          {track.duration && (
                            <span className="text-xs text-gray-500 font-mono">{track.duration}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sector */}
                {release.sector && (
                  <div className="bg-[#111] rounded-lg border border-[#222] p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <Globe className="w-4 h-4" />
                      <span>Setor Responsável</span>
                    </div>
                    <span className="text-white font-medium text-sm">{release.sector}</span>
                  </div>
                )}

                {/* Notes */}
                {release.notes && (
                  <div className="bg-[#111] rounded-lg border border-[#222] p-4 space-y-2">
                    <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                      <Pencil className="w-3 h-3" /> Observações
                    </h3>
                    <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">
                      {release.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-[#2a2a2a] bg-[#0a0a0a] flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => onDelete(release.id)}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir Release
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => onDuplicate(release.id)}
              className="border-[#333] text-gray-300 hover:text-white hover:bg-[#222]"
            >
              <Copy className="w-4 h-4 mr-2" />
              Duplicar
            </Button>

            <Button
              variant="outline"
              onClick={handleDownload}
              className="border-[#333] text-gray-300 hover:text-white hover:bg-[#222]"
            >
              <Download className="w-4 h-4 mr-2" />
              Baixar Card
            </Button>

            <Button
              onClick={() => onEdit(release)}
              className="bg-white text-black hover:bg-gray-200"
            >
              <Pencil className="w-4 h-4 mr-2" />
              Editar Lançamento
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
