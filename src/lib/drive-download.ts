import type { DriveItem } from '@/types/drive'

export function driveContentUrl(id: string, download = false) {
  return `/api/drive/files/${encodeURIComponent(id)}/content?request=${crypto.randomUUID()}${download ? '&download=1' : ''}`
}

export async function downloadDriveFile(file: DriveItem) {
  const response = await fetch(driveContentUrl(file.id, true), { cache: 'no-store', credentials: 'same-origin' })
  if (!response.ok) throw new Error('Arquivo indisponível ou acesso revogado')
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  document.body.appendChild(link)
  try { link.click() } finally { link.remove(); URL.revokeObjectURL(url) }
}
