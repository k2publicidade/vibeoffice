'use client'

import { Hash, Building2, Users, Briefcase, Scale, Settings, Headset, Music } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Sector {
  id: string
  name: string
  icon: React.ReactNode
  color: string
}

interface ChatSidebarProps {
  selectedSector?: string
  onSelectSector?: (sectorId: string) => void
}

const sectors: Sector[] = [
  { id: 'geral', name: 'Geral', icon: <Hash className="w-5 h-5" />, color: '#ef5907' },
  { id: 'a&r', name: 'A&R', icon: <Music className="w-5 h-5" />, color: '#0c67ff' },
  { id: 'marketing', name: 'Marketing', icon: <Briefcase className="w-5 h-5" />, color: '#ef5907' },
  { id: 'financeiro', name: 'Financeiro', icon: <Building2 className="w-5 h-5" />, color: '#0c67ff' },
  { id: 'juridico', name: 'Jurídico', icon: <Scale className="w-5 h-5" />, color: '#ef5907' },
  { id: 'administrativo', name: 'Administrativo', icon: <Settings className="w-5 h-5" />, color: '#0c67ff' },
  { id: 'suporte', name: 'Suporte', icon: <Headset className="w-5 h-5" />, color: '#ef5907' },
  { id: 'artista', name: 'Atendimento ao Artista', icon: <Users className="w-5 h-5" />, color: '#0c67ff' },
]

export function ChatSidebar({ selectedSector, onSelectSector }: ChatSidebarProps) {
  return (
    <div className="w-20 bg-black border-r border-[#262626] flex flex-col items-center py-6 space-y-4">
      {sectors.map((sector) => (
        <button
          key={sector.id}
          onClick={() => onSelectSector?.(sector.id)}
          className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center transition-all hover:scale-110',
            'relative group'
          )}
          style={{
            backgroundColor: sector.color + '20',
            color: sector.color,
          }}
          title={sector.name}
        >
          {sector.icon}

          {/* Tooltip */}
          <div className="absolute left-full ml-2 px-3 py-1.5 bg-white text-black text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg z-10">
            {sector.name}
          </div>
        </button>
      ))}
    </div>
  )
}
