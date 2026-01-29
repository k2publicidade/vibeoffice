import { useRef } from 'react'
import html2canvas from 'html2canvas'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Disc3, Music, Calendar, ExternalLink, Copy, Trash2, Pencil,
  Tag, Building2, Truck, Hash, Globe, Users,
  Download,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Release } from '@/types/releases'

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
        backgroundColor: '#0a0a0a', // Match the modal background
        scale: 2, // Higher resolution
        useCORS: true, // For external images (cover)
        logging: false,
      })

      const image = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = image
      link.download = `release-${release.title.toLowerCase().replace(/\s+/g, '-')}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error generating image:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto bg-[#0a0a0a] border-[#2a2a2a] text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Disc3 className="w-5 h-5 text-[#fc7a67]" />
            Detalhes do Lançamento
          </DialogTitle>
        </DialogHeader>

        <div ref={contentRef} className="space-y-4 mt-2 p-4 bg-[#0a0a0a] rounded-lg">
          {/* Cover + Title */}
          <div className="flex gap-4">
            <div className="w-20 h-20 rounded-lg bg-[#111] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0 overflow-hidden">
              {release.coverUrl ? (
                <img src={release.coverUrl} alt={release.title} className="w-full h-full object-cover" crossOrigin="anonymous" />
              ) : (
                <Disc3 className="w-8 h-8 text-gray-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-white text-xl font-bold truncate">{release.title}</h2>
              <p className="text-gray-400 flex items-center gap-1.5 mt-1">
                <Music className="w-4 h-4" />
                {release.artist}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={`text-xs border ${STATUS_COLORS[release.status]}`}>
                  {STATUS_LABELS[release.status]}
                </Badge>
                <Badge className="text-xs bg-[#1a1a1a] text-gray-400 border-[#2a2a2a]">
                  {TYPE_LABELS[release.releaseType]}
                </Badge>
              </div>
            </div>
          </div>

          <Separator className="bg-[#2a2a2a]" />

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {release.releaseDate && (
              <div>
                <span className="text-gray-600 text-xs flex items-center gap-1 mb-0.5">
                  <Calendar className="w-3 h-3" /> Data
                </span>
                <span className="text-white">
                  {format(release.releaseDate, "dd 'de' MMMM, yyyy", { locale: ptBR })}
                </span>
              </div>
            )}
            {release.genre && (
              <div>
                <span className="text-gray-600 text-xs flex items-center gap-1 mb-0.5">
                  <Tag className="w-3 h-3" /> Gênero
                </span>
                <span className="text-white">{release.genre}</span>
              </div>
            )}
            {release.label && (
              <div>
                <span className="text-gray-600 text-xs flex items-center gap-1 mb-0.5">
                  <Building2 className="w-3 h-3" /> Selo
                </span>
                <span className="text-white">{release.label}</span>
              </div>
            )}
            {release.distributor && (
              <div>
                <span className="text-gray-600 text-xs flex items-center gap-1 mb-0.5">
                  <Truck className="w-3 h-3" /> Distribuidora
                </span>
                <span className="text-white">{release.distributor}</span>
              </div>
            )}
            {release.isrc && (
              <div>
                <span className="text-gray-600 text-xs flex items-center gap-1 mb-0.5">
                  <Hash className="w-3 h-3" /> ISRC
                </span>
                <span className="text-white font-mono text-xs">{release.isrc}</span>
              </div>
            )}
            {release.upc && (
              <div>
                <span className="text-gray-600 text-xs flex items-center gap-1 mb-0.5">
                  <Hash className="w-3 h-3" /> UPC
                </span>
                <span className="text-white font-mono text-xs">{release.upc}</span>
              </div>
            )}
            {release.sector && (
              <div className="col-span-2">
                <span className="text-gray-600 text-xs flex items-center gap-1 mb-0.5">
                  <Globe className="w-3 h-3" /> Setor
                </span>
                <span className="text-white">{release.sector}</span>
              </div>
            )}
          </div>

          {/* Composers */}
          {release.composers && release.composers.length > 0 && (
            <>
              <Separator className="bg-[#2a2a2a]" />
              <div className="space-y-2">
                <span className="text-gray-600 text-xs flex items-center gap-1">
                  <Users className="w-3 h-3" /> Compositores
                </span>
                {release.composers.map((composer, i) => (
                  <div key={i} className="text-sm text-gray-300">
                    <span className="text-white">{composer.name}</span>
                    {composer.artistName && (
                      <span className="text-gray-500 ml-1.5">({composer.artistName})</span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Links */}
          {linkItems.length > 0 && (
            <>
              <Separator className="bg-[#2a2a2a]" />
              <div className="space-y-2">
                <span className="text-gray-600 text-xs">Plataformas</span>
                {linkItems.map((link, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    {link.url ? (
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        {link.platform || 'Link'}
                      </a>
                    ) : (
                      <span className="text-gray-400">{link.platform}</span>
                    )}
                    {link.artistName && (
                      <span className="text-gray-500 text-xs">- {link.artistName}</span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Notes */}
          {release.notes && (
            <>
              <Separator className="bg-[#2a2a2a]" />
              <div>
                <span className="text-gray-600 text-xs block mb-1">Observações</span>
                <p className="text-gray-300 text-sm whitespace-pre-wrap">{release.notes}</p>
              </div>
            </>
          )}
        </div>

        <Separator className="bg-[#2a2a2a]" />

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(release)}
            className="text-gray-400 hover:text-white"
          >
            <Pencil className="w-4 h-4 mr-1.5" />
            Editar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDuplicate(release.id)}
            className="text-gray-400 hover:text-white"
          >
            <Copy className="w-4 h-4 mr-1.5" />
            Duplicar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="text-gray-400 hover:text-white"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Baixar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(release.id)}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 ml-auto"
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            Excluir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
