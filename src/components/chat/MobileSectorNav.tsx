'use client'

import { Hash, Music, Briefcase, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Sector {
  id: string
  name: string
  icon: React.ReactNode
  color: string
}

interface MobileSectorNavProps {
  selectedSector?: string
  onSelectSector?: (sectorId: string) => void
}

const mainSectors: Sector[] = [
  { id: 'geral', name: 'Geral', icon: <Hash className="w-5 h-5" />, color: '#ef5907' },
  { id: 'a&r', name: 'A&R', icon: <Music className="w-5 h-5" />, color: '#0c67ff' },
  { id: 'marketing', name: 'Marketing', icon: <Briefcase className="w-5 h-5" />, color: '#ef5907' },
  { id: 'financeiro', name: 'Financeiro', icon: <Building2 className="w-5 h-5" />, color: '#0c67ff' },
]

export function MobileSectorNav({ selectedSector, onSelectSector }: MobileSectorNavProps) {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-[#262626] z-50">
      <div className="flex items-center justify-around py-2 px-4">
        {mainSectors.map((sector) => (
          <button
            key={sector.id}
            onClick={() => onSelectSector?.(sector.id)}
            className={cn(
              'flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-all',
              selectedSector === sector.id && 'bg-[#262626]'
            )}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: sector.color + '20',
                color: sector.color,
              }}
            >
              {sector.icon}
            </div>
            <span className="text-xs text-white">{sector.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
