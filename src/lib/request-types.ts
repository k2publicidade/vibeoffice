import type { Sector } from '@/types/auth'

export const requestTypes: { id: string; name: string; icon: string; sector: Sector }[] = [
  { id: 'dayoff', name: 'Day Off', icon: '🌴', sector: 'Administrativo' },
  { id: 'vacation', name: 'Férias', icon: '✈️', sector: 'Administrativo' },
  { id: 'sick', name: 'Atestado Médico', icon: '🏥', sector: 'Administrativo' },
  { id: 'remote', name: 'Home Office', icon: '🏠', sector: 'Administrativo' },
  { id: 'compensatory', name: 'Folga Compensatória', icon: '⏰', sector: 'Administrativo' },
  { id: 'other', name: 'Outro', icon: '📋', sector: 'Administrativo' },
  { id: 'repertoire', name: 'Avaliação de repertório', icon: '🎵', sector: 'A&R' },
  { id: 'artist-development', name: 'Desenvolvimento artístico', icon: '🎤', sector: 'A&R' },
  { id: 'campaign', name: 'Campanha de lançamento', icon: '📣', sector: 'Marketing' },
  { id: 'creative', name: 'Criação de material', icon: '🎨', sector: 'Marketing' },
  { id: 'payment', name: 'Pagamento', icon: '💳', sector: 'Financeiro' },
  { id: 'reimbursement', name: 'Reembolso', icon: '🧾', sector: 'Financeiro' },
  { id: 'contract', name: 'Análise de contrato', icon: '📄', sector: 'Jurídico' },
  { id: 'rights', name: 'Direitos autorais', icon: '⚖️', sector: 'Jurídico' },
  { id: 'equipment', name: 'Equipamentos e materiais', icon: '📦', sector: 'Administrativo' },
  { id: 'technical-support', name: 'Suporte técnico', icon: '💻', sector: 'TI/Suporte' },
  { id: 'access', name: 'Acesso a sistemas', icon: '🔑', sector: 'TI/Suporte' },
  { id: 'artist-support', name: 'Atendimento ao artista', icon: '🎤', sector: 'Atendimento ao Artista' },
  { id: 'release-support', name: 'Acompanhamento de lançamento', icon: '💿', sector: 'Atendimento ao Artista' },
  { id: 'phonogram-review', name: 'Análise de fonograma', icon: '🎧', sector: 'Análise de fonogramas' },
  { id: 'metadata-review', name: 'Revisão de metadados e ISRC', icon: '🔎', sector: 'Análise de fonogramas' },
]
export const requestTypeLabel = (id: string) => requestTypes.find(type => type.id === id)?.name || id
export interface NewRequestInput {
  type: string
  startDate: Date
  endDate: Date
  description?: string
  sector: Sector
}
